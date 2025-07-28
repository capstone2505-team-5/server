import { Project } from "../../types/types";
import { queryAPI } from "./queryAPI";

export const fetchProjects = async (): Promise<Project[] | undefined> => {
  try {
    console.log('Fetching projects');
  
    const query = 
    `query Projects {
      projects {
        edges {
          node {
            name
            id
            createdAt
            updatedAt
            traceCount
          }
        }
      }
    }`


    const data = await queryAPI(query);
    const formattedData = formatProjects(data);
    return formattedData;
  } catch (error) {
    console.error('Error in fetchProjects:', error);
  }
}

const formatProjects = (data: any): Project[] => {
  return data.data.projects.edges.map((edge: any) => ({
    id: edge.node.id,
    name: edge.node.name,
    createdAt: edge.node.createdAt,
    updatedAt: edge.node.updatedAt,
    traceCount: edge.node.traceCount,
  }));
};

export default fetchProjects