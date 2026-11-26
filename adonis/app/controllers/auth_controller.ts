import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, signupValidator } from '#validators/kambuyam'

const me = (u: User | undefined | null) => (u ? u.serialize() : null)

export default class AuthController {
  /** Qui est connecté ? (null si personne) */
  async session({ auth }: HttpContext) {
    await auth.check()
    return { user: me(auth.user) }
  }

  async signup({ request, response, auth }: HttpContext) {
    const data = await request.validateUsing(signupValidator)
    if (await User.findBy('email', data.email)) return response.conflict({ message: 'User already registered' })
    const user = await User.create({ email: data.email, password: data.password, fullName: data.full_name, phone: data.phone,
      role: data.role === 'owner' ? 'owner' : 'client' })
    await auth.use('web').login(user)
    return { user: me(user) }
  }

  async login({ request, response, auth }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    try {
      const user = await User.verifyCredentials(email, password)
      await auth.use('web').login(user)
      return { user: me(user) }
    } catch {
      return response.unauthorized({ message: 'Invalid login credentials' })
    }
  }

  async logout({ auth }: HttpContext) {
    await auth.use('web').logout()
    return { user: null }
  }
}
