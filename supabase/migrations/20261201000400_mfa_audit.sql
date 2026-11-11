-- Verificación en dos pasos (MFA) y registro de auditoría.

-- ---------- Configuración de seguridad ----------

-- Una sola fila. La lee cualquier usuario autenticado (la necesita la pantalla
-- de verificación antes de entrar) y la cambia quien gestiona roles.
create table public.app_settings (
  id boolean primary key default true check (id),
  -- off: opcional · privileged: obligatoria para quien gestiona usuarios o roles · all: para todos.
  mfa_policy text not null default 'privileged' check (mfa_policy in ('off', 'privileged', 'all'))
);
insert into public.app_settings default values;

alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select to authenticated using (true);

-- ---------- Verificación en dos pasos ----------

-- ¿La política se la exige al usuario en sesión? La misma regla está en src/domain/audit.ts (mfaRequired).
create function public.mfa_required() returns boolean
language sql stable security definer set search_path = public as $$
  select case (select mfa_policy from app_settings)
    when 'all' then true
    when 'privileged' then exists (
      select 1 from profiles p join roles r on r.id = p.role_id
      where p.id = auth.uid() and r.permissions && array['users.manage', 'roles.manage']
    )
    else false
  end;
$$;

-- ¿La sesión tiene el nivel de verificación que corresponde? Si el usuario tiene
-- una aplicación autenticadora (por obligación o porque la activó), la sesión
-- debe haber ingresado el código (aal2).
create function public.aal_ok() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or (
      not mfa_required()
      and not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
    );
$$;

-- Todas las políticas de datos se apoyan en estas dos funciones: sin el código, no se lee ni se cambia nada.
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and not must_change_password) and aal_ok();
$$;

create or replace function public.has_permission(permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    join roles r on r.id = p.role_id
    where p.id = auth.uid() and p.active and not p.must_change_password and permission = any (r.permissions)
  ) and aal_ok();
$$;

create or replace function public.my_permissions() returns text[]
language sql stable security definer set search_path = public as $$
  select case when aal_ok() then coalesce(
    (select r.permissions from profiles p join roles r on r.id = p.role_id
     where p.id = auth.uid() and p.active and not p.must_change_password),
    array[]::text[]
  ) else array[]::text[] end;
$$;

create policy app_settings_write on public.app_settings for update to authenticated
  using (has_permission('roles.manage')) with check (has_permission('roles.manage'));

-- ---------- Auditoría ----------

-- Solo se agrega (con las funciones de abajo) y se consulta con el permiso audit.view.
-- Nadie la modifica ni la borra: no hay políticas de update ni delete.
create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  -- El nombre se guarda tal cual estaba: el registro no cambia si después se renombra al usuario.
  actor_name text not null,
  action text not null,
  target_name text not null default '',
  detail text not null default ''
);
create index audit_log_at on public.audit_log (at desc);

alter table public.audit_log enable row level security;
create policy audit_log_read on public.audit_log for select to authenticated using (has_permission('audit.view'));

-- Agrega una entrada a nombre de `actor` (por defecto, el usuario en sesión).
create function public.audit(action text, target_name text, detail text default '', actor uuid default auth.uid()) returns void
language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, actor_name, action, target_name, detail)
  values (actor, coalesce((select full_name from profiles where id = actor), 'Sistema'), action, coalesce(target_name, ''), coalesce(detail, ''));
$$;
revoke execute on function public.audit(text, text, text, uuid) from public, anon, authenticated;

-- Lo que registra la aplicación: ingresos, salidas y lectura de documentos (lo
-- demás lo registran los disparadores). Solo estas acciones.
create function public.log_event(action text, document_id uuid default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if action not in ('session.login', 'session.logout', 'session.expired', 'password.changed', 'mfa.enabled', 'mfa.disabled', 'document.viewed', 'document.downloaded') then
    raise exception 'Acción de auditoría no permitida.';
  end if;
  perform audit(action, coalesce((select code || ' · ' || title from documents where id = document_id), ''));
end;
$$;
revoke execute on function public.log_event(text, uuid) from public, anon;
grant execute on function public.log_event(text, uuid) to authenticated;

-- Usuarios: cambios hechos desde la aplicación. Los que hace la función
-- admin-users (crear, restablecer) los registra ella misma, con quien la llamó.
create function public.audit_profiles() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  changes text[] := '{}';
begin
  if auth.uid() is null or new.id = auth.uid() then
    return new;
  end if;
  if new.full_name <> old.full_name then changes := changes || ('nombre: ' || new.full_name); end if;
  if new.role_id <> old.role_id then
    changes := changes || ('rol: ' || coalesce((select name from roles where id = new.role_id), '?'));
  end if;
  if new.active <> old.active then changes := changes || (case when new.active then 'habilitado' else 'inhabilitado' end); end if;
  if new.photo_path is distinct from old.photo_path then changes := changes || 'foto'::text; end if;
  if new.birthday is distinct from old.birthday then changes := changes || 'cumpleaños'::text; end if;
  if cardinality(changes) > 0 then
    perform audit('user.updated', new.full_name || ' (' || new.email || ')', array_to_string(changes, ', '));
  end if;
  return new;
end;
$$;
create trigger profiles_audit after update on public.profiles for each row execute function public.audit_profiles();

create function public.audit_roles() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform audit('role.deleted', old.name, array_to_string(old.permissions, ', '));
    return old;
  end if;
  perform audit('role.saved', new.name, 'permisos: ' || coalesce(nullif(array_to_string(new.permissions, ', '), ''), 'ninguno'));
  return new;
end;
$$;
create trigger roles_audit after insert or update or delete on public.roles for each row execute function public.audit_roles();

create function public.audit_documents() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  label text;
begin
  if tg_op = 'DELETE' then
    perform audit('document.deleted', old.code || ' · ' || old.title, 'versión ' || old.version);
    return old;
  end if;
  label := new.code || ' · ' || new.title;
  if tg_op = 'INSERT' or (new.status = 'pending' and old.status <> 'pending') then
    perform audit('document.submitted', label, 'versión ' || new.version);
  elsif new.status <> old.status then
    perform audit(
      case new.status when 'published' then 'document.approved' when 'rejected' then 'document.rejected' else 'document.archived' end,
      label,
      case when new.status = 'rejected' then new.review_note else 'versión ' || new.version end
    );
  end if;
  return new;
end;
$$;
create trigger documents_audit after insert or update or delete on public.documents for each row execute function public.audit_documents();

create function public.audit_catalog() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform audit(
    'catalog.changed',
    coalesce(new.name, old.name),
    (case tg_op when 'INSERT' then 'creado' when 'DELETE' then 'eliminado' else 'modificado' end)
      || (case tg_table_name when 'process_nodes' then ' (proceso)' else ' (tipo de documento)' end)
  );
  return coalesce(new, old);
end;
$$;
create trigger process_nodes_audit after insert or update or delete on public.process_nodes for each row execute function public.audit_catalog();
create trigger document_types_audit after insert or update or delete on public.document_types for each row execute function public.audit_catalog();

-- Textos de cada política, los mismos de src/domain/audit.ts (MFA_POLICIES.short).
create function public.mfa_policy_text(policy text) returns text
language sql immutable as $$
  select case policy when 'off' then 'opcional' when 'privileged' then 'obligatoria para gestores de usuarios y roles' else 'obligatoria para todos' end;
$$;

create function public.audit_settings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.mfa_policy <> old.mfa_policy then
    perform audit('settings.changed', 'Verificación en dos pasos', mfa_policy_text(old.mfa_policy) || ' → ' || mfa_policy_text(new.mfa_policy));
  end if;
  return new;
end;
$$;
create trigger app_settings_audit after update on public.app_settings for each row execute function public.audit_settings();

-- ---------- Permiso para consultar la auditoría ----------

-- Lo tienen el Administrador y el Oficial de seguridad.
update public.roles set permissions = permissions || array['audit.view']
where name in ('Administrador', 'Oficial de seguridad de la información') and not ('audit.view' = any (permissions));
