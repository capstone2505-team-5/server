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

function safeParseArray(raw: any): any[] {
  if (typeof raw !== 'string') {
    console.warn('Expected JSON string but got', raw);
    return [];
  }
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    console.warn('Bad JSON – defaulting to []:', raw);
    return [];
  }
}

// This is the formatting for our rootSpans where we want the content from the last object in an array.
const formatRootSpans = (data: any): RootSpan[] => {
  return data.data.projects.edges.flatMap((project: any) => {
    return project.node.spans.edges.map((span: any) => {

      // 1. safely grab the raw strings (or fall back to "")
      const rawInput  = span.node.input?.value  ?? 'bad input not retrieved';
      const rawOutput = span.node.output?.value ?? 'bad output not retrieved';

      // 2. parse into arrays (empty if null/malformed)
      const inputArr  = safeParseArray(rawInput);
      const outputArr = safeParseArray(rawOutput);

      // 3. pick the last content (or "")
      const inputContent  = inputArr.length  ? inputArr[inputArr.length  - 1].content : '';
      const outputContent = outputArr.length ? outputArr[outputArr.length - 1].content : '';

      return {
        id:          span.node.context.spanId,
        traceId:     span.node.context.traceId,
        startTime:   span.node.startTime,
        endTime:     span.node.endTime,
        input:       inputContent || 'input not retrieved',
        output:      outputContent || 'output not retrieved',
        projectName: project.node.name,
        spanName:    span.node.name,
      };
    });
  });
};

export default fetchRootSpans;