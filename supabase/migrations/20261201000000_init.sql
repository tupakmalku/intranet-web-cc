-- Intranet: esquema base.
-- Roles, usuarios, permisos por rol (RLS) y funciones comunes.

-- ---------- Roles y usuarios ----------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  -- Permisos que otorga el rol. Los valores posibles están en src/domain/types.ts (Permission).
  permissions text[] not null default '{}',
  -- Los roles del sistema no se pueden eliminar.
  system boolean not null default false,
  created_at timestamptz not null default now()
);

-- Un perfil por cada usuario de auth.users. Los crea la función admin-users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_id uuid not null references public.roles (id),
  active boolean not null default true,
  -- La contraseña es temporal: hay que cambiarla antes de usar la aplicación.
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Funciones de permisos ----------

-- ¿El usuario en sesión está habilitado?
create function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active);
$$;

-- ¿El rol del usuario en sesión otorga el permiso?
create function public.has_permission(permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    join roles r on r.id = p.role_id
    where p.id = auth.uid() and p.active and permission = any (r.permissions)
  );
$$;

-- ---------- Reglas que se aplican con disparadores ----------

-- Nadie cambia su propio rol ni se inhabilita a sí mismo: evita escalar permisos y quedarse fuera.
-- Los demás campos del perfil solo los cambia quien gestiona usuarios o la clave de servicio.
create function public.guard_profile_update() returns trigger
language plpgsql as $$
begin
  if auth.uid() = old.id and (new.role_id <> old.role_id or new.active <> old.active) then
    raise exception 'No puedes cambiar tu propio rol ni inhabilitarte.';
  end if;
  new.id := old.id;
  new.email := old.email;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
for each row execute function public.guard_profile_update();

create function public.guard_role_delete() returns trigger
language plpgsql as $$
begin
  if old.system then
    raise exception 'Los roles del sistema no se pueden eliminar.';
  end if;
  return old;
end;
$$;

create trigger roles_guard before delete on public.roles
for each row execute function public.guard_role_delete();

-- ---------- Funciones que llama la aplicación ----------

-- Marca cumplido el cambio obligatorio de contraseña del usuario en sesión.
create function public.complete_password_change() returns void
language sql security definer set search_path = public as $$
  update profiles set must_change_password = false where id = auth.uid();
$$;

revoke execute on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

-- ---------- Políticas (RLS) ----------

alter table public.roles enable row level security;
alter table public.profiles enable row level security;

-- Roles: todos los leen; los cambia quien gestiona roles.
create policy roles_read on public.roles for select to authenticated using (is_active_user());
create policy roles_write on public.roles for all to authenticated
  using (has_permission('roles.manage')) with check (has_permission('roles.manage'));

-- Perfiles: todos los leen (para mostrar nombres). Los crea la función
-- admin-users; aquí solo se editan nombre, rol y estado.
create policy profiles_read on public.profiles for select to authenticated using (is_active_user());
create policy profiles_update on public.profiles for update to authenticated
  using (has_permission('users.manage')) with check (has_permission('users.manage'));

-- ---------- Roles iniciales ----------

insert into public.roles (name, description, permissions, system) values
  ('Administrador', 'Acceso a todo.',
    array['users.manage', 'roles.manage', 'documents.publish', 'documents.approve', 'intranet.configure'], true),
  ('Oficial de seguridad de la información', 'Gestiona usuarios y restablece contraseñas.',
    array['users.manage'], true),
  ('Jefatura', 'Publica los documentos de su área en la intranet.',
    array['documents.publish'], true),
  ('Aprobador de publicaciones', 'Aprueba u observa los documentos que las áreas envían a la intranet y mantiene el mapa de procesos.',
    array['documents.approve', 'intranet.configure'], true),
  ('Colaborador', 'Consulta los documentos publicados en la intranet.',
    array[]::text[], true);
