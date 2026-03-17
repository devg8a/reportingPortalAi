import mongoose from 'mongoose';

const clientIcpSchema = new mongoose.Schema({
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client_details',
        default: null
    },
    category: {
        type: String,
        default: 'null'
    },
    access: {
        type: String,
        default: null
    },//stores paid media network names
    affiliate_network: {
        type: String,
        default: null
    },//stores affiliate network names
    multiple_networks :{
        type: String,
        default: null
    }, //stores multiple networks
    program_id: {
        type: String,
        default: null
    },
    sign_up_link: {
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
    reason: {
        type: String,
        default: null
    },
    company_size_in_revenue: {
        type: String,
        default: null
    },
    employee_count: {
        type: String,
        default: null
    },
    b2B_or_b2C: {
        type: String,
        default: null
    },
    app_services_retail: {
        type: String,
        default: null
    },
    primary_region: {
        type: String,
        default: null
    },
    organic_traffic_before_we_start_with_them: {
        type: String,
        default: null
    },
    before_start_with_them:{
        type:String,
        default: null
    },
    at_time_of_loss:{
        type:String,
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
},{
    timestamps: true,
    versionKey: false,
});

const ClientIcp = mongoose.model("client_icps",clientIcpSchema); 

export default ClientIcp;