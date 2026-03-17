import IORedis from 'ioredis';
import 'dotenv/config';
import logger from '../utils/logger';

export const redisConnection = new IORedis({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null
});

redisConnection.on('connect', () => {
    logger.info('**IO Redis Connected**');
});

redisConnection.on('error', (err) => {
    logger.error(err, 'Redis Error: ');
});