import { Annotation, Trace } from "../types/types";

// Mock data - replace with actual database calls
export const mockTraces: Trace[] = [
  { id: 1, input: "Hello", output: "Hi there!" },
  { id: 2, input: "How are you?", output: "I'm doing well, thanks!" }
];

export const mockAnnotations: Annotation[] = [
  { id: 1, traceId: 1, note: "Good response", rating: 'good', categories: ['helpful', 'polite'] },
  { id: 2, traceId: 2, note: "Could be better", rating: 'none', categories: ['neutral'] }
];
