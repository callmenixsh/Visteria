import { MongoClient } from 'mongodb'

let cachedClient = null
let cachedDb = null
let cachedCollection = null

export async function getVisitsCollection() {
  if (cachedCollection) {
    return cachedCollection
  }

  const uri = process.env.MONGODB_URI
  const dbName = process.env.MONGODB_DB_NAME || 'visteria'
  const collectionName = process.env.MONGODB_VISITS_COLLECTION || 'visits'

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri)
    await cachedClient.connect()
  }

  cachedDb = cachedClient.db(dbName)
  cachedCollection = cachedDb.collection(collectionName)

  return cachedCollection
}

export function parseApiKeys() {
  const rawValue = process.env.VISTERIA_API_KEYS || process.env.VISTERIA_API_KEY || process.env.API_KEY || ''
  return String(rawValue)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function verifyApiKey(req) {
  const apiKeys = parseApiKeys()
  
  if (!apiKeys.length) {
    return { valid: false, error: 'Server misconfigured: missing API key.' }
  }

  const apiKey = String(req.headers['x-api-key'] || '').trim()
  if (!apiKey || !apiKeys.includes(apiKey)) {
    return { valid: false, error: 'Unauthorized' }
  }

  return { valid: true }
}
