const url = 'mongodb://username:password@localhost:27017';const { MongoClient } = require('mongodb');

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'Book4U';

async function main() {
  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log('Connected successfully to MongoDB server');

    const db = client.db(dbName);

    // Create a "user" collection and insert sample data
    const usersCollection = db.collection('user');

    const sampleUsers = [
      { name: 'John Doe', email: 'john.doe@example.com', age: 30, cartId: null },
      { name: 'Jane Smith', email: 'jane.smith@example.com', age: 25, cartId: null },
    ];

    const result = await usersCollection.insertMany(sampleUsers);
    console.log(`${result.insertedCount} users inserted successfully.`);

    // Create a "shop" collection for storing book details
    const shopCollection = db.collection('shop');

    const sampleBooks = [
      { title: 'Book A', category: 'Fiction', price: 10.99 },
      { title: 'Book B', category: 'Anime', price: 15.99 },
    ];

    const shopResult = await shopCollection.insertMany(sampleBooks);
    console.log(`${shopResult.insertedCount} books inserted into shop successfully.`);

    // Create a "cart" collection for tracking user carts
    const cartCollection = db.collection('cart');

    const sampleCarts = [
      { userId: 'user1', books: [{ title: 'Book A', quantity: 1 }] },
      { userId: 'user2', books: [{ title: 'Book B', quantity: 2 }] },
    ];

    const cartResult = await cartCollection.insertMany(sampleCarts);
    console.log(`${cartResult.insertedCount} carts inserted successfully.`);

    // Update user collection to reference cart IDs
    const updatedUsers = await Promise.all(
      sampleCarts.map(async (cart, index) => {
        const user = sampleUsers[index];
        const cartId = cartResult.insertedIds[index];
        return usersCollection.updateOne(
          { email: user.email },
          { $set: { cartId: cartId } }
        );
      })
    );

    console.log(`${updatedUsers.length} users updated with cart references.`);
  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    // Close the connection
    await client.close();
  }
}

main();