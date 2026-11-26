import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { resetDemo } from '#services/demo_data'

// node ace db:seed : remet les données de démonstration.
export default class extends BaseSeeder {
  async run() {
    await resetDemo()
  }
}
