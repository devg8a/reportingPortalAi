// controllers/emailMarketingController.ts

import { Request, Response } from "express";
import moment from "moment";
import clientConnections from "../db/models/clientConnections";
import { getCentralStorageModel } from "../db/schema/dynamic-central-model";
import { getMongoDbObjectId, getUtcDate, getRangeBetweenDates } from "../helper/helper";
import redisClient from "../config/redisClient";
import axios, { AxiosError } from "axios";

import {
    num,
    isPromoCampaign,
    extractDiscount,
    calculateDiff,
    detectTabs,
    normalizeAudiences,
    getClientFilterFields,
    shouldSkipCampaign
} from '../helper/emailMarketingHelper';
import { calculateAggregatedShopifyRevenue } from "../helper/metricsHelper";


// totalRevenue = Shopify / GA revenue
// emailRevenue = campaignRevenue + flowRevenue
// campaignRevenue = sum(campaign.statistics.conversion_value)
// flowRevenue = sum(flow.statistics.conversion_value)
// smsCampaignRevenue = sum(smsCampaign.statistics.conversion_value)
// promoRecipients = sum(recipients where campaign name contains "promo" OR "%")
// nonPromoRecipients = sum(recipients where campaign is not promo)
// totalRecipients = promoRecipients + nonPromoRecipients
// openRate = (opens_unique / delivered) * 100
// clickRate = (clicks_unique / delivered) * 100
// place_order_rate = (conversion_uniques / delivered) * 100
// unsubscribe_rate = (unsubscribes / delivered) * 100
// bounce_rate = (bounced / recipients) * 100
// sms_click_rate = (clicks_unique / delivered) * 100
// sms_place_rate = (conversion_uniques / delivered) * 100
// sms_unsubscribe_rate = (unsubscribes / delivered) * 100
// sms_bounce_rate = (bounced / recipients) * 100
// roas = revenue / spend
// flow_place_order_rate = (conversion_uniques / delivered) * 100
// flow_open_rate = (opens_unique / delivered) * 100
// flow_click_rate = (clicks_unique / delivered) * 100
// flow_unsubscribe_rate = (unsubscribes / delivered) * 100
// flow_bounce_rate = (bounced / recipients) * 100
// campaign_total_recipients = sum(recipients)
// campaign_total_delivered = sum(delivered)
// campaign_total_opens_unique = sum(opens_unique)
// campaign_total_clicks_unique = sum(clicks_unique)
// campaign_total_conversion_uniques = sum(conversion_uniques)
// campaign_total_conversion_value = sum(conversion_value)
// sms_total_recipients = sum(recipients)
// sms_total_delivered = sum(delivered)
// sms_total_clicks_unique = sum(clicks_unique)
// sms_total_conversion_uniques = sum(conversion_uniques)
// sms_total_conversion_value = sum(conversion_value)
// sms_total_spend = sum(spend)
// benchmark_open_rate = (opens_unique / delivered) * 100
// benchmark_click_rate = (clicks_unique / delivered) * 100
// diff = ((current_value - previous_value) / previous_value) * 100
// if previous_value = 0 and current_value > 0 → diff = 100
// if previous_value = 0 and current_value = 0 → diff = 0

export const getEmailMarketingReport = async (req: Request, res: Response) => {
    try {
        const {
            clientId,
            startDate,
            endDate,
            comparison = false,
            compareStartDate,
            compareEndDate
        } = req.body;

        if (!clientId || !startDate || !endDate) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: "Missing required fields: clientId, startDate, endDate"
            });
        }

        if (comparison && (!compareStartDate || !compareEndDate)) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: "Comparison enabled but compareStartDate or compareEndDate missing"
            });
        }

        const filterFields = await getClientFilterFields(clientId);

        const withComparison = Boolean(comparison);

        const metric = (curr: number, prev?: number) => {
            if (!withComparison) return { curr };
            const p = Number(prev || 0);
            return { curr, prev: p, diff: calculateDiff(curr, p) };
        };
        const module_key = req?.header('x-module-key');
        const userId = (req as any).user?._id || null;
        console.log('- User ID:', userId);
        console.log('- moduleket:', module_key);

        const cacheKey = `${module_key}_${userId}`;

        // ✅ Redis me jo data store karna hai
        const redisPayload = {
            userId,
            clientId,
            startDate,
            endDate,
            comparison,
            compareStartDate,
            compareEndDate,
            storedAt: new Date()
        };

        // ✅ 1️⃣ SET in Redis
        await redisClient.set(
            cacheKey,
            JSON.stringify(redisPayload),
            { EX: 86400 }
        );


        const allConnections = await clientConnections.find({
            client_id: getMongoDbObjectId(clientId),
            status: "active"
        }).select("_id network shopify_revenue_settings").lean();


        // ✅ Ab filter karke nikalo jo chahiye
        const klaviyoConnection = allConnections.find(c => c.network === "klaviyo");
        const shopifyConnection = allConnections.find(c => c.network === "shopify");
        const gaConnection = allConnections.find(c => c.network === "ga");

        if (!klaviyoConnection) {
            return res.status(404).json({
                status_code: 404,
                success: false,
                message: "Klaviyo connection not found or inactive"
            });
        }

        // Previous year range
        const endDateYear = moment(endDate).year();
        const prevYear = endDateYear - 1;
        const prevYearStart = moment(`${prevYear}-01-01`).format('YYYY-MM-DD');
        const prevYearEnd = moment(`${prevYear}-12-31`).format('YYYY-MM-DD');

        // Fetch data
        let minDate = startDate;
        let maxDate = endDate;
        if (comparison) {
            minDate = new Date(startDate) < new Date(compareStartDate) ? startDate : compareStartDate;
            maxDate = new Date(endDate) > new Date(compareEndDate) ? endDate : compareEndDate;
        }

        const yearsList = getRangeBetweenDates(minDate, maxDate, "year");
        let allRecords: any[] = [];

        for (const year of yearsList) {
            const model = getCentralStorageModel(`central_storage_${year}`);
            const records = await model.find({
                client_id: getMongoDbObjectId(clientId),
                connection_id: klaviyoConnection._id,
                network: "klaviyo",
                date: {
                    $gte: getUtcDate(minDate),
                    $lte: getUtcDate(maxDate, "end")
                }
            }).select("date data updatedAt").lean();
            allRecords.push(...records);
        }
        let latestUpdatedAt: Date | null = null;

        allRecords.forEach(record => {
            if (record.updatedAt) {
                const recordDate = new Date(record.updatedAt);
                if (!latestUpdatedAt || recordDate > latestUpdatedAt) {
                    latestUpdatedAt = recordDate;
                }
            }
        });


        // ✅ Separate data by type and date range
        const currentStart = new Date(getUtcDate(startDate));
        const currentEnd = new Date(getUtcDate(endDate, "end"));
        const comparedStart = comparison ? new Date(getUtcDate(compareStartDate!)) : null;
        const comparedEnd = comparison ? new Date(getUtcDate(compareEndDate!, "end")) : null;

        // ✅ NEW CODE - unique by ID using Map
        const currentCampaignsMap = new Map();
        const comparedCampaignsMap = new Map();
        const currentSmsCampaignsMap = new Map();
        const comparedSmsCampaignsMap = new Map();
        const currentFlowsMap = new Map();
        const comparedFlowsMap = new Map();

        allRecords.forEach(record => {
            const recordDate = new Date(record.date);
            const campaigns = record.data?.campaigns || [];
            const flows = record.data?.flows || [];

            const isCurrent = recordDate >= currentStart && recordDate <= currentEnd;
            const isCompared = comparison && comparedStart && comparedEnd &&
                recordDate >= comparedStart && recordDate <= comparedEnd;

            campaigns.forEach((campaign: any) => {
                if (!campaign.id) return;
                if (shouldSkipCampaign(campaign.name, filterFields)) return;

                if (campaign.channel === "sms") {
                    if (isCurrent) currentSmsCampaignsMap.set(campaign.id, campaign);
                    if (isCompared) comparedSmsCampaignsMap.set(campaign.id, campaign);
                } else {
                    if (isCurrent) currentCampaignsMap.set(campaign.id, campaign);
                    if (isCompared) comparedCampaignsMap.set(campaign.id, campaign);
                }
            });

            flows.forEach((flow: any) => {
                if (!flow.id) return;
                if (isCurrent) currentFlowsMap.set(flow.id, flow);
                if (isCompared) comparedFlowsMap.set(flow.id, flow);
            });
        });

        // ✅ Convert Maps to Arrays
        const currentCampaigns = Array.from(currentCampaignsMap.values());
        const comparedCampaigns = Array.from(comparedCampaignsMap.values());
        const currentSmsCampaigns = Array.from(currentSmsCampaignsMap.values());
        const comparedSmsCampaigns = Array.from(comparedSmsCampaignsMap.values());
        const currentFlows = Array.from(currentFlowsMap.values());
        const comparedFlows = Array.from(comparedFlowsMap.values());


        // ✅ Campaign Stats Calculator (Email)
        const calculateCampaignStats = (campaigns: any[]) => {
            let promoRecipients = 0;
            let nonPromoRecipients = 0;
            let totalDelivered = 0;
            let totalOpensUnique = 0;
            let totalClicksUnique = 0;
            let noOfEmails = 0;
            let noOfUnsubscribers = 0;

            campaigns.forEach(campaign => {
                const stats = campaign.statistics || {};
                const recipients = Number(stats.recipients || 0);

                if (isPromoCampaign(campaign.name)) {
                    promoRecipients += recipients;
                } else {
                    nonPromoRecipients += recipients;
                }

                totalDelivered += Number(stats.delivered || 0);
                totalOpensUnique += Number(stats.opens_unique || 0);
                totalClicksUnique += Number(stats.clicks_unique || 0);
                noOfUnsubscribers += Number(stats.unsubscribe_uniques || 0);
                noOfEmails += 1;
            });

            const totalRecipients = promoRecipients + nonPromoRecipients;
            const openRate = totalDelivered > 0 ? (totalOpensUnique / totalDelivered) * 100 : 0;
            const clickRate = totalDelivered > 0 ? (totalClicksUnique / totalDelivered) * 100 : 0;

            return {
                promoRecipients,
                nonPromoRecipients,
                totalRecipients,
                openRate,
                clickRate,
                noOfEmails,
                noOfUnsubscribers
            };
        };

        // ✅ SMS Stats Calculator (No Open Rate, No. of SMS/MMS instead of Emails)
        const calculateSmsStats = (smsCampaigns: any[]) => {
            let promoRecipients = 0;
            let nonPromoRecipients = 0;
            let totalDelivered = 0;
            let totalClicksUnique = 0;
            let noOfSms = 0;
            let noOfUnsubscribers = 0;

            smsCampaigns.forEach(campaign => {
                const stats = campaign.statistics || {};
                const recipients = Number(stats.recipients || 0);

                if (isPromoCampaign(campaign.name)) {
                    promoRecipients += recipients;
                } else {
                    nonPromoRecipients += recipients;
                }

                totalDelivered += Number(stats.delivered || 0);
                totalClicksUnique += Number(stats.clicks_unique || 0);
                noOfUnsubscribers += Number(stats.unsubscribe_uniques || 0);
                noOfSms += 1;
            });

            const totalRecipients = promoRecipients + nonPromoRecipients;
            const clickRate = totalDelivered > 0 ? (totalClicksUnique / totalDelivered) * 100 : 0;

            return {
                promoRecipients,
                nonPromoRecipients,
                totalRecipients,
                clickRate,
                noOfSms,
                noOfUnsubscribers
            };
        };




        // ✅ Calculate all stats
        const currCampaignStats = calculateCampaignStats(currentCampaigns);
        const prevCampaignStats = comparison ? calculateCampaignStats(comparedCampaigns) : {
            promoRecipients: 0, nonPromoRecipients: 0, totalRecipients: 0,
            openRate: 0, clickRate: 0, noOfEmails: 0, noOfUnsubscribers: 0
        };

        const currSmsStats = calculateSmsStats(currentSmsCampaigns);
        const prevSmsStats = comparison ? calculateSmsStats(comparedSmsCampaigns) : {
            promoRecipients: 0, nonPromoRecipients: 0, totalRecipients: 0,
            clickRate: 0, noOfSms: 0, noOfUnsubscribers: 0
        };

        // ✅ Revenue calculation (same as before)
        // ✅ Simple - No SMS flows
        const calculateRevenue = (
            campaigns: any[],
            smsCampaigns: any[],
            flows: any[]
        ) => {
            let campaignRevenue = 0;
            let smsRevenue = 0;
            let flowRevenue = 0;

            campaigns.forEach(c => campaignRevenue += num(c.statistics?.conversion_value));
            smsCampaigns.forEach(c => smsRevenue += num(c.statistics?.conversion_value));
            flows.forEach(f => flowRevenue += num(f.statistics?.conversion_value));

            const emailRevenue = campaignRevenue + flowRevenue;
            const totalRevenue = emailRevenue + smsRevenue;

            return { totalRevenue, emailRevenue, flowRevenue, campaignRevenue, smsRevenue };
        };



        // ✅ Benchmark: Fetch previous year data
        const prevYearYearsList = getRangeBetweenDates(prevYearStart, prevYearEnd, "year");
        let prevYearRecords: any[] = [];

        for (const year of prevYearYearsList) {
            const model = getCentralStorageModel(`central_storage_${year}`);
            const records = await model.find({
                client_id: getMongoDbObjectId(clientId),
                connection_id: klaviyoConnection._id,
                network: "klaviyo",
                date: {
                    $gte: getUtcDate(prevYearStart),
                    $lte: getUtcDate(prevYearEnd, "end")
                }
            }).select("date data").lean();

            prevYearRecords.push(...records);
        }

        // ✅ Separate prev year campaigns into benchmark periods
        const prevYearEndMoment = moment(prevYearEnd);

        // Last 2 months of prev year (e.g., Nov 1 - Dec 31)
        const bench2MonthStart = new Date(getUtcDate(prevYearEndMoment.clone().subtract(2, 'months').startOf('month').format('YYYY-MM-DD')));
        // Last 6 months of prev year (e.g., Jul 1 - Dec 31)
        const bench6MonthStart = new Date(getUtcDate(prevYearEndMoment.clone().subtract(6, 'months').startOf('month').format('YYYY-MM-DD')));
        // Full year
        const bench12MonthStart = new Date(getUtcDate(prevYearStart));
        const benchEnd = new Date(getUtcDate(prevYearEnd, "end"));

        const benchmarkCampaigns2m: any[] = [];
        const benchmarkCampaigns6m: any[] = [];
        const benchmarkCampaigns12m: any[] = [];

        const benchmarkSmsCampaigns2m: any[] = [];
        const benchmarkSmsCampaigns6m: any[] = [];
        const benchmarkSmsCampaigns12m: any[] = [];

        prevYearRecords.forEach(record => {
            const recordDate = new Date(record.date);
            const campaigns = record.data?.campaigns || [];

            campaigns.forEach((campaign: any) => {
                const isSms = campaign.channel === "sms";

                // 12 months (full year - all records qualify)
                if (recordDate >= bench12MonthStart && recordDate <= benchEnd) {
                    if (isSms) benchmarkSmsCampaigns12m.push(campaign);
                    else benchmarkCampaigns12m.push(campaign);
                }

                // 6 months (last 6 months)
                if (recordDate >= bench6MonthStart && recordDate <= benchEnd) {
                    if (isSms) benchmarkSmsCampaigns6m.push(campaign);
                    else benchmarkCampaigns6m.push(campaign);
                }

                // 2 months (last 2 months)
                if (recordDate >= bench2MonthStart && recordDate <= benchEnd) {
                    if (isSms) benchmarkSmsCampaigns2m.push(campaign);
                    else benchmarkCampaigns2m.push(campaign);
                }
            });
        });

        // ✅ Benchmark rate calculator (Email)
        const calculateBenchmarkRates = (campaigns: any[], currOpenRate: number, currClickRate: number) => {
            let totalDelivered = 0;
            let totalOpensUnique = 0;
            let totalClicksUnique = 0;

            campaigns.forEach(campaign => {
                const stats = campaign.statistics || {};
                totalDelivered += Number(stats.delivered || 0);
                totalOpensUnique += Number(stats.opens_unique || 0);
                totalClicksUnique += Number(stats.clicks_unique || 0);
            });

            const openRate = totalDelivered > 0 ? Number(((totalOpensUnique / totalDelivered) * 100).toFixed(2)) : 0;
            const clickRate = totalDelivered > 0 ? Number(((totalClicksUnique / totalDelivered) * 100).toFixed(2)) : 0;

            return {
                openRate: {
                    rate: openRate,
                    diff: Number((currOpenRate - openRate).toFixed(2))
                },
                clickRate: {
                    rate: clickRate,
                    diff: Number((currClickRate - clickRate).toFixed(2))
                }
            };
        };

        // ✅ Benchmark rate calculator (SMS - no open rate)
        const calculateSmsBenchmarkRates = (smsCampaigns: any[], currClickRate: number) => {
            let totalDelivered = 0;
            let totalClicksUnique = 0;

            smsCampaigns.forEach(campaign => {
                const stats = campaign.statistics || {};
                totalDelivered += Number(stats.delivered || 0);
                totalClicksUnique += Number(stats.clicks_unique || 0);
            });

            const clickRate = totalDelivered > 0 ? Number(((totalClicksUnique / totalDelivered) * 100).toFixed(2)) : 0;

            return {
                clickRate: {
                    rate: clickRate,
                    diff: Number((currClickRate - clickRate).toFixed(2))
                }
            };
        };

        // ✅ Build campaign benchmarks
        const campaignBenchmark = {
            "2months": calculateBenchmarkRates(benchmarkCampaigns2m, currCampaignStats.openRate, currCampaignStats.clickRate),
            "6months": calculateBenchmarkRates(benchmarkCampaigns6m, currCampaignStats.openRate, currCampaignStats.clickRate),
            "12months": calculateBenchmarkRates(benchmarkCampaigns12m, currCampaignStats.openRate, currCampaignStats.clickRate)
        };

        // ✅ Build SMS benchmarks
        const smsBenchmark = {
            "2months": calculateSmsBenchmarkRates(benchmarkSmsCampaigns2m, currSmsStats.clickRate),
            "6months": calculateSmsBenchmarkRates(benchmarkSmsCampaigns6m, currSmsStats.clickRate),
            "12months": calculateSmsBenchmarkRates(benchmarkSmsCampaigns12m, currSmsStats.clickRate)
        };


        const formatCampaign = (item: any) => {
            const s = item.statistics || {};
            const delivered = num(s.delivered);
            const recipients = num(s.recipients);

            return {
                campaign_name: item.name,
                message_id: item.message_id ?? null,
                audiences: item.audiences ? normalizeAudiences(item.audiences) : null,

                total_recipients: recipients,
                send_weekday: item.send_time ? moment(item.send_time).format('dddd') : null,
                unique_placed_order: num(s.conversion_uniques),
                place_order_rate: delivered ? (num(s.conversion_uniques) / delivered) * 100 : 0,
                unique_opens: num(s.opens_unique),
                open_rate: delivered ? (num(s.opens_unique) / delivered) * 100 : 0,
                unique_clicks: num(s.clicks_unique),
                click_rate: delivered ? (num(s.clicks_unique) / delivered) * 100 : 0,
                unsubscribe_rate: delivered ? (num(s.unsubscribes) / delivered) * 100 : 0,
                bounce_rate: recipients ? (num(s.bounced) / recipients) * 100 : 0,
                revenue: num(s.conversion_value)
            };
        };

        // ✅ Calculate Campaign Total
        const calculateCampaignTotal = (campaigns: any[]) => {
            let recipients = 0, delivered = 0, opens_unique = 0, clicks_unique = 0;
            let conversion_uniques = 0, conversion_value = 0, unsubscribes = 0, bounced = 0;

            campaigns.forEach((item: any) => {
                const s = item.statistics || {};
                recipients += num(s.recipients);
                delivered += num(s.delivered);
                opens_unique += num(s.opens_unique);
                clicks_unique += num(s.clicks_unique);
                conversion_uniques += num(s.conversion_uniques);
                conversion_value += num(s.conversion_value);
                unsubscribes += num(s.unsubscribes);
                bounced += num(s.bounced);
            });

            return {
                campaign_name: "All Total",
                total_recipients: recipients,
                send_weekday: null,
                unique_placed_order: conversion_uniques,
                place_order_rate: delivered ? (conversion_uniques / delivered) * 100 : 0,
                unique_opens: opens_unique,
                open_rate: delivered ? (opens_unique / delivered) * 100 : 0,
                unique_clicks: clicks_unique,
                click_rate: delivered ? (clicks_unique / delivered) * 100 : 0,
                unsubscribe_rate: delivered ? (unsubscribes / delivered) * 100 : 0,
                bounce_rate: recipients ? (bounced / recipients) * 100 : 0,
                revenue: conversion_value
            };
        };

        // ✅ Campaign Table - conditional total
        const buildCampaignTable = (campaigns: any[]) => {
            const formatted = campaigns.map(formatCampaign);
            if (formatted.length === 0) return [];
            return [...formatted, calculateCampaignTotal(campaigns)];
        };

        const campaignTable = withComparison
            ? {
                curr: buildCampaignTable(currentCampaigns),
                prev: buildCampaignTable(comparedCampaigns)
            }
            : { curr: buildCampaignTable(currentCampaigns) };


        // ✅ Fixed - No isFlow parameter
        const formatSms = (item: any) => {
            const s = item.statistics || {};
            const delivered = num(s.delivered);
            const recipients = num(s.recipients);
            const spend = num(s.text_message_spend || s.spend);
            const revenue = num(s.conversion_value);

            return {
                sms_name: item.name,
                message_id: item.message_id ?? null,
                audiences: item.audiences ? normalizeAudiences(item.audiences) : null,
                total_recipients: recipients,
                send_weekday: item.send_time ? moment(item.send_time).format('dddd') : null,  // ✅ Added
                unique_place_order: num(s.conversion_uniques),
                place_rate: delivered ? (num(s.conversion_uniques) / delivered) * 100 : 0,
                unique_clicks: num(s.clicks_unique),
                click_rate: delivered ? (num(s.clicks_unique) / delivered) * 100 : 0,
                unsubscribe_rate: delivered ? (num(s.unsubscribes) / delivered) * 100 : 0,
                bounce_rate: recipients ? (num(s.bounced) / recipients) * 100 : 0,
                revenue: revenue,
                spend: spend,
                roas: spend > 0 ? revenue / spend : 0
            };
        };


        const calculateSmsTotal = (smsCampaigns: any[]) => {
            let recipients = 0, delivered = 0, clicks_unique = 0;
            let conversion_uniques = 0, conversion_value = 0, unsubscribes = 0, bounced = 0, spend = 0;

            smsCampaigns.forEach((item: any) => {
                const s = item.statistics || {};
                recipients += num(s.recipients);
                delivered += num(s.delivered);
                clicks_unique += num(s.clicks_unique);
                conversion_uniques += num(s.conversion_uniques);
                conversion_value += num(s.conversion_value);
                unsubscribes += num(s.unsubscribes);
                bounced += num(s.bounced);
                spend += num(s.text_message_spend || s.spend);
            });

            return {
                sms_name: "All Total",
                message_id: null,
                audiences: null,
                total_recipients: recipients,
                send_weekday: null,  // ✅ Added (null for total row)
                unique_place_order: conversion_uniques,
                place_rate: delivered ? (conversion_uniques / delivered) * 100 : 0,
                unique_clicks: clicks_unique,
                click_rate: delivered ? (clicks_unique / delivered) * 100 : 0,
                unsubscribe_rate: delivered ? (unsubscribes / delivered) * 100 : 0,
                bounce_rate: recipients ? (bounced / recipients) * 100 : 0,
                revenue: conversion_value,
                spend: spend,
                roas: spend > 0 ? conversion_value / spend : 0
            };
        };

        const buildSmsTable = (smsCampaigns: any[]) => {
            if (smsCampaigns.length === 0) return [];

            const formatted = smsCampaigns.map(formatSms);
            const total = calculateSmsTotal(smsCampaigns);

            return [...formatted, total];
        };

        const smsTable = withComparison
            ? {
                curr: buildSmsTable(currentSmsCampaigns),
                prev: buildSmsTable(comparedSmsCampaigns)
            }
            : { curr: buildSmsTable(currentSmsCampaigns) };

        // ✅ Flow Category Detector
        const getFlowCategory = (name: string): 'welcome' | 'abandonment' | 'other' => {
            if (!name) return 'other';

            const lowerName = name.toLowerCase();

            if (lowerName.includes('welcome')) return 'welcome';

            const abandonmentKeywords = [
                'browse abandonment', 'abandonment browse', 'browse abandoned', 'abandoned browse',
                'cart abandonment', 'abandonment cart', 'cart abandoned', 'abandoned cart',
                'checkout abandonment', 'abandonment checkout', 'checkout abandoned', 'abandoned checkout'
            ];

            if (abandonmentKeywords.some(keyword => lowerName.includes(keyword))) {
                return 'abandonment';
            }

            return 'other';
        };

        // ✅ Group Flows by Category with conditional All Total
        const groupFlowsByCategory = (flows: any[]) => {
            const categories: Record<string, any> = {
                welcome: { name: "Welcome", recipients: 0, delivered: 0, opens_unique: 0, clicks_unique: 0, conversion_uniques: 0, conversion_value: 0, unsubscribes: 0, bounced: 0 },
                abandonment: { name: "Abandonment Flows", recipients: 0, delivered: 0, opens_unique: 0, clicks_unique: 0, conversion_uniques: 0, conversion_value: 0, unsubscribes: 0, bounced: 0 },
                other: { name: "Other Flows", recipients: 0, delivered: 0, opens_unique: 0, clicks_unique: 0, conversion_uniques: 0, conversion_value: 0, unsubscribes: 0, bounced: 0 }
            };

            flows.forEach((flow: any) => {
                const s = flow.statistics || {};

                // Skip SMS flows
                if (flow.name?.toLowerCase().includes('sms')) return;

                const category = getFlowCategory(flow.name);
                const cat = categories[category];

                cat.recipients += num(s.recipients);
                cat.delivered += num(s.delivered);
                cat.opens_unique += num(s.opens_unique);
                cat.clicks_unique += num(s.clicks_unique);
                cat.conversion_uniques += num(s.conversion_uniques);
                cat.conversion_value += num(s.conversion_value);
                cat.unsubscribes += num(s.unsubscribes);
                cat.bounced += num(s.bounced);
            });

            const formatCategory = (cat: any) => ({
                flow_name: cat.name,
                total_recipients: cat.recipients,
                unique_placed_order: cat.conversion_uniques,
                place_order_rate: cat.delivered ? (cat.conversion_uniques / cat.delivered) * 100 : 0,
                unique_opens: cat.opens_unique,
                open_rate: cat.delivered ? (cat.opens_unique / cat.delivered) * 100 : 0,
                unique_clicks: cat.clicks_unique,
                click_rate: cat.delivered ? (cat.clicks_unique / cat.delivered) * 100 : 0,
                unsubscribe_rate: cat.delivered ? (cat.unsubscribes / cat.delivered) * 100 : 0,
                bounce_rate: cat.recipients ? (cat.bounced / cat.recipients) * 100 : 0,
                revenue: cat.conversion_value
            });

            // ✅ Calculate All Total
            const allTotal = {
                name: "All Total",
                recipients: categories.welcome.recipients + categories.abandonment.recipients + categories.other.recipients,
                delivered: categories.welcome.delivered + categories.abandonment.delivered + categories.other.delivered,
                opens_unique: categories.welcome.opens_unique + categories.abandonment.opens_unique + categories.other.opens_unique,
                clicks_unique: categories.welcome.clicks_unique + categories.abandonment.clicks_unique + categories.other.clicks_unique,
                conversion_uniques: categories.welcome.conversion_uniques + categories.abandonment.conversion_uniques + categories.other.conversion_uniques,
                conversion_value: categories.welcome.conversion_value + categories.abandonment.conversion_value + categories.other.conversion_value,
                unsubscribes: categories.welcome.unsubscribes + categories.abandonment.unsubscribes + categories.other.unsubscribes,
                bounced: categories.welcome.bounced + categories.abandonment.bounced + categories.other.bounced
            };

            const result = [
                formatCategory(categories.welcome),
                formatCategory(categories.abandonment),
                formatCategory(categories.other)
            ];

            // ✅ Check if all categories are empty (no data)
            const hasData = result.some(cat => cat.total_recipients > 0);

            if (!hasData) return [];

            return [...result, formatCategory(allTotal)];
        };

        const flowTable = withComparison
            ? { curr: groupFlowsByCategory(currentFlows), prev: groupFlowsByCategory(comparedFlows) }
            : { curr: groupFlowsByCategory(currentFlows) };

        const currentRevenue = calculateRevenue(currentCampaigns, currentSmsCampaigns, currentFlows);
        const comparedRevenue = comparison
            ? calculateRevenue(comparedCampaigns, comparedSmsCampaigns, comparedFlows)
            : { totalRevenue: 0, emailRevenue: 0, flowRevenue: 0, campaignRevenue: 0, smsRevenue: 0 };

        // ✅ Total Revenue - Shopify priority, GA fallback
        let currentTotalRevenue = 0;
        let comparedTotalRevenue = 0;

        const revenueConnection = shopifyConnection || gaConnection;
        const revenueNetwork = shopifyConnection ? "shopify" : gaConnection ? "ga" : null;

        if (revenueConnection && revenueNetwork) {
            const shopifyFormula = "G-D+S+T";

            // Current period
            for (const year of yearsList) {
                const model = getCentralStorageModel(`central_storage_${year}`);
                const records = await model.find({
                    client_id: getMongoDbObjectId(clientId),
                    connection_id: revenueConnection._id,
                    network: revenueNetwork,
                    date: {
                        $gte: getUtcDate(startDate),
                        $lte: getUtcDate(endDate, "end")
                    }
                }).select("data").lean();

                records.forEach((record: any) => {
                    if (revenueNetwork === "shopify") {
                        const aggregated = {
                            gross_sales: num(record.data?.gross_sales),
                            discounts: num(record.data?.discounts),
                            shipping_charges: num(record.data?.shipping_charges),
                            taxes: num(record.data?.taxes),
                            returns: num(record.data?.returns),
                            net_sales: num(record.data?.net_sales)
                        };
                        currentTotalRevenue += calculateAggregatedShopifyRevenue(aggregated, shopifyFormula);
                    } else {
                        currentTotalRevenue += num(record.data?.totalRevenue || record.data?.transactionRevenue || 0);
                    }
                });
            }

            // Comparison period
            if (comparison) {
                const compYearsList = getRangeBetweenDates(compareStartDate, compareEndDate, "year");

                for (const year of compYearsList) {
                    const model = getCentralStorageModel(`central_storage_${year}`);
                    const records = await model.find({
                        client_id: getMongoDbObjectId(clientId),
                        connection_id: revenueConnection._id,
                        network: revenueNetwork,
                        date: {
                            $gte: getUtcDate(compareStartDate),
                            $lte: getUtcDate(compareEndDate, "end")
                        }
                    }).select("data").lean();

                    records.forEach((record: any) => {
                        if (revenueNetwork === "shopify") {
                            const aggregated = {
                                gross_sales: num(record.data?.gross_sales),
                                discounts: num(record.data?.discounts),
                                shipping_charges: num(record.data?.shipping_charges),
                                taxes: num(record.data?.taxes),
                                returns: num(record.data?.returns),
                                net_sales: num(record.data?.net_sales)
                            };
                            comparedTotalRevenue += calculateAggregatedShopifyRevenue(aggregated, shopifyFormula);
                        } else {
                            comparedTotalRevenue += num(record.data?.totalRevenue || record.data?.transactionRevenue || 0);
                        }
                    });
                }
            }
        }


        const statsArray: any[] = [
            {
                totalRevenue: {
                    ...metric(Number(currentTotalRevenue.toFixed(2)), Number(comparedTotalRevenue.toFixed(2))),
                    ...(revenueNetwork === "shopify" && { shopify: true }),
                    ...(revenueNetwork === "ga" && { ga: true })
                }
            },
            { emailRevenue: metric(Number(currentRevenue.emailRevenue.toFixed(2)), Number(comparedRevenue.emailRevenue.toFixed(2))) },
            { flowRevenue: metric(Number(currentRevenue.flowRevenue.toFixed(2)), Number(comparedRevenue.flowRevenue.toFixed(2))) },
            { campaignRevenue: metric(Number(currentRevenue.campaignRevenue.toFixed(2)), Number(comparedRevenue.campaignRevenue.toFixed(2))) }
        ];

        // ✅ SMS section - conditional
        const hasSms =
            currentSmsCampaigns.length > 0 ||
            (comparison && comparedSmsCampaigns.length > 0);

        // ✅ Only add smsCampaignRevenue if SMS data exists
        if (hasSms) {
            statsArray.push({ smsCampaignRevenue: metric(Number(currentRevenue.smsRevenue.toFixed(2)), Number(comparedRevenue.smsRevenue.toFixed(2))) });
        }

        // ✅ Build response
        const dataPayload: any = {
            stats: statsArray,

            campaigns: {
                table: campaignTable,
                stats: [
                    { promoRecipients: metric(currCampaignStats.promoRecipients, prevCampaignStats.promoRecipients) },
                    { nonPromoRecipients: metric(currCampaignStats.nonPromoRecipients, prevCampaignStats.nonPromoRecipients) },
                    { totalRecipients: metric(currCampaignStats.totalRecipients, prevCampaignStats.totalRecipients) },
                    { openRate: metric(Number(currCampaignStats.openRate.toFixed(2)), Number(prevCampaignStats.openRate.toFixed(2))) },
                    { clickRate: metric(Number(currCampaignStats.clickRate.toFixed(2)), Number(prevCampaignStats.clickRate.toFixed(2))) },
                    { noOfEmails: metric(currCampaignStats.noOfEmails, prevCampaignStats.noOfEmails) },
                    { noOfUnsubscribers: metric(currCampaignStats.noOfUnsubscribers, prevCampaignStats.noOfUnsubscribers) }
                ],
                benchmark: campaignBenchmark
            },

            flows: { table: flowTable }
        };


        if (hasSms) {
            dataPayload.sms = {
                table: smsTable,
                stats: [
                    { promoRecipients: metric(currSmsStats.promoRecipients, prevSmsStats.promoRecipients) },
                    { nonPromoRecipients: metric(currSmsStats.nonPromoRecipients, prevSmsStats.nonPromoRecipients) },
                    { totalRecipients: metric(currSmsStats.totalRecipients, prevSmsStats.totalRecipients) },
                    { clickRate: metric(Number(currSmsStats.clickRate.toFixed(2)), Number(prevSmsStats.clickRate.toFixed(2))) },
                    { noOfSms: metric(currSmsStats.noOfSms, prevSmsStats.noOfSms) },
                    { noOfUnsubscribers: metric(currSmsStats.noOfUnsubscribers, prevSmsStats.noOfUnsubscribers) }
                ],
                benchmark: smsBenchmark
            };
        }

        return res.status(200).json({
            status_code: 200,
            success: true,
            lastUpdated: latestUpdatedAt,
            message: "Email marketing report fetched successfully",
            data: dataPayload
        });

    } catch (error) {
        console.error("Error:", error);
        return res.status(422).json({
            status_code: 422,
            success: false,
            message: "Error in email marketing report",
            error: error instanceof Error ? error.message : error
        });
    }
};







const KLAVIYO_BASE = "https://a.klaviyo.com/api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));



// ✅ GET with retry on 429
const klaviyoGetWithRetry = async (
    url: string,
    headers: any,
    maxRetries = 5
) => {

    let attempt = 0;

    while (true) {
        try {
            return await axios.get(url, { headers });
        } catch (e) {
            const err = e as AxiosError<any>;
            const status = err.response?.status;

            if (status === 429 && attempt < maxRetries) {
                const retryAfterHeader = err.response?.headers?.["retry-after"];
                const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : 1;
                const waitMs = Math.max(1000, retryAfterSec * 1000);

                attempt += 1;
                console.log(`[Klaviyo] 429 throttled. Waiting ${waitMs}ms (attempt ${attempt}/${maxRetries})`);
                await sleep(waitMs);
                continue;
            }

            throw err;
        }
    }
};

const formatAudienceText = (items: any[]) => {
    if (!items?.length) return ` `;

    const text = items
        .map((x) => {
            const name = x?.klaviyo?.attributes?.name || x?.inputName || x?.id;
            const count = x?.klaviyo?.attributes?.profile_count;
            return `${name}(${count ?? 0})`;
        })
        .join(", ");

    return `${text}`;
};

export const klaviyoCampaignPreview = async (req: Request, res: Response) => {
    try {
        const { clientId, messageId } = req.body;

        if (!clientId || !messageId) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: "clientId and messageId are required",
            });
        }

        const conn: any = await clientConnections
            .findOne({
                client_id: getMongoDbObjectId(clientId),
                network: "klaviyo",
                status: "active",
            })
            .select("_id value token status")
            .lean();

        if (!conn) {
            return res.status(404).json({
                status_code: 404,
                success: false,
                message: "Klaviyo connection not found or inactive",
            });
        }

        const klaviyoApiKey = conn?.value;
        if (!klaviyoApiKey) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: "Klaviyo API key not found in connection",
            });
        }

        const headers = {
            Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            revision: "2024-10-15",
        };

        // ✅ FIXED: Use valid fields only
        const campaignMessageUrl = `${KLAVIYO_BASE}/campaign-messages/${messageId}?fields[campaign-message]=content,label,channel,render_options&fields[template]=html,text,name&include=template`;

        const msgResp = await klaviyoGetWithRetry(campaignMessageUrl, headers);

        const originalData = msgResp?.data?.data;
        const originalIncluded = msgResp?.data?.included;

        // ✅ Reshape data based on actual response
        const contentData = originalData?.attributes?.content || {};



        const reshapedData = {
            type: originalData?.type,
            id: originalData?.id,
            label: originalData?.attributes?.label || null,
            channel: originalData?.attributes?.channel || null,
            content: {
                subject: contentData?.subject || null,
                preview_text: contentData?.preview_text || null,
                from_email: contentData?.from_email || null,
                from_label: contentData?.from_label || null,
                body: contentData?.body || null,
            },
        };

        // Template data
        const reshapedIncluded = (originalIncluded || []).map((item: any) => ({
            type: item?.type,
            id: item?.id,
            attributes: {
                name: item?.attributes?.name || null,
                html: item?.attributes?.html || null,
                text: item?.attributes?.text || null,
            },
        }));

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: "Klaviyo campaign preview fetched",
            data: {
                campaignMessage: {
                    data: reshapedData,
                    included: reshapedIncluded,
                },
            },
        });
    } catch (error: any) {
        console.error("Klaviyo preview error:", error?.response?.data || error?.message || error);

        return res.status(422).json({
            status_code: 422,
            success: false,
            message: "Error in klaviyoCampaignPreview",
            error: error?.response?.data || error?.message || error,
        });
    }
};

// Helper: Extract included audiences properly
const extractIncludedAudiences = (included: any): Array<{ id: string; type: string; name: string | null }> => {
    if (!included) return [];

    // If array
    if (Array.isArray(included)) {
        return included
            .map((item: any) => ({
                id: item?.id,
                type: (item?.type || "").toLowerCase(),
                name: item?.name ?? null,
            }))
            .filter((x) => x.id && (x.type === "segment" || x.type === "list"));
    }

    // If object
    return Object.values(included)
        .map((v: any) => ({
            id: v?.id,
            type: (v?.type || "").toLowerCase(),
            name: v?.name ?? null,
        }))
        .filter((x: any) => x.id && (x.type === "segment" || x.type === "list"));
};

// ✅ NEW API: Fetch Audience Details
export const klaviyoAudienceDetails = async (req: Request, res: Response) => {
    try {
        const { clientId, audiences } = req.body;

        if (!clientId) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: "clientId is required",
            });
        }

        const includedArr = extractIncludedAudiences(audiences?.included);

        // No audiences to fetch
        if (!includedArr.length) {
            return res.status(200).json({
                status_code: 200,
                success: true,
                message: "No audiences to fetch",
                data: {
                    segments: [],
                    lists: [],
                    includedListsAndSegments: "",
                },
            });
        }

        // Get Klaviyo connection
        const conn: any = await clientConnections
            .findOne({
                client_id: getMongoDbObjectId(clientId),
                network: "klaviyo",
                status: "active",
            })
            .select("_id value")
            .lean();

        if (!conn?.value) {
            return res.status(404).json({
                status_code: 404,
                success: false,
                message: "Klaviyo connection not found",
            });
        }

        const headers = {
            Authorization: `Klaviyo-API-Key ${conn.value}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            revision: "2024-10-15",
        };

        const segments: any[] = [];
        const lists: any[] = [];

        // Fetch each audience sequentially
        for (const a of includedArr) {
            try {
                if (a.type === "segment") {
                    const segmentUrl = `${KLAVIYO_BASE}/segments/${a.id}?fields[segment]=name&additional-fields[segment]=profile_count`;
                    const segResp = await klaviyoGetWithRetry(segmentUrl, headers);

                    segments.push({
                        id: a.id,
                        type: "segment",
                        inputName: a.name,
                        klaviyo: segResp.data?.data || segResp.data,
                    });
                } else if (a.type === "list") {
                    const listUrl = `${KLAVIYO_BASE}/lists/${a.id}?fields[list]=name&additional-fields[list]=profile_count`;
                    const listResp = await klaviyoGetWithRetry(listUrl, headers);

                    lists.push({
                        id: a.id,
                        type: "list",
                        inputName: a.name,
                        klaviyo: listResp.data?.data || listResp.data,
                    });
                }

                await sleep(250); // Avoid rate limiting
            } catch (err: any) {
                const errorPayload = {
                    id: a.id,
                    type: a.type,
                    inputName: a.name,
                    error: err?.response?.data || err?.message,
                    errorStatus: err?.response?.status,
                };

                if (a.type === "segment") {
                    segments.push(errorPayload);
                } else {
                    lists.push(errorPayload);
                }
            }
        }

        // Format combined text
        const segmentText = formatAudienceText(segments);
        const listText = formatAudienceText(lists);

        const combinedTexts: string[] = [];
        if (segmentText?.trim()) combinedTexts.push(segmentText.trim());
        if (listText?.trim()) combinedTexts.push(listText.trim());

        const includedListsAndSegments = combinedTexts.join(", ");

        return res.status(200).json({
            status_code: 200,
            success: true,
            message: "Klaviyo audience details fetched",
            data: {
                segments,
                lists,
                includedListsAndSegments,
            },
        });
    } catch (error: any) {
        console.error("Klaviyo audience error:", error?.response?.data || error?.message || error);

        return res.status(422).json({
            status_code: 422,
            success: false,
            message: "Error in klaviyoAudienceDetails",
            error: error?.response?.data || error?.message || error,
        });
    }
};