import { RootSpan } from "../../types/types";
import { queryAPI } from "./queryAPI";

const fetchRootSpans = async (projectName?: string): Promise<RootSpan[]> => {
  try {
    console.log('Fetching root spans');
    
    const query = `query RootSpans ($projectName: String!){
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
                  spanKind
                }
              }
            }
          }
        }
      }
    }`;

    // If projectName is empty it will retrieve all root spans!
    const variables = projectName ? { projectName } : { projectName: "" };
    const data = await queryAPI(query, variables);
    const formattedData = formatRootSpans(data);
    return formattedData;
  } catch (error) {
    console.error('Error in fetchRootSpans:', error);
    return []; // Return empty array instead of undefined
  }
};

function safeJsonParse(value: string | null | undefined): any {
  if (!value || typeof value !== 'string') {
    return value; // Return as-is if not a string
  }
  
  try {
    return JSON.parse(value);
  } catch {
    return value; // Return original string if parsing fails
  }
}

const isValidRootSpan = (rootSpan: any): boolean => {
  const requiredProps = ['id', 'traceId', 'startTime', 'endTime', 'input', 'output', 'projectName', 'spanName'];
  
  return requiredProps.every(prop => {
    const value = rootSpan[prop];
    return value !== null && value !== undefined && value !== '';
  });
};

const formatRootSpans = (data: any): RootSpan[] => {
  try {
    if (!data?.data?.projects?.edges) {
      console.log('No projects data found');
      return [];
    }

    const allSpans = data.data.projects.edges.flatMap((project: any) => {
      if (!project?.node?.spans?.edges) {
        console.log('No spans found for project:', project?.node?.name);
        return [];
      }

      const projectName = project?.node?.name;
      if (!projectName) {
        console.warn('Project missing name, skipping');
        return [];
      }

      return project.node.spans.edges
        .map((span: any) => {
          try {
            const spanNode = span?.node;
            if (!spanNode) {
              console.warn('Span node is missing, skipping');
              return null;
            }

            const context = spanNode?.context;
            if (!context?.spanId || !context?.traceId) {
              console.warn('Span missing required context (spanId/traceId), skipping');
              return null;
            }

            console.log('Processing span:', context.spanId);
            
            // Safe access and JSON parsing
            const inputValue = spanNode?.input?.value;
            const outputValue = spanNode?.output?.value;
            
            const inputContent = safeJsonParse(inputValue);
            const outputContent = safeJsonParse(outputValue);
            
            return {
              id: context.spanId,
              traceId: context.traceId,
              startTime: spanNode?.startTime || null,
              endTime: spanNode?.endTime || null,
              input: inputContent,
              output: outputContent,
              projectName: projectName,
              spanName: spanNode?.name || null,
            };
          } catch (spanError) {
            console.error('Error processing individual span:', spanError);
            return null; // Return null for failed spans
          }
        })
        .filter((rootSpan: any) => {
          if (rootSpan === null) {
            return false; // Filter out failed spans
          }
          
          const valid = isValidRootSpan(rootSpan);
          if (!valid) {
            console.warn('Filtered out incomplete span:', {
              id: rootSpan?.id,
              hasInput: rootSpan?.input !== null && rootSpan?.input !== undefined,
              hasOutput: rootSpan?.output !== null && rootSpan?.output !== undefined,
              hasStartTime: !!rootSpan?.startTime,
              hasEndTime: !!rootSpan?.endTime,
              hasSpanName: !!rootSpan?.spanName
            });
          }
          return valid;
        });
    });

    console.log(`Processed ${allSpans.length} valid root spans`);
    return allSpans;

  } catch (error) {
    console.error('Error in formatRootSpans:', error);
    return []; // Return empty array on any formatting error
  }
};

export default fetchRootSpans;