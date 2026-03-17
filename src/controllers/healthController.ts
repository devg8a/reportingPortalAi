import { MetaService } from '../liberaries/PaidMedia/Meta/metaLib';
import { AdwordService } from '../liberaries/PaidMedia/Adword/AdwordLib';
import { CriteoService } from "../liberaries/PaidMedia/Criteo/CriteoLib";
import { BingService } from "../liberaries/PaidMedia/Bing/BingLib";
import logger from '../utils/logger';

export const allApiHealth = async (req, res) => {
    try {
        const services = {
            meta:   () => new MetaService().getMetaAccounts(),
            adword: () => new AdwordService().getAllAccounts(),
            criteo: () => new CriteoService().getAllAccounts(),
            bing:   () => new BingService().getAllAccounts()
        };

        const results = await Promise.allSettled(
            Object.entries(services).map(([_, fn]) => fn())
        );

        const apiHealthResponse = {};

        Object.keys(services).forEach((serviceName, index) => {
            const result = results[index];

            if (result.status === 'fulfilled') {
                const data = result.value;

                apiHealthResponse[serviceName] =
                    Array.isArray(data) && data.length > 0
                        ? 'ok'
                        : 'empty';
            } else {
                apiHealthResponse[serviceName] = {
                    status: 'error',
                    message: result.reason?.message || 'Unknown error'
                };
            }
        });

        res.status(200).json({
            status_code: 200,
            status: true,
            message: 'API health check completed',
            data: apiHealthResponse
        });

    } catch (error) {
        // This should almost never happen now
        logger.error(error, 'Unexpected error in API health');
        res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Unexpected server error',
            data: error
        });
    }
};
