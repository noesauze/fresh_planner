import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Recipe, Ingredient } from "@/types/recipe";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Removed localStorage usage in favor of Supabase
import { isSupabaseEnabled } from "@/lib/supabaseClient";
import { createRecipe, listCatalog, upsertCatalogItems, uploadRecipeImage, upsertPackagingOptions } from "@/lib/supabaseApi";
import { useTranslation } from 'react-i18next';

const difficultyOptions: Recipe["difficulty"][] = ["easy", "medium", "hard"];
const tagSuggestions = ["healthy", "quick", "vegetarian", "gluten-free", "comfort-food", "family-friendly", "protein", "asian"];

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const NewRecipe = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<{ name: string; defaultUnit: string; category: Ingredient["category"] }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<Ingredient["category"] | "all">("all");

  useEffect(() => {
    (async () => {
      if (!isSupabaseEnabled) return;
      try {
        const items = await listCatalog();
        setCatalog(items);
      } catch {}
    })();
  }, []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<string>("");
  const [cookTime, setCookTime] = useState(15);
  const [servings, setServings] = useState(2);
  const [difficulty, setDifficulty] = useState<Recipe["difficulty"]>("easy");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: crypto.randomUUID(), name: "", amount: 0, unit: "g", category: "other" },
  ]);

  const handleAddInstruction = () => setInstructions(prev => [...prev, ""]);
  const handleRemoveInstruction = (idx: number) => setInstructions(prev => prev.filter((_, i) => i !== idx));

  const handleAddIngredient = () => setIngredients(prev => [...prev, { id: crypto.randomUUID(), name: "", amount: 0, unit: "g", category: "other" }]);
  const handleRemoveIngredient = (id: string) => setIngredients(prev => prev.filter(ing => ing.id !== id));

  const handleIngredientNameChange = (id: string, value: string) => {
    const found = catalog.find(c => c.name.toLowerCase() === value.toLowerCase());
    setIngredients(prev => prev.map(ing => ing.id === id ? {
      ...ing,
      name: value,
      unit: found?.defaultUnit ?? ing.unit,
      category: found?.category ?? ing.category,
    } : ing));
  };

  const handleImageFile = async (file: File) => {
    // Compress image to reduce localStorage usage
    const blob = await compressImageFile(file, 1200, 0.7);
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result || ""));
    reader.readAsDataURL(blob);
  };

  async function compressImageFile(file: File, maxWidth: number, quality: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob ?? file;
  }

  const canSave = name.trim() && description.trim() && instructions.filter(s => s.trim()).length > 0 && ingredients.some(i => i.name.trim());

  const onSubmit = async () => {
    if (!canSave) return;
    if (isSupabaseEnabled) {
      const items = ingredients
        .filter(i => i.name.trim())
        .map(i => ({ name: i.name.trim(), defaultUnit: i.unit, category: i.category }));
      if (items.length) await upsertCatalogItems(items);

      let imageUrl = image;
      // If image is a data URL, try to upload to Supabase storage
      if (image && image.startsWith("data:")) {
        const res = await fetch(image);
        const blob = await res.blob();
        imageUrl = await uploadRecipeImage(new File([blob], `${crypto.randomUUID()}.jpg`, { type: blob.type || "image/jpeg" }));
      }

      const created = await createRecipe({
        name: name.trim(),
        description: description.trim(),
        image: imageUrl || "",
        cookTime,
        servings,
        difficulty,
        tags,
        instructions: instructions.filter(s => s.trim()),
        ingredients: ingredients
          .filter(i => i.name.trim())
          .map(i => ({ ...i, name: i.name.trim(), amount: Number(i.amount) })),
      });
      navigate(`/recipes/${created.id}`);
    } else {
      // Supabase not configured: disable save
      alert(t('errors.supabaseNotConfigured'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h1 className="text-2xl font-bold">{t('recipes.createNewRecipe')}</h1>
              <p className="text-sm text-muted-foreground">{t('recipes.fillDetails')}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('recipes.name')}</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('recipes.namePlaceholder')} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('recipes.difficulty')}</label>
                  <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Recipe["difficulty"])}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('recipes.selectDifficulty')} />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map(d => (<SelectItem key={d} value={d}>{t(`recipes.${d}`)}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t('recipes.cookTimeMinutes')}</label>
                  <Input type="number" min={0} value={cookTime} onChange={(e) => setCookTime(toNumber(e.target.value))} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('recipes.servingsCount')}</label>
                  <Input type="number" min={1} value={servings} onChange={(e) => setServings(Math.max(1, toNumber(e.target.value)))} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">{t('recipes.description')}</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('recipes.descriptionPlaceholder')} />
              </div>

              <div>
                <label className="text-sm font-medium">{t('recipes.image')}</label>
                <div className="flex items-center gap-3">
                  <Input type="url" placeholder={t('recipes.imageUrlPlaceholder')} value={image.startsWith("data:") ? "" : image} onChange={(e) => setImage(e.target.value)} />
                  <Input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageFile(file); }} />
                </div>
                {image && (
                  <div className="mt-3 overflow-hidden rounded border border-border w-full max-w-md">
                    <img src={image} alt="Recipe preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">{t('recipes.tagsLabel')}</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(t => (
                    <Badge key={t} variant="outline" onClick={() => setTags(tags.filter(x => x !== t))} className="cursor-pointer">{t}</Badge>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input placeholder={t('recipes.addTagPlaceholder')} value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { setTags(Array.from(new Set([...tags, tagInput.trim()]))); setTagInput(""); } }} />
                  <Button type="button" variant="outline" onClick={() => { if (tagInput.trim()) { setTags(Array.from(new Set([...tags, tagInput.trim()]))); setTagInput(""); } }}>{t('common.add')}</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tagSuggestions.map(s => (
                    <Button key={s} variant="secondary" size="sm" onClick={() => setTags(Array.from(new Set([...tags, s])))}>{s}</Button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">{t('recipes.instructionsLabel')}</h2>
                <div className="space-y-3">
                  {instructions.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-2 text-sm text-muted-foreground w-6">{idx + 1}.</span>
                      <Textarea value={step} onChange={(e) => setInstructions(prev => prev.map((s, i) => i === idx ? e.target.value : s))} placeholder={t('recipes.writeStep')} />
                      <Button type="button" variant="outline" onClick={() => handleRemoveInstruction(idx)}>{t('common.remove')}</Button>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={handleAddInstruction}>{t('recipes.addStep')}</Button>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">{t('recipes.ingredientsLabel')}</h2>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-muted-foreground">{t('recipes.filterByCategory')}</span>
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t('recipes.all')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('recipes.all')}</SelectItem>
                      {(["protein","vegetable","grain","dairy","spice","other"] as Ingredient["category"][]).map(c => (
                        <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSupabaseEnabled && (
                    <NewIngredientModal onCreated={async () => { try { const items = await listCatalog(); setCatalog(items); } catch {} }} />
                  )}
                </div>
                <div className="space-y-3">
                  {ingredients.map((ing) => (
                    <div key={ing.id} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                      <div className="md:col-span-2">
                        <Input list={`ingredient-names-${ing.id}`} placeholder={t('recipes.ingredientName')} value={ing.name} onChange={(e) => handleIngredientNameChange(ing.id, e.target.value)} />
                        <datalist id={`ingredient-names-${ing.id}`}>
                          {catalog.filter(c => categoryFilter === "all" || c.category === categoryFilter).map(c => (<option key={c.name} value={c.name} />))}
                        </datalist>
                      </div>
                      <div>
                        <Input type="number" min={0} placeholder={t('recipes.amount')} value={ing.amount} onChange={(e) => setIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, amount: toNumber(e.target.value) } : i))} />
                      </div>
                      <div>
                        <Input placeholder={t('recipes.unit')} value={ing.unit} onChange={(e) => setIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, unit: e.target.value } : i))} />
                      </div>
                      <div>
                        <Select value={ing.category} onValueChange={(v) => setIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, category: v as Ingredient["category"] } : i))}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('recipes.selectCategory')} />
                          </SelectTrigger>
                          <SelectContent>
                            {(["protein","vegetable","grain","dairy","spice","other"] as Ingredient["category"][ ]).map(c => (
                              <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Button type="button" variant="outline" onClick={() => handleRemoveIngredient(ing.id)}>{t('common.remove')}</Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" onClick={handleAddIngredient}>{t('recipes.addIngredient')}</Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
                <Button onClick={onSubmit} disabled={!canSave}>{t('recipes.saveRecipe')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">{t('recipes.tips')}</h2>
              <p className="text-sm text-muted-foreground">{t('recipes.tipsDescription')}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('recipes.imageTip')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NewRecipe;

// Modal to create a new ingredient with packaging options
function NewIngredientModal({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Ingredient["category"]>("other");
  const [defaultUnit, setDefaultUnit] = useState("g");
  const [packUnit, setPackUnit] = useState("g");
  const [packs, setPacks] = useState<number[]>([]);

  const addPack = () => setPacks(prev => [...prev, 0]);
  const removePack = (idx: number) => setPacks(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (!name.trim() || !isSupabaseEnabled) return;
    await upsertCatalogItems([{ name: name.trim(), defaultUnit, category }]);
    const options = packs.filter(v => v > 0).map(v => ({ ingredient_name: name.trim(), unit: packUnit, pack_amount: v }));
    if (options.length) await upsertPackagingOptions(options as any);
    setOpen(false);
    await onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t('recipes.newIngredient')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('recipes.createIngredient')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('recipes.name')}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pasta" />
            </div>
            <div>
              <label className="text-sm font-medium">{t('recipes.category')}</label>
              <Select value={category} onValueChange={(v) => setCategory(v as Ingredient["category"]) }>
                <SelectTrigger>
                  <SelectValue placeholder={t('recipes.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {(["protein","vegetable","grain","dairy","spice","other"] as Ingredient["category"][]).map(c => (
                    <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('recipes.defaultUnit')}</label>
              <Input value={defaultUnit} onChange={(e) => setDefaultUnit(e.target.value)} placeholder={t('recipes.unitPlaceholder')} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('recipes.packagingUnit')}</label>
              <Input value={packUnit} onChange={(e) => setPackUnit(e.target.value)} placeholder={t('recipes.unitPlaceholder')} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">{t('recipes.packagingAmounts')}</label>
              <Button variant="secondary" size="sm" onClick={addPack}>{t('common.add')}</Button>
            </div>
            <div className="space-y-2">
              {packs.map((v, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input type="number" min={0} value={v} onChange={(e) => setPacks(prev => prev.map((x,i) => i===idx ? Number(e.target.value) : x))} />
                  <Button variant="outline" size="sm" onClick={() => removePack(idx)}>{t('common.remove')}</Button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={save} disabled={!name.trim()}>{t('common.save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

