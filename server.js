require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');

const app = express();
const port = 3000;

// ==========================================
//  PASSWORD HASHING
// ==========================================
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// ==========================================
//  AI CLIENT (xAI)
// ==========================================
let aiClient;
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROQ_API_KEY;
if (XAI_API_KEY) {
    aiClient = new OpenAI({ apiKey: XAI_API_KEY, baseURL: "https://api.x.ai/v1" });
} else {
    console.warn("WARNING: XAI_API_KEY missing. AI features disabled.");
}

// ==========================================
//  MONGODB CONNECTION
// ==========================================
const uri = 'mongodb://127.0.0.1:27017';
const dbName = 'book4u';
const mongoClient = new MongoClient(uri);
let db;

async function connectDB() {
    if (!db) {
        await mongoClient.connect();
        db = mongoClient.db(dbName);
        console.log('Connected to MongoDB');
    }
    return db;
}

function getCol(name) {
    return db.collection(name);
}

// ==========================================
//  MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
//  DATABASE INITIALIZATION
// ==========================================
async function initDB() {
    try {
        await connectDB();

        // Ensure indexes
        await getCol('users').createIndex({ email: 1 }, { unique: true });
        await getCol('users').createIndex({ username: 1 }, { unique: true, sparse: true });
        await getCol('carts').createIndex({ userId: 1 });
        await getCol('books').createIndex({ bookId: 1 }, { unique: true });
        await getCol('admins').createIndex({ username: 1 }, { unique: true });

        // Seed books collection if empty
        const bookCount = await getCol('books').countDocuments();
        if (bookCount === 0) {
            const books = [
                { bookId: '1', title: 'The Great Adventure', author: 'John Smith', category: 'fiction', price: 9.99, originalPrice: 14.99, badge: 'BESTSELLER', pages: 324, description: 'An epic tale of courage and discovery.' },
                { bookId: '2', title: 'Learning Python', author: 'Sarah Johnson', category: 'educational', price: 14.99, originalPrice: 24.99, pages: 456, description: 'Master Python from basics to advanced.' },
                { bookId: '3', title: 'Mystery Island', author: 'Mike Davis', category: 'fiction', price: 19.99, badge: 'NEW', pages: 298, description: 'A gripping mystery thriller set on a secluded island.' },
                { bookId: '4', title: 'Science Explorer', author: 'Emily Chen', category: 'educational', price: 24.99, originalPrice: 34.99, pages: 212, description: 'Discover the wonders of science.' },
                { bookId: '5', title: 'History Uncovered', author: 'Robert Brown', category: 'non-fiction', price: 12.99, originalPrice: 19.99, badge: 'SALE', pages: 387, description: 'Explore untold stories from history.' },
                { bookId: '6', title: 'Anime Legends Vol.1', author: 'Kenji Tanaka', category: 'anime', price: 16.99, badge: 'NEW', pages: 220, description: 'A stunning manga-style adventure across alternate worlds.' },
                { bookId: '7', title: 'Attack on Knowledge', author: 'Hiro Matsuda', category: 'anime', price: 14.50, originalPrice: 18.99, pages: 200, description: 'Action-packed anime universe book collection.' },
                { bookId: '8', title: 'Coding 101', author: 'Jane Doe', category: 'educational', price: 19.99, pages: 310, description: 'Beginner-friendly coding guide for everyone.' },
            ];
            await getCol('books').insertMany(books);
            console.log('Books collection seeded.');
        }

        // Seed default admin if admins collection is empty
        const adminCount = await getCol('admins').countDocuments();
        if (adminCount === 0) {
            await getCol('admins').insertOne({
                username: 'admin',
                password: hashPassword('book4u@admin2024'),
                createdAt: new Date()
            });
            console.log('Default admin account created.');
        }

        console.log('DB initialization complete.');
    } catch (err) {
        console.error('DB init error:', err.message);
    }
}

// ==========================================
//  AI CHATBOT
// ==========================================
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ reply: "Please say something!" });
    try {
        if (!aiClient) return res.status(503).json({ reply: "AI not configured (missing API key)." });
        const completion = await aiClient.chat.completions.create({
            messages: [
                { role: "system", content: "You are a helpful assistant for BOOK4U bookstore. Answer in 2-3 sentences max. Be concise and friendly." },
                { role: "user", content: userMessage }
            ],
            model: "grok-beta",
        });
        res.json({ reply: completion.choices[0]?.message?.content || "I'm not sure." });
    } catch (error) {
        console.error("AI Error:", error.message);
        res.status(500).json({ reply: "Error connecting to AI." });
    }
});

// ==========================================
//  USER STATS
// ==========================================
app.get('/api/stats', async (req, res) => {
    try {
        await connectDB();
        const userCount = await getCol('users').countDocuments();
        const bookCount = await getCol('books').countDocuments();
        const cartCount = await getCol('carts').countDocuments();
        res.json({ userCount, bookCount, cartCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
//  BOOKS ENDPOINTS
// ==========================================
app.get('/api/books', async (req, res) => {
    try {
        await connectDB();
        const books = await getCol('books').find({}).toArray();
        res.json({ success: true, books });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  AUTH: REGISTER
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        await connectDB();
        const { fullname, username, email, address, password, confirmPassword } = req.body;

        // Validation
        if (!fullname || !username || !email || !address || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        if (fullname.trim().length < 4) {
            return res.status(400).json({ success: false, message: 'Full name must be at least 4 characters' });
        }
        if (username.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email format' });
        }

        const users = getCol('users');

        // Check email uniqueness
        const existingEmail = await users.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'Email already registered. Please login instead.' });
        }

        // Check username uniqueness
        const existingUsername = await users.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(400).json({ success: false, message: 'Username already taken. Please choose another.' });
        }

        // Ensure no two users have the same password
        const hashedPw = hashPassword(password);
        const existingPassword = await users.findOne({ password: hashedPw });
        if (existingPassword) {
            return res.status(400).json({ success: false, message: 'Password already in use by another account. Please choose a different password.' });
        }

        const newUser = {
            fullname: fullname.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            address: address.trim(),
            password: hashedPw,
            cartBookCount: 0,
            createdAt: new Date().toISOString()
        };

        const result = await users.insertOne(newUser);
        const userId = result.insertedId.toString();

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            user: { id: userId, fullname: newUser.fullname, username: newUser.username, email: newUser.email }
        });

    } catch (error) {
        console.error('Register error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Email or username already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// ==========================================
//  AUTH: LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        await connectDB();
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await getCol('users').findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, message: 'No account found with this email. Please sign up first.' });
        }

        if (user.password !== hashPassword(password)) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
        }

        // Get user's cart count from carts collection
        const cartCount = await getCol('carts').countDocuments({ userId: user._id.toString() });

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user._id.toString(),
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                cartBookCount: cartCount
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// ==========================================
//  CART ENDPOINTS
// ==========================================

// Add book to cart
app.post('/api/cart/add', async (req, res) => {
    try {
        await connectDB();
        const { userId, bookId, bookTitle, bookCategory, bookPrice } = req.body;

        if (!userId || !bookId || !bookTitle || bookPrice === undefined) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const cartItem = {
            userId,
            bookId,
            bookTitle,
            bookCategory: bookCategory || 'general',
            bookPrice: parseFloat(bookPrice),
            addedAt: new Date().toISOString()
        };

        await getCol('carts').insertOne(cartItem);

        // Update user's cartBookCount
        await getCol('users').updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { cartBookCount: 1 } }
        );

        // Get updated cart count
        const cartCount = await getCol('carts').countDocuments({ userId });

        res.json({ success: true, message: 'Book added to cart', cartCount });
    } catch (err) {
        console.error('Add to cart error:', err.message);
        res.status(500).json({ success: false, message: 'Server error adding to cart' });
    }
});

// Get user's cart
app.get('/api/cart/:userId', async (req, res) => {
    try {
        await connectDB();
        const { userId } = req.params;
        const cartItems = await getCol('carts').find({ userId }).toArray();
        const total = cartItems.reduce((sum, item) => sum + item.bookPrice, 0);
        res.json({ success: true, cartItems, total: total.toFixed(2), count: cartItems.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Remove item from cart
app.delete('/api/cart/remove/:itemId', async (req, res) => {
    try {
        await connectDB();
        const { itemId } = req.params;
        const { userId } = req.body;

        const result = await getCol('carts').deleteOne({ _id: new ObjectId(itemId) });

        if (result.deletedCount > 0 && userId) {
            await getCol('users').updateOne(
                { _id: new ObjectId(userId) },
                { $inc: { cartBookCount: -1 } }
            );
        }

        res.json({ success: true, message: 'Item removed from cart' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Clear entire cart (after checkout)
app.delete('/api/cart/clear/:userId', async (req, res) => {
    try {
        await connectDB();
        const { userId } = req.params;
        await getCol('carts').deleteMany({ userId });
        await getCol('users').updateOne(
            { _id: new ObjectId(userId) },
            { $set: { cartBookCount: 0 } }
        );
        res.json({ success: true, message: 'Cart cleared' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  PURCHASE / TRANSACTION
// ==========================================
app.post('/api/purchase', async (req, res) => {
    try {
        await connectDB();
        const { userId, transactionId, cartItems, total } = req.body;

        if (!transactionId || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Transaction ID and cart items are required' });
        }

        const purchase = {
            userId: userId || 'guest',
            transactionId,
            books: cartItems,
            totalAmount: parseFloat(total),
            purchasedAt: new Date().toISOString(),
            status: 'confirmed'
        };

        await getCol('purchases').insertOne(purchase);

        // Clear user's cart in DB if logged in
        if (userId) {
            await getCol('carts').deleteMany({ userId });
            await getCol('users').updateOne(
                { _id: new ObjectId(userId) },
                { $set: { cartBookCount: 0 } }
            );
        }

        res.json({ success: true, message: 'Purchase confirmed!', transactionId });
    } catch (err) {
        console.error('Purchase error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  USERS LIST (for admin visibility)
// ==========================================
app.get('/api/users', async (req, res) => {
    try {
        await connectDB();
        const users = await getCol('users').find({}, { projection: { password: 0 } }).toArray();
        res.json({ success: true, users, count: users.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  ADMIN API
// ==========================================
const ADMIN_KEY = 'book4u@admin2024';
function requireAdmin(req, res, next) {
    if (req.headers['x-admin-key'] !== ADMIN_KEY) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}

// Admin Login (verifies against admins collection in DB)
app.post('/api/admin/login', async (req, res) => {
    try {
        await connectDB();
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }
        const admin = await getCol('admins').findOne({ username: username.trim().toLowerCase() });
        if (!admin || admin.password !== hashPassword(password)) {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
        }
        // Return the shared admin key so subsequent requests can authenticate
        res.json({ success: true, message: 'Admin login successful.', adminKey: ADMIN_KEY });
    } catch (err) {
        console.error('Admin login error:', err.message);
        res.status(500).json({ success: false, message: 'Server error during admin login.' });
    }
});

// Add a book (admin only)
app.post('/api/admin/books', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const { title, author, price, origPrice, category, pages, badge, imageUrl, image, description } = req.body;
        if (!title || !price || !category) {
            return res.status(400).json({ success: false, message: 'title, price, and category are required.' });
        }
        // auto-generate bookId
        const lastBook = await getCol('books').find({}).sort({ bookId: -1 }).limit(1).toArray();
        const lastId = lastBook.length ? (parseInt(lastBook[0].bookId) || 0) : 0;
        const bookId = String(lastId + 1);

        const newBook = {
            bookId,
            title: title.trim(),
            author: (author || 'Unknown').trim(),
            price: parseFloat(price),
            origPrice: origPrice ? parseFloat(origPrice) : null,
            category: category.toLowerCase(),
            pages: pages ? parseInt(pages) : null,
            badge: badge || null,
            imageUrl: (imageUrl || image || '').trim(),
            image: (imageUrl || image || '').trim(),
            description: (description || '').trim(),
            addedAt: new Date()
        };
        await getCol('books').insertOne(newBook);
        res.json({ success: true, message: 'Book added successfully!', book: newBook });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Delete a book (admin only)
app.delete('/api/admin/books/:id', requireAdmin, async (req, res) => {
    try {
        await connectDB();
        const { id } = req.params;
        let result;
        // Try ObjectId first, then bookId string
        try {
            result = await getCol('books').deleteOne({ _id: new ObjectId(id) });
        } catch {
            result = await getCol('books').deleteOne({ bookId: id });
        }
        if (result.deletedCount > 0) {
            res.json({ success: true, message: 'Book deleted.' });
        } else {
            res.status(404).json({ success: false, message: 'Book not found.' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  STATIC ROUTES
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index (1).html'));
});

// ==========================================
//  START SERVER
// ==========================================
initDB().then(() => {
    app.listen(port, () => {
        console.log(`\n🚀 Book4U Server running at http://localhost:${port}`);
        console.log(`📚 Collections: users, books, carts, purchases`);
        console.log(`✅ Authentication, Cart, and Shop APIs active\n`);
    });
}).catch(err => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
});