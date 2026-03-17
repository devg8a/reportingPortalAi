import express from "express";
import { impactJobCompletionWebhook } from "../controllers/webhookController";

const router = express.Router();

router.get("/impact-jobs-completion",impactJobCompletionWebhook);

export default router;