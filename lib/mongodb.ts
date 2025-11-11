import { MongoClient, Db } from 'mongodb';

// MongoDB connection string for local instance
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ecobhandu';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Create new connection
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);

    // Cache the connection
    cachedClient = client;
    cachedDb = db;

    console.log('✅ Connected to MongoDB at localhost:27017');
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

export async function getUsersCollection() {
  const { db } = await connectToDatabase();
  return db.collection('users');
}
