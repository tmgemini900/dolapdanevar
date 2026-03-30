-- ============================================================
-- FIX: infinite recursion in profiles SELECT policy
-- profiles_select policy referenced itself → infinite loop
-- All SELECT policies on all tables fixed here.
-- ============================================================

-- 1. Drop recursive profiles policy, replace with simple one
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "partner_profile_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

-- 2. saved_recipes SELECT (was also broken via profiles subquery)
drop policy if exists "recipes_select" on public.saved_recipes;

create policy "recipes_select" on public.saved_recipes
  for select using (
    auth.uid() = user_id
    or user_id = (
      select partner_id from public.profiles
      where id = auth.uid() and partner_id is not null
    )
  );

-- 3. kitchen_items SELECT
drop policy if exists "kitchen_select" on public.kitchen_items;

create policy "kitchen_select" on public.kitchen_items
  for select using (
    auth.uid() = user_id
    or user_id = (
      select partner_id from public.profiles
      where id = auth.uid() and partner_id is not null
    )
  );

-- 4. shopping_items SELECT
drop policy if exists "shopping_select" on public.shopping_items;

create policy "shopping_select" on public.shopping_items
  for select using (
    auth.uid() = user_id
    or user_id = (
      select partner_id from public.profiles
      where id = auth.uid() and partner_id is not null
    )
  );
