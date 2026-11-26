import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import type { StatusPageRange, StatusPageRenderer } from '@adonisjs/core/types/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction
  protected renderStatusPages = app.inProduction

  protected statusPages: Record<StatusPageRange, StatusPageRenderer> = {
    '404': (error, { view }) => view.render('pages/errors/not_found', { error }),
    '500..599': (error, { view }) => view.render('pages/errors/server_error', { error }),
  }

  /** Pour l'API : toujours une réponse JSON simple { message } que le site sait afficher. */
  async handle(error: any, ctx: HttpContext) {
    if (ctx.request.url().startsWith('/api/')) {
      const status = error?.status || 500
      let message = error?.message || 'Erreur'
      if (error?.code === 'E_VALIDATION_ERROR') message = 'Champ invalide : ' + (error.messages?.[0]?.field || '') 
      else if (error?.code === 'E_UNAUTHORIZED_ACCESS') message = 'Connectez-vous pour continuer.'
      else if (error?.code === 'E_BAD_CSRF_TOKEN') message = 'Session expirée : rechargez la page.'
      else if (error?.code === 'E_ROW_NOT_FOUND') message = 'Introuvable'
      else if (status >= 500) { this.report(error, ctx); message = 'Erreur du serveur' }
      return ctx.response.status(status).send({ message })
    }
    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
