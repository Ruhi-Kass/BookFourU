const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb://127.0.0.1:27017';

// Database and collection names
const dbName = 'book4u';
const collectionName = 'users';

// Create a MongoDB client
const client = new MongoClient(uri);

async function run() {
    try {
        // Connect to the MongoDB server
        await client.connect();
        console.log('Connected to MongoDB');

        // Select the database and collection
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Define a sample user document
        const sampleUser = {
            name: 'John Doe',
            email: 'john.doe@example.com',
            password: 'securepassword123',
            address: '123 Main St, Anytown, USA',
            phone: '123-456-7890'
        };

        // Insert the sample user into the collection
        const result = await collection.insertOne(sampleUser);
        console.log(`User inserted with ID: ${result.insertedId}`);
    } catch (error) {
        console.error('Error connecting to MongoDB or inserting user:', error);
    } finally {
        // Close the MongoDB connection
        await client.close();
        console.log('MongoDB connection closed');
    }
}

run();