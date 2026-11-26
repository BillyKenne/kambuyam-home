import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, SnakeCaseNamingStrategy, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Listing from '#models/listing'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export type Role = 'client' | 'owner' | 'admin'

export default class User extends compose(BaseModel, AuthFinder) {
  // Noms en snake_case dans le JSON (full_name, owner_id…), comme le site les attend.
  static namingStrategy = new SnakeCaseNamingStrategy()

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare fullName: string

  @column()
  declare phone: string

  @column()
  declare role: Role

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  declare updatedAt: DateTime | null

  @hasMany(() => Listing, { foreignKey: 'ownerId' })
  declare listings: HasMany<typeof Listing>

  get isAdmin() {
    return this.role === 'admin'
  }

  get canPublish() {
    return this.role === 'owner' || this.role === 'admin'
  }
}
