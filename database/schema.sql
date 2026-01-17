-- =========================================================
-- 1. ESTRUTURA BASE (Manter tabelas principais)
-- =========================================================
-- (Mantém users, posts, comments, likes, follows, missions, rewards, reward_claims, settings inalterados)

-- ... (Tabelas anteriores) ...

-- NOVA TABELA: Avisos Diários (Card Verde da Sidebar)
create table if not exists public.daily_notices (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =========================================================
-- 2. POLÍTICAS DE SEGURANÇA (RLS)
-- =========================================================
-- ... (Policies anteriores mantidas) ...

alter table public.daily_notices enable row level security;

drop policy if exists "Notices - Leitura Pública" on public.daily_notices;
create policy "Notices - Leitura Pública" on public.daily_notices for select using (true);

drop policy if exists "Notices - Gestão Admin" on public.daily_notices;
create policy "Notices - Gestão Admin" on public.daily_notices for all using (public.is_admin());

-- ... (Restante do arquivo, triggers e funções mantidos) ...
