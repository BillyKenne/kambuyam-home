import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { profileValidator } from '#validators/kambuyam'
import { Forbidden } from '#services/rules'

export default class ProfilesController {
  /** Mon profil : nom, téléphone, et « je veux aussi proposer des biens » (client → propriétaire). */
  async update({ request, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await request.validateUsing(profileValidator)
    if (data.role && data.role !== user.role && !user.isAdmin && !(user.role === 'client' && data.role === 'owner'))
      throw new Forbidden('Changement de rôle non autorisé')
    user.merge({ fullName: data.full_name ?? user.fullName, phone: data.phone ?? user.phone, role: data.role ?? user.role })
    await user.save()
    return { user: user.serialize() }
  }

  /** Admin : liste des comptes. */
  async index({ auth }: HttpContext) {
    if (!auth.getUserOrFail().isAdmin) throw new Forbidden()
    return User.query().orderBy('created_at', 'desc')
  }

  /** Admin : changer le rôle d'un compte. */
  async setRole({ request, params, auth }: HttpContext) {
    if (!auth.getUserOrFail().isAdmin) throw new Forbidden()
    const { role } = await request.validateUsing(profileValidator)
    const user = await User.findOrFail(params.id)
    if (role) user.role = role
    await user.save()
    return user
  }
}
