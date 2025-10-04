import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { sampleRecipes } from "@/data/recipes";
import { isSupabaseEnabled } from "@/lib/supabaseClient";
import { getRecipeById } from "@/lib/supabaseApi";
import { Recipe } from "@/types/recipe";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Clock, Users, ChefHat } from "lucide-react";
import { useTranslation } from 'react-i18next';

const RecipeDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [dbRecipe, setDbRecipe] = useState<Recipe | null>(null);
  const sample = useMemo(() => sampleRecipes.find(r => r.id === id), [id]);
  useEffect(() => {
    (async () => {
      if (isSupabaseEnabled && !sample && id) {
        const r = await getRecipeById(id);
        setDbRecipe(r);
      }
    })();
  }, [id, sample]);

  const recipe: Recipe | null = sample ?? dbRecipe;

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <p className="text-muted-foreground">{t('errors.recipeNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('common.back')}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-border shadow-sm">
            <img src={recipe.image} alt={recipe.name} className="w-full h-[320px] object-cover" />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-xl font-semibold">{t('recipes.instructions')}</h2>
              <p className="text-sm text-muted-foreground">{t('recipes.followSteps', { recipeName: recipe.name })}</p>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal pl-6 space-y-3">
                {recipe.instructions.map((step, idx) => (
                  <li key={idx} className="text-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold leading-tight">{recipe.name}</h1>
              <p className="text-muted-foreground">{recipe.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {t('recipes.cookTime', { time: recipe.cookTime })}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {t('recipes.servings', { count: recipe.servings })}
                </div>
                <div className="flex items-center gap-1">
                  <ChefHat className="h-4 w-4" />
                  {recipe.difficulty}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>

              <h3 className="font-semibold mb-3">{t('recipes.ingredientsList')}</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map(ing => (
                  <li key={ing.id} className="flex items-center justify-between">
                    <span>{ing.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {ing.amount} {ing.unit}
                    </span>
                  </li>
                ))}
              </ul>

              <Button className="w-full mt-6">{t('recipes.addToMealPlan')}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;


