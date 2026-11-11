-- Intranet: documentos institucionales de documentos (manuales, procedimientos, anexos...).
-- Los documentos se ordenan según el mapa de procesos de la institución, que
-- se mantiene desde la aplicación junto con los tipos de documento. Las áreas
-- suben sus documentos, un aprobador los publica y la clasificación decide
-- quién los lee y quién los descarga. La regla es la misma de
-- src/domain/documents.ts (documentAccess): si cambia allá, cambia aquí.

-- ---------- Mapa de procesos y tipos de documento ----------

-- Macroprocesos (sin padre), procesos (su padre es un macroproceso) y subprocesos (su padre es un proceso).
create table public.process_nodes (
  id uuid primary key default gen_random_uuid(),
  -- Restrict: no se elimina un elemento con otros debajo.
  parent_id uuid references public.process_nodes (id) on delete restrict,
  code text not null default '',
  name text not null check (trim(name) <> ''),
  position integer not null default 0
);

create index process_nodes_parent on public.process_nodes (parent_id, position);

-- Las carpetas de cada proceso: Manual, Procedimiento, Registro, Tomo 1...
create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (trim(name) <> ''),
  position integer not null default 0
);

create unique index document_types_name on public.document_types (lower(name));

-- Nivel de un elemento del mapa: 0 macroproceso, 1 proceso, 2 subproceso.
create function public.process_level(node uuid) returns integer
language sql stable set search_path = public as $$
  with recursive up as (
    select id, parent_id, 0 as depth from process_nodes where id = node
    union all
    select p.id, p.parent_id, up.depth + 1 from process_nodes p join up on p.id = up.parent_id where up.depth < 5
  )
  select max(depth) from up;
$$;

-- Al crear: el elemento va al final de su nivel y no se pasa de tres niveles. Al editar: el padre no cambia.
create function public.guard_process_node() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.parent_id := old.parent_id;
    return new;
  end if;
  if new.parent_id is not null and process_level(new.parent_id) >= 2 then
    raise exception 'Los subprocesos no llevan otros procesos debajo.';
  end if;
  select coalesce(max(position), -1) + 1 into new.position
  from process_nodes where parent_id is not distinct from new.parent_id;
  return new;
end;
$$;

create trigger process_nodes_guard before insert or update on public.process_nodes
for each row execute function public.guard_process_node();

create function public.place_document_type() returns trigger
language plpgsql set search_path = public as $$
begin
  select coalesce(max(position), -1) + 1 into new.position from document_types;
  return new;
end;
$$;

create trigger document_types_place before insert on public.document_types
for each row execute function public.place_document_type();

-- Sube (-1) o baja (+1) un lugar un elemento del mapa o un tipo de documento, intercambiando
-- su posición con la del vecino. Antes renumera el nivel, por si había posiciones repetidas.
create function public.move_catalog_item(catalog text, item uuid, direction integer) returns void
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[];
  i integer;
begin
  if not has_permission('intranet.configure') then
    raise exception 'Tu rol no permite configurar la intranet.';
  end if;
  if catalog = 'process_nodes' then
    select array_agg(id order by position, code) into ids from process_nodes
    where parent_id is not distinct from (select parent_id from process_nodes where id = item);
  elsif catalog = 'document_types' then
    select array_agg(id order by position, name) into ids from document_types;
  else
    raise exception 'Catálogo desconocido.';
  end if;
  i := array_position(ids, item);
  if i is null or i + direction < 1 or i + direction > cardinality(ids) then
    return;
  end if;
  ids[i] := ids[i + direction];
  ids[i + direction] := item;
  if catalog = 'process_nodes' then
    update process_nodes set position = array_position(ids, id) - 1 where id = any (ids);
  else
    update document_types set position = array_position(ids, id) - 1 where id = any (ids);
  end if;
end;
$$;

-- ---------- Documentos ----------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  -- Restrict: un tipo o un proceso con documentos no se puede eliminar.
  type_id uuid not null references public.document_types (id) on delete restrict,
  -- Proceso o subproceso del mapa (nunca un macroproceso: lo controla guard_document_process).
  process_id uuid not null references public.process_nodes (id) on delete restrict,
  version text not null,
  description text not null default '',
  -- public: todos leen y descargan. internal: todos leen, nadie descarga. restricted: leen solo allowed_role_ids.
  classification text not null check (classification in ('public', 'internal', 'restricted')),
  allowed_role_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'archived')),
  review_note text not null default '',
  owner_id uuid not null references public.profiles (id),
  reviewed_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  published_at timestamptz,
  -- La versión publicada que este documento reemplaza al aprobarse.
  replaces_id uuid references public.documents (id) on delete set null,
  file_name text not null,
  mime_type text not null,
  size bigint not null,
  -- Ubicación en el bucket "documents": <id del documento>/<uuid>-<nombre>.
  path text not null unique,
  created_at timestamptz not null default now(),
  constraint documents_restricted_needs_roles check (classification <> 'restricted' or cardinality(allowed_role_ids) > 0)
);

create unique index documents_code_version on public.documents (lower(code), lower(version));
create index documents_status on public.documents (status);
create index documents_owner on public.documents (owner_id);
create index documents_process on public.documents (process_id);

-- Los macroprocesos solo agrupan: los documentos van en un proceso o subproceso.
create function public.guard_document_process() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from process_nodes where id = new.process_id and parent_id is not null) then
    raise exception 'Elige un proceso o subproceso del mapa.';
  end if;
  return new;
end;
$$;

create trigger documents_process_guard before insert or update of process_id on public.documents
for each row execute function public.guard_document_process();

-- ---------- Funciones de permisos ----------

-- El rol del usuario en sesión, si está habilitado.
create function public.current_role_id() returns uuid
language sql stable security definer set search_path = public as $$
  select role_id from profiles where id = auth.uid() and active;
$$;

-- ¿Puede el usuario subir un archivo a la carpeta de este documento? Sí, si publica documentos y
-- la carpeta es de un documento nuevo o de uno suyo que todavía no está publicado.
-- Corre con permisos del dueño de la función: tiene que ver también los documentos que el usuario no ve.
create function public.can_upload_document_file(folder text) returns boolean
language sql stable security definer set search_path = public as $$
  select has_permission('documents.publish') and (
    not exists (select 1 from documents where id::text = folder)
    or exists (
      select 1 from documents
      where id::text = folder and owner_id = auth.uid() and status in ('pending', 'rejected')
    )
  );
$$;

-- ---------- Reglas que se aplican con disparadores ----------

-- El dueño solo cambia los datos y el archivo; cada corrección vuelve a esperar la aprobación.
-- El estado lo cambian únicamente review_document y archive_document.
create function public.guard_document_update() returns trigger
language plpgsql as $$
begin
  new.id := old.id;
  new.owner_id := old.owner_id;
  new.replaces_id := old.replaces_id;
  if new.status = old.status then
    new.status := 'pending';
    new.review_note := '';
    new.reviewed_by := null;
    new.submitted_at := now();
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger documents_guard before update on public.documents
for each row execute function public.guard_document_update();

-- Desde la aplicación no se escriben el estado, la revisión ni las fechas.
revoke insert on public.documents from authenticated;
grant insert (
  id, code, title, type_id, process_id, version, description, classification, allowed_role_ids,
  owner_id, replaces_id, file_name, mime_type, size, path
) on public.documents to authenticated;
revoke update on public.documents from authenticated;
grant update (
  code, title, type_id, process_id, version, description, classification, allowed_role_ids,
  file_name, mime_type, size, path
) on public.documents to authenticated;

-- ---------- Funciones que llama la aplicación ----------

-- Aprueba (publica) u observa un documento. Nadie aprueba lo que subió (segregación de funciones).
create function public.review_document(document uuid, approved boolean, note text) returns public.documents
language plpgsql security definer set search_path = public as $$
declare
  result documents;
begin
  if not has_permission('documents.approve') then
    raise exception 'Tu rol no permite aprobar publicaciones.';
  end if;
  select * into result from documents where id = document for update;
  if not found or result.status <> 'pending' then
    raise exception 'El documento ya no está por aprobar.';
  end if;
  if result.owner_id = auth.uid() then
    raise exception 'No puedes aprobar un documento que tú subiste.';
  end if;
  if not approved and coalesce(trim(note), '') = '' then
    raise exception 'Explica qué hay que corregir.';
  end if;

  update documents
  set status = case when approved then 'published' else 'rejected' end,
      review_note = coalesce(trim(note), ''),
      reviewed_by = auth.uid(),
      published_at = case when approved then now() else null end
  where id = document
  returning * into result;

  -- La versión nueva reemplaza a la anterior: esa sale de la intranet.
  if approved and result.replaces_id is not null then
    update documents set status = 'archived' where id = result.replaces_id and status = 'published';
  end if;
  return result;
end;
$$;

-- Retira de la intranet un documento publicado: lo hace su dueño o un aprobador.
create function public.archive_document(document uuid) returns public.documents
language plpgsql security definer set search_path = public as $$
declare
  result documents;
begin
  update documents
  set status = 'archived'
  where id = document
    and status = 'published'
    and ((owner_id = auth.uid() and is_active_user()) or has_permission('documents.approve'))
  returning * into result;
  if not found then
    raise exception 'Solo el dueño o un aprobador retira un documento publicado.';
  end if;
  return result;
end;
$$;

revoke execute on function public.move_catalog_item(text, uuid, integer) from public, anon;
grant execute on function public.move_catalog_item(text, uuid, integer) to authenticated;
revoke execute on function public.review_document(uuid, boolean, text) from public, anon;
revoke execute on function public.archive_document(uuid) from public, anon;
grant execute on function public.review_document(uuid, boolean, text) to authenticated;
grant execute on function public.archive_document(uuid) to authenticated;

-- ---------- Políticas (RLS) ----------

alter table public.documents enable row level security;
alter table public.process_nodes enable row level security;
alter table public.document_types enable row level security;

-- Mapa de procesos y tipos: todos los leen; los cambia quien configura la intranet.
create policy process_nodes_read on public.process_nodes for select to authenticated using (is_active_user());
create policy process_nodes_write on public.process_nodes for all to authenticated
  using (has_permission('intranet.configure')) with check (has_permission('intranet.configure'));
create policy document_types_read on public.document_types for select to authenticated using (is_active_user());
create policy document_types_write on public.document_types for all to authenticated
  using (has_permission('intranet.configure')) with check (has_permission('intranet.configure'));

-- El dueño y los aprobadores ven todo lo suyo / todo; los demás, lo publicado que su clasificación permite.
create policy documents_read on public.documents for select to authenticated
  using (
    is_active_user() and (
      owner_id = auth.uid()
      or has_permission('documents.approve')
      or (
        status = 'published'
        and (classification in ('public', 'internal') or current_role_id() = any (allowed_role_ids))
      )
    )
  );

-- Se suben a nombre propio. Una versión nueva solo la sube el dueño de la publicada.
create policy documents_insert on public.documents for insert to authenticated
  with check (
    has_permission('documents.publish')
    and owner_id = auth.uid()
    and (
      replaces_id is null
      or exists (select 1 from documents p where p.id = replaces_id and p.owner_id = auth.uid() and p.status = 'published')
    )
  );

-- El dueño corrige su documento mientras no esté publicado.
create policy documents_update on public.documents for update to authenticated
  using (has_permission('documents.publish') and owner_id = auth.uid() and status in ('pending', 'rejected'))
  with check (owner_id = auth.uid());

-- Lo elimina su dueño si no está publicado, o un aprobador.
create policy documents_delete on public.documents for delete to authenticated
  using (has_permission('documents.approve') or (is_active_user() and owner_id = auth.uid() and status <> 'published'));

-- ---------- Almacenamiento ----------

-- Bucket privado: PDF, Word (.docx) y Excel de hasta 20 MB (las mismas reglas que DOCUMENT_FILES en src/lib/files.ts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
);

-- La primera carpeta es el id del documento: quien ve el documento (política de arriba) lee su archivo.
-- Nota: leer el archivo permite guardarlo. "Solo lectura" se aplica en la interfaz (sin botón de
-- descarga, visor con marca de agua); no impide a un usuario técnico obtener el archivo.
create policy documents_files_read on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from public.documents d where d.id::text = (storage.foldername(name))[1])
  );
create policy documents_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.can_upload_document_file((storage.foldername(name))[1]));
create policy documents_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (owner_id::text = auth.uid()::text or public.has_permission('documents.approve'))
  );

-- ---------- Mapa de procesos y tipos iniciales ----------
-- Punto de partida, el mismo del modo de demostración (src/backend/local/intranetSeed.ts).
-- Después se mantienen desde la intranet, pestaña Configuración.

insert into public.document_types (name) values
  ('Estatuto'), ('Reglamento'), ('Política'), ('Plan'), ('Manual'), ('Procedimiento'), ('Instructivo'), ('Registro'), ('Anexo');

-- Se insertan en orden: el disparador asigna la posición de cada uno dentro de su nivel.
do $$
declare
  map jsonb := '[
    {"code": "1", "name": "Macroprocesos gobernantes", "children": [
      {"code": "1.1", "name": "Gestión de la planificación institucional"},
      {"code": "1.2", "name": "Gestión de la organización"},
      {"code": "1.3", "name": "Gestión de innovación y desarrollo", "children": [
        {"code": "1.3.1", "name": "Gestión de calidad"},
        {"code": "1.3.2", "name": "Administración de procesos"},
        {"code": "1.3.3", "name": "Gestión de proyectos"}]}]},
    {"code": "2", "name": "Macroprocesos productivos y de negocios", "children": [
      {"code": "2.1", "name": "Gestión de captaciones"},
      {"code": "2.2", "name": "Gestión de créditos", "children": [
        {"code": "2.2.1", "name": "Gestión de créditos"},
        {"code": "2.2.3", "name": "Gestión de cobranza"}]},
      {"code": "2.3", "name": "Gestión de servicios electrónicos"},
      {"code": "2.4", "name": "Gestión de educación financiera"},
      {"code": "2.5", "name": "Gestión de operaciones"},
      {"code": "2.6", "name": "Gestión de atención al cliente"}]},
    {"code": "3", "name": "Macroprocesos de apoyo", "children": [
      {"code": "3.1", "name": "Gestión de talento humano"},
      {"code": "3.2", "name": "Gestión financiera y administrativa", "children": [
        {"code": "3.2.1", "name": "Gestión contable"},
        {"code": "3.2.2", "name": "Gestión de tesorería"},
        {"code": "3.2.3", "name": "Gestión de proveeduría y adquisiciones"},
        {"code": "3.2.4", "name": "Gestión de estructuras financieras"}]},
      {"code": "3.3", "name": "Gestión de tecnología de la información"},
      {"code": "3.4", "name": "Gestión de balance social"},
      {"code": "3.5", "name": "Gestión de seguridad física"},
      {"code": "3.6", "name": "Gestión de asesoría legal administrativa"},
      {"code": "3.7", "name": "Gestión de marketing y comunicación"}]}
  ]';
  macro jsonb;
  process jsonb;
  sub jsonb;
  macro_id uuid;
  process_id uuid;
begin
  for macro in select * from jsonb_array_elements(map) loop
    insert into process_nodes (code, name) values (macro->>'code', macro->>'name') returning id into macro_id;
    for process in select * from jsonb_array_elements(coalesce(macro->'children', '[]')) loop
      insert into process_nodes (parent_id, code, name) values (macro_id, process->>'code', process->>'name') returning id into process_id;
      for sub in select * from jsonb_array_elements(coalesce(process->'children', '[]')) loop
        insert into process_nodes (parent_id, code, name) values (process_id, sub->>'code', sub->>'name');
      end loop;
    end loop;
  end loop;
end;
$$;
