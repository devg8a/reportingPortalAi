import mongoose from "mongoose"

const goalSchema = new mongoose.Schema({
    client_id: {
        type: String, 
    },
    year_month: {
        type: String
    },
    paid_spend_goal: {
        type: Number,
    },
    paid_yoy_revenue: {
        type: Number,
    },
    paid_yoy_growth_rate: {
        type: Number,
    },
    paid_projected_revenue: {
        type: Number,
    },
    paid_am_Projected_revenue: {
        type: Number,
    },
    paid_measurement_channel:  [{
         type: String,
  }],
    paid_marketing_pct: {
        type: Number,
    },
    paid_roas: {
        type: Number,
    },
    paid_site_spend_goal: {
        type: Number,
    },
    paid_site_yoy_revenue: {
        type: Number,
    },
    paid_site_yoy_growth_rate: {
        type: Number,
    },
    paid_site_projected_revenue: {
        type: Number,
    },
    paid_site_am_projected_revenue: {
        type: Number,
    },
    paid_site_measurement_channel: {
        type: String
    },
    paid_site_marketing_pct: {
        type: Number,
    },
    paid_site_roas: {
        type: Number,
    },
    paid_spend_type:  [{
         type: String,
  }],
    paid_meta_spend_pct: {
        type: Number,
    },
    paid_google_spend_pct: {
        type: Number,
    },
    paid_bing_spend_pct: {
        type: Number,
    },
    paid_criteo_spend_pct: {
        type: Number,
    },
    paid_roas_up_increase_pct: {
        type: Number,
    },
    paid_roas_down_adjust_pct: {
        type: Number,
    },
    affSite_yoy_revenue: {
        type: Number,
    },
    affSite_yoy_growth_rate: {
        type: Number,
    },
    affSite_projected_revenue: {
        type: Number,
    },
    affSite_am_projected_revenue: {
        type: Number,
    },
    affSite_measurement_channel: {
        type: String
    },
    aff_yoy_revenue: {
        type: Number,
    },
    aff_yoy_growth_rate: {
        type: Number,
        default: 0
    },
    aff_projected_revenue: {
        type: Number,
    },
    aff_am_projected_revenue: {
        type: Number,
    },
    aff_measurement_channel: {
        type: String
    },
    aff_projected_roas: {
        type: Number,
    },
    aff_actual_revenue: {
        type: Number,
    },
    aff_actual_spend: {
        type: Number,
    },
    aff_actual_roas: {
        type: Number,
    },
    aff_account_type: {
        type: String
    },
    aff_full_network_goal: {
        type: Number,
    },
    aff_outreach_goal: {
        type: Number,
    },
    aff_intro_am_goal: {
        type: Number,
    },
    aff_conv_rate_goal: {
        type: Number,
    },
    aff_conversations_goal: {
        type: Number,
    },
    aff_published_goal: {
        type: Number,
    },
    clockify_goal: {
        type: Number,
    },

    account_priority:  [{
         type: String,
  }],
    notes: {
        type: String
    }

}, {
    timestamps: true,
    versionKey: false,
});

const projectionGoals = mongoose.model('projection_goals', goalSchema);
export default projectionGoals;