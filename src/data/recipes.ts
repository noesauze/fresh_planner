import { Recipe } from "@/types/recipe";
import salmonImage from "@/assets/salmon-recipe.jpg";
import pastaImage from "@/assets/pasta-recipe.jpg";
import stirfryImage from "@/assets/stirfry-recipe.jpg";

export const sampleRecipes: Recipe[] = [
  {
    id: "1",
    name: "Grilled Salmon with Roasted Vegetables",
    description: "Fresh salmon fillet with seasonal roasted vegetables and herbs",
    image: salmonImage,
    cookTime: 25,
    servings: 2,
    difficulty: "medium",
    ingredients: [
      { id: "1", name: "Salmon fillet", amount: 2, unit: "pieces", category: "protein" },
      { id: "2", name: "Broccoli", amount: 200, unit: "g", category: "vegetable" },
      { id: "3", name: "Bell peppers", amount: 1, unit: "piece", category: "vegetable" },
      { id: "4", name: "Olive oil", amount: 2, unit: "tbsp", category: "other" },
      { id: "5", name: "Lemon", amount: 1, unit: "piece", category: "other" },
      { id: "6", name: "Garlic", amount: 2, unit: "cloves", category: "spice" },
      { id: "7", name: "Fresh herbs", amount: 1, unit: "bunch", category: "spice" },
    ],
    instructions: [
      "Preheat oven to 200°C",
      "Season salmon with salt, pepper and herbs",
      "Cut vegetables into chunks and toss with olive oil",
      "Roast vegetables for 15 minutes",
      "Grill salmon for 4-5 minutes each side",
      "Serve with lemon wedges"
    ],
    tags: ["healthy", "protein", "quick", "gluten-free"]
  },
  {
    id: "2",
    name: "Pasta Primavera",
    description: "Creamy pasta with fresh seasonal vegetables and parmesan",
    image: pastaImage,
    cookTime: 20,
    servings: 4,
    difficulty: "easy",
    ingredients: [
      { id: "8", name: "Pasta", amount: 400, unit: "g", category: "grain" },
      { id: "9", name: "Heavy cream", amount: 200, unit: "ml", category: "dairy" },
      { id: "10", name: "Parmesan cheese", amount: 100, unit: "g", category: "dairy" },
      { id: "11", name: "Zucchini", amount: 1, unit: "piece", category: "vegetable" },
      { id: "12", name: "Cherry tomatoes", amount: 200, unit: "g", category: "vegetable" },
      { id: "13", name: "Asparagus", amount: 150, unit: "g", category: "vegetable" },
      { id: "14", name: "Garlic", amount: 3, unit: "cloves", category: "spice" },
    ],
    instructions: [
      "Cook pasta according to package instructions",
      "Sauté garlic in olive oil until fragrant",
      "Add vegetables and cook until tender",
      "Pour in cream and simmer",
      "Add cooked pasta and toss with cheese",
      "Season with salt, pepper and fresh herbs"
    ],
    tags: ["vegetarian", "comfort-food", "easy", "family-friendly"]
  },
  {
    id: "3",
    name: "Chicken Stir-Fry",
    description: "Healthy chicken stir-fry with colorful vegetables and ginger",
    image: stirfryImage,
    cookTime: 15,
    servings: 3,
    difficulty: "easy",
    ingredients: [
      { id: "15", name: "Chicken breast", amount: 400, unit: "g", category: "protein" },
      { id: "16", name: "Soy sauce", amount: 3, unit: "tbsp", category: "other" },
      { id: "17", name: "Ginger", amount: 2, unit: "cm", category: "spice" },
      { id: "18", name: "Bell peppers", amount: 2, unit: "pieces", category: "vegetable" },
      { id: "19", name: "Snap peas", amount: 150, unit: "g", category: "vegetable" },
      { id: "20", name: "Carrots", amount: 1, unit: "piece", category: "vegetable" },
      { id: "21", name: "Sesame oil", amount: 1, unit: "tbsp", category: "other" },
    ],
    instructions: [
      "Cut chicken into bite-sized pieces",
      "Heat oil in a wok or large pan",
      "Stir-fry chicken until golden",
      "Add vegetables and stir-fry for 3-4 minutes",
      "Add soy sauce and ginger",
      "Serve immediately over rice"
    ],
    tags: ["healthy", "quick", "protein", "asian", "low-carb"]
  }
];