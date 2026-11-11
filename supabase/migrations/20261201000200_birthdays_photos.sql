-- Cumpleaños y fotos de perfil de los usuarios, para saludarlos en la intranet.
-- Los registra quien gestiona usuarios (política profiles_update) y cada
-- usuario puede poner o corregir los suyos con set_my_birthday y set_my_photo.

-- ---------- Cumpleaños ----------

-- Solo día y mes (MM-DD), sin año: no se expone la edad.
alter table public.profiles
  add column birthday text
  constraint profiles_birthday_format check (
    birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'
    -- Día que exista en el mes (febrero admite el 29).
    and split_part(birthday, '-', 2)::int <= case split_part(birthday, '-', 1)
      when '02' then 29
      when '04' then 30 when '06' then 30 when '09' then 30 when '11' then 30
      else 31
    end
  );

-- El usuario en sesión registra, corrige o quita (null) su propio cumpleaños.
create function public.set_my_birthday(value text) returns void
language sql security definer set search_path = public as $$
  update profiles set birthday = nullif(value, '') where id = auth.uid() and active;
$$;

revoke execute on function public.set_my_birthday(text) from public, anon;
grant execute on function public.set_my_birthday(text) to authenticated;

-- ---------- Fotos ----------

-- Ubicación en el bucket "avatars": <id del usuario>/<uuid>.jpg. Cada foto nueva
-- tiene otro nombre, así el navegador no muestra una versión vieja guardada.
-- La aplicación sube un JPEG cuadrado de 512 px ya comprimido (src/lib/images.ts).
alter table public.profiles add column photo_path text;

-- Bucket privado: solo los usuarios habilitados ven las fotos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/jpeg']);

-- Quien sube o borra la foto de un usuario: él mismo o quien gestiona usuarios.
create function public.can_manage_photo(user_folder text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_active_user() and (user_folder = auth.uid()::text or has_permission('users.manage'));
$$;

create policy avatars_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_active_user());
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.can_manage_photo((storage.foldername(name))[1]));
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.can_manage_photo((storage.foldername(name))[1]));

-- El usuario en sesión pone o quita (null) su propia foto. Solo acepta una
-- ubicación dentro de su carpeta; los demás campos del perfil siguen protegidos.
create function public.set_my_photo(path text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if path is not null and path <> '' and split_part(path, '/', 1) <> auth.uid()::text then
    raise exception 'La foto debe estar en tu carpeta.';
  end if;
  update profiles set photo_path = nullif(path, '') where id = auth.uid() and active;
end;
$$;

revoke execute on function public.set_my_photo(text) from public, anon;
grant execute on function public.set_my_photo(text) to authenticated;
