import { Request, Response } from "express"
import ApprovalActivityLogs from "../db/models/approvalActivityLogs"
import mongoose from "mongoose"
import { MarketingCalendarModel } from "../db/models/marketing-calendar"

export const createApprovalActivity = async (req: Request, res: Response) => {
    try {

        const {
            send_by,
            user_id,
            status,
            comment,
            files,
            campaign_id,
            client_id,
            connection_id,
            // module

        } = req.body

        const module = req?.header('x-module-key');


        const activity = await ApprovalActivityLogs.create({
            send_by,
            user_id,
            module,
            status,
            comment,
            files,
            campaign_id,
            client_id,
            connection_id
        })

        await MarketingCalendarModel.updateOne(
            {
                _id: new mongoose.Types.ObjectId(campaign_id),
                client_id: new mongoose.Types.ObjectId(client_id),
                connection_id: new mongoose.Types.ObjectId(connection_id)
            },
            {
                $set: { status }
            }
        )

        return res.status(201).json({
            success: true,
            data: activity
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error
        })
    }
}


export const getApprovalActivity = async (req: Request, res: Response) => {
    try {

        const { campaign_id } = req.query
        const module = req?.header('x-module-key');

        const matchStage: any = {}

        if (campaign_id) {
            matchStage.campaign_id = new mongoose.Types.ObjectId(campaign_id as string)
        }

        if (module) {
            matchStage.module = module
        }

        const data = await ApprovalActivityLogs.aggregate([

            { $match: matchStage },

            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "userData"
                }
            },

            {
                $lookup: {
                    from: "client_contacts",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "clientData"
                }
            },

            {
                $addFields: {

                    sender_first_name: {
                        $cond: [
                            { $eq: ["$send_by", "user"] },
                            { $arrayElemAt: ["$userData.first_name", 0] },
                            { $arrayElemAt: ["$clientData.first_name", 0] }
                        ]
                    },

                    sender_last_name: {
                        $cond: [
                            { $eq: ["$send_by", "user"] },
                            { $arrayElemAt: ["$userData.last_name", 0] },
                            { $arrayElemAt: ["$clientData.last_name", 0] }
                        ]
                    },

                    sender_email: {
                        $cond: [
                            { $eq: ["$send_by", "user"] },
                            { $arrayElemAt: ["$userData.email", 0] },
                            { $arrayElemAt: ["$clientData.email", 0] }
                        ]
                    },

                    sender_role: {
                        $cond: [
                            { $eq: ["$send_by", "user"] },
                            { $arrayElemAt: ["$userData.user_type", 0] },
                            "Client"
                        ]
                    }

                }
            },

            {
                $project: {
                    userData: 0,
                    clientData: 0
                }
            },

            { $sort: { createdAt: -1 } }

        ])

        return res.status(200).json({
            success: true,
            data
        })

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching activity logs"
        })
    }
}