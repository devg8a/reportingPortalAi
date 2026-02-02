import express from 'express';
import {
  syncNetworkAccounts,
  getNetworkAccounts,
  cronSyncAllNetworkAccounts,
  getNetworkAccountById,
  selectNetworkAccount
} from '../controllers/networkAccountController';

const router = express.Router();

// Sync all network accounts
router.post('/network-accounts/sync', syncNetworkAccounts);

// Get all network accounts with filters
router.get('/network-accounts', getNetworkAccounts);

// Get specific network account
router.get('/network-accounts/:accountId', getNetworkAccountById);

router.post('/select/:clientId', selectNetworkAccount);

// Manual trigger for cron job
router.post('/network-accounts/cron/sync-all',  async (req, res) => {
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

export default router;