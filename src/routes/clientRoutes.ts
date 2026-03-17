import express from 'express';
import multer from 'multer';
import {
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  getChangeLogs,
  resetPasswordAndSendLogin,
  deleteContact,
  getConnectionsByClientId,
  getClientAccountHandlers,
  deleteConnectionById,
  fetchClients,
  checkContactEmail,
  bulkDisconnectNetwork,
  fetchClientsall
} from '../controllers/clientController';
import { authMiddleware } from '../middleware/authMiddleware';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = express.Router();

// ✅ LIST ROUTES
router.get('/list-all', fetchClientsall);
router.get('/list', fetchClients);

// ✅ OTHER STATIC ROUTES
router.get('/check-email/:email', checkContactEmail);
router.post('/bulk-disconnect', authMiddleware, bulkDisconnectNetwork);

// ✅ NESTED ROUTES
router.get('/connections/:clientId', getConnectionsByClientId);
router.get('/connections/:clientId/:network', getConnectionsByClientId);

router.get('/logs/change-logs/:clientId', getChangeLogs);
router.get('/account-handlers/:clientId', getClientAccountHandlers);

// ✅ CONTACT ROUTES
router.post('/contacts/:contactId/reset-password', authMiddleware, resetPasswordAndSendLogin);
router.delete('/contacts/:contactId', deleteContact);
router.delete('/connections/:clientId/:connectionId', deleteConnectionById);

// ✅ CRUD ROUTES
router.post('/', authMiddleware, upload.single('profile_pic'), createClient);
router.put('/:clientId', authMiddleware, upload.single('profile_pic'), updateClient);
router.delete('/:clientId', authMiddleware, deleteClient);

// 🔥 ALWAYS KEEP THIS LAST
router.get('/:clientId', authMiddleware, getClientById);

// In your backend routes
// router.get('/check-email/:email', async (req, res) => {
//   try {
//     const { email } = req.params;

//     const existingContact = await ClientContacts.findOne({
//       email: email,
//       is_main_contact: true
//     });

//     return res.status(200).json({
//       success: true,
//       exists: !!existingContact
//     });
//   } catch (error) {
//     console.error('Error checking email:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error'
//     });
//   }
// });

export default router;