import type { HttpContext } from '@adonisjs/core/http'

const version = Date.now().toString(36) // change à chaque démarrage : force le navigateur à recharger app.js et styles.css

export default class PagesController {
  /** La page unique du site (les rubriques s'affichent via l'adresse #annonces, #compte…). */
  async home({ view }: HttpContext) {
    return view.render('pages/home', { demoMode: process.env.DEMO_MODE !== 'false', version })
  }
}
