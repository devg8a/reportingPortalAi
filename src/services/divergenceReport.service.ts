import { ApiCall } from "../helper/axios";
import {
    DivergenceReportRequest,
    DivergenceReportResponse,
} from "../types/divergenceReport.types";

const MODULE_KEY = "divergence_report";

class DivergenceReportService {
    async getReport(
        params: DivergenceReportRequest,
        token: string
    ): Promise<DivergenceReportResponse> {
        const response = await ApiCall<DivergenceReportResponse>(
            "POST",
            "/api/divergence-report/view",
            params,
            {
                Authorization: token,
                modulekey: MODULE_KEY,
            }
        );

        if (response && typeof response === "object" && "data" in response) {
            return response.data;
        }

        throw new Error("Failed to fetch divergence report");
    }
}

export const divergenceReportService = new DivergenceReportService();
