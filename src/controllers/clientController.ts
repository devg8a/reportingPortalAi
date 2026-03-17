import ClientDetails from '../db/models/clientDetails';
import ClientContacts from '../db/models/clientContacts';
import ClientAccountHandlers from '../db/models/clientAccountHandlers';
import ClientConnections from '../db/models/clientConnections';
import ClientAccountLogs from '../db/models/clientAccountLogs';
import ClientBenchmarkSetting from '../db/models/benchmarkSetting';
import ClientIcp from '../db/models/clientIcp';
import User from '../db/models/user';
import bcrypt from 'bcryptjs';
import { generateSecurePassword, sendUserLoginInformation } from '../services/emailService';
import mongoose, { Types } from 'mongoose';
import projectionGoals from '../db/models/projectionGoals';
import clientContacts from '../db/models/clientContacts';
import { getMongoDbObjectId } from "../helper/helper";

export const createClient = async (req, res) => {
  try {
    const {
      name,
      type,
      is_main_account,
      main_account_id,
      status,
      monday_board_id,
      website_url,
      role_id,
      email_notification,
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
      monday_calender_id
    } = req.body;

    let clientProfilePic = null;
    if (req.file) {
      if (!req.file.buffer) {
        console.error('File buffer is undefined!');
      } else {
        const base64Image = req.file.buffer.toString('base64');
        clientProfilePic = `data:${req.file.mimetype};base64,${base64Image}`;

        // Check size
        if (clientProfilePic.length > 1000000) {
          return res.status(400).json({
            status_code: 400,
            success: false,
            message: 'Profile picture too large. Max size is 1MB.',
            data: null
          });
        }
      }
    }
    else if (req.body.profile_pic) {
      clientProfilePic = req.body.profile_pic;
      if (clientProfilePic.length > 1000000) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Profile picture too large. Max size is 1MB.',
          data: null
        });
      }
    }

    // Check for duplicate main contact email before creating client
    if (contacts && contacts.length > 0) {
      const mainContact = contacts.find(contact => contact.is_main_contact === true);

      if (mainContact && mainContact.email) {
        // Check if a main contact with the same email already exists
        const existingMainContact = await ClientContacts.findOne({
          email: mainContact.email,
          is_main_contact: true
        });

        if (existingMainContact) {
          return res.status(400).json({
            status_code: 400,
            success: false,
            message: `${mainContact.email} already exists. Please use a different email for the main contact.`,
            data: null
          });
        }
      }
    }

    // Create Client Details
    const clientDetails = new ClientDetails({
      name,
      type,
      is_main_account: is_main_account || false,
      main_account_id: is_main_account ? null : main_account_id,
      status: status || 'active',
      monday_board_id,
      start_date: new Date(),
      website_url,
      email_notification,
      role_id,
      quickbook_configuration: quickbook_configuration || {},
      setting: setting || {},
      profile_pic: clientProfilePic,
      monday_calender_id
    });
    await clientDetails.save();

    const createdContacts = [];
    if (contacts && contacts.length > 0) {
      // Check for duplicate emails among all contacts (including main and additional)
      const contactEmails = contacts.map(contact => contact.email).filter(Boolean);
      const duplicateEmails = contactEmails.filter((email, index) => contactEmails.indexOf(email) !== index);

      if (duplicateEmails.length > 0) {
        // Delete the client that was just created
        await ClientDetails.findByIdAndDelete(clientDetails._id);

        return res.status(422).json({
          status_code: 422,
          success: false,
          message: `Duplicate email(s) found in contacts: ${duplicateEmails.join(', ')}. Each contact must have a unique email.`,
          data: null
        });
      }

      // Check if any contact email already exists in the database
      for (const contact of contacts) {
        if (contact.email) {
          const existingContact = await ClientContacts.findOne({
            email: contact.email
          });

          if (existingContact) {
            // Delete the client that was just created
            await ClientDetails.findByIdAndDelete(clientDetails._id);

            return res.status(400).json({
              status_code: 400,
              success: false,
              message: `Email ${contact.email} already exists in the system. Please use a different email.`,
              data: null
            });
          }
        }
      }

      // Create contacts if all checks pass
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
          is_invitation_sent: false,
          status: contact.status || 'active',
          email_notification_preference: contact.email_notification_preference || false,
        });
        await clientContact.save();
        createdContacts.push(clientContact);
      }
    }

    // const noAmUserId = User.find({email:"mohit+noam@group8a.com"}).select("_id").lean();
    const noAmUserId = await User.findOne({ email: "mohit+noam@group8a.com" }).select("_id").lean();
    const clientAccountHandlers = new ClientAccountHandlers({
      client_id: clientDetails._id,
      am_id: noAmUserId || [],
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

    const clientAccountLog = new ClientAccountLogs({
      client_id: clientDetails._id,
      am_id: noAmUserId || [],
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
      type: type,
      status: status || 'active',
    });
    await clientAccountLog.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client Created successfully',
      data: {
        clientDetails,
        contacts: createdContacts,
        accountHandlers: clientAccountHandlers
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
  try {
    const { clientId } = req.params;
    const updateData = req.body;
    // console.log(updateData, "kajajjaja")

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
      benchmarkSettings,
      ...otherData
    } = updateData;
    const updatedData: any = {};

    // Update ClientDetails
    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }
    const oldType = client.type;
    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      otherData.profile_pic = `data:${req.file.mimetype};base64,${base64Image}`;

      if (otherData.profile_pic.length > 1000000) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Profile picture too large. Max size is 1MB.',
          data: null
        });
      }
    } else if (otherData.profile_pic === null || otherData.profile_pic === 'null') {
      otherData.profile_pic = null;
    }

    // Update quickbook configuration
    if (otherData.quickbook_configuration) {
      if (!client.quickbook_configuration) {
        client.quickbook_configuration = otherData.quickbook_configuration;
      } else {
        Object.assign(client.quickbook_configuration, otherData.quickbook_configuration);
      }
      delete otherData.quickbook_configuration;
    }

    // Update settings
    if (otherData.setting) {
      if (!client.setting) {
        client.setting = otherData.setting;
      } else {
        Object.assign(client.setting, otherData.setting);
      }
      delete otherData.setting;
    }

    // Remove fields that shouldn't be updated directly
    const { _id, created_at, email, ...dataToUpdate } = otherData;

    // Update client details
    Object.assign(client, dataToUpdate);
    if (clientDetails) {
      Object.assign(client, clientDetails);
    }

    await client.save();
    updatedData.client = client;

    // 👇 YEH CODE ADD KARO - Main Account Update Logic
    if (otherData.main_account_id || dataToUpdate.main_account_id) {
      const mainAccountId = otherData.main_account_id || dataToUpdate.main_account_id;

      // Us client ko find karo aur is_main_account: true karo
      const mainClient = await ClientDetails.findById(mainAccountId);

      if (mainClient) {
        mainClient.is_main_account = true;
        await mainClient.save();
        updatedData.mainAccountUpdated = {
          _id: mainClient._id,
          name: mainClient.name,
          is_main_account: mainClient.is_main_account
        };
      }
    }

    const newType = client.type;
    // Update contacts
    if (contacts && Array.isArray(contacts)) {
      const updatedContacts = [];

      for (const contactData of contacts) {
        const { contactId, ...contactUpdate } = contactData;

        // Check email uniqueness for new contacts
        if (!contactId && contactUpdate.email) {
          const existingContact = await ClientContacts.findOne({
            email: contactUpdate.email,
            client_id: { $ne: clientId }
          });

          if (existingContact) {
            return res.status(400).json({
              status_code: 400,
              success: false,
              message: `Email ${contactUpdate.email} already exists for another contact`,
              data: null
            });
          }
        }

        // Check email uniqueness for existing contacts (if email is being changed)
        if (contactId && contactUpdate.email) {
          const existingContact = await ClientContacts.findOne({
            email: contactUpdate.email,
            _id: { $ne: contactId }
          });

          if (existingContact) {
            return res.status(400).json({
              status_code: 400,
              success: false,
              message: `Email ${contactUpdate.email} already exists for another contact`,
              data: null
            });
          }
        }

        if (contactId) {
          // Update existing contact
          const contact = await ClientContacts.findById(contactId);
          if (contact) {
            if (contactUpdate.password) {
              contactUpdate.password = await bcrypt.hash(contactUpdate.password, 10);
            }

            Object.assign(contact, contactUpdate);
            await contact.save();
            updatedContacts.push(contact);
          }
        } else {
          const newContact = new ClientContacts({
            client_id: clientId,
            ...contactUpdate
          });

          // console.log(newContact, "newcontacttt");

          // 🔹 Random 10-digit password generate karne ka function
          const generate10DigitCode = (): string => {
            return Array.from({ length: 10 }, () =>
              Math.floor(Math.random() * 10)
            ).join("");
          };

          // ✅ Agar password hai toh use karo, nahi toh random generate karo
          if (newContact.password) {
            // Frontend se password aaya hai - use hash karo
            newContact.password = await bcrypt.hash(newContact.password, 10);
          } else {
            // ❌ Password nahi hai - random generate karo
            const randomPassword = generate10DigitCode();
            // console.log(`Generated random password for ${newContact.email}: ${randomPassword}`);
            newContact.password = await bcrypt.hash(randomPassword, 10);
          }
          await newContact.save();
          updatedContacts.push(newContact);
        }
      }

      updatedData.contacts = updatedContacts;
    }

    // Update account handlers
    if (accountHandlers) {
      let accountHandler = await ClientAccountHandlers.findOne({
        client_id: clientId
      });

      if (!accountHandler) {
        accountHandler = new ClientAccountHandlers({
          client_id: clientId,
          ...accountHandlers
        });
      } else {
        Object.assign(accountHandler, accountHandlers);
      }

      await accountHandler.save();
      updatedData.accountHandlers = accountHandler;
    }

    // Update benchmark settings (if provided)
    if (benchmarkSettings) {
      const { benchmarks } = benchmarkSettings;
      const date = new Date().toISOString().split("T")[0];


      if (!date) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Benchmark start date is required when providing benchmark settings',
          data: null
        });
      }

      // Check if benchmark setting with the same date already exists for this client
      let existingBenchmarkSetting = await ClientBenchmarkSetting.findOne({
        client_id: clientId,
        date: date
      });

      const defaultBenchmarks = {
        spend: {
          microdata: "",
          evergreen: "",
          promo1st: "",
          promo2nd: ""
        },
        cpoc: {
          microdata: "",
          evergreen: "",
          promo1st: "",
          promo2nd: ""
        },
        octr: {
          microdata: "",
          evergreen: "",
          promo1st: "",
          promo2nd: ""
        },
        roas: {
          microdata: "",
          evergreen: "",
          promo1st: "",
          promo2nd: ""
        },
        cpa: {
          microdata: "",
          evergreen: "",
          promo1st: "",
          promo2nd: ""
        }
      };

      if (existingBenchmarkSetting) {
        // Update existing benchmark setting for the same date
        if (benchmarks && typeof benchmarks === 'object') {
          const currentBenchmarks = existingBenchmarkSetting.benchmarks || {};

          existingBenchmarkSetting.benchmarks = {
            spend: {
              ...(currentBenchmarks as any).spend,
              ...benchmarks.spend,
            },
            cpoc: {
              ...(currentBenchmarks as any).cpoc,
              ...benchmarks.cpoc,
            },
            octr: {
              ...(currentBenchmarks as any).octr,
              ...benchmarks.octr,
            },
            roas: {
              ...(currentBenchmarks as any).roas,
              ...benchmarks.roas,
            },
            cpa: {
              ...(currentBenchmarks as any).cpa,
              ...benchmarks.cpa,
            },
          };
        }

        await existingBenchmarkSetting.save();
        updatedData.benchmarkSettings = existingBenchmarkSetting;
      } else {
        // Create new benchmark setting for new date
        const newBenchmarkSetting = new ClientBenchmarkSetting({
          client_id: clientId,
          date: date,
          benchmarks: benchmarks || defaultBenchmarks,
        });

        await newBenchmarkSetting.save();
        updatedData.benchmarkSettings = newBenchmarkSetting;
      }
    }

    const logType = oldType !== newType ? Array.isArray(newType) ? newType.join(',') : newType : 'updated';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await ClientAccountLogs.findOneAndUpdate(
      {
        client_id: clientId,
        // type: logType,
        createdAt: { $gte: today }, // same day match
      },
      {
        $set: { status: client.status, type: logType },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );


    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client details updated successfully.',
      data: updatedData
    });
  } catch (error) {
    console.error('Update client error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'An error occurred while updating the client.',
      data: error.message
    });
  }
};

// export const getClients = async (req, res) => {
//   try {
//     const {
//       searchText,
//       name,
//       type,
//       status,
//       email,
//       page = 1,
//       limit = 10
//     } = req.query;

//     const filter: any = {};
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     if (name) filter.name = { $regex: name, $options: 'i' };
//     if (status) filter.status = status;
//     if (type) {
//       if (Array.isArray(type)) {
//         filter.type = { $all: type };
//       } else {
//         filter.type = type;
//       }
//     }
//     let searchTerm = searchText;
//     if (Array.isArray(searchText)) {
//       searchTerm = searchText[searchText.length - 1];
//     }
//     if (searchTerm && searchTerm.trim()) {
//       let clientIds = [];
//       const searchTermStr = String(searchTerm).trim();
//       const searchLower = searchTermStr.toLowerCase();
//       const searchParts = searchTermStr.split(/\s+/).filter(part => part.length > 0);
//       const nameMatches = await ClientDetails.find({
//         name: { $regex: searchTermStr, $options: 'i' }
//       }).select('_id');
//       const nameClientIds = nameMatches.map(client => client._id);
//       const contactConditions: any[] = [
//         { email: { $regex: searchTermStr, $options: 'i' } },
//         { first_name: { $regex: searchTermStr, $options: 'i' } },
//         { last_name: { $regex: searchTermStr, $options: 'i' } }
//       ];
//       if (searchParts.length > 1) {
//         const fullNameRegex = searchParts.join('\\s+');
//         contactConditions.push({
//           $expr: {
//             $regexMatch: {
//               input: { $concat: ["$first_name", " ", "$last_name"] },
//               regex: searchTermStr,
//               options: "i"
//             }
//           }
//         });
//         const reversedNameRegex = searchParts.reverse().join('\\s+');
//         contactConditions.push({
//           $expr: {
//             $regexMatch: {
//               input: { $concat: ["$first_name", " ", "$last_name"] },
//               regex: reversedNameRegex,
//               options: "i"
//             }
//           }
//         });
//       }
//       const contacts = await ClientContacts.find({
//         $or: contactConditions
//       }).select('client_id');
//       const contactClientIds = contacts.map(contact => contact.client_id);
//       const connections = await ClientConnections.find({
//         $or: [
//           { network: { $regex: searchTermStr, $options: 'i' } },
//           { value: { $regex: searchTermStr, $options: 'i' } }
//         ]
//       }).select('client_id');
//       const connectionClientIds = connections.map(connection => connection.client_id);
//       const allHandlers = await ClientAccountHandlers.find({})
//         .populate('am_id', 'first_name last_name email')
//         .populate('assoc_am_id', 'first_name last_name email')
//         .populate('past_am_id', 'first_name last_name email')
//         .populate('paid_social_id', 'first_name last_name email')
//         .populate('assoc_paid_social_id', 'first_name last_name email')
//         .populate('paid_search_id', 'first_name last_name email')
//         .populate('assoc_paid_search_id', 'first_name last_name email')
//         .populate('design_lead_id', 'first_name last_name email')
//         .populate('assoc_design_lead_id', 'first_name last_name email')
//         .populate('email_lead_id', 'first_name last_name email')
//         .populate('assoc_email_lead_id', 'first_name last_name email')
//         .populate('affiliate_lead_id', 'first_name last_name email')
//         .populate('assoc_affiliate_lead_id', 'first_name last_name email')
//         .select('client_id');
//       const matchedHandlers = allHandlers.filter(handler => {
//         const handlerFields = [
//           'am_id', 'assoc_am_id', 'past_am_id', 'paid_social_id', 'assoc_paid_social_id',
//           'paid_search_id', 'assoc_paid_search_id', 'design_lead_id', 'assoc_design_lead_id',
//           'email_lead_id', 'assoc_email_lead_id', 'affiliate_lead_id', 'assoc_affiliate_lead_id'
//         ];
//         return handlerFields.some(field => {
//           const users = handler[field];
//           if (!users) return false;
//           const userArray = Array.isArray(users) ? users : [users];
//           return userArray.some(user => {
//             if (!user) return false;
//             const firstName = user.first_name || '';
//             const lastName = user.last_name || '';
//             const email = user.email || '';
//             if (firstName.toLowerCase().includes(searchLower) ||
//               lastName.toLowerCase().includes(searchLower) ||
//               email.toLowerCase().includes(searchLower)) {
//               return true;
//             }
//             if (searchParts.length > 1) {
//               const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
//               const reversedFullName = `${lastName} ${firstName}`.trim().toLowerCase();

//               const searchFull = searchParts.join(' ').toLowerCase();
//               const searchReversed = searchParts.reverse().join(' ').toLowerCase();

//               if (fullName.includes(searchFull) || fullName.includes(searchReversed) ||
//                 reversedFullName.includes(searchFull) || reversedFullName.includes(searchReversed)) {
//                 return true;
//               }
//             }

//             return false;
//           });
//         });
//       });
//       const handlerClientIds = matchedHandlers.map(handler => handler.client_id);
//       const userSearchConditions: any[] = [
//         { first_name: { $regex: searchTermStr, $options: 'i' } },
//         { last_name: { $regex: searchTermStr, $options: 'i' } },
//         { email: { $regex: searchTermStr, $options: 'i' } }
//       ];
//       if (searchParts.length > 1) {
//         userSearchConditions.push({
//           $expr: {
//             $regexMatch: {
//               input: { $concat: ["$first_name", " ", "$last_name"] },
//               regex: searchTermStr,
//               options: "i"
//             }
//           }
//         });
//       }
//       const users = await User.find({
//         $or: userSearchConditions
//       }).select('_id');

//       const userIds = users.map(user => user._id);
//       if (userIds.length > 0) {
//         const userBasedHandlers = await ClientAccountHandlers.find({
//           $or: [
//             { am_id: { $in: userIds } },
//             { assoc_am_id: { $in: userIds } },
//             { past_am_id: { $in: userIds } },
//             { paid_social_id: { $in: userIds } },
//             { assoc_paid_social_id: { $in: userIds } },
//             { paid_search_id: { $in: userIds } },
//             { assoc_paid_search_id: { $in: userIds } },
//             { design_lead_id: { $in: userIds } },
//             { assoc_design_lead_id: { $in: userIds } },
//             { email_lead_id: { $in: userIds } },
//             { assoc_email_lead_id: { $in: userIds } },
//             { affiliate_lead_id: { $in: userIds } },
//             { assoc_affiliate_lead_id: { $in: userIds } }
//           ]
//         }).select('client_id');
//         const userBasedClientIds = userBasedHandlers.map(handler => handler.client_id);
//         handlerClientIds.push(...userBasedClientIds);
//       }

//       clientIds = [...new Set([
//         ...nameClientIds,
//         ...contactClientIds,
//         ...handlerClientIds,
//         ...connectionClientIds
//       ])];

//       if (clientIds.length > 0) {
//         filter._id = { $in: clientIds };
//       } else {
//         const response = {
//           status_code: 200,
//           success: true,
//           message: searchTerm ? 'Clients search completed successfully' : 'Clients fetched successfully',
//           data: {
//             count: 0,
//             total: 0,
//             active: 0,
//             inactive: 0,
//             page: parseInt(page),
//             totalPages: 0,
//             ...(searchTerm && { searchText: searchTerm }),
//             clients: []
//           }
//         };
//         return res.status(200).json(response);
//       }
//     }
//     const totalCount = await ClientDetails.countDocuments(filter);
//     const totalPages = Math.ceil(totalCount / parseInt(limit));
//     const clients = await ClientDetails.find(filter)
//       .populate('main_account_id', 'name')
//       .populate('role_id', 'name')
//       .sort({ created_at: -1 })
//       .skip(skip)
//       .limit(parseInt(limit));
//     const clientsWithDetails = await Promise.all(
//       clients.map(async (client) => {
//         const [contacts, accountHandlers, connections] = await Promise.all([
//           ClientContacts.find({ client_id: client._id })
//             .select('first_name last_name email is_invitation_sent is_main_contact status'),
//           ClientAccountHandlers.findOne({ client_id: client._id })
//             .populate('am_id', 'first_name last_name email')
//             .populate('assoc_am_id', 'first_name last_name email')
//             .populate('past_am_id', 'first_name last_name email')
//             .populate('paid_social_id', 'first_name last_name email')
//             .populate('assoc_paid_social_id', 'first_name last_name email')
//             .populate('paid_search_id', 'first_name last_name email')
//             .populate('assoc_paid_search_id', 'first_name last_name email')
//             .populate('design_lead_id', 'first_name last_name email')
//             .populate('assoc_design_lead_id', 'first_name last_name email')
//             .populate('email_lead_id', 'first_name last_name email')
//             .populate('assoc_email_lead_id', 'first_name last_name email')
//             .populate('affiliate_lead_id', 'first_name last_name email')
//             .populate('assoc_affiliate_lead_id', 'first_name last_name email')
//             .select('-created_at -updated_at'),
//           ClientConnections.find({ client_id: client._id })
//             .select('network value is_primary ordering is_backed_data_synced')
//         ]);

//         let searchMatches = {};
//         if (searchTerm && searchTerm.trim()) {
//           const searchTermStr = String(searchTerm).trim();
//           const searchLower = searchTermStr.toLowerCase();
//           const searchParts = searchTermStr.split(/\s+/).filter(part => part.length > 0);
//           const matchedContacts = contacts.filter(contact => {
//             const firstName = contact.first_name || '';
//             const lastName = contact.last_name || '';
//             const email = contact.email || '';
//             const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
//             if (firstName.toLowerCase().includes(searchLower) ||
//               lastName.toLowerCase().includes(searchLower) ||
//               email.toLowerCase().includes(searchLower)) {
//               return true;
//             }
//             if (searchParts.length > 1) {
//               const searchFull = searchParts.join(' ').toLowerCase();
//               const searchReversed = searchParts.reverse().join(' ').toLowerCase();

//               if (fullName.includes(searchFull) || fullName.includes(searchReversed)) {
//                 return true;
//               }
//             }

//             return false;
//           });

//           let matchedHandlers: any[] = [];
//           if (accountHandlers) {
//             const handlerFields = [
//               { field: 'am_id', label: 'Account Manager' },
//               { field: 'assoc_am_id', label: 'Associate Account Manager' },
//               { field: 'past_am_id', label: 'Past Account Manager' },
//               { field: 'paid_social_id', label: 'Paid Social Lead' },
//               { field: 'assoc_paid_social_id', label: 'Associate Paid Social Lead' },
//               { field: 'paid_search_id', label: 'Paid Search Lead' },
//               { field: 'assoc_paid_search_id', label: 'Associate Paid Search Lead' },
//               { field: 'design_lead_id', label: 'Design Lead' },
//               { field: 'assoc_design_lead_id', label: 'Associate Design Lead' },
//               { field: 'email_lead_id', label: 'Email Lead' },
//               { field: 'assoc_email_lead_id', label: 'Associate Email Lead' },
//               { field: 'affiliate_lead_id', label: 'Affiliate Lead' },
//               { field: 'assoc_affiliate_lead_id', label: 'Associate Affiliate Lead' }
//             ];

//             handlerFields.forEach(({ field, label }) => {
//               const handlers = accountHandlers[field];
//               if (!handlers) return;
//               const handlerArray = Array.isArray(handlers) ? handlers : [handlers];
//               handlerArray.forEach(handler => {
//                 if (handler && typeof handler === 'object') {
//                   const firstName = handler.first_name || '';
//                   const lastName = handler.last_name || '';
//                   const email = handler.email || '';
//                   const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
//                   if (firstName.toLowerCase().includes(searchLower) ||
//                     lastName.toLowerCase().includes(searchLower) ||
//                     fullName.includes(searchLower) ||
//                     email.toLowerCase().includes(searchLower)) {
//                     matchedHandlers.push({
//                       field,
//                       label,
//                       user: {
//                         _id: handler._id,
//                         first_name: handler.first_name,
//                         last_name: handler.last_name,
//                         email: handler.email,
//                         name: fullName || handler.name
//                       }
//                     });
//                   }
//                   if (searchParts.length > 1) {
//                     const searchFull = searchParts.join(' ').toLowerCase();
//                     const searchReversed = searchParts.reverse().join(' ').toLowerCase();

//                     if (fullName.includes(searchFull) || fullName.includes(searchReversed)) {
//                       matchedHandlers.push({
//                         field,
//                         label,
//                         user: {
//                           _id: handler._id,
//                           first_name: handler.first_name,
//                           last_name: handler.last_name,
//                           email: handler.email,
//                           name: fullName || handler.name
//                         }
//                       });
//                     }
//                   }
//                 }
//               });
//             });
//           }

//           const matchedConnections = connections.filter(connection =>
//             connection.network?.toLowerCase().includes(searchLower) ||
//             connection.value?.toLowerCase().includes(searchLower)
//           );

//           const clientNameMatches = client.name?.toLowerCase().includes(searchLower);

//           searchMatches = {
//             searchText: searchTermStr,
//             matchedContacts,
//             matchedHandlers,
//             matchedConnections,
//             clientNameMatches
//           };
//         }

//         return {
//           clientDetails: client,
//           contacts,
//           accountHandlers,
//           connections,
//           ...(searchTerm && { searchMatches })
//         };
//       })
//     );

//     const activeCount = await ClientDetails.countDocuments({ ...filter, status: 'active' });
//     const inactiveCount = await ClientDetails.countDocuments({ ...filter, status: 'inactive' });

//     const response = {
//       status_code: 200,
//       success: true,
//       message: searchTerm ? 'Clients search completed successfully' : 'Clients fetched successfully',
//       data: {
//         count: clientsWithDetails.length,
//         total: totalCount,
//         active: activeCount,
//         inactive: inactiveCount,
//         page: parseInt(page),
//         totalPages,
//         ...(searchTerm && { searchText: searchTerm }),
//         ...(type && { filterTypes: Array.isArray(type) ? type : [type] }),
//         clients: clientsWithDetails
//       }
//     };

//     return res.status(200).json(response);

//   } catch (error) {
//     console.error('Get clients error:', error);
//     return res.status(422).json({
//       status_code: 422,
//       success: false,
//       message: 'Error in fetching clients',
//       data: error.message
//     });
//   }
// };

export const getClientById = async (req, res) => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      return res.status(401).json({
        status_code: 401,
        success: false,
        message: 'Client ID is required',
        data: null
      });
    }

    const client = await ClientDetails.findById(clientId)
      .populate('main_account_id', 'name')
      .populate('role_id', 'name');

    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    const [contacts, accountHandlers, benchmarkSettings, connections] = await Promise.all([
      ClientContacts.find({ client_id: client._id })
        .select('first_name last_name email is_invitation_sent is_main_contact status email_notification_preference'),
      ClientAccountHandlers.findOne({ client_id: client._id })
        .populate('am_id', 'first_name last_name email')
        .populate('assoc_am_id', 'first_name last_name email')
        .populate('past_am_id', 'first_name last_name email')
        .populate('paid_social_id', 'first_name last_name email')
        .populate('assoc_paid_social_id', 'first_name last_name email')
        .populate('paid_search_id', 'first_name last_name email')
        .populate('assoc_paid_search_id', 'first_name last_name email')
        .populate('design_lead_id', 'first_name last_name email')
        .populate('assoc_design_lead_id', 'first_name last_name email')
        .populate('email_lead_id', 'first_name last_name email')
        .populate('assoc_email_lead_id', 'first_name last_name email')
        .populate('affiliate_lead_id', 'first_name last_name email')
        .populate('assoc_affiliate_lead_id', 'first_name last_name email')
        .select('-created_at -updated_at'),
      ClientBenchmarkSetting.find({ client_id: client._id }),
      ClientConnections.find({ client_id: client._id, status: 'active' }).select('network')
    ]);

    const rawConnections = await ClientConnections.find({
      client_id: client._id,
      status: 'active'
    }).select('network');

    const fetchMainAccountContact = await clientContacts.findOne({
      client_id: client.main_account_id,
      is_main_contact: true
    }).select('first_name last_name email');

    // ❌ Remove ga & shopify
    const filtered = rawConnections.filter(
      (item) => !['ga', 'shopify'].includes(item.network)
    );

    // ✅ Keep only unique networks
    const uniqueConnections = [
      ...new Map(filtered.map(item => [item.network, item])).values()
    ];


    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client retrieved successfully',
      data: {
        clientDetails: client,
        contacts,
        accountHandlers,
        benchmarkSettings,
        connections: uniqueConnections,
        mainAccountContact: fetchMainAccountContact
      }
    });

  } catch (error) {
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
    const { type, action } = req.body;

    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }
    if (action === 'reactivate') {
      client.status = 'active';
      await client.save();

      const clientAccountLog = new ClientAccountLogs({
        clientId: clientId,
        type: 'reactivated',
        status: 'active',
      });

      await clientAccountLog.save();

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Client reactivated successfully',
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
        message: 'Client deactivated successfully',
        data: null
      });
    }
    else if (type === 'permanent') {
      await Promise.all([
        ClientContacts.deleteMany({ client_id: clientId }),
        ClientAccountHandlers.findOneAndDelete({ client_id: clientId }),
        ClientConnections.deleteMany({ client_id: clientId }),
        ClientAccountLogs.deleteMany({ client_id: clientId }),
        ClientBenchmarkSetting.deleteMany({ client_id: clientId }),
        ClientDetails.findByIdAndDelete(clientId),
        ClientIcp.findOneAndDelete({ client_id: clientId }),
        projectionGoals.findOneAndDelete({ client_id: clientId }),
      ]);

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'Client deleted successfully.',
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

    console.log(contactId, "copnatct iddd")
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
    contact.is_invitation_sent = true;
    await contact.save();
    const emailSent = await sendUserLoginInformation(contact.email, newPassword);
    console.log(emailSent, "emailSent")
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: emailSent
        ? 'Login information sent to client.'
        : 'Failed to send email.',
      data: {
        contactId: contact._id,
        email: contact.email,
        emailSent,
        is_invitation_sent: true
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
    const { clientId } = req.params;
    const {
      searchText = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
      month = "all",   // <-- NEW
    } = req.query;

    if (!clientId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client ID is required',
        data: null
      });
    }

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid Client ID format',
        data: null
      });
    }

    const query: any = {
      client_id: new mongoose.Types.ObjectId(clientId)
    };

    // MONTH filter: month = "1-2026", "12-2025", etc. | "all" => no filter
    if (month && month !== "all") {
      const [monthStr, yearStr] = String(month).split("-");
      const m = parseInt(monthStr, 10);
      const y = parseInt(yearStr, 10);

      if (!m || !y || m < 1 || m > 12) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Invalid month format. Use "M-YYYY", e.g. "1-2026".',
          data: null
        });
      }

      const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999); // last day of month

      query.createdAt = {
        $gte: startOfMonth,
        $lte: endOfMonth
      };
    }

    // Search filter
    if (searchText && searchText.trim() !== "") {
      const searchRegex = new RegExp(searchText, 'i');
      query.$or = [
        { type: searchRegex },
        { status: searchRegex }
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalLogs = await ClientAccountLogs.countDocuments(query);

    const sortOptions: Record<string, 1 | -1> = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy as string] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const logs = await ClientAccountLogs.find(query)
      .populate({
        path: 'client_id',
        select: 'name type status'
      })
      .populate('am_id', 'first_name last_name email type status profile_pic')
      .populate('assoc_am_id', 'first_name last_name email type status profile_pic')
      .populate('paid_social_id', 'first_name last_name email type status profile_pic')
      .populate('assoc_paid_social_id', 'first_name last_name email type status profile_pic')
      .populate('paid_search_id', 'first_name last_name email type status profile_pic')
      .populate('assoc_paid_search_id', 'first_name last_name email type status profile_pic')
      .populate('design_lead_id', 'first_name last_name email type status profile_pic')
      .populate('assoc_design_lead_id', 'first_name last_name email type status profile_pic')
      .populate('email_lead_id', 'first_name last_name email type status profile_pic')
      .populate('assoc_email_lead_id', 'first_name last_name email type status profile_pic')
      .populate('affiliate_lead_id', 'first_name last_name email type status profile_pic')
      .populate('assoc_affiliate_lead_id', 'first_name last_name email type status profile_pic')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Group logs by DATE (YYYY-MM-DD) as before
    const groupedByDate: Record<string, any[]> = {};
    logs.forEach(log => {
      const dateKey = log.createdAt
        ? new Date(log.createdAt).toISOString().split('T')[0]
        : 'Unknown Date';

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }

      groupedByDate[dateKey].push({
        _id: log._id,
        client_id: log.client_id,
        am_id: log.am_id,
        assoc_am_id: log.assoc_am_id,
        paid_social_id: log.paid_social_id,
        assoc_paid_social_id: log.assoc_paid_social_id,
        paid_search_id: log.paid_search_id,
        assoc_paid_search_id: log.assoc_paid_search_id,
        design_lead_id: log.design_lead_id,
        assoc_design_lead_id: log.assoc_design_lead_id,
        email_lead_id: log.email_lead_id,
        assoc_email_lead_id: log.assoc_email_lead_id,
        affiliate_lead_id: log.affiliate_lead_id,
        assoc_affiliate_lead_id: log.assoc_affiliate_lead_id,
        type: log.type,
        status: log.status,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt
      });
    });

    // All distinct createdAt dates (for filters)
    const allDates = await ClientAccountLogs.distinct('createdAt', {
      client_id: new mongoose.Types.ObjectId(clientId)
    });

    // Available days (YYYY-MM-DD) – same as pehle
    const availableDates = allDates
      .map((d: any) => new Date(d).toISOString().split('T')[0])
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // NEW: available months in "M-YYYY" format (for dropdown, etc.)
    const monthSet = new Set<string>();
    allDates.forEach((d: any) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = dt.getMonth() + 1; // 1-12
      monthSet.add(`${m}-${y}`);
    });

    const availableMonths = Array.from(monthSet).sort((a, b) => {
      const [ma, ya] = a.split("-").map(Number);
      const [mb, yb] = b.split("-").map(Number);
      if (ya !== yb) return yb - ya; // year desc
      return mb - ma;                // month desc
    });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Change logs fetched successfully',
      data: {
        clientId,
        totalLogs,
        logs,
        logsByDate: groupedByDate,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalLogs / limitNum),
          totalLogs,
          limit: limitNum
        },
        availableDates,   // per-day
        availableMonths   // per-month ("1-2026", "2-2026", ...)
      }
    });

  } catch (error) {
    console.error('Get change logs error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Error in fetching change logs',
      data: (error as Error).message
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

export const getConnectionsByClientId = async (req, res) => {
  try {
    const { clientId, network } = req.params;

    // 1. Validate clientId
    if (!clientId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client ID is required',
        data: null
      });
    }

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid Client ID format',
        data: null
      });
    }

    // 2. Check if client exists
    const client = await ClientDetails.findById(clientId);
    if (!client) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    // 3. If network is provided → Return full details of that network
    if (network) {
      const connections = await ClientConnections.find({
        client_id: clientId,
        network: network,
        // status: "active"
        status: { $ne: 'deleted', }
      })
        .select('-__v') // Exclude sensitive fields
        .sort({ ordering: 1, createdAt: -1 })
        .lean();

      if (!connections || connections.length === 0) {
        return res.status(404).json({
          status_code: 404,
          success: false,
          message: `No connections found for network: ${network}`,
          data: null
        });
      }

      return res.status(200).json({
        status_code: 200,
        success: true,
        message: `Connections for ${network} fetched successfully`,
        data: connections,
        count: connections.length
      });
    }

    // 4. If only clientId → Return unique networks with name & status only
    const networks = await ClientConnections.aggregate([
      {
        $match: {
          client_id: new mongoose.Types.ObjectId(clientId),
          status: "active"
        }
      },
      {
        $group: {
          _id: '$network',
          name: { $first: '$network' },
          status: { $first: '$status' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          status: 1,
          count: 1
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);
    const totalConnections = networks.reduce((sum, n) => sum + n.count, 0);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Networks fetched successfully',
      data: networks,
      totalNetworks: networks.length,
      totalConnections: totalConnections
    });

  } catch (error) {
    console.error('Get connections error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message
      })
    });
  }
};

export const getClientAccountHandlers = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { searchText } = req.query;

    if (!clientId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client ID is required',
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

    const accountHandlers = await ClientAccountHandlers.findOne({ client_id: clientId })
      .populate('am_id', 'first_name last_name email user_type')
      .populate('assoc_am_id', 'first_name last_name email user_type')
      .populate('past_am_id', 'first_name last_name email user_type')
      .populate('paid_social_id', 'first_name last_name email user_type')
      .populate('assoc_paid_social_id', 'first_name last_name email user_type')
      .populate('paid_search_id', 'first_name last_name email user_type')
      .populate('assoc_paid_search_id', 'first_name last_name email user_type')
      .populate('design_lead_id', 'first_name last_name email user_type')
      .populate('assoc_design_lead_id', 'first_name last_name email user_type')
      .populate('email_lead_id', 'first_name last_name email user_type')
      .populate('assoc_email_lead_id', 'first_name last_name email user_type')
      .populate('affiliate_lead_id', 'first_name last_name email user_type')
      .populate('assoc_affiliate_lead_id', 'first_name last_name email user_type')
      .lean();

    if (!accountHandlers) {
      return res.status(200).json({
        status_code: 200,
        success: true,
        message: 'No account handlers found for this client',
        data: {
          client_id: clientId,
          client_name: client.name,
          searchText: searchText || null,
          account_handlers: {
            am_id: [],
            assoc_am_id: [],
            past_am_id: [],
            paid_social_id: [],
            assoc_paid_social_id: [],
            paid_search_id: [],
            assoc_paid_search_id: [],
            design_lead_id: [],
            assoc_design_lead_id: [],
            email_lead_id: [],
            assoc_email_lead_id: [],
            affiliate_lead_id: [],
            assoc_affiliate_lead_id: []
          }
        }
      });
    }

    // Remove the client_id field from the result
    delete accountHandlers.client_id;

    // Apply search filter if searchText is provided
    if (searchText && searchText.trim()) {
      const searchTerm = searchText.trim().toLowerCase();
      const searchRegex = new RegExp(searchTerm, 'i');

      // Define all handler fields to search through
      const handlerFields = [
        'am_id',
        'assoc_am_id',
        'past_am_id',
        'paid_social_id',
        'assoc_paid_social_id',
        'paid_search_id',
        'assoc_paid_search_id',
        'design_lead_id',
        'assoc_design_lead_id',
        'email_lead_id',
        'assoc_email_lead_id',
        'affiliate_lead_id',
        'assoc_affiliate_lead_id'
      ];

      // Filter each handler field
      handlerFields.forEach(field => {
        if (accountHandlers[field] && Array.isArray(accountHandlers[field])) {
          accountHandlers[field] = accountHandlers[field].filter(user => {
            if (!user) return false;
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            const email = user.email || '';
            const userType = user.user_type || '';

            const fullName = `${firstName} ${lastName}`.toLowerCase();
            return firstName.toLowerCase().includes(searchTerm) ||
              lastName.toLowerCase().includes(searchTerm) ||
              fullName.includes(searchTerm) ||
              email.toLowerCase().includes(searchTerm) ||
              userType.toLowerCase().includes(searchTerm) ||
              searchRegex.test(firstName) ||
              searchRegex.test(lastName) ||
              searchRegex.test(email) ||
              searchRegex.test(userType);
          });
        }
      });
    }

    const response = {
      status_code: 200,
      success: true,
      message: 'Account handlers fetched successfully',
      data: {
        client_id: clientId,
        client_name: client.name,
        searchText: searchText || null,
        account_handlers: accountHandlers
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Get client account handlers error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};
export const deleteConnectionById = async (req, res) => {
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
    if (!mongoose.Types.ObjectId.isValid(connectionId)) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid connection ID format',
        data: null
      });
    }
    const connection = await ClientConnections.findOne({
      _id: connectionId,
      client_id: clientId
    });

    if (!connection) {
      return res.status(404).json({
        status_code: 404,
        success: false,
        message: 'Connection not found',
        data: null
      });
    }
    await ClientConnections.findByIdAndDelete(connectionId);
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Connection permanently deleted successfully',
      data: null
    });
  } catch (error) {
    console.error('Delete connection error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

export const fetchClientsall = async (req, res) => {
  try {
    const {
      searchText,
      name,
      am_id,
      operator_id,
      type,
      status = "active",
    } = req.query;

    const result = {
      clients: [],
      active: 0,
      inactive: 0,
      total: 0,
    };

    const matchStage: Record<string, any> = { status };
    if (searchText) {
      matchStage.name = {
        $regex: searchText?.trim(),
        $options: "i"
      };
    }
    if (type) {
      matchStage.type = {
        $regex: String(type)?.trim(),
        $options: "i"
      };
    }

    const handlerMatch: Record<string, any> = {};

    if (am_id) {
      handlerMatch.am_id = {
        $in: [String(am_id)?.trim()]
      };
    }

    if (operator_id) {
      const opId = String(operator_id)?.trim();

      handlerMatch.$or = [
        { assoc_am_id: opId },
        { assoc_paid_social_id: opId },
        { assoc_paid_search_id: opId },
        { assoc_design_lead_id: opId },
        { assoc_email_lead_id: opId },
        { assoc_affiliate_lead_id: opId }
      ];
    }

    result['clients'] = await ClientDetails.aggregate([
      { $match: matchStage },
      // HAS MANY → UNIQUE NETWORKS
      {
        $lookup: {
          from: "client_connections",
          let: { clientId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$client_id", "$$clientId"] }
              }
            },
            { $match: { status: "active" } },

            {
              $group: {
                _id: "$network",
                network: { $first: "$network" },
                status: { $first: "$status" }
              }
            },

            {
              $project: {
                _id: 0,
                name: "$network",
                type: "$status"
              }
            }
          ],
          as: "connections"
        }
      },

      // HAS ONE → ACCOUNT HANDLER
      {
        $lookup: {
          from: "client_account_handlers",
          let: { clientId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$client_id", "$$clientId"] }
              }
            },
            { $match: handlerMatch },
            { $limit: 1 }
          ],
          as: "account_handler"
        }
      },

      {
        $unwind: {
          path: "$account_handler",
          preserveNullAndEmptyArrays: !am_id && !operator_id
        }
      },
      {
        $addFields: {
          "account_handler.am_id": {
            $map: {
              input: { $ifNull: ["$account_handler.am_id", []] },
              as: "id",
              in: {
                $cond: [
                  { $eq: [{ $type: "$$id" }, "objectId"] },
                  "$$id",
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$$id", ""] },
                          { $ne: ["$$id", null] },
                          { $eq: [{ $strLenCP: "$$id" }, 24] }
                        ]
                      },
                      { $toObjectId: "$$id" },
                      "$$REMOVE"
                    ]
                  }

                ]
              }
            }
          }
        }

      },
      // RESOLVE am_id[] → users
      {
        $lookup: {
          from: "users",
          let: { amIds: "$account_handler.am_id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$amIds"] }
              }
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                full_name: {
                  $concat: ["$first_name", " ", "$last_name"]
                }
              }
            }
          ],
          as: "account_managers"
        }
      },
      {
        $lookup: {
          from: "client_contacts",
          let: { clientId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$client_id", "$$clientId"] },
                status: "active"
              }
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                email: 1,
                is_main_contact: 1,
                is_invitation_sent: 1
              }
            }
          ],
          as: "client_contacts"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          start_date: 1,
          termination_date: 1,
          profile_pic: 1,
          status: 1,
          connections: 1,
          account_managers: 1,
          client_contacts: 1,
          main_account_id: 1,

        }
      }
    ]);
    // const clientListData = []; 

    for (let client of result.clients) {
      if (client.main_account_id) {
        const mainContact = await ClientContacts.findOne({
          client_id: client.main_account_id,
          is_main_contact: true
        })
          .select("first_name last_name email")
          .lean();

        client.mainAccount = mainContact || {};
      } else {
        client.mainAccount = {};
      }
    }


    const status_count = await ClientDetails.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = { active: 0, inactive: 0 };
    status_count.forEach(item => {
      if (item._id === "active") counts.active = item.count;
      if (item._id === "inactive") counts.inactive = item.count;
    });
    result['active'] = counts.active;
    result['inactive'] = counts.inactive;
    const totalCount = result['clients']?.length || 0;
    result['total'] = totalCount;
    return res.status(200).json({ status_code: 200, success: true, message: 'Clients fetched successfully.', data: result });
  } catch (error) {
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching clients',
      data: error
    });
  }
}

export const fetchClients = async (req, res) => {
  try {
    const {
      searchText,
      name,
      am_id,
      operator_id,
      type,
      status = "active",
      page = 1,
      limit = 20
    } = req.query;

    const result = {
      clients: [],
      active: 0,
      inactive: 0,
      total: 0,
      page: parseInt(page),
    };

    const matchStage: Record<string, any> = { status };
    if (searchText) {
      matchStage.name = {
        $regex: searchText?.trim(),
        $options: "i"
      };
    }
    if (type) {
      const typeArray = Array.isArray(type)
        ? type.map(t => String(t).trim())
        : [String(type).trim()];

      if (typeArray.length === 1) {
        // Single type - simple regex
        matchStage.type = {
          $regex: typeArray[0],
          $options: "i"
        };
      } else {
        // Multiple types - ALL must match (AND condition)
        matchStage.type = {
          $all: typeArray.map(t => new RegExp(t, 'i'))
        };
      }
    }

    const handlerMatch: Record<string, any> = {};

    if (am_id) {
      handlerMatch.am_id = {
        $in: [getMongoDbObjectId(String(am_id)?.trim())]
      };
    }



    if (operator_id) {
      const opId = String(operator_id)?.trim();

      handlerMatch.$or = [
        { assoc_am_id: opId },
        { assoc_paid_social_id: opId },
        { assoc_paid_search_id: opId },
        { assoc_design_lead_id: opId },
        { assoc_email_lead_id: opId },
        { assoc_affiliate_lead_id: opId }
      ];
    }

    result['clients'] = await ClientDetails.aggregate([
      { $match: matchStage },

      // HAS MANY → UNIQUE NETWORKS
      {
        $lookup: {
          from: "client_connections",
          let: { clientId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$client_id", "$$clientId"] }
              }
            },
            { $match: { status: "active" } },
            {
              $group: {
                _id: "$network",
                network: { $first: "$network" },
                status: { $first: "$status" }
              }
            },
            {
              $project: {
                _id: 0,
                name: "$network",
                type: "$status"
              }
            }
          ],
          as: "connections"
        }
      },

      // HAS ONE → ACCOUNT HANDLER
      {
        $lookup: {
          from: "client_account_handlers",
          let: { clientId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$client_id", "$$clientId"] }
              }
            },
            { $match: handlerMatch },
            { $limit: 1 }
          ],
          as: "account_handler"
        }
      },

      {
        $unwind: {
          path: "$account_handler",
          preserveNullAndEmptyArrays: !am_id && !operator_id
        }
      },

      {
        $addFields: {
          "account_handler.am_id": {
            $map: {
              input: { $ifNull: ["$account_handler.am_id", []] },
              as: "id",
              in: {
                $cond: [
                  { $eq: [{ $type: "$$id" }, "objectId"] },
                  "$$id",
                  {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$$id", ""] },
                          { $ne: ["$$id", null] },
                          { $eq: [{ $strLenCP: "$$id" }, 24] }
                        ]
                      },
                      { $toObjectId: "$$id" },
                      "$$REMOVE"
                    ]
                  }
                ]
              }
            }
          }
        }
      },

      // RESOLVE am_id[] → users
      {
        $lookup: {
          from: "users",
          let: { amIds: "$account_handler.am_id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$amIds"] }
              }
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                full_name: {
                  $concat: ["$first_name", " ", "$last_name"]
                }
              }
            }
          ],
          as: "account_managers"
        }
      },

      // Client's own contacts
      {
        $lookup: {
          from: "client_contacts",
          let: { clientId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$client_id", "$$clientId"] },
                status: "active"
              }
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                email: 1,
                is_main_contact: 1,
                is_invitation_sent: 1
              }
            }
          ],
          as: "client_contacts"
        }
      },

      // 🆕 Lookup ALL contacts from main_account_id (parent account)
      {
        $lookup: {
          from: "client_contacts",
          let: { mainAccountId: "$main_account_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $ne: ["$$mainAccountId", null] },
                    { $eq: ["$client_id", "$$mainAccountId"] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                first_name: 1,
                last_name: 1,
                email: 1,
                is_main_contact: 1,
                is_invitation_sent: 1
              }
            }
          ],
          as: "parent_contacts"
        }
      },

      // 🆕 Restructure: mainAccount = main contact only, merge others into client_contacts
      {
        $addFields: {
          // mainAccount = single object with is_main_contact: true from parent
          mainAccount: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$parent_contacts",
                  as: "pc",
                  cond: { $eq: ["$$pc.is_main_contact", true] }
                }
              },
              0
            ]
          },
          // client_contacts = own contacts + parent contacts where is_main_contact: false
          client_contacts: {
            $concatArrays: [
              "$client_contacts",
              {
                $filter: {
                  input: "$parent_contacts",
                  as: "pc",
                  cond: { $eq: ["$$pc.is_main_contact", false] }
                }
              }
            ]
          }
        }
      },

      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: Number(limit) },

      {
        $project: {
          _id: 1,
          name: 1,
          type: 1,
          start_date: 1,
          termination_date: 1,
          profile_pic: 1,
          status: 1,
          connections: 1,
          account_managers: 1,
          client_contacts: 1,
          main_account_id: 1,
          mainAccount: 1  // Now a single object, not array
          // parent_contacts excluded from final output
        }
      }
    ]);

    // ✅ REMOVED the N+1 for loop - everything is now in the aggregation!

    // Fix total count calculation
    const countPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "client_account_handlers",
          let: { clientId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$client_id", "$$clientId"] } } },
            { $match: handlerMatch },
            { $limit: 1 }
          ],
          as: "account_handler"
        }
      },
      {
        $unwind: {
          path: "$account_handler",
          preserveNullAndEmptyArrays: !am_id && !operator_id
        }
      },
      { $count: "total" }
    ];

    const statusMatchStage: Record<string, any> = {};

    if (type) {
      statusMatchStage.type = {
        $regex: String(type)?.trim(),
        $options: "i"
      };
    }

    const statusCountResult = await ClientDetails.aggregate([
      { $match: statusMatchStage },

      {
        $lookup: {
          from: "client_account_handlers",
          let: { clientId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$client_id", "$$clientId"] } } },
            { $match: handlerMatch }, // ✅ am_id & operator_id yahi se filter honge
            { $limit: 1 }
          ],
          as: "account_handler"
        }
      },

      {
        $unwind: {
          path: "$account_handler",
          preserveNullAndEmptyArrays: !am_id && !operator_id
        }
      },

      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCountResult = await ClientDetails.aggregate(countPipeline);
    const totalCount = totalCountResult[0]?.total || 0;

    const counts = { active: 0, inactive: 0 };

    statusCountResult.forEach(item => {
      if (item._id === "active") counts.active = item.count;
      if (item._id === "inactive") counts.inactive = item.count;
    });

    result['active'] = counts.active;
    result['inactive'] = counts.inactive;
    result['total'] = totalCount;
    result['totalPages'] = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Clients fetched successfully.',
      data: result
    });

  } catch (error) {
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error fetching clients',
      data: error
    });
  }
}





export const checkContactEmail = async (req, res) => {
  try {
    // email ko query ya params se lo
    const email = (req.query.email || req.params.email || "").trim();
    const _id = req.query._id || req.params._id; // optional

    if (!email) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Email is required',
        data: null
      });
    }

    const filter: any = { email };

    // Agar _id aayi hai (update case) to us _id wale contact ko ignore karo
    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        return res.status(400).json({
          status_code: 400,
          success: false,
          message: 'Invalid _id format',
          data: null
        });
      }

      filter._id = { $ne: new mongoose.Types.ObjectId(_id) };
    }

    const existingContact = await ClientContacts.findOne(filter)
      .select('_id email client_id');

    if (existingContact) {
      // ❗ Yahan pe pehle res.status(400) tha – ab 200 kar diya
      return res.status(200).json({
        status_code: 400, // logical code ke liye
        success: true,    // ya false rakhna ho to bhi chalega, frontend ignore karega
        message: 'This email is already exists.',
        data: {
          exists: true,
          _id: existingContact._id,
          client_id: existingContact.client_id
        }
      });
    }

    // Email available hai
    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Email is available.',
      data: {
        exists: false
      }
    });

  } catch (error) {
    console.error('Check contact email error:', error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: 'Internal server error',
      data: error.message
    });
  }
};


export const bulkDisconnectNetwork = async (req, res) => {
  try {
    const { clientId, networkId, connected } = req.body;

    if (!clientId || !networkId) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: "clientId and networkId are required",
        data: null
      });
    }

    if (connected !== false) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: "Invalid operation. Only disconnect allowed.",
        data: null
      });
    }

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: "Invalid clientId format",
        data: null
      });
    }

    const result = await ClientConnections.updateMany(
      {
        client_id: clientId,
        network: networkId,
        status: { $ne: "inactive" }
      },
      {
        $set: { status: "inactive" }
      }
    );

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: "Network disconnected successfully",
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error("Bulk disconnect error:", error);
    return res.status(500).json({
      status_code: 500,
      success: false,
      message: "Internal server error",
      data: error.message
    });
  }
};


