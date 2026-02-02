import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import logger from "../../utils/logger";
import PerformanceEntities from "../../db/models/performanceEntity"

/**
 * service account email: g8a-dev@v2reportingportal.iam.gserviceaccount.com
 */

interface GoogleCreds {
  client_email : string;
  private_key  : string;
}

export class SheetLib {
  private filePath: string;
  private creds: GoogleCreds;
  private auth: JWT;

  constructor() {
    this.filePath = path.join(
      process.cwd(),
      'service_account_credentials.json'
    );

    this.creds = JSON.parse(
      fs.readFileSync(this.filePath, 'utf8')
    ) as GoogleCreds;

    this.auth = new JWT({
      email : this.creds.client_email,
      key   : this.creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  async readGoogleSheet(spreadsheetId: string, tabName: string | null = null) {
    try{
        await this.auth.authorize();
        const doc = new GoogleSpreadsheet(spreadsheetId, this.auth);
        await doc.loadInfo();

        const sheet = tabName ? doc.sheetsByTitle[tabName] : doc.sheetsByIndex[0];
        if (!sheet) {
            throw new Error(`Sheet "${tabName}" not found. Available sheets: ${Object.keys(doc.sheetsByTitle).join(', ')}`
        );
        }
    
        const rows = await sheet.getRows();
        
        //Check row type and handle accordingly
        var rowDataList = {};
        if (rows.length > 0 && rows[0].toObject && typeof rows[0].toObject === 'function') {
            rowDataList = rows.map(row => row.toObject());
        } else {
            await sheet.loadHeaderRow();
            rowDataList = rows.map(row => {
                const rowObj = {};
                sheet.headerValues.forEach(header => {
                    rowObj[header] = row[header] || row.get?.(header);
                });
                return rowObj;
            });
        }
        this.storageScript(rowDataList);
        return rowDataList;
    }catch(error){
        logger.error(error,"Google Sheet read error: ");
    }
  }

  async storageScript(rawData){
    type MetaIds = {
        main_account?: string;
        nba?: string;
        nhl?: string;
        mlb?: string;
        nfl?: string;
    };

    type AdwordIds = {
        ad_group_id?: string;
        asset_group_id?: string;
    };
    
    const formattedData = rawData.map(item => {
        const meta: MetaIds = {};
        const adword: AdwordIds = {};

        if (item?.main_account && item.main_account !== 'NULL')
            meta.main_account = item.main_account;

        if (item?.nba && item.nba !== 'NULL')
            meta.nba = item.nba;

        if (item?.nhl && item.nhl !== 'NULL')
            meta.nhl = item.nhl;

        if (item?.mlb && item.mlb !== 'NULL')
            meta.mlb = item.mlb;

        if (item?.nfl && item.nfl !== 'NULL')
            meta.nfl = item.nfl;

        if (item?.adword_ad_group_id && item.adword_ad_group_id !== 'NULL')
            adword.ad_group_id = item.adword_ad_group_id;

        if (item?.adword_asset_group_id && item.adword_asset_group_id !== 'NULL')
            adword.asset_group_id = item.adword_asset_group_id;

        return {
            group_name: item?.group_name,
            entity_name: item?.entity_name,
            ...(Object.keys(meta).length ? { meta: meta } : {}),
            ...(Object.keys(adword).length ? { adword: adword } : {}),
            status: item?.status ?? 'active',
        };
    });
    console.log('formattedData==>',formattedData);
    const clientId = "696e8023b19c0740ef424746";
    const bulkOps = formattedData.map(item => ({
    updateOne: {
        filter: {
        client_id: clientId,
        group_name: item.group_name,
        entity_name: item.entity_name,
        },
        update: {
        $set: item,
        },
        upsert: true,
    },
    }));
    await PerformanceEntities.bulkWrite(bulkOps);
    return true;
  }
}