-- R&G Forge 3D — setup Supabase (executar uma vez no SQL Editor)
create extension if not exists pgcrypto;
create table if not exists public.app_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data_key text not null check (data_key in ('rgforge3d_stock_v1','rgforge3d_calc_v1','rgforge3d-tools-v1','rgforge3d_finance_v1','rgforge3d_business_v1')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, data_key)
);
alter table public.app_data enable row level security;
revoke all on public.app_data from anon;
grant select, insert, update, delete on public.app_data to authenticated;
drop policy if exists "Users can read their own app data" on public.app_data;
create policy "Users can read their own app data" on public.app_data for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own app data" on public.app_data;
create policy "Users can insert their own app data" on public.app_data for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own app data" on public.app_data;
create policy "Users can update their own app data" on public.app_data for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own app data" on public.app_data;
create policy "Users can delete their own app data" on public.app_data for delete to authenticated using (auth.uid() = user_id);

-- Migração para projetos em que app_data já existia antes do módulo Financeiro.
alter table public.app_data drop constraint if exists app_data_data_key_check;
alter table public.app_data add constraint app_data_data_key_check check (data_key in ('rgforge3d_stock_v1','rgforge3d_calc_v1','rgforge3d-tools-v1','rgforge3d_finance_v1','rgforge3d_business_v1'));

-- Dados comerciais são carregados diretamente de app_data; não há migração automática de localStorage.
-- Para atualizações em tempo real, habilite app_data em Database > Replication se a publicação não estiver ativa.
