import moment from "moment";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import clientConnections from "../db/models/clientConnections";
import PerformanceEntitiesSchema from "../db/models/performanceEntity";
import { MetaService } from "../liberaries/PaidMedia/Meta/metaLib";

const CLIENT_ID = "6979ee13c7c7b575bab41b52";
const CLIENT_NAME = "Pro Standard";

// Account name → meta key mapping
const accountNameToKey: Record<string, string> = {
    "Main account": "main_account",
    "main account": "main_account",
    "NBA": "nba",
    "NFL": "nfl",
    "NHL": "nhl",
    "MLB": "mlb"
};

// Email configuration
const EMAIL_CONFIG = {
    to: ["dev-team@company.com"], // Add recipients here
    from: "noreply@company.com"
};

console.log("New Ads Auto-Mapper Cron Loaded...");

// ─────────────────────────────────────────────────────────────
// MATCH ENTITY BY AD NAME (group_name + entity_name exact word match)
// ─────────────────────────────────────────────────────────────
function matchEntityByAdName(adName: string, entities: any[]): any | null {
    if (!adName) return null;

    const nameLower = adName.toLowerCase();

    for (const entity of entities) {
        const groupName = String(entity.group_name || "").toLowerCase();
        const entityName = String(entity.entity_name || "").toLowerCase();

        if (!groupName || !entityName) continue;

        // Group name exact word match
        const groupMatch = nameLower.includes(groupName);
        if (!groupMatch) continue;

        // Entity name exact word match
        const entityMatch = nameLower.includes(entityName);
        if (!entityMatch) continue;

        // Both matched
        return entity;
    }

    return null;
}

// ─────────────────────────────────────────────────────────────
// SEND EMAIL REPORT
// ─────────────────────────────────────────────────────────────
interface AdRecord {
    account_name: string;
    account_id: string;
    ad_id: string;
    ad_name: string;
    created_time: string;
    status: "mapped" | "skipped" | "duplicate";
    matched_entity?: string;
}

async function sendEmailReport(
    adRecords: AdRecord[],
    startDate: string,
    endDate: string
) {
    if (!adRecords.length) {
        console.log("📧 No ads to report, skipping email...");
        return;
    }

    const formattedStartDate = moment(startDate).format("DD/MM/YYYY");
    const formattedEndDate = moment(endDate).format("DD/MM/YYYY");

    // Separate mapped and skipped ads
    const mappedAds = adRecords.filter(a => a.status === "mapped");
    const skippedAds = adRecords.filter(a => a.status === "skipped");
    const duplicateAds = adRecords.filter(a => a.status === "duplicate");

    // Build HTML table rows
    const buildTableRows = (ads: AdRecord[], showEntity: boolean = false) => {
        return ads.map(ad => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${ad.account_name} (${ad.account_id})</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ad.ad_id}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ad.ad_name}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${ad.created_time}</td>
                ${showEntity ? `<td style="border: 1px solid #ddd; padding: 8px;">${ad.matched_entity || "-"}</td>` : ""}
            </tr>
        `).join("");
    };

    // Build HTML email
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                table { border-collapse: collapse; width: 100%; margin: 15px 0; }
                th { background-color: #4CAF50; color: white; padding: 10px; text-align: left; border: 1px solid #ddd; }
                td { padding: 8px; border: 1px solid #ddd; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .section-title { color: #2c3e50; margin-top: 25px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px; }
                .summary-box { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
                .success { color: #27ae60; }
                .warning { color: #f39c12; }
                .error { color: #e74c3c; }
            </style>
        </head>
        <body>
            <p>Hi Dev Team,</p>
            
            <p>I'm reaching out to inform you about ad(s) created between <strong>(${formattedStartDate} to ${formattedEndDate})</strong> in <strong>${CLIENT_NAME}</strong>. Below, you'll find the details:</p>
            
            <!-- Summary Box -->
            <div class="summary-box">
                <strong>📊 Summary:</strong><br>
                <span class="success">✅ Mapped: ${mappedAds.length}</span> | 
                <span class="warning">⏭️ Skipped (No Match): ${skippedAds.length}</span> | 
                <span class="error">🔄 Duplicates: ${duplicateAds.length}</span> |
                <strong>Total: ${adRecords.length}</strong>
            </div>

            ${mappedAds.length > 0 ? `
                <h3 class="section-title success">✅ Successfully Mapped Ads (${mappedAds.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Name/ID</th>
                            <th>Ad ID</th>
                            <th>Ad Name</th>
                            <th>Created DateTime</th>
                            <th>Matched Entity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${buildTableRows(mappedAds, true)}
                    </tbody>
                </table>
            ` : ""}

            ${skippedAds.length > 0 ? `
                <h3 class="section-title warning">⚠️ Skipped Ads - No Entity Match (${skippedAds.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Name/ID</th>
                            <th>Ad ID</th>
                            <th>Ad Name</th>
                            <th>Created DateTime</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${buildTableRows(skippedAds, false)}
                    </tbody>
                </table>
                <p><em>⚠️ Please manually check and add these ads to appropriate entities.</em></p>
            ` : ""}

            ${duplicateAds.length > 0 ? `
                <h3 class="section-title error">🔄 Duplicate Ads - Already Exists (${duplicateAds.length})</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Account Name/ID</th>
                            <th>Ad ID</th>
                            <th>Ad Name</th>
                            <th>Created DateTime</th>
                            <th>Existing Entity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${buildTableRows(duplicateAds, true)}
                    </tbody>
                </table>
            ` : ""}

            <p>Please check the above listed ads in the <strong>${CLIENT_NAME} Sports Performance</strong> related <code>pro_standard_league_team</code> table in respective columns one day after created date/time mentioned & take appropriate actions accordingly.</p>
            
            <br>
            <p>Best Regards,<br>
            <strong>Automated Ads Mapper System</strong></p>
            
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #888;">
                This is an automated email. Please do not reply directly.<br>
                Generated at: ${moment().format("YYYY-MM-DD HH:mm:ss")} UTC
            </p>
        </body>
        </html>
    `;

    // Plain text version
    const textContent = `
Hi Dev Team,

I'm reaching out to inform you about ad(s) created between (${formattedStartDate} to ${formattedEndDate}) in ${CLIENT_NAME}. Below, you'll find the details:

SUMMARY:
- Mapped: ${mappedAds.length}
- Skipped (No Match): ${skippedAds.length}
- Duplicates: ${duplicateAds.length}
- Total: ${adRecords.length}

${mappedAds.length > 0 ? `
SUCCESSFULLY MAPPED ADS:
${mappedAds.map(ad => `- ${ad.account_name} (${ad.account_id}) | ${ad.ad_id} | ${ad.ad_name} | ${ad.created_time} | Entity: ${ad.matched_entity}`).join("\n")}
` : ""}

${skippedAds.length > 0 ? `
SKIPPED ADS (No Entity Match):
${skippedAds.map(ad => `- ${ad.account_name} (${ad.account_id}) | ${ad.ad_id} | ${ad.ad_name} | ${ad.created_time}`).join("\n")}
` : ""}

Please check the above listed ads in the ${CLIENT_NAME} Sports Performance related pro_standard_league_team table in respective columns one day after created date/time mentioned & take appropriate actions accordingly.

Best Regards,
Automated Ads Mapper System
    `;

    try {
        // Configure transporter (adjust based on your email service)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const mailOptions = {
            from: EMAIL_CONFIG.from,
            to: EMAIL_CONFIG.to.join(", "),
            subject: `[${CLIENT_NAME}] New Ads Report (${formattedStartDate} - ${formattedEndDate}) | Mapped: ${mappedAds.length} | Skipped: ${skippedAds.length}`,
            text: textContent,
            html: htmlContent
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent successfully to: ${EMAIL_CONFIG.to.join(", ")}`);

    } catch (error: any) {
        console.error("❌ Email sending failed:", error.message);
    }
}

// ─────────────────────────────────────────────────────────────
// MAIN CRON FUNCTION
// ─────────────────────────────────────────────────────────────
export async function runNewAdsAutoMapperCron() {
    const startTime = Date.now();
    console.log("═══════════════════════════════════════════════════════");
    console.log("NEW ADS AUTO-MAPPER CRON STARTED");
    console.log("═══════════════════════════════════════════════════════");

    // Track all ads for email report
    const adRecords: AdRecord[] = [];

    try {
        // ─────────────────────────────────────────────────────────
        // STEP 1: Date calculation (today-2 to today-1)
        // ─────────────────────────────────────────────────────────

        const startDate = moment.utc().subtract(2, "days").format("YYYY-MM-DD");
        const endDate = moment.utc().subtract(1, "days").format("YYYY-MM-DD");


        // const startDate = "2026-02-03";
        // const endDate = "2026-02-04";

        console.log(`📅 Date Range: ${startDate} → ${endDate}`);

        // ─────────────────────────────────────────────────────────
        // STEP 2: Fetch Meta connections for client
        // ─────────────────────────────────────────────────────────
        const metaConnections = await clientConnections.find({
            client_id: new mongoose.Types.ObjectId(CLIENT_ID),
            network: "meta"
        })
            .select("account_name value")
            .lean();

        if (!metaConnections.length) {
            console.log("❌ No Meta connections found for client");
            return;
        }

        console.log(`📡 Found ${metaConnections.length} Meta accounts`);
        metaConnections.forEach(conn => {
            console.log(`   → ${conn.account_name}: ${conn.value}`);
        });

        // ─────────────────────────────────────────────────────────
        // STEP 3: Fetch performance entities for client
        // ─────────────────────────────────────────────────────────
        const entities = await PerformanceEntitiesSchema.find({
            client_id: new mongoose.Types.ObjectId(CLIENT_ID)
        }).lean();

        if (!entities.length) {
            console.log("❌ No performance entities found for client");
            return;
        }

        console.log(`📦 Found ${entities.length} performance entities`);

        // ─────────────────────────────────────────────────────────
        // STEP 4: Fetch new ads from all Meta accounts (parallel)
        // ─────────────────────────────────────────────────────────
        const metaSvc = new MetaService();

        const newAdsPromises = metaConnections.map(async (conn) => {
            try {
                const ads = await metaSvc.fetchNewAds({
                    accountId: conn.value,
                    startDate,
                    endDate
                });

                console.log("adsssssssssssssssssssssssssss",
                    conn.account_name,
                    conn.value,
                    ads, "end colsolllllllllllllllllllllllllllllll"
                )

                return {
                    account_name: conn.account_name,
                    account_id: conn.value,
                    ads: ads || []
                };

            } catch (err: any) {
                console.error(`❌ Error fetching ads for ${conn.account_name}:`, err.message);
                return {
                    account_name: conn.account_name,
                    account_id: conn.value,
                    ads: []
                };
            }
        });

        const allAccountAds = await Promise.all(newAdsPromises);

        // ─────────────────────────────────────────────────────────
        // STEP 5: Process each ad and update entities
        // ─────────────────────────────────────────────────────────
        let totalAds = 0;
        let mappedAds = 0;
        let skippedAds = 0;
        let duplicateAds = 0;

        for (const accountData of allAccountAds) {
            const { account_name, account_id, ads } = accountData;

            if (!ads.length) {
                console.log(`📭 ${account_name}: No new ads`);
                continue;
            }

            console.log(`\n📬 ${account_name}: ${ads.length} new ads found`);

            // Get meta key from account name
            const metaKey = accountNameToKey[account_name];
            if (!metaKey) {
                console.log(`   ⚠️ Unknown account_name: "${account_name}", skipping...`);

                // Add to records as skipped
                ads.forEach((ad: any) => {
                    adRecords.push({
                        account_name,
                        account_id,
                        ad_id: String(ad.id),
                        ad_name: ad.name,
                        created_time: ad.created_time,
                        status: "skipped"
                    });
                });

                skippedAds += ads.length;
                continue;
            }

            for (const ad of ads) {
                totalAds++;

                const adId = String(ad.id);
                const adName = ad.name;
                const createdTime = ad.created_time;

                console.log(`\n   🔍 Processing: "${adName}"`);
                console.log(`      ID: ${adId}`);

                // Match entity by ad name
                const matchedEntity = matchEntityByAdName(adName, entities);

                if (!matchedEntity) {
                    console.log(`      ❌ No entity match found, skipping...`);

                    adRecords.push({
                        account_name,
                        account_id,
                        ad_id: adId,
                        ad_name: adName,
                        created_time: createdTime,
                        status: "skipped"
                    });

                    skippedAds++;
                    continue;
                }

                const matchedEntityName = `${matchedEntity.group_name} → ${matchedEntity.entity_name}`;
                console.log(`      ✅ Matched: ${matchedEntityName}`);

                // Check if ID already exists (duplicate check)
                const existingIds = String(matchedEntity.meta?.[metaKey] || "")
                    .split(",")
                    .map(id => id.trim())
                    .filter(id => id.length > 0);

                if (existingIds.includes(adId)) {
                    console.log(`      ⚠️ ID already exists, skipping...`);

                    adRecords.push({
                        account_name,
                        account_id,
                        ad_id: adId,
                        ad_name: adName,
                        created_time: createdTime,
                        status: "duplicate",
                        matched_entity: matchedEntityName
                    });

                    duplicateAds++;
                    continue;
                }

                // Append new ID
                const updatedIds = [...existingIds, adId].join(",");

                // Update in database
                await PerformanceEntitiesSchema.updateOne(
                    { _id: matchedEntity._id },
                    {
                        $set: {
                            [`meta.${metaKey}`]: updatedIds,
                            updated_at: new Date()
                        }
                    }
                );

                console.log(`      💾 Updated meta.${metaKey}: added ${adId}`);

                adRecords.push({
                    account_name,
                    account_id,
                    ad_id: adId,
                    ad_name: adName,
                    created_time: createdTime,
                    status: "mapped",
                    matched_entity: matchedEntityName
                });

                mappedAds++;

                // Update local entity object for subsequent checks
                if (!matchedEntity.meta) matchedEntity.meta = {};
                matchedEntity.meta[metaKey] = updatedIds;
            }
        }

        // ─────────────────────────────────────────────────────────
        // STEP 6: Send Email Report
        // ─────────────────────────────────────────────────────────


        // await sendEmailReport(adRecords, startDate, endDate);

        // ─────────────────────────────────────────────────────────
        // SUMMARY
        // ─────────────────────────────────────────────────────────
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("\n═══════════════════════════════════════════════════════");
        console.log("NEW ADS AUTO-MAPPER CRON COMPLETED");
        console.log("═══════════════════════════════════════════════════════");
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`📊 Total Ads: ${totalAds}`);
        console.log(`✅ Mapped: ${mappedAds}`);
        console.log(`⏭️  Skipped (no match): ${skippedAds}`);
        console.log(`🔄 Duplicates: ${duplicateAds}`);
        console.log("═══════════════════════════════════════════════════════\n");

    } catch (error: any) {
        console.error("❌ NEW ADS AUTO-MAPPER CRON ERROR:", error.message);
        throw error;
    }
}


