import { Request, Response } from "express";    
import dotenv from "dotenv";

dotenv.config();

export const getPhoenixDashboardUrl = async (req: Request, res: Response) => {
    try {
        res.json(process.env.PHOENIX_API_URL);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Phoenix dashboard URL' });
    }
}