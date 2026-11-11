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

  if (body.action === 'create') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const fullName = String(body.fullName ?? '').trim()
    if (!email || !fullName || !body.roleId) return json({ error: 'Faltan datos del usuario.' }, 400)
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
    return json({ user: profile.data, temporaryPassword: password })
  }

  if (body.action === 'resetPassword') {
    const userId = String(body.userId ?? '')
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
    return json({ temporaryPassword: password })
  }

  return json({ error: 'Acción desconocida.' }, 400)
})
