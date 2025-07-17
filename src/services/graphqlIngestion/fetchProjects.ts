import { Project } from "../../types/types";
import { queryAPI } from "./queryAPI";

const fetchProjects = async (): Promise<Project[] | undefined> => {
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
    createdAt: edge.node.createdAt
  }));
};

export default fetchProjects