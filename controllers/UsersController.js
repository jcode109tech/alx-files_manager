import { PassThrough } from 'form-data';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';
import Queue from 'bull';
import { ObjectId } from 'mongodb'; // Import ObjectId from mongodb

const userQueue = new Queue('userQueue');

class UsersController {
    // POST NEW USER - REGISTER [new user]
    static async postNew(req, res) { // Fixed method name
        const { email, password } = req.body; // Fixed typo in 'password'

        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }

        if (!password) { // Fixed typo in 'password'
            return res.status(400).json({ error: 'Missing password' }); // Fixed typo in error message
        }

        const userCollection = dbClient.db.collection('users');
        const existingUser = await userCollection.findOne({ email }); // Await the promise

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' }); // Fixed typo in status and error message
        }

        const hashedPassword = sha1(password); // Fixed typo in 'password'

        const newUser = {
            email, 
            password: hashedPassword
        };

        try {
            const result = await userCollection.insertOne(newUser); // Await the insert operation
            await userQueue.add({ userId: result.insertedId });
            return res.status(201).json({ id: result.insertedId, email });
        } catch (error) {
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }

    // GET /user/me - RETRIEVE USER INFO [using (TOKEN)]
    static async getMe(req, res) {
        const token = req.header('X-Token');

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userCollection = dbClient.db.collection('users');
        const user = await userCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.status(200).json({ _id: user._id, email: user.email });
    }
}

export default UserController;
