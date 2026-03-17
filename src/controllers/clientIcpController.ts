import Client from '../db/models/clientIcp';

export const createClient = async (req, res) => {
  try {
    const {
      client_id,
      monday_id,
      name,
      category,
      type,
      start_date,
      termination_date,
      website,
      starter_professional,
      lead_account_manager,
      account_manager,
      out_reach_specialist,
      design_lead,
      paid_social_lead,
      assoc_paid_social_lead,
      paid_search_lead,
      assoc_paid_search_lead,
      email_lead,
      assoc_email_lead,
      access,
      affiliate_network,
      program_id,
      sign_up_link,
      base_line_cpa,
      editorial_cpa,
      alias,
      sample_status,
      brand_description,
      excluded_partners_tag,
      bdr_lead_source,
      closer,
      payment_method,
      contract_commission_rate,
      contract_term,
      contract_mrr,
      geo,
      total_management_fee_invoiced_to_date,
      total_management_fee_paid_to_date,
      total_commission_fee_invoiced_to_date,
      total_commission_fee_paid_to_date,
      sub_items,
      reason
    } = req.body;

    // Check if client already exists with same monday_id
    const existingClient = await Client.findOne({ monday_id });
    if (existingClient) {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Client with this Monday ID already exists',
        data: null
      });
    }

    // Create new client
    const newClient = new Client({
      client_id,
      monday_id,
      name,
      category,
      type,
      start_date,
      termination_date,
      website,
      starter_professional,
      lead_account_manager,
      account_manager,
      out_reach_specialist,
      design_lead,
      paid_social_lead,
      assoc_paid_social_lead,
      paid_search_lead,
      assoc_paid_search_lead,
      email_lead,
      assoc_email_lead,
      access,
      affiliate_network,
      program_id,
      sign_up_link,
      base_line_cpa,
      editorial_cpa,
      alias,
      sample_status,
      brand_description,
      excluded_partners_tag,
      bdr_lead_source,
      closer,
      payment_method,
      contract_commission_rate,
      contract_term,
      contract_mrr,
      geo,
      total_management_fee_invoiced_to_date: total_management_fee_invoiced_to_date || 0,
      total_management_fee_paid_to_date: total_management_fee_paid_to_date || 0,
      total_commission_fee_invoiced_to_date: total_commission_fee_invoiced_to_date || 0,
      total_commission_fee_paid_to_date: total_commission_fee_paid_to_date || 0,
      sub_items: sub_items || [],
      reason,
    });

    await newClient.save();

    return res.status(201).json({
      status_code: 201,
      success: true,
      message: 'Client created successfully',
      data: newClient
    });
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in creating client',
      data: error.message
    });
  }
};

// Get all clients
export const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find()
      .sort({ created_at: -1 });

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Clients fetched successfully',
      data: {
        count: clients.length,
        clients: clients
      }
    });
  } catch (error) {
    console.error('Get all clients error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in fetching clients',
      data: error.message
    });
  }
};

// Get client by ID
export const getClientById = async (req, res) => {
  try {
    console.log("icoconsnnnnnnn")
    const { clientId } = req.params;

    const client = await Client.findById(clientId)

    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client fetched successfully',
      data: client
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

// Update client
export const updateClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const updateData = req.body;

    // Check if updateData exists
    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({
        status_code: 400,
        success: false,
        message: 'Invalid update data',
        data: null
      });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    // Remove fields that shouldn't be updated
    if (updateData._id) delete updateData._id;
    if (updateData.client_id) delete updateData.client_id;
    if (updateData.created_at) delete updateData.created_at;

    // Update client
    Object.assign(client, updateData);
    await client.save();

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client updated successfully',
      data: client
    });
  } catch (error) {
    console.error('Update client error:', error);
    return res.status(422).json({
      status_code: 422,
      success: false,
      message: 'Error in updating client',
      data: error.message
    });
  }
};

// Delete client
export const deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(422).json({
        status_code: 422,
        success: false,
        message: 'Client not found',
        data: null
      });
    }

    await Client.findByIdAndDelete(clientId);

    return res.status(200).json({
      status_code: 200,
      success: true,
      message: 'Client deleted successfully',
      data: null
    });
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