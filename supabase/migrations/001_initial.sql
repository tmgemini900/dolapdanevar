-- ============================================================
-- DOLAPTA NE VAR? — Initial Database Schema
-- ============================================================

-- profiles: her kullanıcı için otomatik oluşturulur
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text,
  display_name  text,
  partner_id    uuid references auth.users(id) on delete set null,
  partner_code  text unique default upper(substr(md5(random()::text), 1, 6)),
  created_at    timestamptz default now()
);

alter table public.profiles enable row level security;

-- Kullanıcı kendi profilini görebilir
create policy "own_profile_select" on public.profiles
  for select using (auth.uid() = id);

-- Kullanıcı partner profilini görebilir (partner_id üzerinden)
create policy "partner_profile_select" on public.profiles
  for select using (
    id = (select partner_id from public.profiles where id = auth.uid())
  );

-- partner_code ile arama için (link işlemi)
create policy "partner_code_lookup" on public.profiles
  for select using (true);

create policy "own_profile_insert" on public.profiles
  for insert with check (auth.uid() = id);

create policy "own_profile_update" on public.profiles
  for update using (auth.uid() = id);

-- ============================================================
-- saved_recipes: kullanıcıların kaydettiği tarifler
-- ============================================================
create table public.saved_recipes (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  recipe      jsonb not null,
  ingredients text[],
  note        text,
  created_at  timestamptz default now()
);

alter table public.saved_recipes enable row level security;

-- Kendi tarifleri + partner tarifleri görülebilir
create policy "recipes_select" on public.saved_recipes
  for select using (
    auth.uid() = user_id
    or user_id = (select partner_id from public.profiles where id = auth.uid())
  );

create policy "recipes_insert" on public.saved_recipes
  for insert with check (auth.uid() = user_id);

create policy "recipes_delete" on public.saved_recipes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Trigger: yeni kullanıcı kaydında otomatik profil oluştur
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RPC: partner_code ile iki kullanıcıyı birbirine bağla
-- ============================================================
create or replace function public.link_partners(
  my_id            uuid,
  partner_code_in  text
)
returns text as $$
declare
  found_id uuid;
begin
  select id into found_id
  from public.profiles
  where partner_code = upper(trim(partner_code_in));

  if found_id is null then
    return 'not_found';
  end if;

  if found_id = my_id then
    return 'self';
  end if;

  -- Mevcut partnerları temizle
  update public.profiles set partner_id = null
  where id = (select partner_id from public.profiles where id = my_id)
     or id = (select partner_id from public.profiles where id = found_id);

  -- Yeni eşleşmeyi yaz
  update public.profiles set partner_id = found_id where id = my_id;
  update public.profiles set partner_id = my_id   where id = found_id;

  return 'ok';
end;
$$ language plpgsql security definer;

-- ============================================================
-- RPC: partner bağını kaldır
-- ============================================================
create or replace function public.unlink_partners(my_id uuid)
returns void as $$
declare
  pid uuid;
begin
  select partner_id into pid from public.profiles where id = my_id;
  if pid is not null then
    update public.profiles set partner_id = null where id = pid;
  end if;
  update public.profiles set partner_id = null where id = my_id;
end;
$$ language plpgsql security definer;
