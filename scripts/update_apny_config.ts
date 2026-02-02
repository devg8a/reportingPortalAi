
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ClientDetails from '../src/db/models/clientDetails';
import ClientConnections from '../src/db/models/clientConnections';
import connectDB from '../src/db/connection';

dotenv.config();

// **********************************************************
// TODO: REPLACE THIS WITH THE REAL META ACCOUNT ID
const NEW_META_ID = 'ENTER_REAL_ID_HERE';
// **********************************************************

const updateClientConfig = async () => {
    if (NEW_META_ID === 'ENTER_REAL_ID_HERE') {
        console.error('❌ PLEASE EDIT THE SCRIPT AND UPDATE "NEW_META_ID" WITH THE REAL ID FIRST!');
        process.exit(1);
    }

    await connectDB();

    try {
        const client = await ClientDetails.findOne({ name: 'APNY Apparel' });
        if (!client) {
            console.log('Client "APNY Apparel" not found.');
            return;
        }

        console.log(`Updating Meta ID for ${client.name}...`);

        const result = await ClientConnections.updateOne(
            { client_id: client._id, network: 'meta' },
            { $set: { value: NEW_META_ID } }
        );

        if (result.matchedCount === 0) {
            console.log('Meta connection not found. Creating new connection...');
            await ClientConnections.create({
                client_id: client._id,
                network: 'meta',
                value: NEW_META_ID,
                is_primary: true,
                is_backed_data_synced: false
            });
            console.log('✅ Created new Meta connection.');
        } else {
            console.log(`✅ Updated existing Meta connection. New ID: ${NEW_META_ID}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

updateClientConfig();
