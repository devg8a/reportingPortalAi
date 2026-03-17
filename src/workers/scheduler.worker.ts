import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import schedularLogs from "../db/models/schedularLogs";
import { callNetworkAPI } from "../services/api.service";
import { NETWORKS } from '../config/networkHandler';
import mongoose from "mongoose";
import {
  checkKlaviyoDailyLimit,
  checkAwinLimit,
} from "../services/rateLimit.service";

interface JobData {
  logId: string;
}

async function startWorkers() {
  // ✅ CONNECT DB ONCE
  await mongoose.connect(process.env.DB_URL as string, {
    maxPoolSize: 100,
  });

  console.log("MongoDB connected for Worker");

  Object.entries(NETWORKS).forEach(([network, config]) => {
    try {
      const worker = new Worker(
        config.queue,
        async (job) => {
          const { logId } = job.data;

          // ✅ USE LEAN (FASTER)
          const log = await schedularLogs
            .findById(logId)
            .populate("connection_id")
            .lean();

          if (!log) return;

          // ---------- RATE LIMIT (ONLY WHERE NEEDED) ----------

          if (network === "awin") {
            const allowed = await checkAwinLimit();
            if (!allowed) {
              throw new Error("AWIN rate limit reached");
            }
          }

          if (network === "klaviyo") {
            const allowed = await checkKlaviyoDailyLimit(
              log?.connection_id?._id
            );

            if (!allowed) {
              throw new Error("Klaviyo daily limit reached");
            }
          }

          // ---------- API CALL ----------
          // console.log("log AT worker==>",log)
          await callNetworkAPI(network, log);
        },
        {
          connection: redisConnection,
          concurrency: config.concurrency,
          limiter: config.limiter,
        }
      );

      // ✅ FAILURE HANDLING
      worker.on("failed", async (job, err) => {
        if (!job) return;

        await schedularLogs.updateOne(
          { _id: job.data.logId },
          {
            status: "error",
            error: err,
          }
        );
      });

      console.log(`✅ ${network} worker started`);
    } catch (error) {
      console.error(`❌ ${network} worker failed to start`, error);
    }
  });
}
startWorkers();