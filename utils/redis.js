
import { createClient } from 'redis'

class RedisClient {
    constructor() {
        this.client =  createClient();
        this.client.on('error', (err) => {
            console.error(`Redis client Error: ${err}`);});
        this.client.on('connect', () => 
            console.log('Redis client conneted to the server'));
        this.client.connect();
    }

    isAlive() {
        if (this.client.isOpen) {
            return true
        }
        return false;
    }

    async get(key) {
        try {
            const value = await this.client.get(key);
            return value
        } catch (err) {
            console.error(`Error getting key "${key}": ${err}`)
            return null;
        }
    }

    async set(key, value, duration) {
        try {
            await this.client.set(key, value, 
                { EX: duration })
        } catch (err) {
            console.error(`Error setting key ${key}: ${err}`)
        }

        if (duration) {
            await this.client.expire(key, duration)
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
        } catch (err) {
            console.error(`Error deleting key "${key}": ${err}`);
        }
    }
// end of class
}

const redisClient = new RedisClient()
export default redisClient