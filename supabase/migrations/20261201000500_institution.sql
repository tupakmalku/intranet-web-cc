-- Identidad institucional: misión, visión, valores y política de calidad.
-- Una sola fila. Es información pública (la institución la publica en su web):
-- se lee sin sesión, para mostrarla en la pantalla de ingreso. La cambia quien
-- configura la intranet, y queda en la auditoría.

create table public.institution_profile (
  id boolean primary key default true check (id),
  mission text not null default '',
  vision text not null default '',
  "values" text[] not null default '{}',
  quality_policy text not null default '',
  -- Código del documento oficial de la política en la intranet: se enlaza su versión publicada vigente.
  quality_document_code text,
  -- Qué se muestra en la pantalla de ingreso: todo, solo la misión, solo los valores o nada.
  login_highlight text not null default 'all' check (login_highlight in ('all', 'mission', 'values', 'none'))
);
insert into public.institution_profile default values;

alter table public.institution_profile enable row level security;
create policy institution_profile_read on public.institution_profile for select to anon, authenticated using (true);
create policy institution_profile_write on public.institution_profile for update to authenticated
  using (has_permission('intranet.configure')) with check (has_permission('intranet.configure'));

create function public.audit_institution() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform audit('institution.changed', 'Misión, visión, valores y política de calidad');
  return new;
end;
$$;
create trigger institution_profile_audit after update on public.institution_profile for each row execute function public.audit_institution();

-- Para cargar los textos de la institución (o editarlos después desde la intranet):
-- update public.institution_profile set mission = '…', vision = '…', "values" = array['…', '…'], quality_policy = '…';
