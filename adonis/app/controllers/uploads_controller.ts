import { randomUUID } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { Forbidden } from '#services/rules'

export default class UploadsController {
  /** Photo d'annonce (déjà réduite en JPEG par le navigateur). Rangée dans public/uploads. */
  async store({ request, response, auth }: HttpContext) {
    if (!auth.getUserOrFail().canPublish) throw new Forbidden()
    const photo = request.file('photo', { size: '5mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] })
    if (!photo || !photo.isValid) return response.unprocessableEntity({ message: photo?.errors[0]?.message || 'Photo manquante' })
    const name = `${randomUUID()}.${photo.extname === 'jpeg' ? 'jpg' : photo.extname}`
    await photo.move(app.publicPath('uploads'), { name })
    return { url: `uploads/${name}` }
  }
}
