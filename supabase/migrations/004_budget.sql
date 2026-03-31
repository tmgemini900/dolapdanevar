-- ============================================================
-- BÜTÇEAPP: transactions table
-- ============================================================
create table public.transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  amount      numeric(12,2) not null,
  type        text not null check (type in ('income','expense')),
  category    text default 'Diğer',
  subcategory text,
  note        text,
  date        date default current_date,
  created_at  timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "transactions_select" on public.transactions
  for select using (
    auth.uid() = user_id
    or user_id = (
      select partner_id from public.profiles
      where id = auth.uid() and partner_id is not null
    )
  );

create policy "transactions_insert" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "transactions_update" on public.transactions
  for update using (auth.uid() = user_id);

create policy "transactions_delete" on public.transactions
  for delete using (auth.uid() = user_id);
