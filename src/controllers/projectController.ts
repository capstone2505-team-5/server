import { Request, Response } from "express";    
import fetchProjects from "../services/graphqlIngestion/fetchProjects";


export const getProjects = async (req: Request, res: Response) => {
  try {
    const projects = await fetchProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch root spans' });
  }
};