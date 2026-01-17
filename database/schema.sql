-- =========================================================
-- 1. ESTRUTURA BASE
-- =========================================================

-- Tabela de LIKES (Curtidas)
create table if not exists public.likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id) -- Impede like duplicado
);

-- Tabela de COMMENTS (Comentários)
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- Tabela de AVISOS DIÁRIOS
create table if not exists public.daily_notices (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =========================================================
-- 2. POLÍTICAS DE SEGURANÇA (RLS)
-- =========================================================

-- Habilitar RLS nas tabelas
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.daily_notices enable row level security;

-- LIKES Policies
drop policy if exists "Likes - Leitura Pública" on public.likes;
create policy "Likes - Leitura Pública" on public.likes for select using (true);

drop policy if exists "Likes - Inserir Próprio" on public.likes;
create policy "Likes - Inserir Próprio" on public.likes for insert with check (auth.uid() = user_id);

drop policy if exists "Likes - Deletar Próprio" on public.likes;
create policy "Likes - Deletar Próprio" on public.likes for delete using (auth.uid() = user_id);

-- COMMENTS Policies
drop policy if exists "Comentários - Leitura Pública" on public.comments;
create policy "Comentários - Leitura Pública" on public.comments for select using (true);

drop policy if exists "Comentários - Inserir Próprio" on public.comments;
create policy "Comentários - Inserir Próprio" on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "Comentários - Deletar Próprio ou Admin" on public.comments;
create policy "Comentários - Deletar Próprio ou Admin" on public.comments for delete using (auth.uid() = user_id or public.is_admin());

-- NOTICES Policies
drop policy if exists "Notices - Leitura Pública" on public.daily_notices;
create policy "Notices - Leitura Pública" on public.daily_notices for select using (true);

drop policy if exists "Notices - Gestão Admin" on public.daily_notices;
create policy "Notices - Gestão Admin" on public.daily_notices for all using (public.is_admin());

