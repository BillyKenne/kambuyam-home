import { BaseSchema } from '@adonisjs/lucid/schema'

// Annonces : appartements, chambres, maisons, terrains (à la nuit, au mois ou à vendre).
export default class extends BaseSchema {
  protected tableName = 'listings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 64).primary()
      table.integer('owner_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.string('partner', 120).nullable()
      table.string('title', 100).notNullable()
      table.string('type', 40).notNullable()
      table.string('city', 60).notNullable()
      table.string('area', 120).notNullable().defaultTo('')
      table.enum('mode', ['nuit', 'mois', 'vente']).notNullable()
      table.integer('price').notNullable()
      table.text('description').notNullable().defaultTo('')
      table.text('amenities').notNullable().defaultTo('[]')
      table.text('photos').notNullable().defaultTo('[]')
      table.integer('max_guests').nullable()
      table.integer('bedrooms').nullable()
      table.boolean('ex').notNullable().defaultTo(false)
      table.enum('status', ['pending', 'published', 'rejected', 'archived']).notNullable().defaultTo('pending')
      table.boolean('featured').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['status', 'city', 'mode', 'price'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
