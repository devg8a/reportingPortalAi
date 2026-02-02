import mongoose from 'mongoose';

const clientIcpSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client_details',
        default: null
    },
    monday_id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'null'
    },
    type: {
        type: String,
        default: 'affiliate'
    },
    start_date: {
        type: Date,
        required: true
    },
    termination_date: {
        type: Date,
        default: null
    },
    website: {
        type: String
    },
    starter_professional: {
        type: String,
        default: null
    },
    lead_account_manager: {
        type: String
    },
    account_manager: {
        type: String
    },
    out_reach_specialist: {
        type: String,
        default: null
    },
    design_lead: {
        type: String
    },
    paid_social_lead: {
        type: String
    },
    assoc_paid_social_lead: {
        type: String
    },
    paid_search_lead: {
        type: String
    },
    assoc_paid_search_lead: {
        type: String
    },
    email_lead: {
        type: String
    },
    assoc_email_lead: {
        type: String
    },
    access: {
        type: String,
        default: null
    },
    affiliate_network: {
        type: String,
        default: null
    },
    program_id: {
        type: String,
        default: null
    },
    sign_up_link: {
        type: String,
        default: null
    },
    base_line_cpa: {
        type: String,
        default: null
    },
    editorial_cpa: {
        type: String,
        default: null
    },
    alias: {
        type: String,
        default: null
    },
    sample_status: {
        type: String,
        default: null
    },
    brand_description: {
        type: String,
        default: null
    },
    excluded_partners_tag: {
        type: String,
        default: null
    },
    bdr_lead_source: {
        type: String,
        default: null
    },
    closer: {
        type: String,
        default: null
    },
    payment_method: {
        type: String,
        default: null
    },
    contract_commission_rate: {
        type: String
    },
    contract_term: {
        type: String,
    },
    contract_mrr: {
        type: Number
    },
    geo: {
        type: String,
        default: null
    },
    total_management_fee_invoiced_to_date: {
        type: Number,
        default: 0
    },
    total_management_fee_paid_to_date: {
        type: Number,
        default: 0
    },
    total_commission_fee_invoiced_to_date: {
        type: Number,
        default: 0
    },
    total_commission_fee_paid_to_date: {
        type: Number,
        default: 0
    },
    sub_items: [{
        type: Object
    }],
    reason: {
        type: String,
        default: null
    },
},{
    timestamps: true,
    versionKey: false,
});

const ClientIcp = mongoose.model("client_icps",clientIcpSchema); 

export default ClientIcp;