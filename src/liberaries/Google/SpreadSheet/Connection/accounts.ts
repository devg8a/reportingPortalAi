import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(),'/service_account_credentials.json');
const creds    = JSON.parse(fs.readFileSync(filePath).toString());

const auth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

export async function readGoogleSheet(spreadsheetId: string, tabName: string) {
  await auth.authorize();
  
  const doc = new GoogleSpreadsheet(spreadsheetId, auth);
  await doc.loadInfo();
  
  const sheet = doc.sheetsByTitle[tabName];
  if (!sheet) {
    throw new Error(`Sheet "${tabName}" not found. Available sheets: ${Object.keys(doc.sheetsByTitle).join(', ')}`);
  }
  
  const rows = await sheet.getRows();
  
  
  // Check row type and handle accordingly
  if (rows.length > 0 && rows[0].toObject && typeof rows[0].toObject === 'function') {
    return rows.map(row => row.toObject());
  } else {
    await sheet.loadHeaderRow();
    return rows.map(row => {
      const rowObj = {};
      sheet.headerValues.forEach(header => {
        rowObj[header] = row[header] || row.get?.(header);
      });
      return rowObj;
    });
  }
}
