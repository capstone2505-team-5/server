import { Annotation, Trace } from "../types/types";
import recipes from "../db/rawRecipeData.json"

// Mock data - replace with actual database calls
export const mockTraces: Trace[] = recipes;
//   [
//   { id: 1, input: "Hello", output: "Hi there!" },
//   { id: 2, input: "How are you?", output: "I'm doing well, thanks!" }
// ];

export const mockAnnotations: Annotation[] = [
  { id: "1", traceId: "SYN018", note: "Good response", rating: 'good', categories: ['helpful', 'polite'] },
  { id: "2", traceId: "SYN019", note: "Could be better", rating: 'none', categories: ['neutral'] }
];
