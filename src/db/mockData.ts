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
    "id": "1",
    "rootSpanId": "7a96ff0c2b27d316",
    "note": "spelling is bad",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "2",
    "rootSpanId": "5126fd534f21e310",
    "note": "things are spelled wrong",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "3",
    "rootSpanId": "e17e73a03d076e6f",
    "note": "answer is too long",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "4",
    "rootSpanId": "0474f0c0926837e2",
    "note": "the length of the answer is too long",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "5",
    "rootSpanId": "191fa4c63a81e2c4",
    "note": "the answer skipped steps",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "6",
    "rootSpanId": "1967270ec409a70d",
    "note": "there were steps that were skipped in the answer",
    "rating": "bad",
    "categories": []
  },
];

