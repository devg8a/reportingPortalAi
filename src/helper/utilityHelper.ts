import ClientDetails from '../db/models/clientDetails';
import ClientAccountHandlers from '../db/models/clientAccountHandlers';
import { getFinalPermissions } from '../services/permissionUtils';
import clientConnections from '../db/models/clientConnections';
import { MODULE_NETWORK_MAP } from '../config/moduleNetwork';

/**
 * Get client scope for a user from permissions
 */
const getClientScope = async (userId: string, moduleKey: string): Promise<string> => {
    try {
        const permissions = await getFinalPermissions(userId);
        return permissions?.[moduleKey]?.client_scope || 'assigned';
    } catch (error) {
        console.error('Error getting client scope:', error);
        return 'assigned';
    }
};

/**
 * Handler fields array - reusable
 */
const HANDLER_FIELDS = [
    'am_id', 'assoc_am_id', 'past_am_id',
    'paid_social_id', 'assoc_paid_social_id',
    'paid_search_id', 'assoc_paid_search_id',
    'design_lead_id', 'assoc_design_lead_id',
    'email_lead_id', 'assoc_email_lead_id',
    'affiliate_lead_id', 'assoc_affiliate_lead_id'
];

/**
 * Build handler query for user
 */
const buildHandlerQuery = (userId: string) => {
    return {
        $or: HANDLER_FIELDS.map(field => ({ [field]: userId }))
    };
};

const getClientTypeByModule = (moduleKey: string): string | null => {

    const paidMediaModules = [
        'account_summary',
        'divergence_report',
        'email_marketing'
    ];

    if (paidMediaModules.includes(moduleKey)) {
        return 'paid_media';
    }

    // Other modules ke liye null (means all types)
    return null;
};

/**
 * Fetch all active paid media clients with group_accounts
 */
export const fetchAllActiveClients = async (
    userId?: string,
    moduleKey?: string
) => {
    try {
        let clientIds: any[] = [];
        let clientScope = 'all';

        const type = getClientTypeByModule(moduleKey);

        // ✅ If userId provided, check client_scope permission
        if (userId && moduleKey) {
            clientScope = await getClientScope(userId, moduleKey);
            console.log(clientScope, "client scope");

            if (clientScope === 'none') {
                return [];
            }

            if (clientScope === 'assigned') {
                const handlerDocs = await ClientAccountHandlers.find(buildHandlerQuery(userId))
                    .select('client_id')
                    .lean();

                clientIds = handlerDocs.map(doc => doc.client_id);

                if (clientIds.length === 0) {
                    console.log(`⚠️ User ${userId} has no assigned clients`);
                    return [];
                }
            }
        }

        // ✅ Build query
        const query: any = {
            status: 'active'
        };

        if (type) {
            query.$or = [
                { type: type },
                { type: { $in: [type] } }
            ];
        }

        if (clientScope === 'assigned') {
            query._id = { $in: clientIds };
        }

        // ✅ Fetch clients
        const clients = await ClientDetails.find(query)
            .select('_id name main_account_id is_main_account role_id setting status client_visible type')
            .populate('main_account_id', 'name')
            .populate('role_id', 'name')
            .sort({ created_at: -1 })
            .lean();

        clientIds = clients.map(c => c._id);

        // ✅ Get allowed networks for this module
        const allowedNetworks = moduleKey ? MODULE_NETWORK_MAP[moduleKey] : null;

        // ✅ Build connection query with network filter
        const connectionQuery: any = {
            client_id: { $in: clientIds },
            status: 'active'
        };

        // ✅ Add network filter only if module has allowed list
        if (allowedNetworks && allowedNetworks.length > 0) {
            connectionQuery.network = {
                $in: allowedNetworks
            };
        }
        const connections = await clientConnections.find(connectionQuery)
            .select('_id client_id network account_name')
            .lean();

        // ✅ Build both maps
        const networkMap = new Map<string, any>();
        const connectionMap = new Map<string, Array<{ id: string; network: string; account_name: string }>>();

        connections.forEach(conn => {
            const clientId = conn.client_id.toString();
            const network = conn.network?.toLowerCase();
            const account_name = conn.account_name?.toLowerCase();
            const connectionId = conn._id.toString();

            // ✅ For connected_networks (object format)
            if (!networkMap.has(clientId)) {
                networkMap.set(clientId, {});
            }
            networkMap.get(clientId)[network] = true;

            // ✅ For connected_id (array format)
            if (!connectionMap.has(clientId)) {
                connectionMap.set(clientId, []);
            }
            connectionMap.get(clientId)!.push({
                id: connectionId,
                network: network,
                account_name: account_name
            });
        });

        // ✅ Build group_accounts for each client
        const clientsWithGroups = await buildGroupAccounts(clients, type);

        let finalClients = clientsWithGroups.map(client => ({
            ...client,
            connected_networks: networkMap.get(client._id.toString()) || {},
            connected_id: connectionMap.get(client._id.toString()) || []
        }));

        // ✅ Filter: Agar module MODULE_NETWORK_MAP mein hai, toh sirf connected wale
        if (allowedNetworks && allowedNetworks.length > 0) {
            finalClients = finalClients.filter(client => client.connected_id.length > 0);
        }

        console.log(`✅ Returning ${finalClients.length} clients for user ${userId || 'anonymous'}`);
        return finalClients;

    } catch (error) {
        console.error('Error fetching active clients:', error);
        throw error;
    }
};

/**
 * Build group_accounts for each client
 */
const buildGroupAccounts = async (clients: any[], type: string) => {
    if (!clients || clients.length === 0) return clients;

    // ✅ Get all unique main_account_ids from clients
    const mainAccountIds = new Set<string>();
    const clientIds = new Set<string>();

    clients.forEach(client => {
        clientIds.add(client._id.toString());

        if (client.is_main_account) {
            // This client is a parent - need to find its children
            mainAccountIds.add(client._id.toString());
        }

        if (client.main_account_id) {
            // This client has a parent - need to find siblings
            const parentId = typeof client.main_account_id === 'object'
                ? client.main_account_id._id?.toString()
                : client.main_account_id.toString();

            if (parentId) {
                mainAccountIds.add(parentId);
            }
        }
    });

    // ✅ Fetch all related clients (children of all main accounts)
    const relatedClients = await ClientDetails.find({
        main_account_id: { $in: Array.from(mainAccountIds) },
        status: 'active',
        $or: [
            { type: type },
            { type: { $in: [type] } }
        ]
    })
        .select('_id name main_account_id')
        .lean();
    // ✅ Also fetch parent accounts if not already in clients list
    const parentClients = await ClientDetails.find({
        _id: { $in: Array.from(mainAccountIds) },
        is_main_account: true,
        status: 'active',
        $or: [
            { type: type },
            { type: { $in: [type] } }
        ]
    })
        .select('_id name')
        .lean();
    // ✅ Build lookup maps
    // Map: parentId -> [child clients]
    const childrenByParent = new Map<string, Array<{ _id: string; name: string }>>();

    relatedClients.forEach(client => {
        const parentId = client.main_account_id?.toString();
        if (parentId) {
            if (!childrenByParent.has(parentId)) {
                childrenByParent.set(parentId, []);
            }
            childrenByParent.get(parentId)!.push({
                _id: client._id.toString(),
                name: client.name
            });
        }
    });

    // Map: parentId -> parent client info
    const parentMap = new Map<string, { _id: string; name: string }>();
    parentClients.forEach(client => {
        parentMap.set(client._id.toString(), {
            _id: client._id.toString(),
            name: client.name
        });
    });

    // ✅ Add group_accounts to each client
    const result = clients.map(client => {
        const clientIdStr = client._id.toString();
        let groupAccounts: Array<{ _id: string; name: string }> = [];

        if (client.is_main_account) {
            groupAccounts = childrenByParent.get(clientIdStr) || [];
        } else if (client.main_account_id) {
            const parentId = typeof client.main_account_id === 'object'
                ? client.main_account_id._id?.toString()
                : client.main_account_id.toString();

            if (parentId) {
                const parent = parentMap.get(parentId);
                if (parent) {
                    groupAccounts.push(parent);
                }
                const siblings = childrenByParent.get(parentId) || [];
                siblings.forEach(sibling => {
                    if (sibling._id !== clientIdStr) {
                        groupAccounts.push(sibling);
                    }
                });
            }
        }
        // ✅ CASE 3: Standalone client (no parent, not a main account)
        // group_accounts = [] (empty)

        return {
            ...client,
            group_accounts: groupAccounts
        };
    });

    return result;
};

/**
 * Fetch single client by ID
 * Optional: Check if user has access based on client_scope
 */
export const fetchClientById = async (clientId: string, userId?: string, moduleKey: string = 'account_summary') => {
    try {
        // ✅ If userId provided, check access based on client_scope
        if (userId) {
            const clientScope = await getClientScope(userId, moduleKey);
            // console.log(`👤 User: ${userId} | Client: ${clientId} | Client Scope: ${clientScope}`);

            // ✅ If 'all', allow access to any client
            // ✅ If 'none', deny access
            if (clientScope === 'none') {
                return null;
            }

            // ✅ If 'assigned', verify user is a handler
            if (clientScope === 'assigned') {
                const hasAccess = await ClientAccountHandlers.findOne({
                    client_id: clientId,
                    $or: [
                        { am_id: userId },
                        { assoc_am_id: userId },
                        { past_am_id: userId },
                        { paid_social_id: userId },
                        { assoc_paid_social_id: userId },
                        { paid_search_id: userId },
                        { assoc_paid_search_id: userId },
                        { design_lead_id: userId },
                        { assoc_design_lead_id: userId },
                        { email_lead_id: userId },
                        { assoc_email_lead_id: userId },
                        { affiliate_lead_id: userId },
                        { assoc_affiliate_lead_id: userId }
                    ]
                });

                if (!hasAccess) {
                    console.log(`⚠️ User ${userId} doesn't have access to client ${clientId}`);
                    return null;
                }
            }
        }

        const client = await ClientDetails.findById(clientId)
            .select('_id name main_account_id roles_id setting status type')
            .populate('main_account_id', 'name')
            .populate('roles_id', 'name')
            .lean();

        return client;
    } catch (error) {
        console.error('Error fetching client by ID:', error);
        throw error;
    }
};

/**
 * Fetch clients by filter with user access check based on client_scope
 */
export const fetchClientsByFilter = async (filter: any = {}, userId?: string, moduleKey: string = 'account_summary') => {
    try {
        let clientIds: any[] = [];
        let clientScope = 'all';

        // ✅ If userId provided, check client_scope permission
        if (userId) {
            clientScope = await getClientScope(userId, moduleKey);
            // console.log(`👤 User: ${userId} | Module: ${moduleKey} | Client Scope: ${clientScope}`);

            if (clientScope === 'none') {
                return [];
            }

            if (clientScope === 'assigned') {
                const handlerDocs = await ClientAccountHandlers.find({
                    $or: [
                        { am_id: userId },
                        { assoc_am_id: userId },
                        { past_am_id: userId },
                        { paid_social_id: userId },
                        { assoc_paid_social_id: userId },
                        { paid_search_id: userId },
                        { assoc_paid_search_id: userId },
                        { design_lead_id: userId },
                        { assoc_design_lead_id: userId },
                        { email_lead_id: userId },
                        { assoc_email_lead_id: userId },
                        { affiliate_lead_id: userId },
                        { assoc_affiliate_lead_id: userId }
                    ]
                }).select('client_id').lean();

                clientIds = handlerDocs.map(doc => doc.client_id);

                if (clientIds.length === 0) {
                    return [];
                }

                // Add to filter
                filter._id = { $in: clientIds };
            }
        }

        const clients = await ClientDetails.find(filter)
            .select('_id name main_account_id roles_id setting status type')
            .populate('main_account_id', 'name')
            .populate('roles_id', 'name')
            .sort({ created_at: -1 })
            .lean();

        return clients;
    } catch (error) {
        console.error('Error fetching clients by filter:', error);
        throw error;
    }
};


export const updateClientVisibility = async (
    clientIds: string[],
    client_visible?: boolean
) => {
    if (!clientIds?.length) return { modifiedCount: 0 };

    return ClientDetails.updateMany(
        { _id: { $in: clientIds } },
        { $set: { client_visible } }
    );
};
