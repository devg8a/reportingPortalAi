import schedularLogs from "./db/models/schedularLogs";
import { queues } from "./queues/scheduler.queue";

export const enqueuePendingJobs = async (): Promise<void> => {
  const pendingLogs = await schedularLogs
    .find({ status: "pending" })
    .sort({ priority: 1, createdAt: 1 })
    .limit(500);
  console.log("pendingLogs==>",pendingLogs.length);
  if (!pendingLogs.length) return;

  const ids = pendingLogs.map((l) => l._id);

  // mark processing
  await schedularLogs.updateMany(
    { _id: { $in: ids }, status: "pending" },
    { status: "processing" }
  );

  // 🔥 GROUP JOBS BY NETWORK
  const jobsByNetwork: Record<string, any[]> = {};

  for (const log of pendingLogs) {
    const network = log.network; // 👈 IMPORTANT FIELD

    if (!queues[network]) {
      console.warn(`No queue found for network: ${network}`);
      continue;
    }

    if (!jobsByNetwork[network]) {
      jobsByNetwork[network] = [];
    }

    jobsByNetwork[network].push({
      name: "processNetworkJob",
      data: { logId: log._id.toString() },
      opts: {
        priority: log?.priority ?? 10,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 60000,
        },
        removeOnComplete: true,
      },
    });
  }

  // 🚀 ADD BULK PER NETWORK (VERY FAST)
  await Promise.all(
    Object.entries(jobsByNetwork).map(([network, jobs]) =>
      queues[network].addBulk(jobs)
    )
  );
};