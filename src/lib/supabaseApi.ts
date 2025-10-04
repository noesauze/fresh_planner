import { supabase } from "@/lib/supabaseClient";
import { Recipe, Ingredient } from "@/types/recipe";

const IMAGES_BUCKET = (import.meta as any).env?.VITE_SUPABASE_IMAGES_BUCKET ?? 'images';

export async function uploadRecipeImage(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const path = `recipes/${crypto.randomUUID()}.jpg`;
  try {
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
    if (error) throw error;
    const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err: any) {
    console.warn('Image upload skipped:', err?.message || err);
    // Fallback: no image URL if bucket missing or access denied
    return '';
  }
}

export async function createRecipe(recipe: Omit<Recipe, "id" | "image"> & { image?: string }): Promise<Recipe> {
  if (!supabase) throw new Error("Supabase not configured");
  const toInsert = { ...recipe } as any;
  const { data, error } = await supabase.from("recipes").insert(toInsert).select("*").single();
  if (error) throw error;
  return data as Recipe;
}

export async function listRecipes(): Promise<Recipe[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("recipes").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Recipe[];
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("recipes").select("*").eq("id", id).single();
  if (error) return null;
  return data as Recipe;
}

export async function bulkInsertRecipes(recipes: Array<Omit<Recipe, "id"> & { id?: string }>): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const sanitized = recipes.map(r => {
    const { id, ...rest } = r as any; // let DB assign ids
    return rest;
  });
  const { error } = await supabase.from("recipes").insert(sanitized);
  if (error) throw error;
}

export type CatalogItem = {
  name: string;
  defaultUnit: string;
  category: Ingredient["category"];
}

export async function upsertCatalogItems(items: CatalogItem[]): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("ingredients").upsert(items, { onConflict: "name" });
  if (error) throw error;
}

export async function listCatalog(): Promise<CatalogItem[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from("ingredients").select("name, defaultUnit, category").order("name");
  if (error) throw error;
  return (data ?? []) as CatalogItem[];
}

// Ingredient packaging
export type PackagingOption = {
  id: string;
  ingredient_name: string;
  unit: string; // 'g' | 'ml' | 'piece' | ...
  pack_amount: number;
}

export async function listPackagingForIngredient(ingredientName: string): Promise<PackagingOption[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from('ingredient_packaging').select('*').eq('ingredient_name', ingredientName).order('pack_amount');
  if (error) throw error;
  return (data ?? []) as PackagingOption[];
}

export async function upsertPackagingOptions(options: Array<Omit<PackagingOption, 'id'>>): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('ingredient_packaging').upsert(options, { onConflict: 'ingredient_name,unit,pack_amount' });
  if (error) throw error;
}

export async function deletePackagingOption(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('ingredient_packaging').delete().eq('id', id);
  if (error) throw error;
}

// Meal plans per user
export type MealPlanRow = {
  id: string;
  user_id: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner';
  recipe: Recipe | null;
}

export async function fetchMealPlansForUser(userId: string): Promise<MealPlanRow[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from('meal_plans').select('*').eq('user_id', userId).order('date');
  if (error) throw error;
  return (data ?? []) as MealPlanRow[];
}

export async function upsertMealPlanRow(row: Omit<MealPlanRow, 'id'> & { id?: string }): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('meal_plans').upsert(row, { onConflict: 'user_id,date,meal' });
  if (error) throw error;
}

export async function deleteMealPlanRow(userId: string, date: string, meal: 'breakfast' | 'lunch' | 'dinner'): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('meal_plans').delete().eq('user_id', userId).eq('date', date).eq('meal', meal);
  if (error) throw error;
}

// Grocery lists per user
export type GroceryListItem = {
  id: string;
  user_id: string;
  ingredient_name: string;
  amount: number;
  unit: string;
  category: Ingredient["category"];
  checked: boolean;
  is_custom: boolean;
}

export async function fetchGroceryListForUser(userId: string): Promise<GroceryListItem[]> {
  if (!supabase) throw new Error("Supabase not configured");
  const { data, error } = await supabase.from('grocery_lists').select('*').eq('user_id', userId).order('ingredient_name');
  if (error) throw error;
  return (data ?? []) as GroceryListItem[];
}

export async function upsertGroceryListItem(item: Omit<GroceryListItem, 'id'> & { id?: string }): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('grocery_lists').upsert(item, { onConflict: 'user_id,ingredient_name,unit' });
  if (error) throw error;
}

export async function deleteGroceryListItem(userId: string, ingredientName: string, unit: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('grocery_lists').delete().eq('user_id', userId).eq('ingredient_name', ingredientName).eq('unit', unit);
  if (error) throw error;
}

export async function clearGroceryListForUser(userId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from('grocery_lists').delete().eq('user_id', userId);
  if (error) throw error;
}


