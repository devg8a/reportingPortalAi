export const PLATFORM_CONFIG = [
    {
        id: 'meta',
        label: 'meta',
        aliases: ['meta'],
        schemaKey: 'meta'
    },
    {
        id: 'adword',
        label: 'adword',
        aliases: ['adword'],
        schemaKey: 'adword'
    },
    {
        id: 'shopify',
        label: 'shopify',
        aliases: ['shopify'], // Special logic: also checks store_url
        schemaKey: 'shopify'
    },
    {
        id: 'ga',
        label: 'ga',
        aliases: ['ga'], // Special logic: checks account_id
        schemaKey: 'ga'
    },
    {
        id: 'criteo',
        label: 'criteo',
        aliases: ['criteo'],
        schemaKey: 'criteo'
    }
];

export const getPlatformConfig = (networkName: string) => {
    return PLATFORM_CONFIG.find(p => p.aliases.includes(networkName.toLowerCase()));
};
