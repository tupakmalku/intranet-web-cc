// Función de Supabase (Deno) para gestionar usuarios: crearlos y restablecer contraseñas.
// Estas operaciones necesitan la clave de servicio, que nunca debe llegar al navegador.
// Solo la puede usar quien tenga el permiso "users.manage".
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

// Sin letras ni números que se confunden (0/O, 1/l/I).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** Contraseña temporal aleatoria con mayúsculas, minúsculas y números. */
function temporaryPassword(length = 12): string {
  for (;;) {
    const random = crypto.getRandomValues(new Uint32Array(length))
    const password = Array.from(random, (n) => ALPHABET[n % ALPHABET.length]).join('')
    if (/[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) return password
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')!
  const authorization = request.headers.get('Authorization') ?? ''

  // Con el token de quien llama se comprueba que tenga permiso para gestionar usuarios.
  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
  const { data: allowed, error: permissionError } = await caller.rpc('has_permission', { permission: 'users.manage' })
  if (permissionError || !allowed) return json({ error: 'Tu rol no permite gestionar usuarios.' }, 403)

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const body = await request.json().catch(() => ({}))

  // Nadie otorga lo que no tiene (ver src/domain/permissions.ts y la migración de seguridad):
  // solo se asigna un rol, o se gestiona a un usuario, cuyos permisos ya tiene quien llama.
  const canGrant = async (roleId: unknown) => {
    const { data, error } = await caller.rpc('can_grant_role', { target_role: String(roleId ?? '') })
    return !error && data === true
  }
  const { data: me } = await caller.auth.getUser()

  /** Deja constancia en la auditoría, a nombre de quien llamó a la función. */
  const audit = async (action: string, targetName: string, detail = '') => {
    const { error } = await admin.rpc('audit', { action, target_name: targetName, detail, actor: me.user?.id ?? null })
    if (error) console.error(error)
  }

  /** El usuario a gestionar, si quien llama puede (nadie gestiona a alguien con más permisos). */
  async function manageable(userId: string) {
    const target = await admin.from('profiles').select('role_id, full_name, email').eq('id', userId).maybeSingle()
    if (!target.data) return { error: json({ error: 'El usuario ya no existe.' }, 404) }
    if (userId !== me.user?.id && !(await canGrant(target.data.role_id))) {
      return { error: json({ error: 'No puedes gestionar a un usuario con permisos que tú no tienes.' }, 403) }
    }
    return { target: target.data }
  }

  if (body.action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const fullName = String(body.fullName ?? '').trim()
    if (!email || !fullName || !body.roleId) return json({ error: 'Faltan datos del usuario.' }, 400)
    if (!(await canGrant(body.roleId))) return json({ error: 'No puedes asignar un rol con permisos que tú no tienes.' }, 403)
    // Cumpleaños opcional, MM-DD; la base de datos valida además que el día exista en el mes.
    const birthday = typeof body.birthday === 'string' && /^\d{2}-\d{2}$/.test(body.birthday) ? body.birthday : null

    const password = temporaryPassword()
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data.user) {
      console.error(created.error)
      return json({ error: 'No se pudo crear el usuario. Revisa que el correo no esté ya registrado.' }, 400)
    }

    const profile = await admin
      .from('profiles')
      .insert({ id: created.data.user.id, email, full_name: fullName, role_id: body.roleId, birthday })
      .select()
      .single()
    if (profile.error) {
      // Sin perfil el usuario no podría ingresar: se deshace la creación.
      console.error(profile.error)
      await admin.auth.admin.deleteUser(created.data.user.id)
      return json({ error: 'No se pudo crear el usuario. Revisa el rol elegido.' }, 400)
    }
    await audit('user.created', `${fullName} (${email})`)
    return json({ user: profile.data, temporaryPassword: password })
  }

  if (body.action === 'resetPassword') {
    const userId = String(body.userId ?? '')
    // Restablecer la contraseña de alguien con más permisos permitiría tomar su cuenta.
    const { target, error } = await manageable(userId)
    if (error) return error
    const password = temporaryPassword()
    const updated = await admin.auth.admin.updateUserById(userId, { password })
    if (updated.error) {
      console.error(updated.error)
      return json({ error: 'No se pudo restablecer la contraseña.' }, 400)
    }
    const flagged = await admin.from('profiles').update({ must_change_password: true }).eq('id', userId)
    if (flagged.error) {
      console.error(flagged.error)
      return json({ error: 'La contraseña cambió, pero no se pudo exigir su cambio. Inténtalo de nuevo.' }, 500)
    }
    await audit('user.password_reset', `${target.full_name} (${target.email})`)
    return json({ temporaryPassword: password })
  }

  // Quita la aplicación autenticadora de quien la perdió: la configura de nuevo al ingresar.
  if (body.action === 'resetMfa') {
    const userId = String(body.userId ?? '')
    const { target, error } = await manageable(userId)
    if (error) return error
    const factors = await admin.auth.admin.mfa.listFactors({ userId })
    if (factors.error) {
      console.error(factors.error)
      return json({ error: 'No se pudo leer la verificación en dos pasos del usuario.' }, 400)
    }
    for (const factor of factors.data.factors) {
      const removed = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId })
      if (removed.error) {
        console.error(removed.error)
        return json({ error: 'No se pudo restablecer la verificación en dos pasos.' }, 400)
      }
    }
    // Sus sesiones abiertas caducan solas (ver la caducidad de sesión); al ingresar de nuevo, la configurará otra vez.
    await audit('mfa.reset', `${target.full_name} (${target.email})`)
    return json({ ok: true })
  }

  return json({ error: 'Acción desconocida.' }, 400)
})
