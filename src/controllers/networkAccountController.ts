import NetworkAccountList from '../db/models/networkAccountList';
import { AdwordService } from '../liberaries/PaidMedia/Adword/AdwordLib';
import { MetaService } from '../liberaries/PaidMedia/Meta/metaLib';
import { AnalyticsAdminService } from '../liberaries/PaidMedia/GA4/analyticsAdminLib';
import { CriteoService } from '../liberaries/PaidMedia/Criteo/CriteoLib';
import ClientDetails from '../db/models/clientDetails';
import ClientConnections from '../db/models/clientConnections';

export const syncNetworkAccounts = async (req, res) => {
  try {
    const { network } = req.query;
    const accounts = await getAllNetworkAccounts(network);

    if (!accounts.length) {
      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'No network accounts found',
        data: { total_synced: 0, accounts: [] }
      });
    }

    const result = await bulkUpsertNetworkAccounts(accounts);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: `Network accounts ${network ? `for ${network} ` : ''}synced successfully`,
      data: {
        total_synced: result.upsertedCount + result.modifiedCount,
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
          account_name: acc.name || `Adword Account ${acc.id}`,
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
          account_name: acc.name || `Meta Account ${acc.account_id}`,
          platform_type: 'paid_media',
          status: acc.status || 'active'
        })).filter(acc => acc.account_id)
      ));
    } else {
      services.push(Promise.resolve([]));
    }

    if (!network || network === 'ga4') {
      services.push(new AnalyticsAdminService().listAccounts().then(accounts => 
        accounts?.map(acc => {
          const id = acc.propertyId || acc.accountId || acc.id;
          return id ? {
            network: 'ga4',
            account_id: id.toString(),
            account_name: acc.propertyName || acc.accountName || `GA Account ${id}`,
            platform_type: 'organic',
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
          account_name: acc.name || `Criteo Account ${acc.id}`,
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
      criteoAccounts
    ] = await Promise.all(services);
    return [
      ...(adwordAccounts || []),
      ...(metaAccounts || []),
      ...(gaAccounts || []),
      ...(criteoAccounts || [])
    ];

  } catch (error) {
    console.error('Error fetching network accounts:', error);
    return [];
  }
};

export const bulkUpsertNetworkAccounts = async (accounts) => {
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
    const { network, status, platform } = req.query;

    const filter: any = {};
    if (network) filter.network = network;
    if (status) filter.status = status;
    if (platform) filter.platform_type = platform;

    const accounts = await NetworkAccountList
      .find(filter)
      .sort({ network: 1, account_name: 1 });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Network accounts fetched successfully',
      data: accounts
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
    console.log('CRON: Syncing network accounts...');
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
    if (!account) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Network account not found',
        data: null
      });
    }

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
    const { network, account_id } = req.body;

    if (!clientId || !network || !account_id) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'clientId, network, and account_id are required',
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
    const networkAccount = await NetworkAccountList.findOne({
      network,
      account_id
    });
    if (!networkAccount) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: `Account not found in ${network} network`,
        data: null
      });
    }
    const existingConnection = await ClientConnections.findOne({
      client_id: clientId,
      network
    });
    let connection;
    if (existingConnection) {
      existingConnection.value = networkAccount.account_id;
      existingConnection.account_name = networkAccount.account_name;
      // existingConnection.account_id = networkAccount.account_id;
      // existingConnection.platform_type = networkAccount.platform_type;
      existingConnection.is_primary = true;
      await existingConnection.save();
      connection = existingConnection;
    } else {
      connection = new ClientConnections({
        client_id: clientId,
        network,
        value: networkAccount.account_id,
        account_name: networkAccount.account_name,
        account_id: networkAccount.account_id,
        platform_type: networkAccount.platform_type,
        is_primary: true,
        is_backed_data_synced: false,
        status: 'active'
      });
      await connection.save();
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: `Account selected successfully for ${network}`,
      data: connection
    });

  } catch (error) {
    console.error('Select network account error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};
