
export const DEFAULT_NETWORKS: string[] = [
  "shopify",
  "ga",
  "meta",
  "adword",
  "bing",
  "criteo",
  "klaviyo",
  "impact",
  "awin",
  "rakuten",
  "avantlink",
  "levanta",
  "cj",
  "pepperjam",
  "refersion"
];

export const MODULE_NETWORK_MAP: Record<string, string[]> = {
  divergence_report: [
    "shopify",
    "ga",
    "meta",
    "adword",
    "bing",
    "criteo",
    "klaviyo",
    // "impact",
    // "awin",
    // "rakuten",
    // "avantlink",
    // "levanta",
    // "cj",
    // "pepperjam",
    // "refersion"
  ],

  email_marketing: [
    'klaviyo'
  ],
  ad_approvals: [
    'meta'
  ]
};

export const NETWORK_RANGES = {
  SINGLE: ["shopify", "meta", "adword", "rakuten"],
  YEARLY: ["ga", "bing", "impact", "avantlink", "levanta"],
  MONTHLY: ["klaviyo", "awin", "cj"],
  SIX_MONTH: ["pepperjam"]
};
