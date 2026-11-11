import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js'
import type { DocumentType, IntranetDocument, ProcessNode, Role, Session, User } from '../../domain/types.ts'
import { DOCUMENT_FILES, safeFileName } from '../../lib/files.ts'
import { BackendError, type Backend } from '../types.ts'
import { newId } from '../../lib/ids.ts'

/*
 * Backend sobre Supabase: autenticación, base de datos (con políticas RLS que
 * aplican los permisos de cada rol) y almacenamiento de los documentos. El
 * esquema está en supabase/migrations y la gestión de usuarios, que necesita
 * la clave de servicio, en la función supabase/functions/admin-users.
 *
 * Todo lo específico de Supabase queda en este archivo: aquí se convierten las
 * filas (snake_case) a los tipos del modelo.
 */

/** Bucket de los documentos de la intranet. */
const DOCUMENTS_BUCKET = 'documents'

/* eslint-disable @typescript-eslint/no-explicit-any -- las filas llegan sin tipo y se convierten aquí. */

const toRole = (row: any): Role => ({
  id: row.id,
  name: row.name,
  description: row.description,
  permissions: row.permissions,
  system: row.system,
})

const toUser = (row: any): User => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  roleId: row.role_id,
  active: row.active,
  mustChangePassword: row.must_change_password,
  birthday: row.birthday ?? null,
  photo: row.photo_path ?? null,
})

const AVATARS_BUCKET = 'avatars'

/** Direcciones firmadas de las fotos (valen una hora), para no pedir una cada vez que se muestran. */
const photoUrls = new Map<string, { url: string; expires: number }>()

const toDocument = (row: any): IntranetDocument => ({
  id: row.id,
  code: row.code,
  title: row.title,
  typeId: row.type_id,
  processId: row.process_id,
  version: row.version,
  description: row.description,
  classification: row.classification,
  allowedRoleIds: row.allowed_role_ids,
  status: row.status,
  reviewNote: row.review_note,
  ownerId: row.owner_id,
  reviewedBy: row.reviewed_by,
  submittedAt: row.submitted_at,
  publishedAt: row.published_at,
  replacesId: row.replaces_id,
  fileName: row.file_name,
  mimeType: row.mime_type,
  size: row.size,
  path: row.path,
})

const toProcess = (row: any): ProcessNode => ({
  id: row.id,
  parentId: row.parent_id,
  code: row.code,
  name: row.name,
  position: row.position,
})

const toDocumentType = (row: any): DocumentType => ({ id: row.id, name: row.name, position: row.position })

/* eslint-enable @typescript-eslint/no-explicit-any */

/** Traduce los errores de la base de datos a un mensaje para el usuario. */
function toBackendError(error: { message: string; code?: string }, fallback: string): BackendError {
  console.error(error)
  if (error.code === '23505') return new BackendError('Ya existe un registro con esos datos.')
  if (error.code === '23503') return new BackendError('No se puede eliminar: hay otros registros que dependen de este.')
  // 42501: lo impide una política. PGRST116: la política no dejó ver o cambiar ninguna fila.
  if (error.code === '42501' || error.code === 'PGRST116') return new BackendError('Tu rol no permite hacer esto, o el registro ya no existe.')
  // P0001: mensajes que lanzan las funciones de la base de datos, ya en español.
  if (error.code === 'P0001') return new BackendError(error.message)
  return new BackendError(fallback)
}

/** Devuelve los datos de una consulta o lanza el error traducido. */
function unwrap<T>(result: { data: T; error: { message: string; code?: string } | null }, fallback: string): NonNullable<T> {
  if (result.error) throw toBackendError(result.error, fallback)
  return result.data as NonNullable<T>
}

export function createSupabaseBackend(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env. Ver README.')
  }
  const supabase: SupabaseClient = createClient(url, key)

  /** Lee el perfil y el rol del usuario autenticado. Cierra la sesión si está inhabilitado. */
  async function loadSession(userId: string): Promise<Session> {
    const { data, error } = await supabase.from('profiles').select('*, role:roles(*)').eq('id', userId).maybeSingle()
    if (error) throw toBackendError(error, 'No se pudo leer tu usuario.')
    if (!data || !data.active) {
      await supabase.auth.signOut()
      throw new BackendError('Tu usuario está inhabilitado. Comunícate con el oficial de seguridad.')
    }
    return { user: toUser(data), role: toRole(data.role) }
  }

  /** Llama a la función que gestiona usuarios con la clave de servicio. */
  async function adminUsers<T>(body: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.functions.invoke('admin-users', { body })
    if (error) {
      // La función responde los errores previstos con un mensaje en español.
      const detail = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null
      console.error(error)
      throw new BackendError(detail?.error ?? 'No se pudo completar la operación. Inténtalo de nuevo.')
    }
    return data as T
  }

  return {
    name: 'supabase',

    auth: {
      async getSession() {
        const { data } = await supabase.auth.getSession()
        return data.session ? loadSession(data.session.user.id) : null
      },

      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.user) throw new BackendError('El correo o la contraseña no son correctos.')
        return loadSession(data.user.id)
      },

      async signOut() {
        await supabase.auth.signOut()
      },

      async changePassword(current, next) {
        const { data } = await supabase.auth.getUser()
        if (!data.user?.email) throw new BackendError('Tu sesión terminó. Vuelve a ingresar.')
        // Se vuelve a pedir la contraseña actual: una sesión abierta no basta para cambiarla.
        const check = await supabase.auth.signInWithPassword({ email: data.user.email, password: current })
        if (check.error) throw new BackendError('La contraseña actual no es correcta.')
        const update = await supabase.auth.updateUser({ password: next })
        if (update.error) {
          console.error(update.error)
          throw new BackendError('No se pudo cambiar la contraseña. Prueba con otra distinta.')
        }
        unwrap(await supabase.rpc('complete_password_change'), 'La contraseña cambió, pero no se pudo registrar. Vuelve a ingresar.')
      },

      async setMyBirthday(birthday) {
        unwrap(await supabase.rpc('set_my_birthday', { value: birthday ?? '' }), 'No se pudo guardar tu cumpleaños.')
      },
    },

    users: {
      async list() {
        return unwrap(await supabase.from('profiles').select('*').order('full_name'), 'No se pudieron leer los usuarios.').map(toUser)
      },

      async create(input) {
        const result = await adminUsers<{ user: unknown; temporaryPassword: string }>({ action: 'create', ...input })
        return { user: toUser(result.user), temporaryPassword: result.temporaryPassword }
      },

      async update(id, patch) {
        const row = unwrap(
          await supabase
            .from('profiles')
            .update({ full_name: patch.fullName.trim(), role_id: patch.roleId, active: patch.active, birthday: patch.birthday || null })
            .eq('id', id)
            .select()
            .single(),
          'No se pudo guardar el usuario.',
        )
        return toUser(row)
      },

      async resetPassword(id) {
        const result = await adminUsers<{ temporaryPassword: string }>({ action: 'resetPassword', userId: id })
        return result.temporaryPassword
      },

      async setPhoto(id, photo) {
        const { data: auth } = await supabase.auth.getUser()
        const current = unwrap(await supabase.from('profiles').select('photo_path').eq('id', id).single(), 'El usuario ya no existe.')
        let path: string | null = null
        if (photo) {
          // Nombre nuevo en cada cambio: así nadie ve la foto anterior guardada en el navegador.
          path = `${id}/${crypto.randomUUID()}.jpg`
          const uploaded = await supabase.storage.from(AVATARS_BUCKET).upload(path, photo, { contentType: 'image/jpeg' })
          if (uploaded.error) {
            console.error(uploaded.error)
            throw new BackendError('No se pudo subir la foto.')
          }
        }
        // La propia foto se cambia con la función set_my_photo; la de otro, como gestor de usuarios.
        const saved =
          id === auth.user?.id
            ? await supabase.rpc('set_my_photo', { path: path ?? '' })
            : await supabase.from('profiles').update({ photo_path: path }).eq('id', id)
        if (saved.error) {
          if (path) await supabase.storage.from(AVATARS_BUCKET).remove([path])
          throw toBackendError(saved.error, 'No se pudo guardar la foto.')
        }
        if (current.photo_path) await supabase.storage.from(AVATARS_BUCKET).remove([current.photo_path])
        return toUser(unwrap(await supabase.from('profiles').select('*').eq('id', id).single(), 'No se pudo leer el usuario.'))
      },

      async photoUrl(user) {
        if (!user.photo) return null
        const cached = photoUrls.get(user.photo)
        if (cached && cached.expires > Date.now()) return cached.url
        const { data, error } = await supabase.storage.from(AVATARS_BUCKET).createSignedUrl(user.photo, 3600)
        if (error || !data) return null
        // Se renueva unos minutos antes de que venza.
        photoUrls.set(user.photo, { url: data.signedUrl, expires: Date.now() + 55 * 60 * 1000 })
        return data.signedUrl
      },
    },

    roles: {
      async list() {
        return unwrap(await supabase.from('roles').select('*').order('created_at'), 'No se pudieron leer los roles.').map(toRole)
      },

      async save(input) {
        const fields = { name: input.name.trim(), description: input.description.trim(), permissions: input.permissions }
        const query = input.id ? supabase.from('roles').update(fields).eq('id', input.id) : supabase.from('roles').insert(fields)
        return toRole(unwrap(await query.select().single(), 'No se pudo guardar el rol.'))
      },

      async remove(id) {
        unwrap(await supabase.from('roles').delete().eq('id', id).select().single(), 'No se pudo eliminar el rol.')
      },
    },

    documents: {
      async list() {
        // Las políticas de la base de datos ya dejan solo lo que el usuario puede ver.
        return unwrap(
          await supabase.from('documents').select('*').order('code').order('version', { ascending: false }),
          'No se pudieron leer los documentos.',
        ).map(toDocument)
      },

      async save(input, file) {
        const problem = file && DOCUMENT_FILES.problem(file)
        if (problem) throw new BackendError(problem)
        const { data } = await supabase.auth.getUser()
        if (!data.user) throw new BackendError('Tu sesión terminó. Vuelve a ingresar.')

        const id = input.id ?? newId()
        const previous = input.id
          ? unwrap(await supabase.from('documents').select('path').eq('id', id).single(), 'No se pudo leer el documento.')
          : null
        if (!previous && !file) throw new BackendError('Elige el archivo del documento.')

        // El archivo va primero: la carpeta es el id del documento, y así la fila nunca apunta a un archivo que no está.
        let fileFields = {}
        let path: string | null = null
        if (file) {
          path = `${id}/${newId()}-${safeFileName(file.name)}`
          const mimeType = DOCUMENT_FILES.mimeTypeOf(file)
          const stored = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, { contentType: mimeType })
          if (stored.error) {
            console.error(stored.error)
            throw new BackendError('No se pudo subir el archivo. Revisa que tu rol lo permita, el tipo y el tamaño.')
          }
          fileFields = { file_name: file.name, mime_type: mimeType, size: file.size, path }
        }

        const fields = {
          code: input.code.trim(),
          title: input.title.trim(),
          type_id: input.typeId,
          process_id: input.processId,
          version: input.version.trim(),
          description: input.description.trim(),
          classification: input.classification,
          allowed_role_ids: input.classification === 'restricted' ? input.allowedRoleIds : [],
          ...fileFields,
        }
        // Al corregir, un disparador lo devuelve a "por aprobar".
        const query = previous
          ? supabase.from('documents').update(fields).eq('id', id)
          : supabase.from('documents').insert({ ...fields, id, owner_id: data.user.id, replaces_id: input.replacesId ?? null })
        const saved = await query.select().single()
        if (saved.error) {
          // Sin fila el archivo quedaría huérfano: se retira.
          if (path) await supabase.storage.from(DOCUMENTS_BUCKET).remove([path])
          throw toBackendError(saved.error, 'No se pudo guardar el documento.')
        }
        if (previous && path) await supabase.storage.from(DOCUMENTS_BUCKET).remove([previous.path])
        return toDocument(saved.data)
      },

      async review(id, approved, note) {
        return toDocument(
          unwrap(await supabase.rpc('review_document', { document: id, approved, note: note.trim() }), 'No se pudo registrar la revisión.'),
        )
      },

      async archive(id) {
        return toDocument(unwrap(await supabase.rpc('archive_document', { document: id }), 'No se pudo retirar el documento.'))
      },

      async remove(document) {
        unwrap(await supabase.from('documents').delete().eq('id', document.id).select().single(), 'No se pudo eliminar el documento.')
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.path])
      },

      async getFile(document) {
        const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(document.path)
        if (error || !data) {
          console.error(error)
          throw new BackendError('No se pudo abrir el archivo, o ya no tienes acceso a él.')
        }
        return new Blob([data], { type: document.mimeType })
      },
    },

    processes: {
      async list() {
        return unwrap(await supabase.from('process_nodes').select('*').order('position'), 'No se pudo leer el mapa de procesos.').map(toProcess)
      },

      async save(input) {
        const fields = { code: input.code.trim(), name: input.name.trim() }
        // Los nuevos van al final de su nivel (lo calcula un disparador de la base de datos).
        const query = input.id
          ? supabase.from('process_nodes').update(fields).eq('id', input.id)
          : supabase.from('process_nodes').insert({ ...fields, parent_id: input.parentId })
        return toProcess(unwrap(await query.select().single(), 'No se pudo guardar el proceso.'))
      },

      async remove(id) {
        unwrap(await supabase.from('process_nodes').delete().eq('id', id).select().single(), 'No se pudo eliminar. Revisa que no tenga procesos ni documentos.')
      },

      async move(id, direction) {
        unwrap(await supabase.rpc('move_catalog_item', { catalog: 'process_nodes', item: id, direction }), 'No se pudo cambiar el orden.')
      },
    },

    documentTypes: {
      async list() {
        return unwrap(await supabase.from('document_types').select('*').order('position'), 'No se pudieron leer los tipos de documento.').map(toDocumentType)
      },

      async save(input) {
        const fields = { name: input.name.trim() }
        const query = input.id ? supabase.from('document_types').update(fields).eq('id', input.id) : supabase.from('document_types').insert(fields)
        return toDocumentType(unwrap(await query.select().single(), 'No se pudo guardar el tipo de documento.'))
      },

      async remove(id) {
        unwrap(await supabase.from('document_types').delete().eq('id', id).select().single(), 'No se pudo eliminar. Revisa que ningún documento sea de este tipo.')
      },

      async move(id, direction) {
        unwrap(await supabase.rpc('move_catalog_item', { catalog: 'document_types', item: id, direction }), 'No se pudo cambiar el orden.')
      },
    },

  }
}
