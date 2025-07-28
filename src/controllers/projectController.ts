import { Request, Response } from "express";    
import { getAllProjects } from '../services/projectService';


export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch root spans' });
  }
};