import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { NETWORKS } from '../config/networkHandler';

/**
 * BullmQ: https://api.docs.bullmq.io/
 * Doc: https://docs.bullmq.io/
 */
export const queues: Record<string, Queue> = {};
Object.entries(NETWORKS).forEach(([network, config]) => {
  queues[network] = new Queue(config.queue, {
    connection: redisConnection
  });
  // console.log("queues==>",queues);
});