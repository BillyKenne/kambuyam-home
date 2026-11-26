// Au démarrage du serveur web : base vide → on ajoute les comptes et annonces de démonstration.
import app from '@adonisjs/core/services/app'
import { seedIfEmpty } from '#services/demo_data'

if (app.getEnvironment() === 'web' && process.env.DEMO_MODE !== 'false') {
  await seedIfEmpty()
}
