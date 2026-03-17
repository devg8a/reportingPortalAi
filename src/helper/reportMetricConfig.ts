export const REPORT_METRICS = {
    shopify: {
        metrics: [
            'orders',
            'gross_sales',
            'discounts',
            'revenue',
            'sessions',
            'conv_rate',
            'aov',
            'discount_per',
            'google_cost',
            'meta_cost',
            'total_cost',
            'cost_per_session',
            'roas'
        ],
        rawMetrics: [
            'orders',
            'gross_sales',
            'discounts',
            'revenue',
            'sessions',
            'google_cost',
            'meta_cost',
            'total_cost'
        ]
    },

    meta: {
        metrics: [
            'impressions',
            'clicks',
            'outboundclicks',
            'octr',
            'cpoc',
            'spend',
            'revenue',
            'orders',
            'cvr',
            'aov',
            'roas'
        ],
        rawMetrics: ['impressions', 'clicks', 'outboundclicks', 'spend', 'revenue', 'orders']
    },

    adword: {
        metrics: ['impressions', 'clicks', 'spend', 'revenue', 'orders', 'ctr', 'cpc', 'cvr', 'aov', 'roas'],
        rawMetrics: ['impressions', 'clicks', 'spend', 'revenue', 'orders']
    },

    bing: {
        metrics: ['impressions', 'clicks', 'spend', 'revenue', 'orders', 'ctr', 'cpc', 'cvr', 'aov', 'roas'],
        rawMetrics: ['impressions', 'clicks', 'spend', 'revenue', 'orders']
    },

    criteo: {
        metrics: ['impressions', 'clicks', 'orders', 'spend', 'revenue', 'ctr', 'cpc', 'cvr', 'aov', 'roas'],
        rawMetrics: ['impressions', 'clicks', 'spend', 'revenue', 'orders']
    },

    ga: {
        metrics: [
            'orders',
            'revenue',
            'sessions',
            'conv_rate',
            'aov',
            'google_cost',
            'meta_cost',
            'total_cost',
            'cost_per_session',
            'roas'
        ],
        rawMetrics: ['orders', 'revenue', 'sessions', 'google_cost', 'meta_cost', 'total_cost']
    },

    ga_acquisition: {
        metrics: [
            'sessions',
            'revenue',
            'bounce_rate',
            'avg_engagement_time_per_session',
            'conv_rate',
            'new_users'
        ]
    },

    klaviyo: {
        email: { countKey: 'no_of_emails', metrics: ['no_of_emails', 'revenue', 'recipients', 'open_rate', 'click_rate'] },
        sms: { countKey: 'no_of_sms', metrics: ['no_of_sms', 'revenue', 'recipients', 'open_rate', 'click_rate'] },
        flow: { countKey: 'no_of_flows', metrics: ['no_of_flows', 'revenue', 'recipients', 'open_rate', 'click_rate'] }
    }
} as const;