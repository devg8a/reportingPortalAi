
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ClientDetails from '../src/db/models/clientDetails';
import ClientConnections from '../src/db/models/clientConnections';
import Integrations from '../src/db/models/integrations';
import connectDB from '../src/db/connection';

dotenv.config();

const findClientConfig = async () => {
    await connectDB();

    try {
        const client = await ClientDetails.findOne({ name: 'APNY Apparel' });
        if (!client) {
            console.log('Client "APNY Apparel" not found.');
            return;
        }


        const fs = require('fs');
        let output = `Client Found: ${client.name} ${client._id}\n`;

        const connections = await ClientConnections.find({ client_id: client._id });
        output += '\n--- Client Connections ---\n';
        connections.forEach(c => {
            output += `Network: ${c.network}, Value: ${c.value}, Primary: ${c.is_primary}\n`;
        });

        const integrations = await Integrations.find({ client_id: client._id });
        output += '\n--- Integrations ---\n';
        integrations.forEach(i => {
            output += `Network: ${i.network}, AccountID: ${i.account_id}, StoreURL: ${i.store_url}\n`;
        });

        fs.writeFileSync('apny_config.log', output);
        console.log('Use view_file to read apny_config.log');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

findClientConfig();
