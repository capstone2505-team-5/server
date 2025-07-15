import { RootSpan } from "../../types/types";

const fetchRootSpansInputsOutputs = async () => {
  console.log('Fetching root spans');
  const response = await fetch(process.env.PHOENIX_API_URL + '/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PHOENIX_API_KEY}`
    },
    body: JSON.stringify({
      query: `{
                projects(filter: {col: name, value: "recipe-chatbot-oneTrace"}) {
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
    })
  });
  const data = await response.json();
  const formattedData = formatRootSpans(data);
  return formattedData;
};

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

export default fetchRootSpansInputsOutputs;