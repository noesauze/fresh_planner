import { useEffect, useState } from "react";
import { sampleRecipes } from "@/data/recipes";
import { Recipe } from "@/types/recipe";
import RecipeCard from "@/components/RecipeCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-image.jpg";
import { useNavigate } from "react-router-dom";
import { isSupabaseEnabled, supabase } from "@/lib/supabaseClient";
import { listRecipes as listRecipesFromSupabase, bulkInsertRecipes, upsertMealPlanRow } from "@/lib/supabaseApi";

const Recipes = () => {
  const [recipes, setRecipes] = useState<Recipe[]>(sampleRecipes);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      if (isSupabaseEnabled) {
        try {
          let remote = await listRecipesFromSupabase();
          if (remote.length === 0) {
            await bulkInsertRecipes(sampleRecipes.map(({ id, ...r }) => r));
            remote = await listRecipesFromSupabase();
          }
          setRecipes(remote);
          return;
        } catch {}
      }
      // Supabase not configured: show only bundled samples
      setRecipes(sampleRecipes);
    })();
  }, []);

  // Get user ID for meal planning
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    (async () => {
      const { data } = await supabase!.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const allTags = Array.from(new Set(recipes.flatMap(recipe => recipe.tags)));
  
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => recipe.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAddToPlan = async (recipe: Recipe, date: string, meal: 'breakfast' | 'lunch' | 'dinner') => {
    if (!isSupabaseEnabled || !userId) {
      toast({
        title: "Login Required",
        description: "Please log in to add recipes to your meal plan.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await upsertMealPlanRow({
        user_id: userId,
        date: date,
        meal: meal,
        recipe: recipe,
      });
      
      toast({
        title: "Recipe Added!",
        description: `${recipe.name} has been added to ${meal} on ${new Date(date).toLocaleDateString()}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add recipe to meal plan.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <section className="relative bg-gradient-primary py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-4">
            Fresh Recipes
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Discover delicious, healthy recipes that make meal planning effortless. 
            From quick weeknight dinners to weekend favorites.
          </p>
          <Button variant="hero" size="lg" className="text-lg px-8" onClick={() => navigate("/recipes/new") }>
            <Plus className="mr-2 h-5 w-5" />
            Add New Recipe
          </Button>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="bg-card rounded-lg shadow-card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Tags Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm font-medium text-muted-foreground mr-2">Tags:</span>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer transition-all duration-200 hover:scale-105"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Recipe Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onAddToPlan={handleAddToPlan}
            />
          ))}
        </div>

        {filteredRecipes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No recipes found matching your criteria.
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedTags([]);
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recipes;