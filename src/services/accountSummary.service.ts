import { ApiCall } from "../helper/axios";
import {
    AccountSummaryRequestParams,
    AccountSummaryResponse,
    HideClientResponse,
    UnhideClientResponse,
    GetHiddenClientsResponse,
    TriggerCronRequest,
    TriggerCronResponse,
    GetCronStatusResponse,
    PerformanceReportRequest,
    PerformanceReportResponse,
    GetPerformanceEntitiesRequest,
    GetPerformanceEntitiesResponse,
} from "../types/accountSummary.types";
import { toast } from "../common_components/Toast/ToastUtils";

// ✅ Common module key
const MODULE_KEY = "account_summary";

class AccountSummaryService {

    async getAllAccountSummary(
        params: Omit<AccountSummaryRequestParams, "clientId">,
        token: string
    ): Promise<AccountSummaryResponse> {
        const response = await ApiCall<AccountSummaryResponse>(
            "POST",
            "/api/account-summary/view",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch all clients account summary");
    }

    async getSingleAccountSummary(
        clientId: string,
        params: Omit<AccountSummaryRequestParams, "clientIds" | "clientId">,
        token: string
    ): Promise<AccountSummaryResponse> {
        const response = await ApiCall<AccountSummaryResponse>(
            "POST",
            `/api/account-summary/view/${clientId}`,
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch single client account summary");
    }

    async refreshAccountSummary(token: string): Promise<any> {
        const response = await ApiCall<any>(
            "GET",
            "/api/account-summary/refresh",
            {},
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            toast.success("Account Summary refreshed successfully!");
            return response.data;
        }

        toast.error("Failed to refresh account summary");
        throw new Error("Failed to refresh account summary");
    }

    async hideClients(
        clientIds: string[],
        moduleKey: string,
        hiddenBy: string,
        token: string
    ): Promise<HideClientResponse> {
        const response = await ApiCall<HideClientResponse>(
            "POST",
            "/api/hide-client",
            {
                client_ids: clientIds,
                module_key: moduleKey,
                hidden_by: hiddenBy
            },
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            toast.success("Client hidden successfully");
            return response.data;
        }

        toast.error("Failed to hide clients");
        throw new Error("Failed to hide clients");
    }

    async unhideClients(
        clientIds: string[],
        moduleKey: string,
        token: string
    ): Promise<UnhideClientResponse> {
        const results = await Promise.all(
            clientIds.map(clientId =>
                ApiCall<any>(
                    "DELETE",
                    `/api/hide-client/${clientId}?module_key=${moduleKey}`,
                    {},
                    {
                        Authorization: token,
                        modulekey: MODULE_KEY
                    }
                )
            )
        );

        const unhiddenIds = results
            .filter(r => r && 'data' in r && r.status === 200 && r.data?.success)
            .map(r => ('data' in r && r.data?.data?.client_id) ? r.data.data.client_id : '')
            .filter(id => id !== '');

        if (unhiddenIds.length > 0) {
            toast.success(`${unhiddenIds.length} client(s) unhidden successfully`);
        } else {
            toast.error("Failed to unhide clients");
        }

        return {
            success: true,
            message: `${unhiddenIds.length} client(s) unhidden successfully`,
            unhiddenClientIds: unhiddenIds
        };
    }

    async getHiddenClients(
        moduleKey: string,
        token: string
    ): Promise<GetHiddenClientsResponse> {
        const response = await ApiCall<GetHiddenClientsResponse>(
            "GET",
            `/api/hide-client?module_key=${moduleKey}`,
            "",
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch hidden clients");
    }

    async triggerHourlyCron(
        params: TriggerCronRequest,
        token: string
    ): Promise<TriggerCronResponse> {
        const response = await ApiCall<TriggerCronResponse>(
            "POST",
            "/api/cron/trigger-hourly",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to trigger hourly cron");
    }

    async getCronStatus(token: string): Promise<GetCronStatusResponse> {
        const response = await ApiCall<GetCronStatusResponse>(
            "GET",
            "/api/cron/status",
            "",
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch cron status");
    }

    async getSportPerformanceReport(
        params: PerformanceReportRequest,
        token: string
    ): Promise<PerformanceReportResponse> {
        const response = await ApiCall<PerformanceReportResponse>(
            "POST",
            "/api/performance/reportV2",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch performance report");
    }

    async getPerformanceEntities(
        params: GetPerformanceEntitiesRequest,
        token: string
    ): Promise<GetPerformanceEntitiesResponse> {
        const response = await ApiCall<GetPerformanceEntitiesResponse>(
            "GET",
            "/api/performance",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch performance entities");
    }

    async getTeamPerformanceReport(
        clientId: string,
        params: { end_date?: string; league?: string },
        token: string
    ): Promise<any> {
        return await ApiCall<any>(
            "GET",
            `/api/team-performance/${clientId}`,
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY
            }
        );
    }
}

export const accountSummaryService = new AccountSummaryService();