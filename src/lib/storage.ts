import { Recipe, Ingredient } from "@/types/recipe";

const RECIPES_KEY = "custom_recipes_v1";
const ING_CATALOG_KEY = "ingredient_catalog_v1";

export interface CatalogItem {
  name: string;
  defaultUnit: string;
  category: Ingredient["category"];
}

export function getStoredRecipes(): Recipe[] {
  const raw = localStorage.getItem(RECIPES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Recipe[];
  } catch {
    return [];
  }
}

export function saveRecipe(newRecipe: Recipe): void {
  const list = getStoredRecipes();
  const updated = [...list.filter(r => r.id !== newRecipe.id), newRecipe];
  try {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
  } catch (err) {
    // Retry without large embedded image data to avoid quota errors
    try {
      const slimmed = newRecipe.image.startsWith("data:")
        ? { ...newRecipe, image: "" }
        : newRecipe;
      const updatedSlim = [...list.filter(r => r.id !== newRecipe.id), slimmed];
      localStorage.setItem(RECIPES_KEY, JSON.stringify(updatedSlim));
    } catch {
      throw err;
    }
  }
}

export function getIngredientCatalog(): CatalogItem[] {
  const raw = localStorage.getItem(ING_CATALOG_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CatalogItem[];
  } catch {
    return [];
  }
}

export function upsertIngredientCatalogItems(items: CatalogItem[]): void {
  const existing = getIngredientCatalog();
  const byName = new Map(existing.map(i => [i.name.toLowerCase(), i] as const));
  for (const item of items) {
    byName.set(item.name.toLowerCase(), item);
  }
  localStorage.setItem(ING_CATALOG_KEY, JSON.stringify(Array.from(byName.values())));
}

export function ensureCatalogFromRecipe(recipe: Recipe): void {
  const items: CatalogItem[] = recipe.ingredients.map(ing => ({
    name: ing.name,
    defaultUnit: ing.unit,
    category: ing.category,
  }));
  upsertIngredientCatalogItems(items);
}


