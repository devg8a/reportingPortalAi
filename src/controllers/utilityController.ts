import { Request, Response } from 'express';
import { fetchAllActiveClients, fetchClientById, fetchClientsByFilter, updateClientVisibility } from '../helper/utilityHelper';
import logger from '../utils/logger';
import User from "../db/models/user";
import redisClient from '../config/redisClient';

/**
 * GET /api/utility/clients/active
 * Fetch all active paid media clients (filtered by user access)
 */
export const getActiveClients = async (req: Request, res: Response) => {
    try {
        // ✅ Get userId from authMiddleware
        const userId = (req as any).user?._id || null;
        const module_key = req?.header('x-module-key');
        console.log('👤 getActiveClients - User ID:', userId);

        const clients = await fetchAllActiveClients(userId, module_key);

        // ✅ Redis se selected client nikaalo

        const cacheKey = `${module_key}_${userId}`;
        const redisData = await redisClient.get(cacheKey);

        let selectedClientId: string | null = null;
        let parsedCache = null;

        if (redisData) {
            try {
                parsedCache = JSON.parse(redisData);
                selectedClientId = parsedCache?.clientId ?? null;
            } catch {
                logger.warn("Invalid Redis JSON");
            }
        }

        const updatedClients = clients.map(client => ({
            ...client,
            selected: client._id.toString() === selectedClientId
        }));


        res.status(200).json({
            success: true,
            message: 'Active clients fetched successfully',
            data: { clients: updatedClients, cache: parsedCache },
            count: clients.length
        });
    } catch (error) {
        logger.error(error, 'Error in getActiveClients:');
        res.status(500).json({
            success: false,
            message: 'Error fetching active clients',
            error: error.message
        });
    }
};

/**
 * GET /api/utility/clients/:id
 * Fetch single client by ID (with user access check)
 */
export const getClientById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required'
            });
        }

        // ✅ Get userId from authMiddleware
        const userId = (req as any).user?._id || null;
        console.log('👤 getClientById - User ID:', userId, '| Client ID:', id);

        const client = await fetchClientById(id, userId);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found or access denied'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Client fetched successfully',
            data: client
        });
    } catch (error) {
        logger.error(error, 'Error in getClientById:');
        res.status(500).json({
            success: false,
            message: 'Error fetching client',
            error: error.message
        });
    }
};

/**
 * POST /api/utility/clients/filter
 * Fetch clients by custom filter (with user access check)
 */
export const getClientsByFilter = async (req: Request, res: Response) => {
    try {
        const filter = req.body || {};

        // ✅ Get userId from authMiddleware
        const userId = (req as any).user?._id || null;
        console.log('👤 getClientsByFilter - User ID:', userId);

        const clients = await fetchClientsByFilter(filter, userId);

        res.status(200).json({
            success: true,
            message: 'Clients fetched successfully',
            data: clients,
            count: clients.length
        });
    } catch (error) {
        logger.error(error, 'Error in getClientsByFilter:');
        res.status(500).json({
            success: false,
            message: 'Error fetching clients',
            error: error.message
        });
    }
};


export const updateClientVisibilityController = async (req, res) => {
    try {
        const { clientIds, client_visible } = req.body;

        if (!Array.isArray(clientIds) || client_visible === undefined) {
            return res.status(400).json({ success: false, message: 'Invalid payload' });
        }

        const result = await updateClientVisibility(clientIds, client_visible);

        res.json({ success: true, data: result });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

export const designationWiseUserList = async (req, res) => {
    try {
        const usersList = await User.aggregate([
            { $match: { status: "active" } },
            {
                $group: {
                    _id: "$user_type",
                    users: {
                        $push: {
                            _id: "$_id",
                            first_name: "$first_name",
                            last_name: "$last_name",
                            email: "$email"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    designation: "$_id",
                    users: 1
                }
            }
        ]);

        const formattedUsersList = usersList.map(group => ({
            [group.designation]: group.users
        }));
        res.status(200).json({ status_code: 200, success: true, message: 'Designationwise users list fetched successfully.', data: formattedUsersList });
    } catch (error) {
        return res.status(422).json({ status_code: 422, success: false, message: "Error in retreiving Designationwise Users", data: error });
    }

}
