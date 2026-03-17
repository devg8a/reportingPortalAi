import { redisConnection } from '../config/redis';

export const checkKlaviyoDailyLimit = async (connectionId): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  const key = `klaviyo:${connectionId}_${today}`;
  const current = await redisConnection.get(key);

  if (current && Number(current) >= 225) {
    return false;
  }

  await redisConnection.incr(key);
  await redisConnection.expire(key, 86400);

  return true;
};

export const checkAwinLimit = async (): Promise<boolean> => {

  const now = new Date();
  const minuteKey = now.toISOString().slice(0,16);
  const key = `awin:${minuteKey}`;
  const current = await redisConnection.incr(key);

  if (current === 1) {
    await redisConnection.expire(key, 60);
  }

  if (current > 20) {
    return false;
  }

  return true;
};