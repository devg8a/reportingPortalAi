import redisClient from '../config/redisClient';

export const cache =
  (keyBuilder: (req: any) => string, ttl = 60) =>
  async (req, res, next) => {
    try {
      const key = keyBuilder(req);

      // 1️⃣ Check cache
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        const data = typeof cachedData === 'string' ? cachedData : cachedData.toString();
        return res.status(200).json(JSON.parse(data));
      }

      // 2️⃣ Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        redisClient.setEx(key, ttl, JSON.stringify(body));
        return originalJson(body);
      };
      next();
    } catch (err) {
      console.error('Cache middleware error:', err);
      next(); // fallback to controller
    }
  };
