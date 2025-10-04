-- Schema for Fresh Planner Hub
-- Run this in Supabase SQL Editor or via a psql connection (service role)

create extension if not exists pgcrypto;

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  image text,
  "cookTime" int4 not null,
  servings int4 not null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  tags text[] not null default '{}',
  instructions text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  inserted_at timestamptz default now()
);

create table if not exists public.ingredients (
  name text primary key,
  "defaultUnit" text not null,
  category text not null check (category in ('protein','vegetable','grain','dairy','spice','other'))
);

-- Packaging options per ingredient (e.g., pasta 500g, 1kg; eggs x6, x24)
create table if not exists public.ingredient_packaging (
  id uuid primary key default gen_random_uuid(),
  ingredient_name text not null references public.ingredients(name) on delete cascade,
  unit text not null,              -- e.g. 'g', 'ml', 'piece'
  pack_amount numeric not null,    -- e.g. 500, 1000, 6, 24
  unique(ingredient_name, unit, pack_amount)
);

alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_packaging enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes anon select'
  ) then
    create policy "recipes anon select" on public.recipes for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes anon insert'
  ) then
    create policy "recipes anon insert" on public.recipes for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes auth select'
  ) then
    create policy "recipes auth select" on public.recipes for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'recipes' and policyname = 'recipes auth insert'
  ) then
    create policy "recipes auth insert" on public.recipes for insert to authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredients' and policyname = 'ingredients anon select'
  ) then
    create policy "ingredients anon select" on public.ingredients for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredients' and policyname = 'ingredients anon insert'
  ) then
    create policy "ingredients anon insert" on public.ingredients for insert to anon with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredients' and policyname = 'ingredients anon update'
  ) then
    create policy "ingredients anon update" on public.ingredients for update to anon using (true) with check (true);
  end if;
  -- Also allow authenticated role (signed-in users)
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredients' and policyname = 'ingredients auth select'
  ) then
    create policy "ingredients auth select" on public.ingredients for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredients' and policyname = 'ingredients auth insert'
  ) then
    create policy "ingredients auth insert" on public.ingredients for insert to authenticated with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredients' and policyname = 'ingredients auth update'
  ) then
    create policy "ingredients auth update" on public.ingredients for update to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredient_packaging' and policyname = 'ingredient_packaging anon select'
  ) then
    create policy "ingredient_packaging anon select" on public.ingredient_packaging for select to anon using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredient_packaging' and policyname = 'ingredient_packaging anon upsert'
  ) then
    create policy "ingredient_packaging anon upsert" on public.ingredient_packaging for all to anon using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredient_packaging' and policyname = 'ingredient_packaging auth select'
  ) then
    create policy "ingredient_packaging auth select" on public.ingredient_packaging for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'ingredient_packaging' and policyname = 'ingredient_packaging auth upsert'
  ) then
    create policy "ingredient_packaging auth upsert" on public.ingredient_packaging for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Meal plans per user
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date date not null,
  meal text not null check (meal in ('breakfast','lunch','dinner')),
  recipe jsonb,
  inserted_at timestamptz default now(),
  unique(user_id, date, meal)
);

alter table public.meal_plans enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'meal_plans' and policyname = 'meal_plans select own'
  ) then
    create policy "meal_plans select own" on public.meal_plans for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'meal_plans' and policyname = 'meal_plans insert own'
  ) then
    create policy "meal_plans insert own" on public.meal_plans for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'meal_plans' and policyname = 'meal_plans update own'
  ) then
    create policy "meal_plans update own" on public.meal_plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'meal_plans' and policyname = 'meal_plans delete own'
  ) then
    create policy "meal_plans delete own" on public.meal_plans for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;

-- Grocery lists per user (custom items + checked state)
create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ingredient_name text not null,
  amount numeric not null,
  unit text not null,
  category text not null check (category in ('protein','vegetable','grain','dairy','spice','other')),
  checked boolean not null default false,
  is_custom boolean not null default false,
  inserted_at timestamptz default now(),
  unique(user_id, ingredient_name, unit)
);

alter table public.grocery_lists enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'grocery_lists' and policyname = 'grocery_lists select own'
  ) then
    create policy "grocery_lists select own" on public.grocery_lists for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'grocery_lists' and policyname = 'grocery_lists insert own'
  ) then
    create policy "grocery_lists insert own" on public.grocery_lists for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'grocery_lists' and policyname = 'grocery_lists update own'
  ) then
    create policy "grocery_lists update own" on public.grocery_lists for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'grocery_lists' and policyname = 'grocery_lists delete own'
  ) then
    create policy "grocery_lists delete own" on public.grocery_lists for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;



