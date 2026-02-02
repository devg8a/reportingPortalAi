
import { createClient } from 'redis';

const testRedis = async () => {
    const url = "redis://default:Jpi7bwutvQLLVnzZBf1gKy7wX6nqgUBQ@redis-10756.c99.us-east-1-4.ec2.cloud.redislabs.com:10756";
    console.log(`Testing connection to: ${url}`);

    const client = createClient({ url });

    client.on('error', (err) => console.error('Redis Client Error', err));

    try {
        await client.connect();
        console.log('✅ Successfully connected to remote Redis!');
        await client.disconnect();
    } catch (error) {
        console.error('❌ Failed to connect to remote Redis:', error);
    }
};

testRedis();
