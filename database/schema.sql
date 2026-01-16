-- Habilita extensão para UUIDs
create extension if not exists "uuid-ossp";

-- --- TABELA DE USUÁRIOS (Perfil Público) ---
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  name text,
  role text default 'aluno', -- 'aluno' ou 'gestor'
  nivel int default 1,
  xp int default 0,
  xp_proximo_nivel int default 1000,
  pontos_totais int default 0, -- EJN Coins
  badges text[] default '{}',
  avatar_cor text default 'bg-[#007AFF]',
  bio text,
  location text,
  website text,
  avatar_url text,
  cover_url text,
  posts_count int default 0,
  likes_received int default 0,
  streak int default 0,
  status text default 'active', -- 'active' ou 'suspended'
  created_at timestamptz default now()
);
alter table public.users enable row level security;

-- --- TABELA DE POSTS ---
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text,
  image_url text,
  is_pinned boolean default false,
  created_at timestamptz default now()
);
alter table public.posts enable row level security;

-- --- TABELA DE COMENTÁRIOS ---
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.comments enable row level security;

-- --- TABELA DE LIKES ---
create table if not exists public.likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id) -- Impede like duplicado
);
alter table public.likes enable row level security;

-- --- TABELA DE MISSÕES ---
create table if not exists public.missions (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  reward_xp int default 0,
  reward_coins int default 0,
  icon text,
  type text default 'daily', -- 'daily', 'achievement', 'special'
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.missions enable row level security;

-- --- TABELA DE RECOMPENSAS (LOJA) ---
create table if not exists public.rewards (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  long_desc text,
  cost int default 0,
  icon text,
  image_url text,
  stock int default 0,
  category text default 'Produto',
  created_at timestamptz default now()
);
alter table public.rewards enable row level security;

-- --- TABELA DE SEGUIDORES ---
create table if not exists public.follows (
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);
alter table public.follows enable row level security;

-- --- TABELA DE CONFIGURAÇÕES GLOBAIS ---
create table if not exists public.settings (
  id int primary key default 1,
  platform_name text default 'Rede Social EJN',
  xp_per_post int default 50,
  xp_per_comment int default 10,
  xp_per_like int default 5,
  coins_per_post int default 10,
  constraint single_row check (id = 1)
);
alter table public.settings enable row level security;

-- Inserir configuração padrão se não existir
insert into public.settings (id) values (1) on conflict do nothing;

-- =========================================================
-- FUNÇÃO AUXILIAR: VERIFICAR SE É ADMIN
-- =========================================================
-- Esta função permite que as políticas verifiquem se o usuário é gestor
-- sem causar recursão infinita ou problemas de permissão.
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.users
    where id = auth.uid() and role = 'gestor'
  );
end;
$$ language plpgsql security definer;

-- =========================================================
-- ROW LEVEL SECURITY (RLS) - POLÍTICAS DE SEGURANÇA
-- =========================================================

-- USERS
drop policy if exists "Perfis são públicos" on public.users;
create policy "Perfis são públicos" on public.users for select using (true);

drop policy if exists "Usuário edita próprio perfil" on public.users;
create policy "Usuário edita próprio perfil" on public.users for update using (auth.uid() = id OR public.is_admin());

drop policy if exists "Usuário insere próprio perfil" on public.users;
create policy "Usuário insere próprio perfil" on public.users for insert with check (auth.uid() = id);

drop policy if exists "Admin deleta usuarios" on public.users;
create policy "Admin deleta usuarios" on public.users for delete using (public.is_admin());

-- POSTS
drop policy if exists "Posts são públicos" on public.posts;
create policy "Posts são públicos" on public.posts for select using (true);

drop policy if exists "Usuários autenticados postam" on public.posts;
create policy "Usuários autenticados postam" on public.posts for insert with check (auth.role() = 'authenticated');

drop policy if exists "Dono ou Admin edita post" on public.posts;
create policy "Dono ou Admin edita post" on public.posts for update using (auth.uid() = user_id OR public.is_admin());

drop policy if exists "Dono ou Admin deleta post" on public.posts;
create policy "Dono ou Admin deleta post" on public.posts for delete using (auth.uid() = user_id OR public.is_admin());

-- COMMENTS
drop policy if exists "Comentários públicos" on public.comments;
create policy "Comentários públicos" on public.comments for select using (true);

drop policy if exists "Autenticados comentam" on public.comments;
create policy "Autenticados comentam" on public.comments for insert with check (auth.role() = 'authenticated');

drop policy if exists "Dono ou Admin deleta comentario" on public.comments;
create policy "Dono ou Admin deleta comentario" on public.comments for delete using (auth.uid() = user_id OR public.is_admin());

-- LIKES
drop policy if exists "Likes públicos" on public.likes;
create policy "Likes públicos" on public.likes for select using (true);

drop policy if exists "Autenticados dão like" on public.likes;
create policy "Autenticados dão like" on public.likes for insert with check (auth.role() = 'authenticated');

drop policy if exists "Dono remove like" on public.likes;
create policy "Dono remove like" on public.likes for delete using (auth.uid() = user_id);

-- MISSIONS
drop policy if exists "Ver missões" on public.missions;
create policy "Ver missões" on public.missions for select using (true);

drop policy if exists "Gestão de missões" on public.missions;
create policy "Gestão de missões" on public.missions for all using (auth.role() = 'authenticated');

-- REWARDS
drop policy if exists "Ver recompensas" on public.rewards;
create policy "Ver recompensas" on public.rewards for select using (true);

drop policy if exists "Gestão de recompensas" on public.rewards;
create policy "Gestão de recompensas" on public.rewards for all using (auth.role() = 'authenticated');

-- SETTINGS
drop policy if exists "Ver settings" on public.settings;
create policy "Ver settings" on public.settings for select using (true);

drop policy if exists "Gestão settings" on public.settings;
create policy "Gestão settings" on public.settings for all using (auth.role() = 'authenticated');

-- FOLLOWS
drop policy if exists "Ver follows" on public.follows;
create policy "Ver follows" on public.follows for select using (true);

drop policy if exists "Gerenciar follows" on public.follows;
create policy "Gerenciar follows" on public.follows for all using (auth.uid() = follower_id);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Função para contar posts
create or replace function public.handle_new_post() 
returns trigger as $$
begin
  update public.users set posts_count = posts_count + 1 where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_post_created on public.posts;
create trigger on_post_created
  after insert on public.posts
  for each row execute procedure public.handle_new_post();

-- Função para contar likes recebidos
create or replace function public.handle_new_like() 
returns trigger as $$
begin
  update public.users 
  set likes_received = likes_received + 1 
  from public.posts
  where public.posts.id = new.post_id and public.users.id = public.posts.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_like_created on public.likes;
create trigger on_like_created
  after insert on public.likes
  for each row execute procedure public.handle_new_like();

-- !!! CRÍTICO: TRIGGER DE CRIAÇÃO AUTOMÁTICA DE PERFIL !!!
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role, avatar_cor, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Novo Usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'aluno'),
    coalesce(new.raw_user_meta_data->>'avatarCor', 'bg-[#007AFF]'),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();