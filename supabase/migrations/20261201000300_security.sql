-- Endurecimiento de seguridad.
--
-- 1. Nadie otorga lo que no tiene: solo se asigna o edita un rol cuyos
--    permisos ya tiene quien lo hace, y solo se gestiona a usuarios cuyo rol no
--    tenga más permisos. Evita que quien gestiona usuarios se cree una cuenta de
--    administrador o tome la de uno restableciendo su contraseña. La misma regla
--    está en src/domain/permissions.ts.
-- 2. La contraseña temporal se debe cambiar antes de usar los datos: hasta
--    entonces el usuario solo lee su propio perfil y su rol.

-- ---------- Contraseña temporal pendiente ----------

-- Habilitado y sin contraseña temporal pendiente. Todas las políticas de datos
-- se apoyan en esta función, así que con contraseña temporal no se lee nada.
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and not must_change_password);
$$;

create or replace function public.has_permission(permission text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    join roles r on r.id = p.role_id
    where p.id = auth.uid() and p.active and not p.must_change_password and permission = any (r.permissions)
  );
$$;

-- Con la contraseña temporal pendiente, la aplicación igual necesita leer el
-- propio perfil y el propio rol para mostrar la pantalla de cambio.
create policy profiles_read_self on public.profiles for select to authenticated
  using (id = auth.uid());
create policy roles_read_own on public.roles for select to authenticated
  using (id = (select role_id from public.profiles where id = auth.uid()));

-- ---------- Nadie otorga lo que no tiene ----------

-- Permisos del usuario en sesión (vacío si no está habilitado).
create function public.my_permissions() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select r.permissions from profiles p join roles r on r.id = p.role_id
     where p.id = auth.uid() and p.active and not p.must_change_password),
    array[]::text[]
  );
$$;

-- ¿Puede asignar (o editar) este rol? Solo si no da permisos que él no tenga.
create function public.can_grant_role(target_role uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select r.permissions <@ my_permissions() from roles r where r.id = target_role), false);
$$;

revoke execute on function public.my_permissions() from public, anon;
revoke execute on function public.can_grant_role(uuid) from public, anon;
grant execute on function public.my_permissions() to authenticated;
grant execute on function public.can_grant_role(uuid) to authenticated;

-- Usuarios. Solo aplica a cambios hechos con la sesión de un usuario: la clave
-- de servicio (función admin-users) no tiene auth.uid() y hace sus propias
-- comprobaciones. Las funciones set_my_* y complete_password_change cambian la
-- fila propia sin tocar el rol, así que no se ven afectadas.
create function public.guard_profile_grant() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.id <> auth.uid() and not can_grant_role(old.role_id) then
    raise exception 'No puedes modificar a un usuario con permisos que tú no tienes.';
  end if;
  if (tg_op = 'INSERT' or new.role_id <> old.role_id) and not can_grant_role(new.role_id) then
    raise exception 'No puedes asignar un rol con permisos que tú no tienes.';
  end if;
  return new;
end;
$$;

create trigger profiles_grant_guard before insert or update on public.profiles
for each row execute function public.guard_profile_grant();

-- Roles: no se crea, edita ni elimina un rol con permisos que uno no tiene.
-- Impide, por ejemplo, que alguien con "roles.manage" se agregue permisos a su propio rol.
create function public.guard_role_grant() returns trigger
language plpgsql as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  if tg_op in ('UPDATE', 'DELETE') and not (old.permissions <@ my_permissions()) then
    raise exception 'No puedes modificar un rol con permisos que tú no tienes.';
  end if;
  if tg_op in ('INSERT', 'UPDATE') and not (new.permissions <@ my_permissions()) then
    raise exception 'No puedes dar a un rol permisos que tú no tienes.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger roles_grant_guard before insert or update or delete on public.roles
for each row execute function public.guard_role_grant();
