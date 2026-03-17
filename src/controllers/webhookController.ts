import impactJobs from "../db/models/impactJobs";

export const impactJobCompletionWebhook = async (req, res) => {
    try {
        const jobId = req?.query?.jobId;
        const accountId = req?.query?.AccountId;
        const apiResultUri = req?.query?.ApiResultUri;

        console.log("jobId:", jobId);
        console.log("accountId:", accountId);
        console.log("apiResultUri:", apiResultUri);
        await impactJobs.updateOne(
            { job_id: jobId },
            { $set: { status: "completed" } }
        );
        res.sendStatus(200);
    } catch (err) {
        console.error("Impact webhook error: ",err);
        res.sendStatus(500);
    }
};