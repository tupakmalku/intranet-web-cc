import {
  canArchiveDocument,
  canEditDocument,
  canRemoveDocument,
  canReviewDocument,
  documentAccess,
  isDocumentOwner,
} from '../../domain/documents.ts'
import { levelOf, MAX_PROCESS_LEVEL, withSubprocesses } from '../../domain/processes.ts'
import type { IntranetDocument, Permission, Session, User } from '../../domain/types.ts'
import { DOCUMENT_FILES } from '../../lib/files.ts'
import { isBirthday } from '../../lib/birthdays.ts'
import { generateTemporaryPassword } from '../../lib/validation.ts'
import { demoPhoto } from './demoPhotos.ts'
import { BackendError, type Backend } from '../types.ts'
import { deleteFile, getFile, putFile } from './files.ts'
import { sampleFile } from './sampleFiles.ts'
import { createSeed, DEMO_PASSWORD, type Db, type StoredUser } from './seed.ts'
import { newId } from '../../lib/ids.ts'

/*
 * Backend local: guarda todo en el navegador (localStorage e IndexedDB). Sirve
 * para probar la aplicación sin servidor y como ejemplo de una segunda
 * implementación del contrato `Backend`. Aplica los mismos permisos que las
 * políticas de Supabase. No es para producción: las contraseñas se guardan sin cifrar.
 */

const STORAGE_KEY = 'intranet.local.v1'

function read(): Db {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) return JSON.parse(raw) as Db
  const db = createSeed()
  write(db)
  return db
}

function write(db: Db): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

/** Quita la contraseña antes de entregar un usuario a la aplicación. */
function toUser(stored: StoredUser): User {
  // Los datos guardados antes de existir el cumpleaños y la foto no los traen.
  const user: User & { password?: string } = { ...stored, birthday: stored.birthday ?? null, photo: stored.photo ?? null }
  delete user.password
  return user
}

/** Valida un cumpleaños (MM-DD) antes de guardarlo. Vacío o null lo quita. */
function checkBirthday(value: string | null): string | null {
  if (!value) return null
  if (!isBirthday(value)) throw new BackendError('El cumpleaños no es una fecha válida.')
  return value
}

/** Direcciones ya creadas para las fotos guardadas en IndexedDB, para no crear una por cada vez que se muestran. */
const photoUrls = new Map<string, string>()

function sessionOf(db: Db): Session | null {
  const user = db.users.find((u) => u.id === db.sessionUserId && u.active)
  const role = user && db.roles.find((r) => r.id === user.roleId)
  return user && role ? { user: toUser(user), role } : null
}

/** La sesión actual; falla si no hay o si no tiene alguno de los permisos pedidos. */
function requireSession(db: Db, ...anyOf: Permission[]): Session {
  const session = sessionOf(db)
  if (!session) throw new BackendError('Tu sesión terminó. Vuelve a ingresar.')
  if (anyOf.length && !anyOf.some((p) => session.role.permissions.includes(p))) {
    throw new BackendError('Tu rol no permite hacer esto.')
  }
  return session
}

/** Un documento que el usuario en sesión puede leer; falla si no existe o no tiene acceso. */
function requireReadableDocument(db: Db, session: Session, id: string): IntranetDocument {
  const document = db.documents.find((d) => d.id === id)
  if (!document || !documentAccess(document, session).read) throw new BackendError('El documento ya no existe o no tienes acceso a él.')
  return document
}

/** Sube o baja un lugar un elemento entre sus hermanos, intercambiando la posición con el vecino. */
function moveAmong<T extends { id: string; position: number }>(siblings: T[], id: string, direction: -1 | 1): void {
  const sorted = [...siblings].sort((a, b) => a.position - b.position)
  sorted.forEach((item, i) => (item.position = i))
  const index = sorted.findIndex((item) => item.id === id)
  const neighbor = sorted[index + direction]
  if (index < 0 || !neighbor) return
  ;[sorted[index].position, neighbor.position] = [neighbor.position, sorted[index].position]
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function createLocalBackend(): Backend {
  return {
    name: 'local',
    demoNotice: `Modo de demostración: los datos se guardan solo en este navegador. Usuarios: admin, oficial, jefatura, aprobador o colaborador @demo.ec, con la contraseña temporal ${DEMO_PASSWORD}`,

    auth: {
      async getSession() {
        return sessionOf(read())
      },

      async signIn(email, password) {
        const db = read()
        const user = db.users.find((u) => sameText(u.email, email))
        if (!user || user.password !== password) throw new BackendError('El correo o la contraseña no son correctos.')
        if (!user.active) throw new BackendError('Tu usuario está inhabilitado. Comunícate con el oficial de seguridad.')
        db.sessionUserId = user.id
        write(db)
        return sessionOf(db)!
      },

      async signOut() {
        const db = read()
        db.sessionUserId = null
        write(db)
      },

      async changePassword(current, next) {
        const db = read()
        const session = requireSession(db)
        const user = db.users.find((u) => u.id === session.user.id)!
        if (user.password !== current) throw new BackendError('La contraseña actual no es correcta.')
        user.password = next
        user.mustChangePassword = false
        write(db)
      },

      async setMyBirthday(birthday) {
        const db = read()
        const session = requireSession(db)
        db.users.find((u) => u.id === session.user.id)!.birthday = checkBirthday(birthday)
        write(db)
      },
    },

    users: {
      async list() {
        const db = read()
        requireSession(db)
        return db.users.map(toUser).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
      },

      async create(input) {
        const db = read()
        requireSession(db, 'users.manage')
        if (db.users.some((u) => sameText(u.email, input.email))) throw new BackendError('Ya existe un usuario con ese correo.')
        const temporaryPassword = generateTemporaryPassword()
        const user: StoredUser = {
          id: newId(),
          email: input.email.trim().toLowerCase(),
          fullName: input.fullName.trim(),
          roleId: input.roleId,
          active: true,
          mustChangePassword: true,
          birthday: checkBirthday(input.birthday),
          photo: null,
          password: temporaryPassword,
        }
        db.users.push(user)
        write(db)
        return { user: toUser(user), temporaryPassword }
      },

      async update(id, patch) {
        const db = read()
        const session = requireSession(db, 'users.manage')
        const user = db.users.find((u) => u.id === id)
        if (!user) throw new BackendError('El usuario ya no existe.')
        // Nadie cambia su propio rol ni se inhabilita a sí mismo: evita escalar permisos y quedarse fuera.
        if (id === session.user.id && (patch.roleId !== user.roleId || !patch.active)) {
          throw new BackendError('No puedes cambiar tu propio rol ni inhabilitarte.')
        }
        Object.assign(user, { fullName: patch.fullName.trim(), roleId: patch.roleId, active: patch.active, birthday: checkBirthday(patch.birthday) })
        write(db)
        return toUser(user)
      },

      async resetPassword(id) {
        const db = read()
        requireSession(db, 'users.manage')
        const user = db.users.find((u) => u.id === id)
        if (!user) throw new BackendError('El usuario ya no existe.')
        user.password = generateTemporaryPassword()
        user.mustChangePassword = true
        write(db)
        return user.password
      },

      async setPhoto(id, photo) {
        const db = read()
        const session = requireSession(db)
        if (id !== session.user.id && !session.role.permissions.includes('users.manage')) {
          throw new BackendError('Tu rol no permite cambiar la foto de otro usuario.')
        }
        const user = db.users.find((u) => u.id === id)
        if (!user) throw new BackendError('El usuario ya no existe.')
        const previous = user.photo
        let key: string | null = null
        if (photo) {
          // Clave nueva en cada cambio: así nadie ve la foto anterior guardada.
          key = `photo:${id}:${newId()}`
          await putFile(key, photo)
        }
        user.photo = key
        write(db)
        if (previous?.startsWith('photo:')) await deleteFile(previous)
        return toUser(user)
      },

      async photoUrl(user) {
        if (!user.photo) return null
        // Retratos ilustrados de los usuarios de demostración.
        if (user.photo.startsWith('demo:')) {
          const [, n, style] = user.photo.split(':')
          return demoPhoto(Number(n), Number(style ?? 0))
        }
        const cached = photoUrls.get(user.photo)
        if (cached) return cached
        const blob = await getFile(user.photo)
        if (!blob) return null
        const url = URL.createObjectURL(blob)
        photoUrls.set(user.photo, url)
        return url
      },
    },

    roles: {
      async list() {
        const db = read()
        requireSession(db)
        return db.roles
      },

      async save(input) {
        const db = read()
        requireSession(db, 'roles.manage')
        if (db.roles.some((r) => r.id !== input.id && sameText(r.name, input.name))) {
          throw new BackendError('Ya existe un rol con ese nombre.')
        }
        const fields = { name: input.name.trim(), description: input.description.trim(), permissions: input.permissions }
        let role = db.roles.find((r) => r.id === input.id)
        if (role) Object.assign(role, fields)
        else db.roles.push((role = { id: newId(), system: false, ...fields }))
        write(db)
        return role
      },

      async remove(id) {
        const db = read()
        requireSession(db, 'roles.manage')
        if (db.roles.find((r) => r.id === id)?.system) throw new BackendError('Los roles del sistema no se pueden eliminar.')
        if (db.users.some((u) => u.roleId === id)) throw new BackendError('Hay usuarios con este rol. Asígnales otro antes de eliminarlo.')
        db.roles = db.roles.filter((r) => r.id !== id)
        write(db)
      },
    },

    documents: {
      async list() {
        const db = read()
        const session = requireSession(db)
        return db.documents
          .filter((d) => documentAccess(d, session).read)
          .sort((a, b) => a.code.localeCompare(b.code, 'es') || b.version.localeCompare(a.version, 'es', { numeric: true }))
      },

      async save(input, file) {
        const db = read()
        const session = requireSession(db, 'documents.publish')
        const problem = file && DOCUMENT_FILES.problem(file)
        if (problem) throw new BackendError(problem)
        if (input.classification === 'restricted' && !input.allowedRoleIds.length) {
          throw new BackendError('Elige al menos un rol que pueda leer el documento restringido.')
        }
        if (!db.documentTypes.some((t) => t.id === input.typeId)) throw new BackendError('El tipo de documento ya no existe.')
        // Los macroprocesos solo agrupan: los documentos van en un proceso o subproceso.
        const process = db.processes.find((p) => p.id === input.processId)
        if (!process?.parentId) throw new BackendError('Elige un proceso o subproceso del mapa.')
        const fields = {
          code: input.code.trim(),
          title: input.title.trim(),
          typeId: input.typeId,
          processId: input.processId,
          version: input.version.trim(),
          description: input.description.trim(),
          classification: input.classification,
          allowedRoleIds: input.classification === 'restricted' ? input.allowedRoleIds : [],
        }
        if (db.documents.some((d) => d.id !== input.id && sameText(d.code, fields.code) && sameText(d.version, fields.version))) {
          throw new BackendError('Ya existe un documento con ese código y esa versión.')
        }
        // Cada envío, nuevo o corregido, vuelve a esperar la aprobación.
        const submission = { status: 'pending' as const, reviewNote: '', reviewedBy: null, submittedAt: new Date().toISOString() }

        let document = db.documents.find((d) => d.id === input.id)
        if (document) {
          if (!canEditDocument(document, session)) throw new BackendError('Solo su dueño corrige un documento, y mientras no esté publicado.')
          if (file) {
            const path = newId()
            await putFile(path, file)
            await deleteFile(document.path)
            Object.assign(document, { path, fileName: file.name, mimeType: DOCUMENT_FILES.mimeTypeOf(file), size: file.size })
          }
          Object.assign(document, fields, submission)
        } else {
          if (!file) throw new BackendError('Elige el archivo del documento.')
          if (input.replacesId) {
            const previous = db.documents.find((d) => d.id === input.replacesId)
            if (!previous || previous.status !== 'published' || !isDocumentOwner(previous, session)) {
              throw new BackendError('Solo el dueño de un documento publicado sube su versión nueva.')
            }
          }
          const id = newId()
          await putFile(id, file)
          document = {
            id,
            ...fields,
            ...submission,
            ownerId: session.user.id,
            publishedAt: null,
            replacesId: input.replacesId ?? null,
            fileName: file.name,
            mimeType: DOCUMENT_FILES.mimeTypeOf(file),
            size: file.size,
            path: id,
          }
          db.documents.push(document)
        }
        write(db)
        return document
      },

      async review(id, approved, note) {
        const db = read()
        const session = requireSession(db, 'documents.approve')
        const document = db.documents.find((d) => d.id === id)
        if (!document || document.status !== 'pending') throw new BackendError('El documento ya no está por aprobar.')
        if (!canReviewDocument(document, session)) throw new BackendError('No puedes aprobar un documento que tú subiste.')
        if (!approved && !note.trim()) throw new BackendError('Explica qué hay que corregir.')
        Object.assign(document, {
          status: approved ? 'published' : 'rejected',
          reviewNote: note.trim(),
          reviewedBy: session.user.id,
          publishedAt: approved ? new Date().toISOString() : null,
        })
        // La versión nueva reemplaza a la anterior: esa sale de la intranet.
        const previous = approved ? db.documents.find((d) => d.id === document.replacesId) : undefined
        if (previous?.status === 'published') previous.status = 'archived'
        write(db)
        return document
      },

      async archive(id) {
        const db = read()
        const session = requireSession(db)
        const document = db.documents.find((d) => d.id === id)
        if (!document || !canArchiveDocument(document, session)) throw new BackendError('Solo el dueño o un aprobador retira un documento publicado.')
        document.status = 'archived'
        write(db)
        return document
      },

      async remove(document) {
        const db = read()
        const session = requireSession(db)
        const stored = db.documents.find((d) => d.id === document.id)
        if (!stored) return
        if (!canRemoveDocument(stored, session)) throw new BackendError('Un documento publicado solo lo elimina un aprobador. Puedes retirarlo.')
        await deleteFile(stored.path)
        db.documents = db.documents.filter((d) => d.id !== stored.id)
        write(db)
      },

      async getFile(document) {
        const db = read()
        const stored = requireReadableDocument(db, requireSession(db), document.id)
        const file = (await getFile(stored.path)) ?? sampleFile(stored)
        if (!file) throw new BackendError('El archivo ya no está en este navegador.')
        return new Blob([file], { type: stored.mimeType })
      },
    },

    processes: {
      async list() {
        const db = read()
        requireSession(db)
        return db.processes
      },

      async save(input) {
        const db = read()
        requireSession(db, 'intranet.configure')
        if (!input.name.trim()) throw new BackendError('Escribe el nombre.')
        let process = db.processes.find((p) => p.id === input.id)
        if (process) {
          Object.assign(process, { code: input.code.trim(), name: input.name.trim() })
        } else {
          if (input.parentId) {
            if (!db.processes.some((p) => p.id === input.parentId)) throw new BackendError('El elemento superior ya no existe.')
            if (levelOf(db.processes, input.parentId) >= MAX_PROCESS_LEVEL) throw new BackendError('Los subprocesos no llevan otros procesos debajo.')
          }
          const siblings = db.processes.filter((p) => p.parentId === input.parentId)
          const position = Math.max(-1, ...siblings.map((p) => p.position)) + 1
          process = { id: newId(), parentId: input.parentId, code: input.code.trim(), name: input.name.trim(), position }
          db.processes.push(process)
        }
        write(db)
        return process
      },

      async remove(id) {
        const db = read()
        requireSession(db, 'intranet.configure')
        if (db.processes.some((p) => p.parentId === id)) throw new BackendError('Primero elimina o mueve lo que está debajo.')
        const ids = withSubprocesses(db.processes, id)
        if (db.documents.some((d) => ids.has(d.processId))) throw new BackendError('Tiene documentos. Muévelos a otro proceso antes de eliminarlo.')
        db.processes = db.processes.filter((p) => p.id !== id)
        write(db)
      },

      async move(id, direction) {
        const db = read()
        requireSession(db, 'intranet.configure')
        const process = db.processes.find((p) => p.id === id)
        if (!process) throw new BackendError('El elemento ya no existe.')
        moveAmong(
          db.processes.filter((p) => p.parentId === process.parentId),
          id,
          direction,
        )
        write(db)
      },
    },

    documentTypes: {
      async list() {
        const db = read()
        requireSession(db)
        return [...db.documentTypes].sort((a, b) => a.position - b.position)
      },

      async save(input) {
        const db = read()
        requireSession(db, 'intranet.configure')
        const name = input.name.trim()
        if (!name) throw new BackendError('Escribe el nombre del tipo.')
        if (db.documentTypes.some((t) => t.id !== input.id && sameText(t.name, name))) throw new BackendError('Ya existe un tipo con ese nombre.')
        let type = db.documentTypes.find((t) => t.id === input.id)
        if (type) type.name = name
        else {
          type = { id: newId(), name, position: Math.max(-1, ...db.documentTypes.map((t) => t.position)) + 1 }
          db.documentTypes.push(type)
        }
        write(db)
        return type
      },

      async remove(id) {
        const db = read()
        requireSession(db, 'intranet.configure')
        if (db.documents.some((d) => d.typeId === id)) throw new BackendError('Hay documentos de este tipo. Cámbiales el tipo antes de eliminarlo.')
        db.documentTypes = db.documentTypes.filter((t) => t.id !== id)
        write(db)
      },

      async move(id, direction) {
        const db = read()
        requireSession(db, 'intranet.configure')
        moveAmong(db.documentTypes, id, direction)
        write(db)
      },
    },

  }
}
