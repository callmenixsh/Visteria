import { MongoClient } from 'mongodb'

export async function initDatabase(mongodbUri, databaseName, visitsCollectionName) {
  if (!mongodbUri) {
    throw new Error('Missing MONGODB_URI')
  }

  const client = new MongoClient(mongodbUri)
  await client.connect()

  const database = client.db(databaseName)
  const visitsCollection = database.collection(visitsCollectionName)

  // Drop old indexes to allow switching schema
  try {
    await visitsCollection.dropIndexes()
    console.log('[db] Dropped old indexes')
  } catch {
    // Ignore error if indexes don't exist
  }

  // Check if we need to migrate from old schema (one doc per visit) to new schema (one doc per visitor)
  // Old schema has 'visitedAt' at root level, new schema has 'visits' array
  const sampleDoc = await visitsCollection.findOne({})
  if (sampleDoc && sampleDoc.visitedAt && !sampleDoc.visits) {
    console.log('[db] Detected old schema format - clearing collection for new schema')
    console.log('[db] WARNING: All existing visit data will be deleted')
    
    const result = await visitsCollection.deleteMany({})
    console.log(`[db] Deleted ${result.deletedCount} old documents`)
  }

  await Promise.all([
    visitsCollection.createIndex({ siteId: 1, visitorHash: 1 }, { unique: true }),
    visitsCollection.createIndex({ siteId: 1 }),
    visitsCollection.createIndex({ lastSeenAt: -1 }),
  ])

  console.log('[db] Created indexes: siteId+visitorHash (unique), siteId, lastSeenAt')

  return { client, visitsCollection }
}
