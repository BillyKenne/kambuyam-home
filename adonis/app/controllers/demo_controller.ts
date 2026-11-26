import type { HttpContext } from '@adonisjs/core/http'
import { resetDemo } from '#services/demo_data'

export default class DemoController {
  /** Bouton « Remettre à zéro » de la démonstration (désactivé si DEMO_MODE=false). */
  async reset({ auth, response }: HttpContext) {
    if (process.env.DEMO_MODE === 'false') return response.notFound()
    await auth.use('web').logout()
    await resetDemo()
    return { ok: true }
  }
}
