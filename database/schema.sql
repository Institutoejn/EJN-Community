-- ... (MANTENHA TODO O CÓDIGO ANTERIOR IGUAL ATÉ O FIM DO ARQUIVO) ...

-- =========================================================
-- FUNÇÃO DE TRENDING TOPICS (HASHTAGS)
-- =========================================================
-- Esta função extrai palavras que começam com # de todos os posts,
-- conta a ocorrência de cada uma e retorna o top 5.

create or replace function public.get_trending_topics()
returns table (tag text, count bigint)
language plpgsql
security definer
as $$
begin
  return query
  with extracted_tags as (
    select lower((regexp_matches(content, '#([a-zA-Z0-9_]+)', 'g'))[1]) as tag
    from public.posts
    where content ~ '#[a-zA-Z0-9_]+' -- Apenas posts que contêm hashtags
  )
  select 
    '#' || tag as tag,
    count(*) as count
  from extracted_tags
  group by tag
  order by count desc
  limit 5;
end;
$$;
