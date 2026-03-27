import mongoose from "mongoose";

interface MongoCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const g = global as unknown as { __mongoose?: MongoCache };
const mongoCache: MongoCache = g.__mongoose ?? { conn: null, promise: null };
g.__mongoose = mongoCache;

export default async function dbConnect(): Promise<typeof mongoose> {
  if (mongoCache.conn) return mongoCache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  if (!mongoCache.promise) {
    mongoCache.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10000,
      })
      .catch((err) => {
        mongoCache.promise = null;
        throw err;
      });
  }

  try {
    mongoCache.conn = await mongoCache.promise;
  } catch (err) {
    mongoCache.promise = null;
    mongoCache.conn = null;
    throw err;
  }

  return mongoCache.conn;
}
