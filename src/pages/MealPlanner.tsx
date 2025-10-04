import { useEffect, useMemo, useState } from "react";
import { Calendar, Plus, Trash2, ChefHat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sampleRecipes } from "@/data/recipes";
import { Recipe } from "@/types/recipe";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseEnabled, supabase } from "@/lib/supabaseClient";
import { deleteMealPlanRow, fetchMealPlansForUser, upsertMealPlanRow } from "@/lib/supabaseApi";
import { useNavigate } from "react-router-dom";

interface MealSlot {
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner';
  recipe?: Recipe;
}

const MealPlanner = () => {
  const [plannedMeals, setPlannedMeals] = useState<MealSlot[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Generate 7 days starting from today
  const getDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  };

  const days = getDays();
  const mealTypes = ['breakfast', 'lunch', 'dinner'] as const;

  const getMealForSlot = (date: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    return plannedMeals.find(m => m.date === date && m.meal === meal)?.recipe;
  };

  const addRandomMeal = async (date: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    const randomRecipe = sampleRecipes[Math.floor(Math.random() * sampleRecipes.length)];
    
    setPlannedMeals(prev => {
      const filtered = prev.filter(m => !(m.date === date && m.meal === meal));
      return [...filtered, { date, meal, recipe: randomRecipe }];
    });

    if (isSupabaseEnabled && userId) {
      await upsertMealPlanRow({ user_id: userId, date, meal, recipe: randomRecipe });
    }

    toast({
      title: "Meal Added!",
      description: `${randomRecipe.name} added to ${meal} on ${new Date(date).toLocaleDateString()}`,
    });
  };

  const removeMeal = async (date: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    setPlannedMeals(prev => prev.filter(m => !(m.date === date && m.meal === meal)));
    if (isSupabaseEnabled && userId) {
      await deleteMealPlanRow(userId, date, meal);
    }
    toast({
      title: "Meal Removed",
      description: `Meal removed from ${meal}`,
    });
  };
  // Auth + initial load
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    (async () => {
      const { data } = await supabase!.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const rows = await fetchMealPlansForUser(uid);
        setPlannedMeals(rows.map(r => ({ date: r.date, meal: r.meal, recipe: r.recipe ?? undefined })));
      }
    })();
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) setPlannedMeals([]);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const getTotalIngredients = () => {
    const ingredients = new Map();
    
    plannedMeals.forEach(mealSlot => {
      if (mealSlot.recipe) {
        mealSlot.recipe.ingredients.forEach(ingredient => {
          const key = ingredient.name.toLowerCase();
          if (ingredients.has(key)) {
            const existing = ingredients.get(key);
            ingredients.set(key, {
              ...existing,
              amount: existing.amount + ingredient.amount,
            });
          } else {
            ingredients.set(key, { ...ingredient });
          }
        });
      }
    });
    
    return Array.from(ingredients.values());
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Weekly Meal Planner
          </h1>
          <p className="text-muted-foreground">
            Plan your meals for the week and generate your grocery list automatically
          </p>
        </div>

        {/* Meal Planning Horizontal Scroll */}
        <div className="mb-8">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold">Next 7 Days</h2>
            <p className="text-sm text-muted-foreground">
              {days[0]?.date} - {days[6]?.date}
            </p>
          </div>
          
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
              {days.map(day => (
                <Card key={day.date} className={`shadow-card border-border flex-shrink-0 w-80 ${day.isToday ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">
                  <div className={`text-lg font-semibold ${day.isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day.day}
                  </div>
                  <div className="text-sm text-muted-foreground">{day.dayNum}</div>
                  {day.isToday && (
                    <Badge variant="default" className="mt-1 text-xs">
                      Today
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mealTypes.map(mealType => {
                  const meal = getMealForSlot(day.date, mealType);
                  
                  return (
                    <div key={mealType} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium capitalize text-foreground">
                          {mealType}
                        </span>
                        {meal && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMeal(day.date, mealType)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      {meal ? (
                        <div className="space-y-3">
                          <div 
                            className="aspect-video overflow-hidden rounded border border-border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => navigate(`/recipes/${meal.id}`)}
                          >
                            <img 
                              src={meal.image} 
                              alt={meal.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="text-sm font-medium text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                               onClick={() => navigate(`/recipes/${meal.id}`)}>
                            {meal.name}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <ChefHat className="h-3 w-3" />
                              {meal.cookTime}m
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {meal.difficulty}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-12"
                          onClick={() => addRandomMeal(day.date, mealType)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Meal
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Week Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planned Meals:</span>
                  <span className="font-medium">{plannedMeals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Cook Time:</span>
                  <span className="font-medium">
                    {plannedMeals.reduce((acc, meal) => acc + (meal.recipe?.cookTime || 0), 0)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique Ingredients:</span>
                  <span className="font-medium">{getTotalIngredients().length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/recipes/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Recipe
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Auto-Fill Week
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Grocery List Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {getTotalIngredients().length} ingredients needed
              </p>
              <Button variant="success" className="w-full" onClick={() => navigate("/groceries")}>
                Generate Full List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MealPlanner;