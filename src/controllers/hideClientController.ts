import { Request, Response } from 'express';
import HideClient from '../db/models/hideClient';
import logger from '../utils/logger';
import { fetchAllActiveClients } from '../helper/utilityHelper';



export const fetchVisibleClients = async (
    userId: string,
    moduleKey: string,
    returnAll: boolean = false
) => {
    try {
        // 1️⃣ Get clients based on permission
        const clients = await fetchAllActiveClients(userId, moduleKey);

        if (!clients.length) return [];

        // 2️⃣ Get hidden clients for this module (User Specific)
        const hiddenEntry = await HideClient.findOne({
            module_key: moduleKey,
            user_id: userId
        })
            .select('client_ids')
            .lean();

        const hiddenIds = hiddenEntry?.client_ids?.map(id => id.toString()) || [];

        // 3️⃣ Return all with status or filter
        if (returnAll) {
            return clients.map(client => ({
                ...client,
                visible: !hiddenIds.includes(client._id.toString())
            }));
        }

        // Default: Filter out hidden clients
        const visibleClients = clients.filter(
            client => !hiddenIds.includes(client._id.toString())
        );

        return visibleClients;

    } catch (error) {
        console.error('Error fetching visible clients:', error);
        throw error;
    }
};


export const getVisibleClients = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?._id; // from auth middleware
        const { module_key = 'account_summary' } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID missing'
            });
        }

        // Fetch ALL clients with visible status for the UI dropdown
        const clients = await fetchVisibleClients(
            userId,
            module_key as string,
            true // returnAll
        );

        return res.status(200).json({
            success: true,
            data: clients
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Error fetching visible clients',
            error: error.message
        });
    }
};


export const hideClient = async (req: Request, res: Response) => {
    try {
        const { module_key, client_ids } = req.body;

        const user_id = (req as any).user?._id; // ✅ Logged-in user

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!module_key) {
            return res.status(400).json({
                success: false,
                message: "module_key is required"
            });
        }

        if (!client_ids || !Array.isArray(client_ids) || client_ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "client_ids array is required"
            });
        }

        const hideClientEntry = await HideClient.findOneAndUpdate(
            { module_key, user_id },
            {
                $addToSet: { client_ids: { $each: client_ids } },
                $set: { user_id }
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Clients hidden successfully",
            data: hideClientEntry
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: "Error hiding clients",
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
            .populate('user_id', 'username email')
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
        const { clientId } = req.params;
        const { module_key } = req.query;

        if (!clientId) {
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

        const user_id = (req as any).user?._id; // ✅ Logged-in user

        // Remove the client_id from the client_ids array for the specific submodule
        const updatedEntry = await HideClient.findOneAndUpdate(
            {
                module_key,
                user_id,
                client_ids: clientId
            },
            {
                $pull: { client_ids: clientId }
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
                client_id: clientId,
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




// ==================== PREFERENCES ====================

/**
 * GET preferences
 */
export const getPreferences = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user?._id;
        const module_key = req?.header('x-module-key');

        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        if (!module_key) {
            return res.status(400).json({
                success: false,
                message: 'module_key is required'
            });
        }

        const config = await HideClient.findOne({
            user_id,
            module_key
        })
            .select('preferences')
            .lean();

        return res.status(200).json({
            success: true,
            data: config?.preferences || {}
        });

    } catch (error: any) {
        logger.error(error, 'Error fetching preferences:');
        return res.status(500).json({
            success: false,
            message: 'Error fetching preferences',
            error: error.message
        });
    }
};


/**
 * POST - Save preferences
 */
export const savePreferences = async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user?._id;
        const module_key = req?.header('x-module-key');
        const { preferences } = req.body;


        if (!user_id) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        if (!module_key) {
            return res.status(400).json({
                success: false,
                message: 'module_key is required'
            });
        }

        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'preferences object is required'
            });
        }

        const updated = await HideClient.findOneAndUpdate(
            { user_id, module_key },
            {
                $set: { preferences }
            },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Preferences saved successfully',
            data: updated
        });

    } catch (error: any) {
        logger.error(error, 'Error saving preferences:');
        return res.status(500).json({
            success: false,
            message: 'Error saving preferences',
            error: error.message
        });
    }
};