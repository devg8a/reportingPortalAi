import { ApiCall } from "../helper/axios";

/**
 * Client interface
 */
export interface Client {
    _id: string;
    name: string;
    status: string;
    type: string;
    main_account_id?: any;
    roles_id?: any;
    setting?: any;
}

/**
 * API Response for active clients
 */
export interface ActiveClientsResponse {
    success: boolean;
    message: string;
    data: Client[];
}

/**
 * Utility Service
 * Handles common utility API calls
 */
class UtilityService {
    /**
     * Fetch all active paid media clients
     */
    async getActiveClients(token: string): Promise<ActiveClientsResponse> {
        const response = await ApiCall<ActiveClientsResponse>(
            "GET",
            "/api/utility/clients/active",
            "",
            {
                Authorization: token,
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch active clients");
    }

    /**
     * Fetch client by ID
     */
    async getClientById(clientId: string, token: string): Promise<any> {
        const response = await ApiCall<any>(
            "GET",
            `/api/utility/clients/${clientId}`,
            "",
            {
                Authorization: token,
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch client");
    }

    /**
     * Fetch clients by filter
     */
    async getClientsByFilter(filter: any, token: string): Promise<any> {
        const response = await ApiCall<any>(
            "POST",
            "/api/utility/clients/filter",
            filter,
            {
                Authorization: token,
            }
        );

        if (response && "data" in response && response.status === 200) {
            return response.data;
        }

        throw new Error("Failed to fetch clients");
    }
}

// Export singleton instance
export const utilityService = new UtilityService();
