#!/usr/bin/env node



import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

class DBClient {
  constructor() {
    // Set up MongoDB connection parameters
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    // Initialize the MongoDB client and connect to the database
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect().then(() => {
      this.db = this.client.db(database);
    }).catch((err) => {
      console.error(`MongoDB connection error: ${err}`);
    });
  }

  // Check if MongoDB client is alive
  isAlive() {
    return this.client && this.client.isConnected();
  }

  // Asynchronously get the number of documents in the "users" collection
  async nbUsers() {
    try {
      const usersCollection = this.db.collection('users');
      const count = await usersCollection.countDocuments();
      return count;
    } catch (err) {
      console.error(`Error getting number of users: ${err}`);
      return 0;
    }
  }

  // Asynchronously get the number of documents in the "files" collection
  async nbFiles() {
    try {
      const filesCollection = this.db.collection('files');
      const count = await filesCollection.countDocuments();
      return count;
    } catch (err) {
      console.error(`Error getting number of files: ${err}`);
      return 0;
    }
  }

  collection(collectionName) {
    return this.database.collection(collectionName)
  }
}

// Create and export a DBClient instance
const dbClient = new DBClient();
export default dbClient;
