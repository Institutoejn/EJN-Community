-- =========================================================
-- 1. ESTRUTURA BASE (Manter existente)
-- =========================================================
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text default 'aluno',
  nivel int default 1,
  xp int default 0,
  xp_proximo_nivel int default 1000,
  pontos_totais int default 0,
  badges text[] default array[]::text[],
  avatar_cor text default 'bg-blue-500',
  bio text,
  location text,
  website text,
  avatar_url text,
  cover_url text,
  posts_count int default 0,
  likes_received int default 0,
  streak int default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text,
  image_url text,
  is_pinned boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

create table if not exists public.missions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  reward_xp int default 50,
  reward_coins int default 10,
  icon text default '🎯',
  type text default 'daily',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.rewards (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  long_desc text,
  cost int default 100,
  icon text default '🎁',
  image_url text,
  stock int default 10,
  category text default 'Produto',
  created_at timestamptz default now()
);

-- NOVA TABELA: Registro de Resgates (Claims)
create table if not exists public.reward_claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  reward_id uuid references public.rewards(id) on delete set null,
  reward_title text, -- Cópia estática caso o prêmio seja deletado
  cost_paid int,
  status text default 'pending', -- pending, delivered
  created_at timestamptz default now()
);

create table if not exists public.settings (
  id int primary key default 1,
  platform_name text default 'Instituto EJN',
  xp_per_post int default 50,
  xp_per_comment int default 10,
  xp_per_like int default 5,
  coins_per_post int default 10
);

-- =========================================================
-- 2. POLÍTICAS DE SEGURANÇA (RLS)
-- =========================================================
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.missions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_claims enable row level security;
alter table public.settings enable row level security;

-- Policies Recriadas
drop policy if exists "Users - Leitura Pública" on public.users;
create policy "Users - Leitura Pública" on public.users for select using (true);
drop policy if exists "Users - Update Próprio" on public.users;
create policy "Users - Update Próprio" on public.users for update using (auth.uid() = id);
drop policy if exists "Users - Insert Próprio" on public.users;
create policy "Users - Insert Próprio" on public.users for insert with check (auth.uid() = id);
drop policy if exists "Users - Delete Admin" on public.users;
create policy "Users - Delete Admin" on public.users for delete using (public.is_admin());

drop policy if exists "Posts - Leitura Pública" on public.posts;
create policy "Posts - Leitura Pública" on public.posts for select using (true);
drop policy if exists "Posts - Insert Autenticado" on public.posts;
create policy "Posts - Insert Autenticado" on public.posts for insert with check (auth.role() = 'authenticated');
drop policy if exists "Posts - Update Próprio ou Admin" on public.posts;
create policy "Posts - Update Próprio ou Admin" on public.posts for update using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Posts - Delete Próprio ou Admin" on public.posts;
create policy "Posts - Delete Próprio ou Admin" on public.posts for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Comments - Leitura Pública" on public.comments;
create policy "Comments - Leitura Pública" on public.comments for select using (true);
drop policy if exists "Comments - Insert Autenticado" on public.comments;
create policy "Comments - Insert Autenticado" on public.comments for insert with check (auth.role() = 'authenticated');
drop policy if exists "Comments - Delete Próprio ou Admin" on public.comments;
create policy "Comments - Delete Próprio ou Admin" on public.comments for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Likes - Leitura Pública" on public.likes;
create policy "Likes - Leitura Pública" on public.likes for select using (true);
drop policy if exists "Likes - Insert/Delete Próprio" on public.likes;
create policy "Likes - Insert/Delete Próprio" on public.likes for all using (auth.uid() = user_id);

drop policy if exists "Follows - Leitura Pública" on public.follows;
create policy "Follows - Leitura Pública" on public.follows for select using (true);
drop policy if exists "Follows - Gestão Própria" on public.follows;
create policy "Follows - Gestão Própria" on public.follows for all using (auth.uid() = follower_id);

drop policy if exists "Missions - Leitura" on public.missions;
create policy "Missions - Leitura" on public.missions for select using (true);
drop policy if exists "Missions - Gestão Admin" on public.missions;
create policy "Missions - Gestão Admin" on public.missions for all using (public.is_admin());

drop policy if exists "Rewards - Leitura" on public.rewards;
create policy "Rewards - Leitura" on public.rewards for select using (true);
drop policy if exists "Rewards - Gestão Admin" on public.rewards;
create policy "Rewards - Gestão Admin" on public.rewards for all using (public.is_admin());

drop policy if exists "Claims - Leitura Própria ou Admin" on public.reward_claims;
create policy "Claims - Leitura Própria ou Admin" on public.reward_claims for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Claims - Insert Autenticado" on public.reward_claims;
create policy "Claims - Insert Autenticado" on public.reward_claims for insert with check (auth.uid() = user_id);
drop policy if exists "Claims - Update Admin" on public.reward_claims;
create policy "Claims - Update Admin" on public.reward_claims for update using (public.is_admin());

drop policy if exists "Settings - Leitura" on public.settings;
create policy "Settings - Leitura" on public.settings for select using (true);
drop policy if exists "Settings - Gestão Admin" on public.settings;
create policy "Settings - Gestão Admin" on public.settings for all using (public.is_admin());

-- =========================================================
-- 3. FUNÇÕES E TRIGGERS
-- =========================================================

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'gestor'
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role, avatar_cor, nivel, xp, pontos_totais)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Novo Usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'aluno'),
    coalesce(new.raw_user_meta_data->>'avatarCor', 'bg-blue-500'),
    1, 0, 0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger Posts
create or replace function public.handle_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set posts_count = posts_count + 1,
      xp = xp + 50,
      pontos_totais = pontos_totais + 10
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_post_created on public.posts;
create trigger on_post_created
  after insert on public.posts
  for each row execute procedure public.handle_new_post();

create or replace function public.handle_delete_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set posts_count = greatest(0, posts_count - 1),
      xp = greatest(0, xp - 50)
  where id = old.user_id;
  return old;
end;
$$;
drop trigger if exists on_post_deleted on public.posts;
create trigger on_post_deleted
  after delete on public.posts
  for each row execute procedure public.handle_delete_post();

-- Trigger Likes
create or replace function public.handle_new_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
begin
  select user_id into post_author_id from public.posts where id = new.post_id;
  if post_author_id is not null and post_author_id != new.user_id then
    update public.users
    set likes_received = likes_received + 1,
        xp = xp + 5
    where id = post_author_id;
  end if;
  return new;
end;
$$;
drop trigger if exists on_like_created on public.likes;
create trigger on_like_created
  after insert on public.likes
  for each row execute procedure public.handle_new_like();

create or replace function public.handle_unlike()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author_id uuid;
begin
  select user_id into post_author_id from public.posts where id = old.post_id;
  if post_author_id is not null and post_author_id != old.user_id then
    update public.users
    set likes_received = greatest(0, likes_received - 1),
        xp = greatest(0, xp - 5)
    where id = post_author_id;
  end if;
  return old;
end;
$$;
drop trigger if exists on_like_deleted on public.likes;
create trigger on_like_deleted
  after delete on public.likes
  for each row execute procedure public.handle_unlike();

-- Trigger Comments
create or replace function public.handle_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set xp = xp + 10
  where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists on_comment_created on public.comments;
create trigger on_comment_created
  after insert on public.comments
  for each row execute procedure public.handle_new_comment();

-- RPC Trending
create or replace function public.get_trending_topics()
returns table (tag text, count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    lower(substring(content from '#\w+')) as tag,
    count(*) as count
  from public.posts
  where content ~ '#\w+'
  group by tag
  order by count desc
  limit 5;
end;
$$;

-- 3.6 RPC: TRANSAÇÃO DE RESGATE (ATÔMICA)
-- Esta função garante que não haja race condition no estoque
create or replace function public.claim_reward(p_reward_id uuid, p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_user_balance int;
begin
  -- 1. Bloqueia a linha do prêmio para leitura/escrita
  select * into v_reward from public.rewards where id = p_reward_id for update;
  
  if not found then
    return json_build_object('success', false, 'message', 'Prêmio não encontrado');
  end if;

  if v_reward.stock <= 0 then
    return json_build_object('success', false, 'message', 'Estoque esgotado');
  end if;

  -- 2. Verifica saldo do usuário
  select pontos_totais into v_user_balance from public.users where id = p_user_id;
  
  if v_user_balance < v_reward.cost then
    return json_build_object('success', false, 'message', 'Saldo insuficiente');
  end if;

  -- 3. Executa a transação
  -- Deduz saldo
  update public.users 
  set pontos_totais = pontos_totais - v_reward.cost
  where id = p_user_id;

  -- Deduz estoque
  update public.rewards
  set stock = stock - 1
  where id = p_reward_id;

  -- Registra claim
  insert into public.reward_claims (user_id, reward_id, reward_title, cost_paid, status)
  values (p_user_id, p_reward_id, v_reward.title, v_reward.cost, 'pending');

  return json_build_object('success', true, 'message', 'Resgate realizado com sucesso!');
end;
$$;

-- =========================================================
-- 4. STORAGE
-- =========================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "Imagens são públicas" on storage.objects;
create policy "Imagens são públicas" on storage.objects for select using ( bucket_id = 'media' );
drop policy if exists "Upload de imagens" on storage.objects;
create policy "Upload de imagens" on storage.objects for insert with check ( bucket_id = 'media' and auth.role() = 'authenticated' );
drop policy if exists "Update imagens" on storage.objects;
create policy "Update imagens" on storage.objects for update using ( bucket_id = 'media' and auth.uid() = owner );
drop policy if exists "Delete imagens" on storage.objects;
create policy "Delete imagens" on storage.objects for delete using ( bucket_id = 'media' and auth.uid() = owner );
