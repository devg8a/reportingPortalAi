import ClientDetails from '../db/models/clientDetails';
import ClientContacts from '../db/models/clientContacts';
import ClientAccountHandlers from '../db/models/clientAccountHandlers';
import ClientConnections from '../db/models/clientConnections';
import ClientAccountLogs from '../db/models/clientAccountLogs';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { sendLoginEmail, generateSecurePassword } from '../services/emailService';
import mongoose from 'mongoose';

export const createClient = async (req, res) => {
  try {
    const {
      name,
      type,
      is_main_account,
      main_account_id,
      status,
      monday_calender_id,
      monday_board_id,
      start_date,
      termination_date,
      website_url,
      roles_id,
      quickbook_configuration,
      setting,
      contacts,
      am_id,
      assoc_am_id,
      past_am_id,
      paid_social_id,
      assoc_paid_social_id,
      paid_search_id,
      assoc_paid_search_id,
      design_lead_id,
      assoc_design_lead_id,
      email_lead_id,
      assoc_email_lead_id,
      affiliate_lead_id,
      assoc_affiliate_lead_id,
      connections
    } = req.body;
    
    let clientProfilePic = null;
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      clientProfilePic = `data:${req.file.mimetype};base64,${base64Image}`;
      if (clientProfilePic && clientProfilePic.length > 1000000) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Profile picture too large. Max size is 1MB.',
          data: null
        });
      }
    }

    // Create Client Details
    const clientDetails = new ClientDetails({
      name,
      type,
      is_main_account: is_main_account || false,
      main_account_id: is_main_account ? null : main_account_id,
      status: status || 'active',
      monday_calender_id,
      monday_board_id,
      start_date,
      termination_date,
      website_url,
      roles_id,
      quickbook_configuration: quickbook_configuration || {},
      setting: setting || {},
      profile_pic: clientProfilePic
    });

    await clientDetails.save();

    const createdContacts = [];
    if (contacts && contacts.length > 0) {
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const hashedPassword = await bcrypt.hash(contact.password, 10);
        
        const clientContact = new ClientContacts({
          client_id: clientDetails._id,
          is_main_contact: contact.is_main_contact || false,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          password: hashedPassword,
          is_invitation_sent: contact.is_invitation_sent || 'pending',
          status: contact.status || 'active',
          email_notification_preference: contact.email_notification_preference || 'on',
        });

        await clientContact.save();
        createdContacts.push(clientContact);
      }
    }
    
    const clientAccountHandlers = new ClientAccountHandlers({
      client_id: clientDetails._id,
      am_id: am_id || [],
      assoc_am_id: assoc_am_id || [],
      past_am_id: past_am_id || [],
      paid_social_id: paid_social_id || [],
      assoc_paid_social_id: assoc_paid_social_id || [],
      paid_search_id: paid_search_id || [],
      assoc_paid_search_id: assoc_paid_search_id || [],
      design_lead_id: design_lead_id || [],
      assoc_design_lead_id: assoc_design_lead_id || [],
      email_lead_id: email_lead_id || [],
      assoc_email_lead_id: assoc_email_lead_id || [],
      affiliate_lead_id: affiliate_lead_id || [],
      assoc_affiliate_lead_id: assoc_affiliate_lead_id || [],
    });

    await clientAccountHandlers.save();

    const createdConnections = [];
    if (connections && connections.length > 0) {
      for (const connection of connections) {
        const clientConnection = new ClientConnections({
          client_id: clientDetails._id,
          ordering: connection.ordering,
          is_primary: connection.is_primary || false,
          network: connection.network,
          value: connection.value,
          is_backed_data_synced: connection.is_backed_data_synced || false,
        });

        await clientConnection.save();
        createdConnections.push(clientConnection);
      }
    }

    const clientAccountLog = new ClientAccountLogs({
      client_id: clientDetails._id,
      am_id: am_id || [],
      assoc_am_id: assoc_am_id || [],
      paid_social_id: paid_social_id || [],
      assoc_paid_social_id: assoc_paid_social_id || [],
      paid_search_id: paid_search_id || [],
      assoc_paid_search_id: assoc_paid_search_id || [],
      design_lead_id: design_lead_id || [],
      assoc_design_lead_id: assoc_design_lead_id || [],
      email_lead_id: email_lead_id || [],
      assoc_email_lead_id: assoc_email_lead_id || [],
      affiliate_lead_id: affiliate_lead_id || [],
      assoc_affiliate_lead_id: assoc_affiliate_lead_id || [],
      type: 'paid_media',
      status: status || 'active',
    });

    await clientAccountLog.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client created successfully',
      data: {
        clientDetails,
        contacts: createdContacts,
        accountHandlers: clientAccountHandlers,
        connections: createdConnections
      }
    });

  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const updateClient = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { clientId } = req.params;
    const updateData = req.body;

    // Validate input
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid update data',
        data: null
      });
    }
    const {
      clientDetails,
      contacts,
      accountHandlers,
      connections,
      ...otherData
    } = updateData;
    const updatedData : any = {};

    // Update ClientDetails
    const client = await ClientDetails.findById(clientId).session(session);
    if (!client) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    // Handle profile picture
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      otherData.profile_pic = `data:${req.file.mimetype};base64,${base64Image}`;
      
      if (otherData.profile_pic.length > 1000000) {
        await session.abortTransaction();
        session.endSession();
        
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Profile picture too large. Max size is 1MB.',
          data: null
        });
      }
    } else if (otherData.profile_pic === null || otherData.profile_pic === 'null') {
      // If profile_pic is explicitly set to null, remove it
      otherData.profile_pic = null;
    }

    // Handle nested objects
    if (otherData.quickbook_configuration) {
      if (!client.quickbook_configuration) {
        client.quickbook_configuration = otherData.quickbook_configuration;
      } else {
        Object.assign(client.quickbook_configuration, otherData.quickbook_configuration);
      }
      delete otherData.quickbook_configuration;
    }

    if (otherData.setting) {
      if (!client.setting) {
        client.setting = otherData.setting;
      } else {
        Object.assign(client.setting, otherData.setting);
      }
      delete otherData.setting;
    }

    // Remove fields that shouldn't be updated
    const { _id, created_at, email, ...dataToUpdate } = otherData;

    // Update client details
    Object.assign(client, dataToUpdate);
    if (clientDetails) {
      Object.assign(client, clientDetails);
    }
    
    await client.save({ session });
    updatedData.client = client;

    // 2. Update Contacts (if provided)
    if (contacts && Array.isArray(contacts)) {
      const updatedContacts = [];
      
      for (const contactData of contacts) {
        const { contactId, ...contactUpdate } = contactData;
        
        if (contactId) {
          // Update existing contact
          const contact = await ClientContacts.findById(contactId).session(session);
          
          if (contact) {
            // Don't allow email update
            if (contactUpdate.email) {
              delete contactUpdate.email;
            }
            
            // Handle password update
            if (contactUpdate.password) {
              contactUpdate.password = await bcrypt.hash(contactUpdate.password, 10);
            }
            
            Object.assign(contact, contactUpdate);
            await contact.save({ session });
            updatedContacts.push(contact);
          }
        } else {
          // Create new contact
          const newContact = new ClientContacts({
            client_id: clientId,
            ...contactUpdate
          });
          
          // Hash password if provided
          if (newContact.password) {
            newContact.password = await bcrypt.hash(newContact.password, 10);
          }
          
          await newContact.save({ session });
          updatedContacts.push(newContact);
        }
      }
      
      updatedData.contacts = updatedContacts;
    }

    // 3. Update Account Handlers (if provided)
    if (accountHandlers) {
      let accountHandler = await ClientAccountHandlers.findOne({ 
        client_id: clientId 
      }).session(session);

      if (!accountHandler) {
        accountHandler = new ClientAccountHandlers({
          client_id: clientId,
          ...accountHandlers
        });
      } else {
        Object.assign(accountHandler, accountHandlers);
      }

      await accountHandler.save({ session });
      updatedData.accountHandlers = accountHandler;
    }

    // 4. Update Connections (if provided)
    if (connections && Array.isArray(connections)) {
      const updatedConnections = [];
      
      for (const connectionData of connections) {
        const { network, value, is_primary, ordering, is_backed_data_synced } = connectionData;
        
        if (!network) continue;
        
        let connection = await ClientConnections.findOne({
          client_id: clientId,
          network
        }).session(session);

        if (connection) {
          connection.value = value;
          connection.is_primary = is_primary || false;
          connection.ordering = ordering;
          connection.is_backed_data_synced = is_backed_data_synced || false;
        } else {
          connection = new ClientConnections({
            client_id: clientId,
            network,
            value,
            ordering,
            is_primary: is_primary || false,
            is_backed_data_synced: is_backed_data_synced || false,
          });
        }

        await connection.save({ session });
        updatedConnections.push(connection);
      }
      
      updatedData.connections = updatedConnections;
    }

    // Create log entry
    const clientAccountLog = new ClientAccountLogs({
      client_id: clientId,
      type: 'updated',
      status: client.status,
    });

    await clientAccountLog.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client and all related data updated successfully',
      data: updatedData
    });

  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    
    console.error('Update client error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in updating client',
      data: error.message
    });
  }
};

export const getClients = async (req, res) => {
  try {
    const {
      searchText,
      name,
      type,
      status,
      email,
      page = 1,
      limit = 20
    } = req.query;

    const filter: any = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (type) filter.type = type;
    if (status) filter.status = status;
    
    if (searchText) {
      let clientIds = [];

      const nameMatches = await ClientDetails.find({
        name: { $regex: searchText, $options: 'i' }
      }).select('_id');
      const nameClientIds = nameMatches.map(client => client._id);

      const contacts = await ClientContacts.find({
        email: { $regex: searchText, $options: 'i' }
      }).select('client_id');
      const contactClientIds = contacts.map(contact => contact.client_id);

      const handlers = await ClientAccountHandlers.find({
        $or: [
          { am_id: { $regex: searchText, $options: 'i' } },
          { assoc_am_id: { $regex: searchText, $options: 'i' } },
          { past_am_id: { $regex: searchText, $options: 'i' } },
          { paid_social_id: { $regex: searchText, $options: 'i' } },
          { assoc_paid_social_id: { $regex: searchText, $options: 'i' } },
          { paid_search_id: { $regex: searchText, $options: 'i' } },
          { assoc_paid_search_id: { $regex: searchText, $options: 'i' } },
          { design_lead_id: { $regex: searchText, $options: 'i' } },
          { assoc_design_lead_id: { $regex: searchText, $options: 'i' } },
          { email_lead_id: { $regex: searchText, $options: 'i' } },
          { assoc_email_lead_id: { $regex: searchText, $options: 'i' } },
          { affiliate_lead_id: { $regex: searchText, $options: 'i' } },
          { assoc_affiliate_lead_id: { $regex: searchText, $options: 'i' } }
        ]
      }).select('client_id');
      const handlerClientIds = handlers.map(handler => handler.client_id);

      clientIds = [...new Set([
        ...nameClientIds,
        ...contactClientIds,
        ...handlerClientIds
      ])];

      if (clientIds.length > 0) {
        filter._id = { $in: clientIds };
      } else {
        filter._id = null; 
      }
    }
    
    const totalCount = await ClientDetails.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    const clients = await ClientDetails.find(filter)
      .populate('main_account_id', 'name')
      .populate('roles_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const clientsWithDetails = await Promise.all(
      clients.map(async (client) => {
        const [contacts, accountHandlers, connections] = await Promise.all([
          ClientContacts.find({ client_id: client._id })
            .select('first_name last_name email is_main_contact status'),
          ClientAccountHandlers.findOne({ client_id: client._id })
            .select('-created_at -updated_at'),
          ClientConnections.find({ client_id: client._id })
            .select('network value is_primary ordering is_backed_data_synced')
        ]);

        let searchMatches = {};
        if (searchText) {
          const matchedContacts = contacts.filter(contact =>
            contact.email.toLowerCase().includes(searchText.toLowerCase()) ||
            contact.first_name.toLowerCase().includes(searchText.toLowerCase()) ||
            contact.last_name.toLowerCase().includes(searchText.toLowerCase())
          );

          let matchedHandlers = [];
          if (accountHandlers) {
            matchedHandlers = findMatchingHandlers(accountHandlers, searchText);
          }

          searchMatches = {
            searchText: searchText,
            matchedContacts,
            matchedHandlers
          };
        }

        return {
          clientDetails: client,
          contacts,
          accountHandlers,
          connections,
          ...(searchText && { searchMatches })
        };
      })
    );

    const activeCount = await ClientDetails.countDocuments({ ...filter, status: 'active' });
    const inactiveCount = await ClientDetails.countDocuments({ ...filter, status: 'inactive' });

    const response = {
      status_code: 200,
      success: true,
      message: searchText ? 'Clients search completed successfully' : 'Clients fetched successfully',
      data: {
        count: clientsWithDetails.length,
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        page: parseInt(page),
        totalPages,
        ...(searchText && { searchText }),
        clients: clientsWithDetails
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in fetching clients',
      data: error.message
    });
  }
};

const findMatchingHandlers = (accountHandlers, searchText) => {
  const matches = [];
  const searchLower = searchText.toLowerCase();

  const handlerFields = [
    { field: 'am_id', label: 'Account Manager' },
    { field: 'assoc_am_id', label: 'Associate Account Manager' },
    { field: 'past_am_id', label: 'Past Account Manager' },
    { field: 'paid_social_id', label: 'Paid Social Lead' },
    { field: 'assoc_paid_social_id', label: 'Associate Paid Social Lead' },
    { field: 'paid_search_id', label: 'Paid Search Lead' },
    { field: 'assoc_paid_search_id', label: 'Associate Paid Search Lead' },
    { field: 'design_lead_id', label: 'Design Lead' },
    { field: 'assoc_design_lead_id', label: 'Associate Design Lead' },
    { field: 'email_lead_id', label: 'Email Lead' },
    { field: 'assoc_email_lead_id', label: 'Associate Email Lead' },
    { field: 'affiliate_lead_id', label: 'Affiliate Lead' },
    { field: 'assoc_affiliate_lead_id', label: 'Associate Affiliate Lead' }
  ];

  handlerFields.forEach(({ field, label }) => {
    const handlers = accountHandlers[field] || [];
    handlers.forEach(handler => {
      if (handler.toLowerCase().includes(searchLower)) {
        matches.push({ field, label, value: handler });
      }
    });
  });

  return matches;
};

export const getClientById = async (req, res) => {
  try {
    const { clientId } = req.params;

    const clientDetails = await ClientDetails.findById(clientId)
      .populate('main_account_id', 'name')
      .populate('roles_id', 'name')

    if (!clientDetails) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const contacts = await ClientContacts.find({ client_id: clientId });
    const accountHandlers = await ClientAccountHandlers.findOne({ client_id: clientId });
    const connections = await ClientConnections.find({ client_id: clientId });
    const logs = await ClientAccountLogs.find({ client_id: clientId }).sort({ created_at: -1 });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client fetched successfully',
      data: {
        clientDetails,
        contacts,
        accountHandlers,
        connections,
        logs
      }
    });
  } catch (error) {
    console.error('Get client error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in fetching client',
      data: error.message
    });
  }
};

// Delete Client (Temporary Delete - change status to inactive)
export const deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type } = req.body; 

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    if (type === 'soft') {
      client.status = 'inactive';
      await client.save();

      const clientAccountLog = new ClientAccountLogs({
        clientId: clientId,
        type: 'deleted',
        status: 'inactive',
      });

      await clientAccountLog.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Client marked as inactive successfully',
        data: null
      });
    } 
    else if (type === 'permanent') {
      await Promise.all([
        ClientDetails.findByIdAndDelete(clientId),
        ClientContacts.deleteMany({ client_id: clientId }),
        ClientAccountHandlers.findOneAndDelete({ client_id: clientId }),
        ClientConnections.deleteMany({ client_id: clientId })
      ]);
      await ClientAccountLogs.deleteMany({client_id: clientId });
      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Client and all related data deleted permanently',
        data: null
      });
    } 
    else {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid delete type. Use "soft" or "permanent"',
        data: null
      });
    }

  } catch (error) {
    console.error('Delete client error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in deleting client',
      data: error.message
    });
  }
};
// Reset Password and Send Login Info
export const resetPasswordAndSendLogin = async (req, res) => {
  try {
    const { contactId } = req.params;

    const contact = await ClientContacts.findById(contactId);
    if (!contact) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Contact not found',
        data: null
      });
    }
    const newPassword = generateSecurePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    contact.password = hashedPassword;
    await contact.save();
    const emailSent = await sendLoginEmail(contact.email, newPassword);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: emailSent
        ? 'Password reset successful. Login information sent to client.'
        : 'Password reset successful but failed to send email.',
      data: {
        contactId: contact._id,
        email: contact.email,
        emailSent
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in resetting password',
      data: error.message
    });
  }
};
// Get Change Logs by Date
export const getChangeLogs = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Date is required. Format: YYYY-MM-DD',
        data: null
      });
    }

    const selectedDate = new Date(date);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await ClientAccountLogs.find({
      created_at: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate({
        path: 'clientId',
        select: 'name type status'
      })
      .sort({ created_at: -1 });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Change logs fetched successfully',
      data: {
        date: selectedDate.toISOString().split('T')[0],
        count: logs.length,
        logs
      }
    });

  } catch (error) {
    console.error('Get change logs error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in fetching change logs',
      data: error.message
    });
  }
};
// Delete Contact
export const deleteContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    // Check if contact exists
    const contact = await ClientContacts.findById(contactId);
    if (!contact) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Contact not found',
        data: null
      });
    }

    // Check if this is the main contact
    if (contact.is_main_contact) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Cannot delete main contact',
        data: null
      });
    }

    const remainingContacts = await ClientContacts.countDocuments({
      client_id: contact.client_id
    });

    if (remainingContacts <= 1) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client must have at least one contact',
        data: null
      });
    }

    // Delete the contact
    await ClientContacts.findByIdAndDelete(contactId);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Contact deleted successfully',
      data: {
        contactId: contactId,
        clientId: contact.client_id
      }
    });

  } catch (error) {
    console.error('Delete contact error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in deleting contact',
      data: error.message
    });
  }
};