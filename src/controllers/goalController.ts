import Goals from '../db/models/projectionGoals';
import { readGoogleSheet } from '../liberaries/Google/SpreadSheet/Connection/accounts';

export const getGoalsData = async (req, res) => {
    try {
        const { year_month, limit = 100 } = req.query;
        let filter: any = {};

        if (year_month) filter.year_month = year_month;

        const goals = await Goals.find(filter).limit(parseInt(limit));

        res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Goals fetched successfully',
            count: goals.length,
            data: goals
        });
    } catch (error) {
        console.error('Get goals error:', error);
        res.status(422).json({
            status_code: 422,
            success: false,
            message: 'Error fetching goals',
            data: error.message
        });
    }
}

function mapSheetDataToGoal(rawData, sheetType) {
    let goal: any = {};

    if (sheetType === 'paidMedia') {
        goal.client_id = parseFloat(rawData['Store Id']) || 0;
        // goal.store_name = rawData['Store Name'] || rawData['StoreName'] || rawData['store_name'] || rawData['Store'];
        goal.paid_spend_goal = parseFloat(rawData['Spend Goal']) || 0;
        goal.paid_yoy_revenue = parseFloat(rawData['JAN 2025 Rev']) || 0;
        goal.paid_yoy_growth_rate = parseFloat(rawData['YOY Growth Rate']) || 0;
        goal.paid_projected_revenue = parseFloat(rawData['Proj Rev']) || 0;
        goal.paid_am_Projected_revenue = parseFloat(rawData['Changes'] || rawData['AM Projection']) || 0;
        goal.paid_measurement_channel = rawData['Measurement Channel'] || '';
        goal.paid_marketing_pct = parseFloat(rawData['MP(%)']) || 0;
        goal.paid_roas = parseFloat(rawData['Roas']) || 0;
        goal.paid_site_spend_goal = parseFloat(rawData['Site Spend Goal']) || 0;
        goal.paid_site_projected_revenue = parseFloat(rawData['Total Site Rev']) || 0;
        goal.paid_spend_type = rawData['Spend Type'] || 'Budget-Based';
        goal.paid_meta_spend_pct = parseFloat(rawData['Paid Social Spend Percentage']) || 0;
        goal.paid_google_spend_pct = parseFloat(rawData['Paid Search Spend Percentage']) || 0;
        goal.paid_bing_spend_pct = parseFloat(rawData['Paid Bing Spend Percentage']) || 0;
        goal.paid_criteo_spend_pct = parseFloat(rawData['Paid Criteo Spend Percentage']) || 0;
        goal.paid_roas_up_increase_pct = parseFloat(rawData['Increase % when ROAS is up']) || 0;
        goal.paid_roas_down_adjust_pct = parseFloat(rawData['Spend modification if ROAS is down']) || 0;
        goal.clockify_goal = parseFloat(rawData['Clockify Goal']) || 0;
        goal.account_priority = rawData['Account Priority'] || 'Low';
        goal.notes = rawData['Notes'] || '';
        if (rawData['Paid Site AM Projected Revenue']) {
            goal.paid_site_am_projected_revenue = parseFloat(rawData['Paid Site AM Projected Revenue']) || 0;
        }
        if (goal.paid_site_am_projected_revenue && goal.paid_site_spend_goal) {
            goal.paid_site_marketing_pct = (goal.paid_site_spend_goal / goal.paid_site_am_projected_revenue) * 100;
            goal.paid_site_roas = goal.paid_site_am_projected_revenue / goal.paid_site_spend_goal;
        }
    } else if (sheetType === 'affiliate') {
        goal.affSite_yoy_revenue = parseFloat(rawData['Site Prev. Year Rev']) || 0;
        goal.affSite_yoy_growth_rate = parseFloat(rawData['Site YOY Growth Rate']) || 0;
        goal.affSite_projected_revenue = parseFloat(rawData['Site Proj Rev']) || 0;
        goal.affSite_measurement_channel = rawData['Site Measurement Channel'] || '';
        goal.aff_yoy_revenue = parseFloat(rawData['Prev. Year Rev (2024)']) || 0;
        goal.aff_yoy_growth_rate = parseFloat(rawData['YOY Growth Rate']) || 0;
        goal.aff_projected_revenue = parseFloat(rawData['Proj Rev']) || 0;
        goal.aff_am_projected_revenue = parseFloat(rawData['AM Projection']) || 0;
        goal.aff_measurement_channel = rawData['Measurement Channel'] || '';
        goal.aff_projected_roas = parseFloat(rawData['Proj ROAS']) || 0;
        goal.aff_actual_revenue = parseFloat(rawData['Actual Revenue']) || 0;
        goal.aff_actual_spend = parseFloat(rawData['Actual Spend']) || 0;
        goal.aff_actual_roas = parseFloat(rawData['Actual ROAS']) || 0;
        goal.aff_account_type = rawData['Type'] || '';
        goal.aff_full_network_goal = parseFloat(rawData['Site Goal']) || 0;
        goal.aff_outreach_goal = parseFloat(rawData['Outreach']) || 0;
        goal.aff_intro_am_goal = parseFloat(rawData['Intro to AM']) || 0;
        goal.aff_conv_rate_goal = parseFloat(rawData['Conv. Rate']) || 0;
        goal.aff_conversations_goal = parseFloat(rawData['Conversations']) || 0;
        goal.aff_published_goal = parseFloat(rawData['Published']) || 0;
        goal.account_priority = rawData['Account Priority'] || 'Low';
        goal.notes = rawData['Notes'] || '';

        if (rawData['Aff Site AM Projected Revenue']) {
            goal.affSite_am_projected_revenue = parseFloat(rawData['Aff Site AM Projected Revenue']) || 0;
        }
    }
    return goal;
}

export const syncAndSaveGoals = async (req, res) => {
    try {
        const { start_year_month, end_year_month } = req.query;
        const validateDate = (dateStr) => {
            if (!dateStr) return null;
            const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
            return regex.test(dateStr) ? dateStr : null;
        };

        const startMonth = validateDate(start_year_month);
        const endMonth = validateDate(end_year_month);
        const getCurrentMonth = () => {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        };

        const targetMonth = startMonth || getCurrentMonth();
        const monthRange = [];
        if (startMonth && endMonth) {
            const [startYear, startMonthNum] = startMonth.split('-').map(Number);
            const [endYear, endMonthNum] = endMonth.split('-').map(Number);

            let year = startYear;
            let month = startMonthNum;

            while (year < endYear || (year === endYear && month <= endMonthNum)) {
                monthRange.push(`${year}-${String(month).padStart(2, '0')}`);
                month++;
                if (month > 12) {
                    month = 1;
                    year++;
                }
            }
        } else {
            monthRange.push(targetMonth);
        }
        const deleteResult = await Goals.deleteMany({
            year_month: { $in: monthRange }
        });
        const allDocs = [];
        const monthResults = [];

        for (const month of monthRange) {
            try {
                const [paidData, affData] = await Promise.all([
                    readGoogleSheet(process.env.PAID_MEDIA_SHEET_ID, month),
                    readGoogleSheet(process.env.AFFILIATE_SHEET_ID, month)
                ]);
                const clientMap = new Map();
                // Add Paid Media data
                paidData.forEach((row, i) => {
                    const clientId = row['Store Id'] || `PAID_${i}`;
                    const key = `${clientId}_${month}`;

                    if (!clientMap.has(key)) {
                        clientMap.set(key, {
                            client_id: clientId,
                            year_month: month,
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                    }

                    Object.assign(clientMap.get(key), mapSheetDataToGoal(row, 'paidMedia'));
                });

                // Add Affiliate data
                affData.forEach((row, i) => {
                    const clientId = row['Store Id'] || `AFF_${i}`;
                    const key = `${clientId}_${month}`;

                    if (!clientMap.has(key)) {
                        clientMap.set(key, {
                            client_id: clientId,
                            year_month: month,
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                    }

                    const affGoal = mapSheetDataToGoal(row, 'affiliate');
                    const existingDoc = clientMap.get(key);

                    // Merge notes
                    if (existingDoc.notes && affGoal.notes) {
                        affGoal.notes = `Affiliate & Paid Media: ${existingDoc.notes} | ${affGoal.notes}`;
                    } else if (affGoal.notes) {
                        affGoal.notes = `Affiliate: ${affGoal.notes}`;
                    }

                    Object.assign(existingDoc, affGoal);
                });
                const monthDocs = Array.from(clientMap.values());
                allDocs.push(...monthDocs);

                monthResults.push({
                    month,
                    records: monthDocs.length,
                    paidRows: paidData.length,
                    affiliateRows: affData.length,
                    status: 'success'
                });

            } catch (monthError) {
                monthResults.push({
                    month,
                    error: monthError.message,
                    records: 0,
                    status: 'failed'
                });
            }
        }

        let insertResult = null;
        if (allDocs.length > 0) {
            try {
                insertResult = await Goals.insertMany(allDocs, {
                    ordered: false,
                    rawResult: true
                });
            } catch (insertError) {
                console.error('Insert error, trying bulkWrite...', insertError.message);

                const bulkOps = allDocs.map(doc => ({
                    insertOne: { document: doc }
                }));

                insertResult = await Goals.bulkWrite(bulkOps, { ordered: false });
            }
        }

        const totalRecords = monthResults.reduce((sum, m) => sum + m.records, 0);
        const successMonths = monthResults.filter(m => m.status === 'success').length;

        res.status(200).json({
            status_code: 200,
            success: true,
            message: `Data sync completed: ${successMonths}/${monthRange.length} months successful`,
            data: {
                purge_old_data: true,
                deleted_count: deleteResult.deletedCount,
                date_range: startMonth && endMonth ? {
                    start: startMonth,
                    end: endMonth,
                    months: monthRange.length
                } : { month: targetMonth },
                total_records: totalRecords,
                inserted_count: allDocs.length,
                month_results: monthResults,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        res.status(422).json({
            status_code: 422,
            success: false,
            message: 'Error syncing data',
            data: { error: error.message }
        });
    }
};