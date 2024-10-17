#!/usr/bin/env node


import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import sha1 from 'sha1';

class AuthController {
  // GET /connect - Sign in user and generate token
  static async getConnect(req, res) {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Decode Basic Auth
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Hash password to match stored value
    const hashedPassword = sha1(password);

    // Find user in DB
    const usersCollection = dbClient.db.collection('users');
    const user = await usersCollection.findOne({ email, password: hashedPassword });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate token and store in Redis
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 86400); // Token valid for 24 hours

    return res.status(200).json({ token });
  }

  // GET /disconnect - Sign out user
  static async getDisconnect(req, res) {
    const token = req.header('X-Token');
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Remove token from Redis
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(key);
    return res.status(204).send();
  }
}

export default AuthController;
