
import axios from 'axios';

const BASE_URL = 'http://localhost:3002/api';

async function testAccountSummary() {
    try {
        console.log(`--- Testing Fetch All Clients from ${BASE_URL}/account-summary/view ---`);
        const allRes = await axios.post(`${BASE_URL}/account-summary/view`, {
            startDate: '2024-01-20',
            endDate: '2024-01-22'
        });

        console.log('Fetch All Status:', allRes.status);
        // Response structure: { success: true, data: [...], ... }
        const allClients = allRes.data.data;

        if (Array.isArray(allClients) && allClients.length > 0) {
            console.log(`Success. Fetched ${allClients.length} clients.`);

            const firstClient = allClients[0];
            // client_id is likely in 'client_id' or '_id'
            const clientId = firstClient.client_id || firstClient._id;
            console.log(`Picking Client ID: ${clientId} for single fetch test.`);

            if (!clientId) {
                console.error("Could not find client ID in object", firstClient);
                return;
            }

            console.log('\n--- Testing Fetch Single Client ---');
            const singleRes = await axios.post(`${BASE_URL}/account-summary/view/${clientId}`, {
                startDate: '2024-01-20',
                endDate: '2024-01-22'
            });

            console.log('Single Fetch Status:', singleRes.status);
            const singleClientData = singleRes.data.data;

            if (Array.isArray(singleClientData) && singleClientData.length === 1) {
                console.log('Success. Fetched exactly 1 client.');
                const fetchedId = singleClientData[0].client_id || singleClientData[0]._id;

                if (fetchedId === clientId) {
                    console.log('Client ID matches.');
                } else {
                    console.error(`Client ID mismatch! Expected ${clientId}, got ${fetchedId}`);
                }
            } else {
                console.error('Failed. Expected array of length 1.', singleClientData ? `Got length ${singleClientData.length}` : 'Got null/undefined');
            }

        } else {
            console.log('No clients returned. Cannot test single client.', allRes.data);
        }

    } catch (error: any) {
        if (error.response) {
            console.error('Error Response status:', error.response.status);
            console.error('Error Response data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received (Is the server running on port 3002?)');
        } else {
            console.error('Error setting up request:', error.message);
        }
    }
}

testAccountSummary();
