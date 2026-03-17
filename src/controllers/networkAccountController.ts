import NetworkAccountList from '../db/models/networkAccountList';
import { AdwordService } from '../liberaries/PaidMedia/Adword/AdwordLib';
import { MetaService } from '../liberaries/PaidMedia/Meta/metaLib';
import { AnalyticsAdminService } from '../liberaries/PaidMedia/GA4/analyticsAdminLib';
import { CriteoService } from '../liberaries/PaidMedia/Criteo/CriteoLib';
import ClientDetails from '../db/models/clientDetails';
import ClientConnections from '../db/models/clientConnections';
import { ShopifyService } from '../liberaries/PaidMedia/Shopify/shopify-service';
import { klaviyoService } from '../liberaries/PaidMedia/Klaviyo/klaviyo-service';
import { BingService } from '../liberaries/PaidMedia/Bing/BingLib';
import { AvantlinkService } from '../liberaries/Affiliate/Avantlink/avantlink-service';
import { AwinService } from '../liberaries/Affiliate/Awin/awin-service';
import { CjService } from '../liberaries/Affiliate/Cj/cj-service';
import { ImpactService } from '../liberaries/Affiliate/Impact/impact-service';
import { LevantaService } from '../liberaries/Affiliate/Levanta/levanta-service';
import { RakutenService } from '../liberaries/Affiliate/Rakuten/rakuten-service';
import { PepperjamService } from '../liberaries/Affiliate/Pepperjam/pepperjam-service';
import mongoose, { SortOrder } from 'mongoose';
import { getCentralStorageModel } from "../db/schema/dynamic-central-model";

export const syncNetworkAccounts = async (req, res) => {
  try {
    const network = req?.body?.network || null;
    const accounts = await getAllNetworkAccounts(network);
    if (!accounts.length) {
      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'No network accounts found',
        data: { total_synced: 0 }
      });
    }

    const result = await bulkUpsertNetworkAccounts(accounts);
    const accountIds = accounts.map(acc => acc.account_id);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: `Network accounts ${network ? `for ${network} ` : ''} synced successfully`,
      data: {
        total_synced: result.upsertedCount + result.modifiedCount,
        // total_deleted: deleted?.deletedCount
      }
    });

  } catch (error) {
    console.error('Sync network accounts error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const getAllNetworkAccounts = async (network = null) => {
  try {
    const services = [];
    if (!network || network === 'adword') {
      services.push(new AdwordService().getAllAccounts().then(accounts =>
        accounts?.map(acc => ({
          network: 'adword',
          account_id: acc.id?.toString(),
          account_name: acc?.name || "",
          platform_type: 'paid_media',
          status: acc.status || 'active'
        })).filter(acc => acc.account_id)
      ));
    } else {
      services.push(Promise.resolve([]));
    }

    if (!network || network === 'meta') {
      services.push(new MetaService().getMetaAccounts().then(accounts =>
        accounts?.map(acc => ({
          network: 'meta',
          account_id: acc.account_id?.toString(),
          account_name: acc?.name || "",
          platform_type: 'paid_media',
          status: acc.status || 'active'
        })).filter(acc => acc.account_id)
      ));
    } else {
      services.push(Promise.resolve([]));
    }

    if (!network || network === 'ga') {
      services.push(new AnalyticsAdminService().listAccounts().then(accounts =>
        accounts?.map(acc => {
          const id = acc.propertyId || acc.accountId || acc.id;
          return id ? {
            network: 'ga',
            account_id: id.toString(),
            account_name: `${acc?.accountName} (${acc?.propertyName})` || "",
            platform_type: 'paid_media',
            status: acc.status || 'active'
          } : null;
        }).filter(acc => acc)
      ));
    } else {
      services.push(Promise.resolve([]));
    }
    if (!network || network === 'criteo') {
      services.push(new CriteoService().getAllAccounts().then(accounts =>
        accounts?.map(acc => ({
          network: 'criteo',
          account_id: acc.id?.toString(),
          account_name: acc.name || "",
          platform_type: 'paid_media',
          status: acc.status || 'active'
        })).filter(acc => acc.account_id)
      ));
    } else {
      services.push(Promise.resolve([]));
    }
    if (!network || network === 'bing') {
      services.push(new BingService().getAllAccounts().then(accounts =>
        accounts?.map(acc => ({
          network: 'bing',
          account_id: acc.Id?.toString(),
          account_name: acc.Name || "",
          platform_type: 'paid_media',
          status: acc.status || 'active'
        })).filter(acc => acc.account_id)
      ));
    } else {
      services.push(Promise.resolve([]));
    }
    const [
      adwordAccounts,
      metaAccounts,
      gaAccounts,
      criteoAccounts,
      bingAccounts,
    ] = await Promise.all(services);
    return [
      ...(adwordAccounts || []),
      ...(metaAccounts || []),
      ...(gaAccounts || []),
      ...(criteoAccounts || []),
      ...(bingAccounts || []),
    ];

  } catch (error) {
    console.error('Error fetching network accounts:', error);
    return [];
  }
};

export const bulkUpsertNetworkAccounts = async (accounts) => {
  const uniqueNetworks: any[] = [
    ...new Set(accounts.map(acc => acc.network))
  ];

  const uniqueNetworkIds: any[] = [
    ...new Set(accounts.map(acc => acc.account_id))
  ];

  /**INACTIVE CONNECTION WHICH IS REMOVED BY CLIENT**/
  await ClientConnections.updateMany(
    {
      network: { $in: uniqueNetworks },
      status: "active",
      value: { $nin: uniqueNetworkIds }
    },
    {
      $set: { status: "inactive" }
    }
  );

  /**REMOVE ALL EXISTING NETWORK RECORDS OF REFRESHED NETWORKS **/
  await NetworkAccountList.deleteMany({
    network: { $in: uniqueNetworks }
  });

  const bulkOps = accounts.map(acc => ({
    updateOne: {
      filter: {
        network: acc.network,
        account_id: acc.account_id
      },
      update: {
        $set: {
          ...acc,
          last_synced: new Date()
        }
      },
      upsert: true
    }
  }));
  return NetworkAccountList.bulkWrite(bulkOps);
};


export const getNetworkAccounts = async (req, res) => {
  try {
    const {
      clientId,
      network,
      platform,
      searchText,
      page = 1,
      limit = 10,
      sortBy = 'network',
      sortOrder = 'asc'
    } = req.query;

    // 🔹 Pagination
    const pageNumber = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit as string) || 10));

    // 🔹 Filter for NetworkAccountList
    const filter: Record<string, any> = {};
    if (network) filter.network = network;
    if (platform) filter.platform_type = platform;

    // 🔹 Search
    if (searchText && searchText.toString().trim() !== '') {
      const escapedSearchText = searchText
        .toString()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const searchRegex = new RegExp(escapedSearchText, 'i');

      filter.$or = [
        { account_id: { $regex: searchRegex } },
        { account_name: { $regex: searchRegex } },
        { network: { $regex: searchRegex } },
        { platform_type: { $regex: searchRegex } }
      ];
    }

    // 🔹 Sorting field validation
    const validSortFields = [
      'network',
      'account_name',
      'account_id',
      'platform_type',
      'createdAt',
      'updatedAt'
    ];

    const sortField = validSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : 'network';

    const sortDirection: SortOrder = sortOrder === 'desc' ? -1 : 1;

    // 🔹 Fetch ALL accounts and connections (for proper sorting)
    const [allAccounts, connections] = await Promise.all([
      NetworkAccountList
        .find(filter, { status: 0 })
        .lean(),

      ClientConnections.find({
        client_id: clientId,
        ...(network && { network: network })
      }).lean()
    ]);

    // 🔹 Create connection map
    const connectionMap = new Map<string, { status: string; account_name?: string; connection_id?: any }>();

    connections.forEach(conn => {
      const key = `${conn.network}_${conn.value}`;
      connectionMap.set(key, {
        status: conn.status,
        connection_id: conn._id,
        account_name: conn.account_name
      });
    });

    // 🔹 Update accounts with connection status
    const updatedAccounts = allAccounts.map(acc => {
      const key = `${acc.network}_${acc.account_id}`;
      const connection = connectionMap.get(key);

      return {
        ...acc,
        status: connection?.status || null,
        connection_id: connection?.connection_id || null,
        connected: !!connection
      };
    });

    // 🔹 Find deleted connections (exist in connections but not in accounts)
    const accountKeySet = new Set(
      allAccounts.map(acc => `${acc.network}_${acc.account_id}`)
    );

    // 👇 Search regex banao (agar searchText hai toh)
    const searchRegex = searchText && searchText.toString().trim() !== ''
      ? new RegExp(searchText.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      : null;

    const deletedConnections = connections
      .filter(conn => {
        const key = `${conn.network}_${conn.value}`;
        const notInAccounts = !accountKeySet.has(key);

        // 👇 Agar search hai toh filter karo, nahi toh sab include karo
        if (notInAccounts && searchRegex) {
          return (
            searchRegex.test(conn.value || '') ||
            searchRegex.test(conn.account_name || '') ||
            searchRegex.test(conn.network || '')
          );
        }

        return notInAccounts;
      })
      .map(conn => ({
        _id: null,
        network: conn.network,
        account_id: conn.value,
        account_name: conn.account_name,
        connection_id: conn._id,
        platform_type: null,
        status: "delete",
        connected: false,
        createdAt: null,
        updatedAt: null
      }));

    // 🔹 Combine all accounts
    const allCombinedAccounts = [
      ...updatedAccounts,
      ...deletedConnections
    ];

    // 🔹 Sort: Connected first, then by sortField
    const sortedAccounts = allCombinedAccounts.sort((a, b) => {
      // First priority: connected accounts come first
      if (a.connected && !b.connected) return -1;
      if (!a.connected && b.connected) return 1;

      // Second priority: sort by the specified field
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === 1 ? comparison : -comparison;
      }

      // For dates or numbers
      if (aValue < bValue) return sortDirection === 1 ? -1 : 1;
      if (aValue > bValue) return sortDirection === 1 ? 1 : -1;

      // Third priority: sort by account_name
      const aName = (a.account_name || '').toLowerCase();
      const bName = (b.account_name || '').toLowerCase();
      return aName.localeCompare(bName);
    });

    // 🔹 Apply pagination AFTER sorting
    const totalCount = sortedAccounts.length;
    const skip = (pageNumber - 1) * pageSize;
    const paginatedAccounts = sortedAccounts.slice(skip, skip + pageSize);

    // 🔹 Pagination meta
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Accounts loaded successfully',
      data: {
        accounts: paginatedAccounts,
        pagination: {
          currentPage: pageNumber,
          pageSize,
          totalItems: totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? pageNumber + 1 : null,
          prevPage: hasPrevPage ? pageNumber - 1 : null
        }
      }
    });

  } catch (error) {
    console.error('Get network accounts error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const cronSyncAllNetworkAccounts = async () => {
  try {
    const accounts = await getAllNetworkAccounts();
    const result = await bulkUpsertNetworkAccounts(accounts);

    return {
      success: true,
      total_synced: result.upsertedCount + result.modifiedCount
    };

  } catch (error) {
    console.error('Cron job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const getNetworkAccountById = async (req, res) => {
  try {
    const { accountId } = req.params;
    const account = await NetworkAccountList.findById(accountId);
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Network account fetched successfully',
      data: account
    });

  } catch (error) {
    console.error('Get network account by ID error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const selectNetworkAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { network, account_id, action = 'connect' } = req.body;

    // Validate required fields
    if (!clientId || !network) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and network are required',
        data: null
      });
    }
    if (action === 'connect' && !account_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'account_id is required for connect action',
        data: null
      });
    }
    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }
    if (action === 'connect') {
      const networkAccount = await NetworkAccountList.findOne({
        network,
        account_id,
      });
      if (!networkAccount) {
        return res.status(422).json({
          status_code: 422,
          success: false,
          message: `Account not found in ${network} network`,
          data: null
        });
      }
      const existingConnection = await ClientConnections.findOne({
        client_id: clientId,
        network,
        $or: [
          { value: account_id },
        ]
      });
      if (existingConnection) {
        existingConnection.status = 'active';
        await existingConnection.save();

        return res.status(200).json({
          status_code: 200,
          success: true,
          message: 'Account reconnected successfully',
          data: existingConnection
        });
      }
      const connection = new ClientConnections({
        client_id: clientId,
        network,
        value: networkAccount?.account_id,
        account_name: networkAccount?.account_name,
      });
      await connection.save();
      await updatePerformanceTracking(clientId, network, true);

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: `Account connected successfully`,
        data: connection
      });
    } else if (action === 'disconnect') {
      if (account_id) {
        const connection = await ClientConnections.findOne({
          client_id: clientId,
          network,
          $or: [
            { value: account_id },
            { account_id: account_id }
          ]
        });
        if (!connection) {
          return res.status(422).json({
            status_code: 422,
            success: false,
            message: `Connection not found for this account`,
            data: null
          });
        }
        await ClientConnections.findByIdAndUpdate(connection._id, { status: 'inactive' });
        // const remainingConnections = await ClientConnections.countDocuments({
        //   client_id: clientId,
        //   network,
        //   status: 'active'
        // });
        // if (remainingConnections === 0) {
        //   await updatePerformanceTracking(clientId, network, false);
        // }

        return res.status(200).json({
          status_code: 200,
          success: true,
          message: `Account disconnected successfully`,
          data: null
        });
      } else {
        const result = await ClientConnections.deleteMany({
          client_id: clientId,
          network,
        });
        await updatePerformanceTracking(clientId, network, false);
        return res.status(200).json({
          status_code: 200,
          success: true,
          message: `All ${network} accounts disconnected successfully`,
          data: {
            deletedCount: result.deletedCount
          }
        });
      }
    } else if (action === 'delete') {
      if (account_id) {
        const connection = await ClientConnections.findOne({
          client_id: clientId,
          network,
          $or: [
            { value: account_id },
          ]
        });
        if (!connection) {
          return res.status(422).json({
            status_code: 422,
            success: false,
            message: `Connection not found for this account`,
            data: null
          });
        }

        await deleteStoageData(connection._id);
        await ClientConnections.findByIdAndDelete(connection._id);

        return res.status(200).json({
          status_code: 200,
          success: true,
          message: `Account deleted successfully`,
          data: null
        });
      } else {
        const result = await ClientConnections.deleteMany({
          client_id: clientId,
          network,
        });
        await updatePerformanceTracking(clientId, network, false);
        return res.status(200).json({
          status_code: 200,
          success: true,
          message: `All ${network} accounts disconnected successfully`,
          data: {
            deletedCount: result.deletedCount
          }
        });
      }
    } else {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid action. Use "connect" or "disconnect"',
        data: null
      });
    }
  } catch (error) {
    console.error('Toggle network account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

async function deleteStoageData(connectionId) {
  const centralStorageCollections = await mongoose.connection.db
    .listCollections({ name: { $regex: /^central_storage_/ } })
    .toArray();
  for (const collection of centralStorageCollections) {
    const model = getCentralStorageModel(collection.name);
    await model.deleteMany({ connection_id: connectionId });
  }
  return true;
}

async function updatePerformanceTracking(clientId, network, value) {
  const excludedNetworks = ['shopify', 'klaviyo'];
  if (excludedNetworks.includes(network)) return;
  const updatePath = `setting.performance_tracking.networks.${network}`;
  await ClientDetails.findByIdAndUpdate(
    clientId,
    {
      $set: {
        [updatePath]: value
      }
    }
  );
}
export const connectShopifyAccount = async (req, res) => {
  const { clientId } = req.params;
  const { storeUrl, accessToken, filters, shopify_revenue_settings } = req.body;

  if (!clientId || !storeUrl || !accessToken) {
    return res.status(400).json({
      status_code: 400,
      success: false,
      message: 'clientId, storeUrl, and accessToken are required',
      data: null
    });
  }

  const client = await ClientDetails.findById(clientId);
  if (!client) {
    return res.status(404).json({
      status_code: 404,
      success: false,
      message: 'Client not found',
      data: null
    });
  }

  const requestData = {
    storeUrl: storeUrl,
    accessToken: accessToken,
    clientId: clientId,
  };

  try {
    const shopify = new ShopifyService();
    const shopifyResponse = await shopify.storeDetailsApi(requestData);
    if (shopifyResponse?.status !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Invalid Shopify credentials',
        data: null
      });
    }

    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'shopify',
      $or: [
        { value: storeUrl },
        { account_id: storeUrl }
      ]
    });
    const validFilters = Array.isArray(filters)
      ? filters
        .filter(filter =>
          filter &&
          typeof filter === 'object' &&
          filter.field?.trim() &&
          filter.operator?.trim() &&
          filter.value?.trim()
        )
        .map(filter => ({
          field: filter.field.trim(),
          operator: filter.operator.trim(),
          value: filter.value.trim(),
        }))
      : [];

    /**SHOPIFY REVENUE SETTINGS **/
    // const shopifyRevenueSettings = {
    //   account_summary: 'G-D+S+T',
    //   performance_tracker: 'G-D+S',
    //   report: 'Net Sales',
    //   divergence_report: 'Net Sales'
    // }


    if (existingConnection) {
      const connectionDoc = existingConnection as any;
      if (connectionDoc.status === 'deleted') {
        connectionDoc.status = 'active';
        connectionDoc.is_backed_data_synced = false;
      }
      connectionDoc.token = accessToken;
      connectionDoc.filter = validFilters;
      await connectionDoc.save();
      return res.status(200).json({
        status_code: 200,
        success: true,
        message: connectionDoc.status === 'deleted'
          ? 'Shopify account reconnected successfully'
          : 'Shopify account updated successfully',
        data: connectionDoc
      });
    }

    const connection = new ClientConnections({
      client_id: clientId,
      network: 'shopify',
      is_primary: false,
      is_backed_data_synced: false,
      status: 'active',
      value: storeUrl,
      token: accessToken,
      filter: validFilters,
      shopify_revenue_settings: shopify_revenue_settings
    });

    await connection.save();
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Shopify account connected successfully',
      data: connection
    });
  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: error?.data || null,
    });
  }
};

export const deleteShopifyFilter = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { storeUrl, filterIndex } = req.body;

    if (!clientId || !storeUrl || filterIndex === undefined) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId, storeUrl, and filterIndex are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'shopify',
      $or: [
        { value: storeUrl },
        { account_id: storeUrl }
      ]
    });
    if (!existingConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Shopify connection not found',
        data: null
      });
    }
    const connectionDoc = existingConnection as any;
    if (!connectionDoc.filter || !Array.isArray(connectionDoc.filter)) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'No filters found for this connection',
        data: null
      });
    }
    if (filterIndex < 0 || filterIndex >= connectionDoc.filter.length) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid filter index',
        data: null
      });
    }
    connectionDoc.filter.splice(filterIndex, 1);
    await connectionDoc.save();
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Filter deleted successfully',
      data: connectionDoc
    });

  } catch (error) {
    console.error("Delete Shopify filter error:", error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const connectKlaviyoAccount = async (req, res) => {
  const { clientId } = req.params;
  const { accountkey, filters } = req.body;

  const client = await ClientDetails.findById(clientId);

  if (!clientId || !accountkey || !client) {
    return res.status(400).json({
      status_code: 400,
      success: false,
      message: 'Private key or Client ID is missing.',
      data: null
    });
  }

  try {
    const klaviyoLib = new klaviyoService();
    const klaviyoResponse = await klaviyoLib.getMetrices({privateKey:accountkey});
    if (!klaviyoResponse || !Array.isArray(klaviyoResponse)) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Invalid Klaviyo account key or unable to fetch metrics',
        data: null
      });
    }
    const placedOrderMetric = klaviyoResponse.find(metric =>
      metric.attributes?.name === "Placed Order" &&
      (metric.attributes?.integration as { name?: string })?.name === "Shopify"
    );

    if (!placedOrderMetric) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Could not find "Placed Order" metric in Klaviyo account',
        data: null
      });
    }
    const placedOrderMetricId = placedOrderMetric.id;
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'klaviyo',
      $or: [
        { value: accountkey },
        { token: placedOrderMetricId }
      ]
    });
    const validFilters = Array.isArray(filters)
      ? filters
        .filter(filter =>
          filter &&
          typeof filter === 'object' &&
          filter.field &&
          filter.field.trim()
        )
        .map(filter => ({
          field: filter.field.trim(),
        }))
      : [];
    if (existingConnection) {
      const connectionDoc = existingConnection as any;
      if (connectionDoc.status === 'deleted') {
        connectionDoc.status = 'active';
        connectionDoc.is_backed_data_synced = false;
      }
      connectionDoc.token = placedOrderMetricId;
      connectionDoc.filter = validFilters;
      await connectionDoc.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: connectionDoc.status === 'deleted'
          ? 'Klaviyo account reconnected successfully'
          : 'Klaviyo account updated successfully',
        data: connectionDoc
      });
    }
    const connection = new ClientConnections({
      client_id: clientId,
      network: 'klaviyo',
      is_primary: false,
      is_backed_data_synced: false,
      status: 'active',
      value: accountkey,
      token: placedOrderMetricId,
      filter: validFilters
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Klaviyo account connected successfully',
      data: connection
    });

  } catch (error) {
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Invalid Klaviyo account key or API access issue',
      data: error?.statusText
    });
  }
};

export const deleteKlaviyoFilter = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { accountkey, filterIndex, deleteConnection } = req.body;  // ✅ NEW: deleteConnection flag

    if (!clientId || !accountkey) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and accountkey are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'klaviyo',
      $or: [
        { value: accountkey },
        { token: accountkey }
      ]
    });

    if (!existingConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Klaviyo connection not found',
        data: null
      });
    }

    const connectionDoc = existingConnection;

    // ✅ CASE 1: Delete entire connection (API Key delete)
    if (deleteConnection === true) {
      connectionDoc.status = 'deleted';
      await connectionDoc.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Klaviyo connection deleted successfully',
        data: null
      });
    }

    // ✅ CASE 2: Delete specific filter (existing functionality)
    if (filterIndex === undefined || filterIndex === null) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'filterIndex is required for filter deletion',
        data: null
      });
    }

    if (!connectionDoc.filter || !Array.isArray(connectionDoc.filter)) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'No filters found for this connection',
        data: null
      });
    }

    if (filterIndex < 0 || filterIndex >= connectionDoc.filter.length) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid filter index',
        data: null
      });
    }

    connectionDoc.filter.splice(filterIndex, 1);
    await connectionDoc.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Filter deleted successfully',
      data: connectionDoc
    });

  } catch (error) {
    console.error("Delete Klaviyo filter error:", error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const connectAvantlinkAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { accountId, authKey, accountName } = req.body; // ✅ Added accountName

    if (!clientId || !accountId || !authKey) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId, accountId, and authKey are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const avantlinkService = new AvantlinkService();
    const avantlinkResult = await avantlinkService.publisherList({
      accountId,
      authKey,
      clientId
    });

    if (!avantlinkResult || avantlinkResult.success !== true) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: avantlinkResult?.message || 'Invalid Avantlink credentials',
        data: avantlinkResult?.data
      });
    }

    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'avantlink',
      value: accountId
    });

    if (existingConnection) {
      existingConnection.token = authKey;
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;
      existingConnection.account_name = accountName || existingConnection.account_name || accountId; // ✅ Added

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Avantlink account updated successfully',
        data: existingConnection
      });
    }

    const connection = new ClientConnections({
      client_id: clientId,
      network: 'avantlink',
      value: accountId,
      token: authKey,
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false,
      account_name: accountName || accountId // ✅ Added - fallback to accountId
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Avantlink account connected successfully',
      data: connection
    });
  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.statusText || 'Internal server error',
      data: error?.data
    });
  }
};
export const connectAwinAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { accountId, authToken, accountName, timezone } = req.body;

    if (!clientId || !accountId || !authToken || !accountName || !timezone) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId, accountId, authToken, accountName, and timezone are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }
    const requestData = {
      authToken: authToken,
      accountId: accountId,
      clientId: clientId
    };

    const awinService = new AwinService();
    const awinResult = await awinService.accountInfo(requestData);

    if (!awinResult || awinResult.status_code !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Invalid Awin credentials',
        data: null
      });
    }
    if (!awinResult.data || typeof awinResult.data !== 'object') {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Invalid Awin credentials',
        data: null
      });
    }
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'awin',
      $or: [
        { value: accountId },
        { account_id: accountId }
      ]
    });

    if (existingConnection) {
      existingConnection.token = authToken;
      existingConnection.account_name = accountName;
      existingConnection.timezone = timezone;
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Awin account updated successfully',
        data: existingConnection
      });
    }
    const connection = new ClientConnections({
      client_id: clientId,
      network: 'awin',
      value: accountId,
      token: authToken,
      account_name: accountName,
      timezone: timezone,
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Awin account connected successfully',
      data: connection
    });

  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.statusText || 'Internal server error',
      data: error?.data
    });
  }
};
export const deleteAwinAccount = async (req, res) => {
  try {
    const { clientId, connectionId } = req.params;

    if (!clientId || !connectionId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and connectionId are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }
    const deletedConnection = await ClientConnections.findOneAndDelete({
      _id: connectionId,
      client_id: clientId,
      network: 'awin',
      status: 'active'
    });

    if (!deletedConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Awin connection not found',
        data: null
      });
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Awin account permanently deleted successfully',
      data: deletedConnection
    });

  } catch (error) {
    console.error("Delete Awin account error:", error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const connectImpactAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { accountId, authToken, accountName, program_id } = req.body;

    if (!clientId || !accountId || !authToken || !accountName || !program_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: "clientId, accountId, authToken, accountName and program_id are required",
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: "Client not found",
        data: null
      });
    }

    const requestData = {
      clientId,
      accountId,
      authToken
    };

    const impactService = new ImpactService();
    const impactResult = await impactService.accountInfo(requestData);

    if (!impactResult || impactResult.status_code !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: "Invalid Impact credentials",
        data: null
      });
    }

    if (!impactResult.data || typeof impactResult.data !== "object") {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: "Invalid Impact credentials",
        data: null
      });
    }
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: "impact",
      value: accountId
    });

    if (existingConnection) {
      existingConnection.program_id = program_id;
      existingConnection.token = authToken;
      existingConnection.account_name = accountName;
      existingConnection.status = "active";
      existingConnection.is_backed_data_synced = false;

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: "Impact account updated successfully",
        data: existingConnection
      });
    }
    // Create new connection
    const connection = new ClientConnections({
      client_id: clientId,
      network: "impact",
      program_id: program_id,
      value: accountId,
      token: authToken,
      account_name: accountName,
      is_primary: false,
      is_backed_data_synced: false,
      status: "active"
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: "Impact account connected successfully",
      data: connection
    });

  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.statusText || "Something went wrong.",
      data: error?.data
    });
  }
};

export const deleteImpactAccount = async (req, res) => {
  try {
    const { clientId, connectionId } = req.params;

    if (!clientId || !connectionId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and connectionId are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const deletedConnection = await ClientConnections.findOneAndDelete({
      _id: connectionId,
      client_id: clientId,
      network: 'impact',
      // status: 'active'
    });

    if (!deletedConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Impact connection not found',
        data: null
      });
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Impact account permanently deleted successfully',
      data: deletedConnection
    });

  } catch (error) {
    console.error('Delete Impact account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

function capitalizeFirstLetter(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const deleteNetworkAccount = async (req, res) => {
  try {
    const connectionId = req?.body?.connectionId;
    if (!connectionId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'ConnectionId is required.',
        data: null
      });
    }

    const deletedConnection = await ClientConnections.findOneAndDelete({
      _id: connectionId
    });

    if (!deletedConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Network Connection not found.',
        data: null
      });
    }

    deleteStoageData(connectionId);
    const networkName = capitalizeFirstLetter(deletedConnection?.network);
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: `${networkName} account permanently deleted successfully.`,
      data: deletedConnection
    });

  } catch (error) {
    console.error('Delete Impact account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
}
const getTodayAndYesterday = () => {
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  const formatDate = (date) =>
    date.toISOString().split('T')[0];

  return {
    startDate: formatDate(yesterday),
    endDate: formatDate(today)
  };
};

export const connectCjAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { accountId, accountName } = req.body;
    const { startDate, endDate } = getTodayAndYesterday();

    if (!clientId || !accountId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and accountId are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const requestData = {
      clientId,
      accountId,
      startDate,
      endDate
    };

    const cjService = new CjService();
    const cjResult = await cjService.transactionList(requestData);

    if (!cjResult || cjResult.status_code !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Invalid Cj Account key',
        data: cjResult?.data || null
      });
    }

    // ✅ FIXED: Now checks for specific accountId (value field)
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'cj',
      value: accountId  // ✅ Multiple accounts allowed now
    });

    if (existingConnection) {
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;
      existingConnection.account_name = accountName || existingConnection.account_name || 'CJ Account';
      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'CJ account updated successfully',
        data: existingConnection
      });
    }

    // ✅ Create new connection (multiple allowed)
    const connection = new ClientConnections({
      client_id: clientId,
      network: 'cj',
      value: accountId,
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false,
      account_name: accountName || 'CJ Account'
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'CJ account connected successfully',
      data: connection
    });

  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.statusText || 'Internal server error',
      data: error?.data
    });
  }
};
export const connectLevantaAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { apiKey, accountName } = req.body; // ✅ Added accountName

    if (!clientId || !apiKey) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and apiKey are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const requestData = {
      apiKey,
      clientId
    };

    const levantaService = new LevantaService();
    const levantaResult = await levantaService.publisherList(requestData);

    if (!levantaResult || levantaResult.status_code !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: levantaResult?.message || 'Invalid Levanta API key',
        data: null
      });
    }

    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'levanta',
      value: apiKey
    });

    if (existingConnection) {
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;
      existingConnection.account_name = accountName || existingConnection.account_name || 'Levanta Account'; // ✅ Added

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Levanta account updated successfully',
        data: existingConnection
      });
    }

    const connection = new ClientConnections({
      client_id: clientId,
      network: 'levanta',
      value: apiKey,
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false,
      account_name: accountName || 'Levanta Account' // ✅ Added
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Levanta account connected successfully',
      data: connection
    });

  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.statusText || 'Internal server error',
      data: error?.data
    });
  }
};
export const connectRakutenAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { authToken, accountName } = req.body;
    const { startDate, endDate } = getTodayAndYesterday();

    if (!clientId || !authToken) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and authToken are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const requestData = {
      authToken,
      clientId,
      startDate,
      endDate
    };

    const rakutenService = new RakutenService();
    const rakutenResult: any = await rakutenService.transactionList(requestData);
    // console.log(rakutenResult, "rakutenResult");

    if (!rakutenResult || rakutenResult?.status !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Rakuten token verification failed',
        data: rakutenResult?.data || null
      });
    }

    // ✅ Check using token field (since value will be same as token)
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'rakuten',
      $or: [
        { value: authToken }  // ✅ Check both fields
      ]
    });

    if (existingConnection) {
      existingConnection.value = authToken;  // ✅ Keep value in sync
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;
      existingConnection.account_name = accountName || existingConnection.account_name || 'Rakuten Account';

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Rakuten account updated successfully',
        data: existingConnection
      });
    }

    // ✅ Create new connection with BOTH token and value
    const connection = new ClientConnections({
      client_id: clientId,
      network: 'rakuten',
      value: authToken, 
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false,
      account_name: accountName || 'Rakuten Account'
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Rakuten account connected successfully',
      data: connection
    });

  } catch (error) {
    console.error('Connect Rakuten account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.message || "Something went wrong.",
      data: null
    });
  }
};

export const connectPepperjamAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { apiKey, accountName } = req.body;

    if (!clientId || !apiKey) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and api-key are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const requestData = {
      apiKey,
      clientId,
    };

    const pepperjamService = new PepperjamService();
    console.log("requestData==>",requestData);
    const pepperjamResult: any = await pepperjamService.publishersList(requestData);
    if (!pepperjamResult || pepperjamResult?.status !== 200) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Pepperjam token verification failed',
        data: pepperjamResult?.data || null
      });
    }

    // ✅ Check using token field (since value will be same as token)
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'pepperjam',
      $or: [
        { value: apiKey }  // ✅ Check both fields
      ]
    });

    if (existingConnection) {
      existingConnection.value = apiKey;  // ✅ Keep value in sync
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;
      existingConnection.account_name = accountName || existingConnection.account_name || 'Pepperjam Account';

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Pepperjam account updated successfully',
        data: existingConnection
      });
    }

    // ✅ Create new connection with BOTH token and value
    const connection = new ClientConnections({
      client_id: clientId,
      network: 'pepperjam',
      value: apiKey,  // ✅ ADD THIS - Same as token for uniqueness
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false,
      account_name: accountName || 'Pepperjam Account'
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Pepperjam account connected successfully',
      data: connection
    });

  } catch (error) {
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.message || "Something went wrong.",
      data: error?.data
    });
  }
};

export const connectRefersionAccount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { authToken, accountName } = req.body;

    if (!clientId || !authToken) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and authToken are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const requestData = {
      authToken,
      clientId,
    };

    // ✅ Check using token field (since value will be same as token)
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network: 'refersion',
      $or: [
        { value: authToken }  // ✅ Check both fields
      ]
    });

    if (existingConnection) {
      existingConnection.value = authToken;  // ✅ Keep value in sync
      existingConnection.status = 'active';
      existingConnection.is_backed_data_synced = false;
      existingConnection.account_name = accountName || existingConnection.account_name || 'Refersion Account';

      await existingConnection.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Refersion account updated successfully',
        data: existingConnection
      });
    }

    // ✅ Create new connection with BOTH token and value
    const connection = new ClientConnections({
      client_id: clientId,
      network: 'refersion',
      value: authToken,  // ✅ ADD THIS - Same as token for uniqueness
      status: 'active',
      is_primary: false,
      is_backed_data_synced: false,
      account_name: accountName || 'Refersion Account'
    });

    await connection.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Refersion account connected successfully',
      data: connection
    });

  } catch (error) {
    console.error('Connect Refersion account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: error?.message || "Something went wrong.",
      data: null
    });
  }
};

export const deleteCjAccount = async (req, res) => {
  try {
    const { clientId, connectionId } = req.params;

    if (!clientId || !connectionId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and connectionId are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const deletedConnection = await ClientConnections.findOneAndDelete({
      _id: connectionId,
      client_id: clientId,
      network: 'cj',
      status: 'active'
    });

    if (!deletedConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'CJ connection not found',
        data: null
      });
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'CJ account permanently deleted successfully',
      data: deletedConnection
    });

  } catch (error) {
    console.error('Delete CJ account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};


export const deleteRakutenAccount = async (req, res) => {
  try {
    const { clientId, connectionId } = req.params;

    if (!clientId || !connectionId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId and connectionId are required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const deletedConnection = await ClientConnections.findOneAndDelete({
      _id: connectionId,
      client_id: clientId,
      network: 'rakuten',
      status: 'active'
    });

    if (!deletedConnection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Rakuten connection not found',
        data: null
      });
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Rakuten account permanently deleted successfully',
      data: deletedConnection
    });

  } catch (error) {
    console.error('Delete Rakuten account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const updateAffiliateAccountStatus = async (req, res) => {
  try {
    const { clientId, networkType, accountId, status } = req.body;

    if (!clientId || !networkType || !accountId || !status) {
      return res.status(400).json({
        success: false,
        message: "clientId, networkType, accountId and status are required"
      });
    }

    const updated = await ClientConnections.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(accountId),
        client_id: new mongoose.Types.ObjectId(clientId), // ✅ IMPORTANT
        network: networkType
      },
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Affiliate account not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Account ${status === "active" ? "activated" : "deactivated"} successfully`,
      data: updated
    });

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error); // 🔥 Add this
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
