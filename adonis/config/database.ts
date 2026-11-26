import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

// Base SQLite (un seul fichier). Emplacement réglable avec DB_PATH, sinon tmp/db.sqlite3.
const filename = process.env.DB_PATH || app.tmpPath('db.sqlite3')
mkdirSync(dirname(filename), { recursive: true })

const dbConfig = defineConfig({
  connection: 'sqlite',
  connections: {
    sqlite: {
      client: 'better-sqlite3',
      connection: { filename },
      useNullAsDefault: true,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
