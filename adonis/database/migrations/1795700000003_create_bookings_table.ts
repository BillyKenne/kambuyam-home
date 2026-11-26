import { BaseSchema } from '@adonisjs/lucid/schema'

// Réservations (séjours à la nuit) et demandes de visite (location au mois / vente).
export default class extends BaseSchema {
  protected tableName = 'bookings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 64).primary()
      table.string('reference', 20).notNullable().unique()
      table.enum('kind', ['stay', 'visit']).notNullable().defaultTo('stay')
      table.string('listing_id', 64).notNullable().references('listings.id').onDelete('CASCADE')
      table.integer('client_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('check_in', 10).notNullable()
      table.string('check_out', 10).nullable()
      table.integer('guests').notNullable().defaultTo(1)
      table.integer('nights').notNullable().defaultTo(0)
      table.integer('total').notNullable().defaultTo(0)
      table.integer('commission').notNullable().defaultTo(0) // 3 % pour Kambuyam
      table.string('contact_phone', 20).notNullable().defaultTo('')
      table.text('message').notNullable().defaultTo('')
      table.enum('payment_method', ['orange_money', 'mtn_momo']).nullable()
      table.enum('payment_status', ['unpaid', 'simulated', 'paid', 'refunded']).notNullable().defaultTo('unpaid')
      table.enum('status', ['requested', 'confirmed', 'declined', 'cancelled', 'completed']).notNullable().defaultTo('requested')
      table.timestamp('created_at').notNullable()
      table.index(['client_id'])
      table.index(['listing_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
