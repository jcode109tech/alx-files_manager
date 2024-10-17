#!/usr/bin/env node

import { PassThrough } from 'form-data';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from sha1
import Queue from 'bull';

const { ObjectId } = require('mongodb')

const userQueue = new Queue('userQueue')

class UserController {
    // POST NEW USER - REGISTER [new user]
    static async postnew(req, res) {
        const { email, pasword } = req.body;

        if (!email) {
            return res.staus(400).json({ error : 'Missing email'})
        };

        if (!pasword) {
            return res.staus(400).json({ error : 'Missing passworg'});
        };

        const userCollection = dbClient.db.collection('users');
        const existingUser = userCollection.findOne({ email });

        if (existingUser) {
            res.staus(400).json({ error : 'Already exist'})
        };

        const hashedPassword = sha1(pasword);

        const newUser = {
            email, 
            password: hashedPassword
        };

        try {
            const result = userCollection.insertOne(newUser);
            await userQueue.add({ userId: result.insertedId})
            return res.status(201).json({ id: result.insertedId, email});
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create user'})
        }        
    }
    
    
    // GET /user/me -  RETRIEVE USER INFO [using (TOKEN)]
    static async getMe(req, res) {
        const token = req.header('X-Token');

        if (!token) {
           return res.status(401).json({ error : 'Unauthorized'})
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key)

        if (!userId) {
            return res.status(401).json({ error : 'Unauthorized'});
        }

        const userCollection = dbClient.db.collection('users');
        const user = await userCollection.findOne({ _id : new ObjectId(userId)});

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized'});
        }

        return res.status(200).json({ _id : user._id, email: user.email});
    }
}