import { Annotation, Trace } from "../types/types";
import recipes from "../db/rawRecipeData.json"

// Mock data - replace with actual database calls
export const mockTraces: Trace[] = recipes;
//   [
//   { id: 1, input: "Hello", output: "Hi there!" },
//   { id: 2, input: "How are you?", output: "I'm doing well, thanks!" }
// ];

export const mockAnnotations: Annotation[] = [
  {
    "id": "999",
    "traceId": "SYN018",
    "note": "spelling is bad",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "555",
    "traceId": "SYN019",
    "note": "things are spelled wrong",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "3",
    "traceId": "SYN021",
    "note": "answer is too long",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "4",
    "traceId": "SYN008",
    "note": "the length of the answer is too long",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "5",
    "traceId": "SYN010",
    "note": "the answer skipped steps",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "6",
    "traceId": "SYN009",
    "note": "there were steps that were skipped in the answer",
    "rating": "bad",
    "categories": []
  },
];

