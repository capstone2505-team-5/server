import { RootSpan } from "../../types/types";
import { queryAPI } from "./queryAPI";

const fetchRootSpans = async (projectName?: string) => {
  try {
    console.log('Fetching root spans');
  
    const query = 
    `query RootSpans ($projectName: String!){
      projects (filter: {col: name, value: $projectName}) {
        edges {
          node {
            name
            spans(rootSpansOnly: true) {
              edges {
                node {
                  context {
                    spanId
                    traceId
                  }
                  input {
                    value
                  }
                  output {
                    value
                  }
                  startTime
                  endTime
                  name
                }
              }
            }
          }
        }
      }
    }`

    // If projectName is empty it will retreive all root spans!
    const variables = projectName ? { projectName } : { projectName: "" } ;
    const data = await queryAPI(query, variables);
    const formattedData = formatRootSpans(data);
    return formattedData;
  } catch (error) {
    console.error('Error in fetchRootSpans:', error);
  }
};

// This is the formatting for our rootSpans where we want the content from the last object in an array.
const formatRootSpans = (data: any): RootSpan[] => {
  return data.data.projects.edges.flatMap((project: any) => {
    return project.node.spans.edges.map((span: any) => {
      const output = JSON.parse(span.node.output.value);
      const input = JSON.parse(span.node.input.value);
      const inputContent = input[input.length - 1].content;
      const outputContent = output[output.length - 1].content;

      return {
        id: span.node.context.spanId,
        traceId: span.node.context.traceId,
        startTime: span.node.startTime,
        endTime: span.node.endTime,
        input: inputContent,
        output: outputContent,
        projectName: project.node.name,
        spanName: span.node.name,
      };
    });
  });
};

export default fetchRootSpans;