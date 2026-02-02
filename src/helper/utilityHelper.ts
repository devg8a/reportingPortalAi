import ClientDetails from '../db/models/clientDetails';

/**
 * Fetch all active paid media clients
 * Reusable utility function for multiple endpoints
 */
export const fetchAllActiveClients = async () => {
    try {
        const clients = await ClientDetails.find({
            status: 'active',
            type: { $ne: 'affiliate' }
        })
            .select('_id name main_account_id roles_id setting status')
            .populate('main_account_id', 'name')
            .populate('roles_id', 'name')
            .sort({ created_at: -1 })
            .lean();

        return clients;
    } catch (error) {
        console.error('Error fetching active clients:', error);
        throw error;
    }
};

/**
 * Fetch single client by ID
 */
export const fetchClientById = async (clientId: string) => {
    try {
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
 * Fetch clients by filter
 */
export const fetchClientsByFilter = async (filter: any = {}) => {
    try {
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
