import { Recipe } from "@/types/recipe";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Users, ChefHat, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from 'react-i18next';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect?: (recipe: Recipe) => void;
  onAddToPlan?: (recipe: Recipe, date: string, meal: 'breakfast' | 'lunch' | 'dinner') => void;
}

const RecipeCard = ({ recipe, onSelect, onAddToPlan }: RecipeCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  
  const difficultyColors = {
    easy: "success",
    medium: "secondary",
    hard: "destructive",
  } as const;

  // Generate next 7 days for selection
  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        value: date.toISOString().split('T')[0],
        label: i === 0 ? t('common.today') : 
               i === 1 ? t('common.tomorrow') : 
               date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return days;
  };

  const days = getNext7Days();
  const mealTypes = [
    { value: 'breakfast', label: t('mealPlanner.breakfast') },
    { value: 'lunch', label: t('mealPlanner.lunch') },
    { value: 'dinner', label: t('mealPlanner.dinner') }
  ] as const;

  const handleAddToPlan = () => {
    if (selectedDate && onAddToPlan) {
      onAddToPlan(recipe, selectedDate, selectedMeal);
      setIsDialogOpen(false);
    }
  };

  const handleAddToPlanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
    // Set default to today if not set
    if (!selectedDate) {
      setSelectedDate(days[0].value);
    }
  };

  return (
    <Card className="group overflow-hidden border-border hover:shadow-card transition-all duration-300 hover:scale-105 cursor-pointer"
      onClick={() => (onSelect ? onSelect(recipe) : navigate(`/recipes/${recipe.id}`))}
    >
      <div className="aspect-video overflow-hidden">
        <img
          src={recipe.image}
          alt={recipe.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg leading-tight text-foreground line-clamp-2">
            {recipe.name}
          </h3>
          <Badge variant={difficultyColors[recipe.difficulty]} className="shrink-0">
            {recipe.difficulty}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {recipe.description}
        </p>
      </CardHeader>

      <CardContent className="py-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
            {t('recipes.ingredients', { count: recipe.ingredients.length })}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-3">
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-2">
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onSelect ? onSelect(recipe) : navigate(`/recipes/${recipe.id}`); }}
          >
            {t('recipes.viewRecipe')}
          </Button>
          <Button 
            variant="default" 
            className="flex-1"
            onClick={handleAddToPlanClick}
          >
            {t('recipes.addToPlan')}
          </Button>
        </div>
      </CardFooter>

      {/* Add to Plan Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="sm:max-w-md" 
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <DialogHeader onClick={(e) => e.stopPropagation()}>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('recipes.addToMealPlan')}
            </DialogTitle>
          </DialogHeader>
          
          <div 
            className="space-y-4 py-4" 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
          >
            {/* Recipe Preview */}
            <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <img 
                src={recipe.image} 
                alt={recipe.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-medium text-sm">{recipe.name}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('recipes.cookTime', { time: recipe.cookTime })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('recipes.servings', { count: recipe.servings })}
                  </span>
                </div>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.date')}</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger 
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <SelectValue placeholder={t('common.selectDate')} />
                </SelectTrigger>
                <SelectContent>
                  {days.map(day => (
                    <SelectItem key={day.value} value={day.value}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Meal Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('common.meal')}</label>
              <Select value={selectedMeal} onValueChange={(value) => setSelectedMeal(value as 'breakfast' | 'lunch' | 'dinner')}>
                <SelectTrigger 
                  onClick={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
                >
                  <SelectValue placeholder={t('common.selectMeal')} />
                </SelectTrigger>
                <SelectContent>
                  {mealTypes.map(meal => (
                    <SelectItem key={meal.value} value={meal.value}>
                      {meal.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter 
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <Button 
              variant="outline" 
              onClick={(e) => { e.stopPropagation(); setIsDialogOpen(false); }}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              onClick={(e) => { e.stopPropagation(); handleAddToPlan(); }} 
              disabled={!selectedDate}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {t('recipes.addToPlan')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default RecipeCard;