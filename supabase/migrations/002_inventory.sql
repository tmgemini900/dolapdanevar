-- ============================================================
-- DOLAPTA NE VAR? — Inventory & Shopping Schema
-- ============================================================

-- kitchen_items: mutfak envanteri
create table public.kitchen_items (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  name        text not null,
  quantity    numeric default 1,
  unit        text default 'adet',
  category    text default 'Diğer',
  location    text default 'Dolap',
  expiry_date date,
  note        text,
  created_at  timestamptz default now()
);

alter table public.kitchen_items enable row level security;

create policy "kitchen_select" on public.kitchen_items
  for select using (
    auth.uid() = user_id
    or user_id = (select partner_id from public.profiles where id = auth.uid())
  );

create policy "kitchen_insert" on public.kitchen_items
  for insert with check (auth.uid() = user_id);

create policy "kitchen_update" on public.kitchen_items
  for update using (auth.uid() = user_id);

create policy "kitchen_delete" on public.kitchen_items
  for delete using (auth.uid() = user_id);

-- ============================================================
-- shopping_items: alışveriş listesi
-- ============================================================
create table public.shopping_items (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users on delete cascade not null,
  name         text not null,
  quantity     numeric default 1,
  unit         text default 'adet',
  category     text default 'Market',
  is_completed boolean default false,
  note         text,
  created_at   timestamptz default now()
);

alter table public.shopping_items enable row level security;

create policy "shopping_select" on public.shopping_items
  for select using (
    auth.uid() = user_id
    or user_id = (select partner_id from public.profiles where id = auth.uid())
  );

create policy "shopping_insert" on public.shopping_items
  for insert with check (auth.uid() = user_id);

create policy "shopping_update" on public.shopping_items
  for update using (auth.uid() = user_id);

create policy "shopping_delete" on public.shopping_items
  for delete using (auth.uid() = user_id);
