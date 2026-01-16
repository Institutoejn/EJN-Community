-- ... (MANTENHA TODO O CÓDIGO ANTERIOR IGUAL) ...

-- =========================================================
-- CONFIGURAÇÃO DO STORAGE (BUCKETS)
-- =========================================================
-- Tenta criar o bucket 'media' se não existir.
-- Nota: Em alguns ambientes Supabase, buckets devem ser criados via Dashboard.
-- Este SQL garante as políticas de acesso.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Política: Imagens são públicas para visualização
drop policy if exists "Imagens são públicas" on storage.objects;
create policy "Imagens são públicas"
on storage.objects for select
using ( bucket_id = 'media' );

-- Política: Usuários autenticados podem fazer upload
drop policy if exists "Usuários autenticados upload" on storage.objects;
create policy "Usuários autenticados upload"
on storage.objects for insert
with check ( bucket_id = 'media' and auth.role() = 'authenticated' );

-- Política: Usuários podem atualizar seus próprios arquivos (ou admin)
drop policy if exists "Usuários atualizam arquivos" on storage.objects;
create policy "Usuários atualizam arquivos"
on storage.objects for update
using ( bucket_id = 'media' and (auth.uid() = owner OR public.is_admin()) );

-- Política: Usuários deletam seus arquivos (ou admin)
drop policy if exists "Usuários deletam arquivos" on storage.objects;
create policy "Usuários deletam arquivos"
on storage.objects for delete
using ( bucket_id = 'media' and (auth.uid() = owner OR public.is_admin()) );
