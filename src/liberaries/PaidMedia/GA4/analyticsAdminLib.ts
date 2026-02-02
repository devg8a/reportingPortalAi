import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import path from 'path';

/**
 * Documentation: https://developers.google.com/analytics/devguides/config/admin/v1
 */
export class AnalyticsAdminService{
    private client: AnalyticsAdminServiceClient;
    
    constructor() {
        this.client = new AnalyticsAdminServiceClient({
            keyFilename: path.join(process.cwd(),'/service_account_credentials.json'),
            // keyFilename: path.join(__dirname, '/development_service_account.json'),
        });
    }

    async listAccounts() {
        const [accounts] = await this.client.listAccounts();
        const accountsList = accounts.map(acc => ({
            name: acc.name,
            displayName: acc.displayName,
        }));
        const accountListWithProperty = await this.getPoperties(accountsList);
        return accountListWithProperty;
    }

    async getPoperties(accountsList) {
        const ga4AccountPropertyList = [];
        if(accountsList.length){
            for (const account of accountsList) {
            const accountId = account.name.split('/').pop()
            const [properties] = await this.client.listProperties({
                filter: `parent:accounts/${accountId}`,
            });

            properties.forEach((propertyData, index) => {
                const propertyId = propertyData.name.split('/').pop()
                ga4AccountPropertyList.push({
                    propertyId:propertyId,
                    propertyName:propertyData?.displayName,
                    accountId: accountId,
                    accountName:account?.displayName,
                    timeZone:propertyData?.timeZone,
                    currencyCode:propertyData?.currencyCode
                });
            });
            }
        }
        return ga4AccountPropertyList;
    }
}

