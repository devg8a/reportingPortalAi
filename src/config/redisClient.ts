import { createClient } from 'redis';
import logger from '../utils/logger';
import 'dotenv/config';

let redisClient;
if (process.env.NODE_ENV == 'local') {
  // Use remote Redis for local development to avoid local setup requirements
  redisClient = createClient({
    url: "redis://default:Jpi7bwutvQLLVnzZBf1gKy7wX6nqgUBQ@redis-10756.c99.us-east-1-4.ec2.cloud.redislabs.com:10756",
  });
} else {
  redisClient = createClient({
    url: "redis://default:Jpi7bwutvQLLVnzZBf1gKy7wX6nqgUBQ@redis-10756.c99.us-east-1-4.ec2.cloud.redislabs.com:10756",
  });

  /**const redisClient = createClient({
      username: 'default',
      password: 'Jpi7bwutvQLLVnzZBf1gKy7wX6nqgUBQ',
      socket: {
          host: 'redis-10756.c99.us-east-1-4.ec2.cloud.redislabs.com',
          port: 10756
      }
  });**/
}


redisClient.on('error', err => {
  console.error('Redis error: ', err);
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info("**Redis Connected**");
  }
}

export default redisClient;