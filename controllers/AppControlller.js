#!/usr/bin/env node

import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

class AppController {
    // GET /status
    static async getStatus(req, res) {
        const redisAlive = redisClient.isAlive();
        const dbAlive = dbClient.isAlive();
        res.status(200).json({ redis : redisAlive, 
                            db: dbAlive})}
    // GET /stats
    static async getStatus(req, res) {
        const users = await dbClient.nbUsers();
        const files = await dbClient.nbFiles();
        res.status(200).json({ users: users,
                                files : files})}
}