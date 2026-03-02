const { MongoClient } = require('mongodb');

const uri = 'mongodb://127.0.0.1:27017';
const dbName = 'book4u';
const collectionName = 'users';

async function resetDB() {
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
            await collection.drop();
            console.log(`Collection '${collectionName}' dropped.`);
        } else {
            console.log(`Collection '${collectionName}' does not exist.`);
        }

        // Re-create index (server.js does this too, but good to be sure)
        await db.collection(collectionName).createIndex({ email: 1 }, { unique: true });
        console.log('Unique index on email recreated.');

    } catch (err) {
        console.error('Error resetting DB:', err);
    } finally {
        await client.close();
    }
}

resetDB();
