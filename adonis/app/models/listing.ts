import { randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { BaseModel, SnakeCaseNamingStrategy, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

const json = { prepare: (v: string[]) => JSON.stringify(v ?? []), consume: (v: string) => (v ? JSON.parse(v) : []) }
const bool = { prepare: (v: boolean) => (v ? 1 : 0), consume: (v: number | boolean) => !!v }

export default class Listing extends BaseModel {
  // Noms en snake_case dans le JSON (full_name, owner_id…), comme le site les attend.
  static namingStrategy = new SnakeCaseNamingStrategy()
  static selfAssignPrimaryKey = true // identifiant texte (uuid ou « apt1 »), pas un numéro automatique

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare ownerId: number

  @column()
  declare partner: string | null

  @column()
  declare title: string

  @column()
  declare type: string

  @column()
  declare city: string

  @column()
  declare area: string

  @column()
  declare mode: 'nuit' | 'mois' | 'vente'

  @column()
  declare price: number

  @column()
  declare description: string

  @column(json)
  declare amenities: string[]

  @column(json)
  declare photos: string[]

  @column()
  declare maxGuests: number | null

  @column()
  declare bedrooms: number | null

  @column(bool)
  declare ex: boolean

  @column()
  declare status: 'pending' | 'published' | 'rejected' | 'archived'

  @column(bool)
  declare featured: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'ownerId' })
  declare owner: BelongsTo<typeof User>

  @beforeCreate()
  static assignId(listing: Listing) {
    if (!listing.id) listing.id = randomUUID()
  }
}
