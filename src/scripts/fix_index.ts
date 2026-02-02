
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

const fixIndex = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is not defined in .env");
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected!");

        // Target collection: central_storage_2026
        // Note: In dynamic-central-model, the collection name is passed directly
        const collectionName = 'central_storage_2026';
        const db = mongoose.connection.db;

        if (!db) {
            throw new Error("Database connection execution failed");
        }

        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();

        console.log(`Indexes on ${collectionName}:`);
        indexes.forEach(idx => console.log(` - ${idx.name}:`, idx.key));

        // The bad index likely has name 'client_id_1_network_1_date_1'
        // We want to drop it if it exists and DOES NOT include connection_id
        const badIndexName = 'client_id_1_network_1_date_1';

        const badIndex = indexes.find(i => i.name === badIndexName);

        if (badIndex) {
            console.log(`Found incorrect index: ${badIndexName}. Dropping it...`);
            await collection.dropIndex(badIndexName);
            console.log(`✅ Dropped index ${badIndexName}.`);
            console.log("The correct index (including connection_id) should be created automatically by Mongoose on next application startup or insert.");
        } else {
            console.log(`ℹ️ Index ${badIndexName} not found. Checking if any similar index exists...`);
            // Check if there is ANY unique index on client+network+date without connection_id
            const conflictingIndex = indexes.find(i =>
                i.key.client_id && i.key.network && i.key.date && !i.key.connection_id && i.unique
            );
            if (conflictingIndex) {
                console.log(`Found conflicting index with name: ${conflictingIndex.name}. Dropping...`);
                await collection.dropIndex(conflictingIndex.name);
                console.log(`✅ Dropped index ${conflictingIndex.name}.`);
            } else {
                console.log("No conflicting indexes found.");
            }
        }

        await mongoose.disconnect();
        console.log("Done.");

    } catch (error) {
        console.error("Error fixing index:", error);
        process.exit(1);
    }
};

fixIndex();
