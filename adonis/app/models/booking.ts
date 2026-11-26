import { randomBytes, randomUUID } from 'node:crypto'
import { DateTime } from 'luxon'
import { BaseModel, SnakeCaseNamingStrategy, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Listing from '#models/listing'
import User from '#models/user'

export type BookingStatus = 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'completed'

export default class Booking extends BaseModel {
  // Noms en snake_case dans le JSON (full_name, owner_id…), comme le site les attend.
  static namingStrategy = new SnakeCaseNamingStrategy()
  static selfAssignPrimaryKey = true // identifiant texte (uuid ou « apt1 »), pas un numéro automatique

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare reference: string

  @column()
  declare kind: 'stay' | 'visit'

  @column()
  declare listingId: string

  @column()
  declare clientId: number

  @column()
  declare checkIn: string

  @column()
  declare checkOut: string | null

  @column()
  declare guests: number

  @column()
  declare nights: number

  @column()
  declare total: number

  @column()
  declare commission: number

  @column()
  declare contactPhone: string

  @column()
  declare message: string

  @column()
  declare paymentMethod: 'orange_money' | 'mtn_momo' | null

  @column()
  declare paymentStatus: 'unpaid' | 'simulated' | 'paid' | 'refunded'

  @column()
  declare status: BookingStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Listing)
  declare listing: BelongsTo<typeof Listing>

  @belongsTo(() => User, { foreignKey: 'clientId' })
  declare client: BelongsTo<typeof User>

  @beforeCreate()
  static assignIds(booking: Booking) {
    if (!booking.id) booking.id = randomUUID()
    if (!booking.reference) booking.reference = 'KBY-' + randomBytes(3).toString('hex').toUpperCase()
  }
}
