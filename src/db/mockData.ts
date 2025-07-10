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
    "traceId": "SYN018",
    "note": "Recipe fails to specify a safe internal temperature for salmon, risking under- or over-cooking.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "2",
    "traceId": "SYN019",
    "note": "Instructions omit pan-temperature guidance, so a novice could scorch the garlic and ruin the flavor.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "3",
    "traceId": "SYN021",
    "note": "Cheese is added too early, likely making the scramble rubbery instead of creamy.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "4",
    "traceId": "SYN008",
    "note": "Recipe labels itself low-FODMAP but includes lemon zest without noting some citrus peel can trigger symptoms.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "5",
    "traceId": "SYN010",
    "note": "Wrap suggestion ignores that many store-bought tortillas contain high-FODMAP ingredients like inulin.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "6",
    "traceId": "SYN009",
    "note": "Chicken marinade time is too short for flavor penetration, leading to bland results.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "7",
    "traceId": "SYN020",
    "note": "Recipe calls for searing then baking but doesn’t adjust total cook time to prevent overdone salmon.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "8",
    "traceId": "SYN006",
    "note": "Quinoa instructions skip the vital rinse step, leaving a bitter aftertaste from saponins.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "9",
    "traceId": "SYN016",
    "note": "Garlic quantity is ambiguous, risking overpowering the delicate lemon flavor.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "10",
    "traceId": "SYN007",
    "note": "Grilled chicken method neglects resting time, causing juices to run out and meat to dry.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "11",
    "traceId": "SYN023",
    "note": "Egg bake lacks a dairy-free option even though many users avoid cheese.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "12",
    "traceId": "SYN001",
    "note": "Curry uses canned diced tomatoes without draining, which can water down the sauce.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "13",
    "traceId": "SYN022",
    "note": "Frittata recipe skips seasoning the spinach first, resulting in under-seasoned filling.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "14",
    "traceId": "SYN027",
    "note": "Salad lacks a protein complement, making it nutritionally incomplete as a main dish.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "15",
    "traceId": "SYN011",
    "note": "Stuffed chicken recipe overlooks internal temperature check, posing food-safety concerns.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "16",
    "traceId": "SYN024",
    "note": "Italian frittata calls for garlic but omits pre-cooking, leaving raw garlic flavor.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "17",
    "traceId": "SYN026",
    "note": "Stir-fry lists smoked paprika, which isn’t traditional Mediterranean and may confuse users.",
    "rating": "bad",
    "categories": []
  }
];

