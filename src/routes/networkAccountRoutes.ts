import express from 'express';
import {
  syncNetworkAccounts,
  getNetworkAccounts,
  cronSyncAllNetworkAccounts,
  getNetworkAccountById,
  selectNetworkAccount,
  connectShopifyAccount,
  deleteShopifyFilter,
  connectKlaviyoAccount,
  deleteKlaviyoFilter,
  connectAvantlinkAccount,
  connectAwinAccount,
  deleteAwinAccount,
  connectImpactAccount,
  connectCjAccount,
  deleteImpactAccount,
  connectLevantaAccount,
  connectRakutenAccount,
  deleteCjAccount,
  deleteRakutenAccount,
  updateAffiliateAccountStatus,
  deleteNetworkAccount,
  connectPepperjamAccount,
  connectRefersionAccount
} from '../controllers/networkAccountController';

const router = express.Router();

// Sync all network accounts
router.post('/network-accounts/sync', syncNetworkAccounts);

// Get all network accounts with filters
router.get('/network-accounts', getNetworkAccounts);

// Get specific network account
router.get('/network-accounts/:accountId', getNetworkAccountById);

router.post('/network-accounts/:clientId', selectNetworkAccount);

// Manual trigger for cron job
router.post('/network-accounts/cron/sync-all', async (req, res) => {
  try {
    const result = await cronSyncAllNetworkAccounts();

    return res.status(200).json({
      status_code: 200,
      success: result.success,
      message: result.success ? 'Cron job executed successfully' : 'Cron job failed',
      data: result
    });
  } catch (error) {
    console.error('Manual cron trigger error:', error);
    return res.status(401).json({
      status_code: 401,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
});
router.post('/connect-shopify/:clientId', connectShopifyAccount);
router.delete('/shopify-filter/:clientId', deleteShopifyFilter);
router.post('/connect-klaviyo/:clientId', connectKlaviyoAccount);
router.delete('/klaviyo-filter/:clientId', deleteKlaviyoFilter);
router.post('/connect-avantlink/:clientId', connectAvantlinkAccount);
router.post('/connect-awin/:clientId', connectAwinAccount);
router.delete('/awin-account/:clientId/:connectionId', deleteAwinAccount);
router.post('/connect-impact/:clientId', connectImpactAccount);
router.delete('/impact-account/:clientId/:connectionId', deleteImpactAccount);
router.post('/connect-cj/:clientId', connectCjAccount);
router.post('/connect-levanta/:clientId', connectLevantaAccount);
router.post('/connect-rakuten/:clientId', connectRakutenAccount);
router.post('/connect-pepperjam/:clientId', connectPepperjamAccount);
router.post('/connect-refersion/:clientId', connectRefersionAccount);
router.delete('/client/:clientId/cj/:connectionId', deleteCjAccount);
router.delete('/client/:clientId/rakuten/:connectionId', deleteRakutenAccount);
router.post("/affiliate-account/status", updateAffiliateAccountStatus);
router.post("/delete-connection",deleteNetworkAccount);

export default router;