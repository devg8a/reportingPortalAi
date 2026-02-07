import { ApiCall } from "../helper/axios";
import {
    EmailMarketingSummaryRequest,
    EmailMarketingSummaryResponse,
    EmailMarketingCampaignsResponse,
    EmailMarketingBenchmarksResponse,
    EmailMarketingFlowsResponse,
} from "../types/emailMarketing.types";

const MODULE_KEY = "email_marketing";

class EmailMarketingService {
    async getSummary(
        params: EmailMarketingSummaryRequest,
        token: string
    ): Promise<EmailMarketingSummaryResponse> {
        const response = await ApiCall<EmailMarketingSummaryResponse>(
            "POST",
            "/api/email-marketing/summary",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY,
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch email marketing summary");
    }

    async getCampaigns(
        params: EmailMarketingSummaryRequest,
        token: string
    ): Promise<EmailMarketingCampaignsResponse> {
        const response = await ApiCall<EmailMarketingCampaignsResponse>(
            "POST",
            "/api/email-marketing/campaigns",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY,
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch email marketing campaigns");
    }

    async getBenchmarks(
        params: EmailMarketingSummaryRequest,
        token: string
    ): Promise<EmailMarketingBenchmarksResponse> {
        const response = await ApiCall<EmailMarketingBenchmarksResponse>(
            "POST",
            "/api/email-marketing/benchmarks",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY,
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch email marketing benchmarks");
    }

    async getFlows(
        params: EmailMarketingSummaryRequest,
        token: string
    ): Promise<EmailMarketingFlowsResponse> {
        const response = await ApiCall<EmailMarketingFlowsResponse>(
            "POST",
            "/api/email-marketing/flows",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY,
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch email marketing flows");
    }
}

export const emailMarketingService = new EmailMarketingService();
