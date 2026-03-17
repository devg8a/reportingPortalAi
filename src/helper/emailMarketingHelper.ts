// helpers/emailMarketingHelper.ts

import clientConnections from "../db/models/clientConnections";
import { getMongoDbObjectId } from "./helper";

/**
 * Convert any value to number (0 if invalid)
 */
export const num = (val: any): number => Number(val || 0);

/**
 * Check if campaign is promo (contains 'promo', '%', or 'percent')
 */
export const isPromoCampaign = (name: string): boolean => {
    if (!name) return false;
    const lowerName = name.toLowerCase();

    // Contains "promo"
    if (lowerName.includes('promo')) return true;

    // Contains numeric percentage like 20%
    if (/\d+\s*%/.test(name)) return true;

    // Contains numeric percent like 20 percent
    if (/\d+\s*percent/i.test(lowerName)) return true;

    return false;
};

/**
 * Extract discount percentage from campaign name
 * "30% OFF" → 30
 * "50 percent discount" → 50
 */
export const extractDiscount = (name: string): number | null => {
    if (!name) return null;

    // Match "30%" or "30 %"
    const percentMatch = name.match(/(\d+)\s*%/);
    if (percentMatch) return Number(percentMatch[1]);

    // Match "30 percent" or "30percent"
    const percentWordMatch = name.match(/(\d+)\s*percent/i);
    if (percentWordMatch) return Number(percentWordMatch[1]);

    return null;
};

/**
 * Calculate percentage difference between current and previous
 */
export const calculateDiff = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(2));
};

/**
 * Detect tabs from campaign names (mlb, nba, nfl, nhl)
 * Returns ['all', 'nfl', 'nba'] or null if no matches
 */
export const detectTabs = (campaigns: any[]): string[] | null => {
    const tabKeywords = ['mlb', 'nba', 'nfl', 'nhl'];
    const foundTabs = new Set<string>();

    campaigns.forEach((campaign: any) => {
        if (!campaign.name) return;
        const lowerName = campaign.name.toLowerCase();

        tabKeywords.forEach(keyword => {
            if (lowerName.includes(keyword)) {
                foundTabs.add(keyword);
            }
        });
    });

    if (foundTabs.size > 0) {
        return ['all', ...Array.from(foundTabs)];
    }

    return null;
};

/**
 * Normalize audiences object to array format
 */
export const normalizeAudiences = (aud: any) => {
    const toArr = (obj: any) =>
        Object.entries(obj || {}).map(([id, v]: any) => ({
            id,
            name: v?.name ?? null,
            type: v?.type ?? null
        }));

    return {
        included: toArr(aud?.included),
        excluded: toArr(aud?.excluded)
    };
};

/**
 * Fetch filter fields from klaviyo connection by clientId
 * Returns: ["wholesale", "test"] or []
 */
export const getClientFilterFields = async (clientId: string): Promise<string[]> => {
    try {
        const connection = await clientConnections.findOne({
            client_id: getMongoDbObjectId(clientId),
            network: "klaviyo",
            status: "active"
        }).select("filter").lean();

        if (!connection?.filter || !Array.isArray(connection.filter)) {
            return [];
        }

        return connection.filter
            .map((f: any) => f?.field)
            .filter((f: any) => f && typeof f === 'string');

    } catch (error) {
        console.error('Error fetching client filter fields:', error);
        return [];
    }
};

/**
 * Check if campaign should be skipped based on filter fields
 */
export const shouldSkipCampaign = (campaignName: string, filters: string[]): boolean => {
    if (!campaignName || !filters || filters.length === 0) return false;

    const lowerName = campaignName.toLowerCase();

    return filters.some(filter => lowerName.includes(filter.toLowerCase()));
};