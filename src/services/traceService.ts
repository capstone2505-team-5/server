import { mockTraces } from "../db/mockData";

export class TraceNotFoundError extends Error {
  constructor(id: string) {
    super(`Trace with id ${id} not found`);
    this.name = 'TraceNotFoundError';
  }
}

export const getAllTraces = () => {
  return mockTraces
}

export const getTraceById = (id: string) => {
  const trace = getAllTraces().find(t => t.id === id);
    if (!trace) {
      throw new TraceNotFoundError(id);
    }
  return trace;
}

export const deleteTraceById = (id: string) => {
  // Find the trace to delete
  const traces = getAllTraces()
  const traceIndex = traces.findIndex(a => a.id === id);
  
  if (traceIndex === -1) {
    throw new TraceNotFoundError(id);
  }
  
  // Remove the trace from the array
  return mockTraces.splice(traceIndex, 1)[0];
}