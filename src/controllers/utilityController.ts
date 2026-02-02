import { Request, Response } from 'express';
import { fetchAllActiveClients, fetchClientById, fetchClientsByFilter } from '../helper/utilityHelper';
import logger from '../utils/logger';

/**
 * GET /api/utility/clients/active
 * Fetch all active paid media clients
 */
export const getActiveClients = async (req: Request, res: Response) => {
    try {
        const clients = await fetchAllActiveClients();

        res.status(200).json({
            success: true,
            message: 'Active clients fetched successfully',
            data: clients
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
 * Fetch single client by ID
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

        const client = await fetchClientById(id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
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
 * Fetch clients by custom filter
 */
export const getClientsByFilter = async (req: Request, res: Response) => {
    try {
        const filter = req.body || {};
        const clients = await fetchClientsByFilter(filter);

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
