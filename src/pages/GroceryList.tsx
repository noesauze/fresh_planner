import { useEffect, useMemo, useState } from "react";
import { Check, ShoppingCart, Plus, Trash2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { sampleRecipes } from "@/data/recipes";
import { GroceryItem, Ingredient, Recipe } from "@/types/recipe";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseEnabled, supabase } from "@/lib/supabaseClient";
import { fetchMealPlansForUser, fetchGroceryListForUser, upsertGroceryListItem, deleteGroceryListItem, clearGroceryListForUser } from "@/lib/supabaseApi";

const GroceryList = () => {
  // Planned meals -> recipes from Supabase meal_plans when available
  const [plannedRecipes, setPlannedRecipes] = useState<Recipe[]>(sampleRecipes.slice(0, 0));
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load user's planned meals from Supabase
  const loadPlannedMeals = async () => {
    if (!isSupabaseEnabled) {
      // fallback demo: show a couple of samples so UI works
      setPlannedRecipes(sampleRecipes.slice(0, 2));
      return;
    }
    const { data } = await supabase!.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    setUserId(uid);
    const rows = await fetchMealPlansForUser(uid);
    const recipes = rows.map(r => r.recipe).filter(Boolean) as Recipe[];
    setPlannedRecipes(recipes);
  };

  useEffect(() => {
    loadPlannedMeals();
  }, []);

  // Listen to auth changes to reload meals when user logs in/out
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadPlannedMeals();
      } else {
        setPlannedRecipes([]);
        setUserId(null);
        setGroceryItems([]);
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  // Auto-generate grocery list when planned recipes change
  useEffect(() => {
    if (plannedRecipes.length === 0) {
      setGroceryItems([]);
      return;
    }

    const ingredientMap = new Map();
    
    plannedRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const key = ingredient.name.toLowerCase();
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          ingredientMap.set(key, {
            ...existing,
            amount: existing.amount + ingredient.amount,
          });
        } else {
          ingredientMap.set(key, { ...ingredient });
        }
      });
    });

    const newGroceryItems: GroceryItem[] = Array.from(ingredientMap.values()).map((ingredient: Ingredient) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
      category: ingredient.category,
      checked: false,
    }));

    // Load saved state from DB and merge with generated items
    if (isSupabaseEnabled && userId) {
      (async () => {
        try {
          const savedItems = await fetchGroceryListForUser(userId);
          const savedMap = new Map(savedItems.map(item => [`${item.ingredient_name.toLowerCase()}_${item.unit}`, item]));
          
          const mergedItems = newGroceryItems.map(item => {
            const key = `${item.name.toLowerCase()}_${item.unit}`;
            const saved = savedMap.get(key);
            return saved ? {
              ...item,
              id: saved.id,
              checked: saved.checked,
            } : item;
          });

          // Add custom items that aren't in planned recipes
          const customItems = savedItems
            .filter(item => item.is_custom)
            .filter(item => !mergedItems.some(merged => merged.name.toLowerCase() === item.ingredient_name.toLowerCase() && merged.unit === item.unit))
            .map(item => ({
              id: item.id,
              name: item.ingredient_name,
              amount: item.amount,
              unit: item.unit,
              category: item.category,
              checked: item.checked,
            }));

          setGroceryItems([...mergedItems, ...customItems]);
        } catch {
          setGroceryItems(newGroceryItems);
        }
      })();
    } else {
      setGroceryItems(newGroceryItems);
    }
  }, [plannedRecipes, userId]);

  const toggleItem = async (id: string) => {
    const item = groceryItems.find(i => i.id === id);
    if (!item || !isSupabaseEnabled || !userId) {
      setGroceryItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      );
      return;
    }

    const newChecked = !item.checked;
    setGroceryItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: newChecked } : item
      )
    );

    // Save to DB
    try {
      await upsertGroceryListItem({
        user_id: userId,
        ingredient_name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category as Ingredient["category"],
        checked: newChecked,
        is_custom: false, // Will be updated based on context
      });
    } catch {}
  };

  const removeItem = async (id: string) => {
    const item = groceryItems.find(i => i.id === id);
    setGroceryItems(prev => prev.filter(item => item.id !== id));
    
    // Remove from DB if custom item
    if (item && isSupabaseEnabled && userId) {
      try {
        await deleteGroceryListItem(userId, item.name, item.unit);
      } catch {}
    }
  };

  const addCustomItem = async () => {
    const newItem: GroceryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: "Custom Item",
      amount: 1,
      unit: "piece",
      category: "other",
      checked: false,
    };
    setGroceryItems(prev => [...prev, newItem]);
    
    // Save to DB
    if (isSupabaseEnabled && userId) {
      try {
        await upsertGroceryListItem({
          user_id: userId,
          ingredient_name: newItem.name,
          amount: newItem.amount,
          unit: newItem.unit,
          category: newItem.category as Ingredient["category"],
          checked: newItem.checked,
          is_custom: true,
        });
      } catch {}
    }
  };

  const groupedItems = useMemo(() => {
    const groups = groceryItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, GroceryItem[]>);

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [groceryItems]);

  const checkedCount = groceryItems.filter(item => item.checked).length;
  const totalCount = groceryItems.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const categoryIcons = {
    protein: "🥩",
    vegetable: "🥕",
    grain: "🌾",
    dairy: "🥛",
    spice: "🧄",
    other: "📦",
  };

  const categoryColors = {
    protein: "destructive",
    vegetable: "success",
    grain: "secondary",
    dairy: "default",
    spice: "outline",
    other: "outline",
  } as const;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Smart Grocery List
          </h1>
          <p className="text-muted-foreground">
            Optimized quantities based on your meal plan
          </p>
        </div>

        {/* Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="shadow-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold text-foreground">
                    {checkedCount}/{totalCount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{Math.round(progress)}% Complete</p>
                  <div className="w-20 h-2 bg-muted rounded-full mt-1">
                    <div 
                      className="h-full bg-success rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Planned Recipes</p>
                  <p className="text-2xl font-bold text-foreground">{plannedRecipes.length}</p>
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {groceryItems.length > 0 && (
          <div className="flex gap-4 mb-6">
            <Button variant="outline" onClick={addCustomItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Item
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setGroceryItems([])}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear List
            </Button>
          </div>
        )}

        {/* Grocery List by Category */}
        {groceryItems.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {groupedItems.map(([category, items]) => (
              <Card key={category} className="shadow-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 capitalize">
                    <span className="text-2xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                    {category}
                    <Badge variant={categoryColors[category as keyof typeof categoryColors]} className="ml-auto">
                      {items.length} items
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map(item => (
                    <div 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                        item.checked 
                          ? 'bg-success/5 border-success/20' 
                          : 'bg-background border-border hover:bg-accent/50'
                      }`}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.amount} {item.unit}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-border">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {plannedRecipes.length === 0 ? "No Planned Meals" : "No Grocery Items"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {plannedRecipes.length === 0 
                  ? "Plan some meals in the Meal Planner to see your grocery list here."
                  : "Your planned meals don't have any ingredients yet."
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GroceryList;