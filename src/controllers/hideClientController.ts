import { Request, Response } from 'express';
import HideClient from '../db/models/hideClient';
import User from '../db/models/user';
import logger from '../utils/logger';


export const hideClient = async (req: Request, res: Response) => {
    try {
        const { module_key, client_ids, hidden_by, reason } = req.body;

        // Validate module_key
        if (!module_key) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'module_key is required'
            });
        }

        // Validate client_ids
        if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'client_ids array is required and must not be empty'
            });
        }

        // Validate hidden_by (user ID)
        if (!hidden_by) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'hidden_by (user ID) is required'
            });
        }

        // Create hide client entry
        const hideClientEntry = await HideClient.create({
            module_key,
            client_ids,
            hidden_by,
            reason: reason || null
        });

        res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Clients hidden successfully',
            data: hideClientEntry
        });

    } catch (error) {
        logger.error(error, 'Error in hide client:');
        res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Error in hiding clients',
            error: error.message
        });
    }
};


export const getHiddenClients = async (req: Request, res: Response) => {
    try {
        const { module_key } = req.query;

        const query: any = {};
        if (module_key) {
            query.module_key = module_key;
        }

        const hiddenClients = await HideClient.find(query)
            .populate('hidden_by', 'username email')
            .lean();

        res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Hidden clients fetched successfully',
            data: hiddenClients
        });

    } catch (error) {
        logger.error(error, 'Error in fetching hidden clients:');
        res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Error in fetching hidden clients',
            error: error.message
        });
    }
};


export const unhideClient = async (req: Request, res: Response) => {
    try {
        const { client_id } = req.params;
        const { module_key } = req.query;

        if (!client_id) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'client_id is required'
            });
        }

        if (!module_key) {
            return res.status(400).json({
                status_code: 400,
                success: false,
                message: 'module_key query parameter is required'
            });
        }

        // Remove the client_id from the client_ids array for the specific submodule
        const updatedEntry = await HideClient.findOneAndUpdate(
            {
                module_key,
                client_ids: client_id
            },
            {
                $pull: { client_ids: client_id }
            },
            { new: true }
        );

        // If no client_ids remain, delete the document
        if (updatedEntry && updatedEntry.client_ids.length === 0) {
            await HideClient.findByIdAndDelete(updatedEntry._id);
        }

        // If client was not found in hidden list for this module
        if (!updatedEntry) {
            return res.status(404).json({
                status_code: 404,
                success: false,
                message: 'Client not found in hidden list for this module'
            });
        }

        res.status(200).json({
            status_code: 200,
            success: true,
            message: 'Client unhidden successfully',
            data: {
                client_id,
                module_key
            }
        });

    } catch (error) {
        logger.error(error, 'Error in unhiding clients:');
        res.status(500).json({
            status_code: 500,
            success: false,
            message: 'Error in unhiding clients',
            error: error.message
        });
    }
};
