import { Annotation, Span } from "../types/types";
import recipes from "../db/rawRecipeData.json"

// Mock data - replace with actual database calls
// export const mockTraces: Span[] = recipes;
//   [
//   { id: 1, input: "Hello", output: "Hi there!" },
//   { id: 2, input: "How are you?", output: "I'm doing well, thanks!" }
// ];

export const mockAnnotations: Annotation[] = [
  {
    "id": "1",
    "spanId": "SYN018",
    "note": "Recipe fails to specify a safe internal temperature for salmon, risking under- or over-cooking.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "2",
    "spanId": "SYN019",
    "note": "Instructions omit pan-temperature guidance, so a novice could scorch the garlic and ruin the flavor.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "3",
    "spanId": "SYN021",
    "note": "Cheese is added too early, likely making the scramble rubbery instead of creamy.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "4",
    "spanId": "SYN008",
    "note": "Recipe labels itself low-FODMAP but includes lemon zest without noting some citrus peel can trigger symptoms.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "5",
    "spanId": "SYN010",
    "note": "Wrap suggestion ignores that many store-bought tortillas contain high-FODMAP ingredients like inulin.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "6",
    "spanId": "SYN009",
    "note": "Chicken marinade time is too short for flavor penetration, leading to bland results.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "7",
    "spanId": "SYN020",
    "note": "Recipe calls for searing then baking but doesn’t adjust total cook time to prevent overdone salmon.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "8",
    "spanId": "SYN006",
    "note": "Quinoa instructions skip the vital rinse step, leaving a bitter aftertaste from saponins.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "9",
    "spanId": "SYN016",
    "note": "Garlic quantity is ambiguous, risking overpowering the delicate lemon flavor.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "10",
    "spanId": "SYN007",
    "note": "Grilled chicken method neglects resting time, causing juices to run out and meat to dry.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "11",
    "spanId": "SYN023",
    "note": "Egg bake lacks a dairy-free option even though many users avoid cheese.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "12",
    "spanId": "SYN001",
    "note": "Curry uses canned diced tomatoes without draining, which can water down the sauce.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "13",
    "spanId": "SYN022",
    "note": "Frittata recipe skips seasoning the spinach first, resulting in under-seasoned filling.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "14",
    "spanId": "SYN027",
    "note": "Salad lacks a protein complement, making it nutritionally incomplete as a main dish.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "15",
    "spanId": "SYN011",
    "note": "Stuffed chicken recipe overlooks internal temperature check, posing food-safety concerns.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "16",
    "spanId": "SYN024",
    "note": "Italian frittata calls for garlic but omits pre-cooking, leaving raw garlic flavor.",
    "rating": "bad",
    "categories": []
  },
  {
    "id": "17",
    "spanId": "SYN026",
    "note": "Stir-fry lists smoked paprika, which isn’t traditional Mediterranean and may confuse users.",
    "rating": "bad",
    "categories": []
  }
];

