import axios from 'axios';

const verifyApi = async () => {
    try {
        const payload = {
            startDate: "2026-01-16",
            endDate: "2026-01-16"
        };

        console.log("Calling Account Summary API...");
        const response = await axios.post('http://localhost:3002/api/account-summary/view', payload);

        if (!response.data || !response.data.success) {
            console.error("API call failed or returned success: false");
            return;
        }

        const rows = response.data.data.rows;
        if (!rows || rows.length === 0) {
            console.warn("No client rows returned.");
            return;
        }

        const client = rows[0];
        console.log(`Checking Client: ${client.client_name}`);

        const networks = client.networks;
        if (networks.length > 0 && networks[0].network === "All Channels") {
            const allChannels = networks[0];
            console.log("✅ 'All Channels' found at index 0.");
            console.log("Stats:", {
                spend: allChannels.spend,
                revenue: allChannels.revenue,
                clicks: allChannels.clicks
            });

            if (Object.keys(allChannels.timeseries).length > 0) {
                console.log(`✅ Time series data present with ${Object.keys(allChannels.timeseries).length} keys.`);
                const firstKey = Object.keys(allChannels.timeseries)[0];
                console.log(`Sample Time Series Data (${firstKey}):`, allChannels.timeseries[firstKey]);
            } else {
                console.warn("⚠️ No time series data keys found in All Channels.");
            }
        } else {
            console.error("❌ 'All Channels' NOT found at index 0.");
            console.log("First network is:", networks[0]?.network);
        }

    } catch (error) {
        console.error("Verification Error:", error.message);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    }
};

verifyApi();
