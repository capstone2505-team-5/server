import { Request, Response } from "express";    
import { getProjectSummaries } from '../services/projectService';


export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await getProjectSummaries();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};