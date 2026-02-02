
import { analyticsDataService } from '../liberaries/PaidMedia/GA4/analyticsDataLib';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runDebug = async () => {
    // REPLACE THIS WITH THE ID YOU WANT TO TEST
    const TEST_PROPERTY_ID = '331311778';

    console.log(`Testing GA4 Fetch for Property ID: ${TEST_PROPERTY_ID}`);

    // 1. Get Service Account Client Email
    try {
        const keyPath = path.join(process.cwd(), '/service_account_credentials.json');
        if (fs.existsSync(keyPath)) {
            const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
            console.log("ℹ️  Using Service Account Email:", keyFile.client_email);
            console.log("⚠️  PLEASE ENSURE this email is added as a user in GA4 > Admin > Property Access Management");
        } else {
            console.error("❌ service_account_credentials.json NOT FOUND at:", keyPath);
            return;
        }
    } catch (e) {
        console.error("Error reading credentials file:", e);
    }

    const service = new analyticsDataService();

    try {
        console.log("Fetching data for 2026-01-01 to 2026-01-14...");
        const data = await service.fetchAnalyticsReport({
            accountId: TEST_PROPERTY_ID,
            startDate: '2026-01-01',
            endDate: '2026-01-14',
            clientId: 'DEBUG_TEST'
        });

        console.log("------------------------------------------");
        console.log("Raw Data Received (Keys are dates):");
        console.log(JSON.stringify(data, null, 2));
        console.log("------------------------------------------");

        if (Object.keys(data).length === 0) {
            console.log("⚠️ No data returned.");
        } else {
            console.log("✅ Data successfully fetched!");
        }

    } catch (error) {
        console.error("❌ Error fetching data:", error);
    }
};

runDebug();
