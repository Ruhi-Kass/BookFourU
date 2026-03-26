require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cookieParser = require("cookie-parser");
const multer = require('multer');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) { fs.mkdirSync(uploadsDir); }

// Multer config for book image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E6) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

const app = express();
app.use(cookieParser());

const port = 3000;

// ==========================================
//  PASSWORD HASHING
// ==========================================
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// ==========================================
//  AI CLIENT (Google Gemini)
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// ==========================================
//  MONGODB CONNECTION
// ==========================================
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = 'book4u';
const mongoClient = new MongoClient(uri);
let db;

let dbInitialized = false;
async function connectDB() {
    try {
        if (!db) {
            console.log('Connecting to MongoDB...');
            await mongoClient.connect();
            db = mongoClient.db(dbName);
            console.log('Connected successfully to MongoDB');

            // Ensure initialization happens once per instance
            if (!dbInitialized) {
                await initDB();
                dbInitialized = true;
            }
        }
        return db;
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        throw err;
    }
}

async function getCol(name) {
    await connectDB();
    return db.collection(name);
}

// ==========================================
//  MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname), { index: false }));

// ==========================================
//  DATABASE INITIALIZATION
// ==========================================
async function initDB() {
    try {
        // We assume connectDB or mongoClient is ready since this is called from connectDB
        const database = mongoClient.db(dbName);

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
                // 📚 EDUCATIONAL (3 Books)
                { bookId: '1', title: 'Learning Python', author: 'Sarah J.', category: 'educational', price: 14.99, pages: 400, description: 'Master Python from scratch.', image: 'assets/book1.jpg' },
                { bookId: '2', title: 'Mastering Linux', author: 'Linus T.', category: 'educational', price: 19.99, pages: 350, description: 'The ultimate guide to Linux systems.', image: 'assets/book2.jpg' },
                { bookId: '3', title: 'Web Development 101', author: 'Dev Team', category: 'educational', price: 12.99, pages: 280, description: 'Build your first website.', image: 'assets/book3.jpg' },

                // 📖 FICTION (3 Books)
                { bookId: '4', title: 'The Silent Forest', author: 'Emma Woods', category: 'fiction', price: 11.99, pages: 320, description: 'A thrilling mystery in the woods.', image: 'assets/book4.jpg' },
                { bookId: '5', title: 'Echoes of Time', author: 'Arthur C.', category: 'fiction', price: 15.50, pages: 410, description: 'A journey across different eras.', image: 'assets/book5.jpg' },
                { bookId: '6', title: 'The Last Hero', author: 'Jack Black', category: 'fiction', price: 13.99, pages: 290, description: 'An epic fantasy adventure.', image: 'assets/book6.jpg' },

                // 📕 NON-FICTION (3 Books)
                { bookId: '7', title: 'History Uncovered', author: 'Robert B.', category: 'non-fiction', price: 16.99, pages: 380, description: 'Untold stories from the past.', image: 'assets/book7.jpg' },
                { bookId: '8', title: 'Atomic Habits', author: 'James Clear', category: 'non-fiction', price: 18.00, pages: 320, description: 'Build good habits and break bad ones.', image: 'assets/book8.jpg' },
                { bookId: '9', title: 'Deep Work', author: 'Cal Newport', category: 'non-fiction', price: 17.50, pages: 300, description: 'Rules for focused success.', image: 'assets/book9.jpg' },

                // 🎌 anime mangas (3 Books)
                { bookId: '10', title: 'Jujutsu Battles Vol 1', author: 'Gege A.', category: 'anime mangas', price: 9.99, pages: 200, description: 'Curses, sorcerers, and epic fights.', image: 'assets/book10.jpg' },
                { bookId: '11', title: 'Ninja Chronicles', author: 'Masashi K.', category: 'anime mangas', price: 8.99, pages: 190, description: 'The journey of a young ninja.', image: 'assets/book11.jpg' },
                { bookId: '12', title: 'Hero Academy', author: 'Kohei H.', category: 'anime mangas', price: 10.50, pages: 210, description: 'A world where everyone has superpowers.', image: 'assets/book12.jpg' }
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
//  AI CHATBOT (Powered by Gemini + Live Database)
// ==========================================
app.post('/chat', async (req, res) => {
    const userMessage = req.body.message;
    const pageContext = req.body.context || "General Page";

    if (!userMessage) return res.status(400).json({ reply: "Please say something!" });

    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ reply: "AI not configured." });
        }

        await connectDB();
        const booksCollection = await getCol('books');
        const liveBooks = await booksCollection.find({}).toArray();

        const bookListString = liveBooks.map(book =>
            `- ${book.title} by ${book.author} (Category: ${book.category}, Price: $${book.price})`
        ).join('\n');

        const systemInstruction = `
        You are the official, friendly AI shopping assistant for 'BOOK4U'.

        YOUR LIVE INVENTORY (Do not make up books, only recommend from this list):
        ${bookListString}

        YOUR STRICT RULES:
        1. BE PROACTIVE: If a user wants a recommendation but doesn't specify a genre, ask them: "What kind of genres are you usually interested in?"
        2. CONCISE: Keep your answers brief and friendly (2-3 sentences max).
        3. GUARDRAILS: Only answer questions related to books, reading, or the BOOK4U website.

        The user is currently looking at this context/page: ${pageContext}.
        `;

        const prompt = `${systemInstruction}\n\nUser asks: ${userMessage}`;

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;

        res.json({ reply: response.text() });

    } catch (error) {
        console.error("Gemini AI Error:", error.message);
        res.status(500).json({ reply: "Error connecting to AI." });
    }
});

// ==========================================
//  STATS ENDPOINT
// ==========================================
app.get('/api/stats', async (req, res) => {
    try {
        await connectDB();
        const userCount = await getCol('users').countDocuments({ accountType: { $exists: true } });
        const bookCount = await getCol('books').countDocuments();
        const cartCount = await getCol('carts').countDocuments();
        res.json({ success: true, userCount, bookCount, cartCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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
        const { fullname, username, email, address, password, confirmPassword, accountType, storeName, paymentPreference } = req.body;

        // Validation
        if (!fullname || !username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
        }

        if (!accountType || (accountType !== 'buyer' && accountType !== 'seller')) {
            return res.status(400).json({ success: false, message: 'Invalid account type' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        const hashedPw = hashPassword(password);
        const users = getCol('users');

        const newUser = {
            fullname: fullname.trim(),
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            address: (address || '').trim(),
            password: hashedPw,
            accountType,
            storeName: accountType === 'seller' ? (storeName || '').trim() || null : null,
            paymentPreference: accountType === 'seller' ? (paymentPreference || 'paypal') : null,
            cartBookCount: 0,
            viewedCategories: [],
            createdAt: new Date().toISOString()
        };

        const result = await users.insertOne(newUser);
        const userId = result.insertedId.toString();

        // Set cookies for user session (7 days)
        res.cookie("userId", userId, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie("userType", accountType, {
            httpOnly: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie("userName", newUser.fullname, {
            httpOnly: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            user: {
                id: userId,
                fullname: newUser.fullname,
                username: newUser.username,
                email: newUser.email,
                accountType: newUser.accountType,
                storeName: newUser.storeName
            }
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

        if (!user.accountType) {
            return res.status(401).json({ success: false, message: 'This account was created before the new system. Please sign up again.' });
        }

        if (user.password !== hashPassword(password)) {
            return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
        }

        // Get user's cart from carts collection
        const cartItems = await getCol('carts').find({ userId: user._id.toString() }).toArray();
        const cartCount = cartItems.length;

        // Set session cookies
        const userId = user._id.toString();
        res.cookie("userId", userId, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie("userType", user.accountType, {
            httpOnly: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie("userName", user.fullname, {
            httpOnly: false,
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: userId,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                accountType: user.accountType,
                storeName: user.storeName || null,
                cartBookCount: cartCount
            },
            // Send cart items so client can restore them
            cartItems: cartItems.map(item => ({
                dbId: item._id.toString(),
                id: item.bookId,
                title: item.bookTitle,
                price: item.bookPrice,
                category: item.bookCategory
            }))
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// ==========================================
//  AUTH: LOGOUT
// ==========================================
app.post('/api/logout', (req, res) => {
    res.clearCookie('userId');
    res.clearCookie('userType');
    res.clearCookie('userName');
    res.json({ success: true, message: 'Logged out' });
});

// ==========================================
//  PROFILE (get current user info from cookie)
// ==========================================
app.get('/api/profile', async (req, res) => {
    try {
        await connectDB();
        const userId = req.cookies.userId;
        if (!userId) return res.json({ success: false, message: 'Not logged in' });

        let user;
        try {
            user = await getCol('users').findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
        } catch {
            return res.json({ success: false, message: 'Invalid session' });
        }

        if (!user) return res.json({ success: false, message: 'User not found' });

        const cartItems = await getCol('carts').find({ userId }).toArray();

        res.json({
            success: true,
            user: {
                id: userId,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                accountType: user.accountType,
                storeName: user.storeName || null,
                cartBookCount: cartItems.length
            },
            cartItems: cartItems.map(item => ({
                dbId: item._id.toString(),
                id: item.bookId,
                title: item.bookTitle,
                price: item.bookPrice,
                category: item.bookCategory
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
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

        // Check if already in cart
        const existing = await getCol('carts').findOne({ userId, bookId });
        if (existing) {
            const cartCount = await getCol('carts').countDocuments({ userId });
            return res.json({ success: true, message: 'Already in cart', cartCount });
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
        await getCol('users').updateOne({ _id: new ObjectId(userId) }, { $inc: { cartBookCount: 1 } });

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
            await getCol('users').updateOne({ _id: new ObjectId(userId) }, { $inc: { cartBookCount: -1 } });
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
        await getCol('users').updateOne({ _id: new ObjectId(userId) }, { $set: { cartBookCount: 0 } });
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
            await getCol('users').updateOne({ _id: new ObjectId(userId) }, { $set: { cartBookCount: 0 } });
        }

        res.json({ success: true, message: 'Purchase confirmed!', transactionId });
    } catch (err) {
        console.error('Purchase error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  SELLER: POST A BOOK
// ==========================================
app.post('/api/seller/post-book', upload.single('bookImage'), async (req, res) => {
    try {
        await connectDB();
        const userId = req.cookies.userId;
        if (!userId) return res.status(401).json({ success: false, message: 'Not logged in' });

        let user;
        try {
            user = await getCol('users').findOne({ _id: new ObjectId(userId) });
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        if (!user || user.accountType !== 'seller') {
            return res.status(403).json({ success: false, message: 'Only sellers can post books' });
        }

        const { title, author, description, price, category, imageUrl, image, status, paymentMethod } = req.body;
        if (!title || !price || !category) {
            return res.status(400).json({ success: false, message: 'Title, price, and category are required.' });
        }

        // Auto-generate bookId
        const lastBook = await getCol('books').find({}).sort({ _id: -1 }).limit(1).toArray();
        const lastNumericId = lastBook.length ? (parseInt(lastBook[0].bookId) || 100) : 100;
        const bookId = String(lastNumericId + 1);

        const newBook = {
            bookId,
            title: title.trim(),
            author: (author || user.fullname).trim(),
            price: parseFloat(price),
            category: (category || 'general').toLowerCase(),
            description: (description || '').trim(),
            imageUrl: req.file ? '/uploads/' + req.file.filename : (imageUrl || image || '').trim(),
            image: req.file ? '/uploads/' + req.file.filename : (imageUrl || image || '').trim(),
            status: status || 'In Stock',
            sellerId: userId,
            sellerName: user.fullname,
            storeName: user.storeName || null,
            paymentMethod: paymentMethod || user.paymentPreference || 'paypal',
            postedAt: new Date().toISOString(),
            isSellerBook: true
        };

        await getCol('books').insertOne(newBook);

        res.status(201).json({ success: true, message: 'Book posted successfully!', book: newBook });
    } catch (err) {
        console.error('Seller post book error:', err.message);
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

// Admin Login
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
//  TRACK BOOK VIEW
// ==========================================
app.post("/api/track-view", async (req, res) => {
    try {
        await connectDB();

        const { category } = req.body;
        const userId = req.cookies.userId;

        if (!category || !userId) {
            return res.json({ success: false });
        }

        try {
            await getCol('users').updateOne({ _id: new ObjectId(userId) }, { $push: { viewedCategories: category } });
        } catch {
            // ignore if userId is invalid ObjectId
        }

        res.json({ success: true });

    } catch (err) {
        console.error("Track view error:", err.message);
        res.status(500).json({ success: false });
    }
});

// ==========================================
//  RECOMMEND BOOKS
// ==========================================
app.get("/api/recommendations", async (req, res) => {
    try {
        await connectDB();

        const userId = req.cookies.userId;
        if (!userId) return res.json({ books: [] });

        let user;
        try {
            user = await getCol('users').findOne({ _id: new ObjectId(userId) });
        } catch {
            return res.json({ books: [] });
        }

        if (!user || !user.viewedCategories || user.viewedCategories.length === 0) {
            return res.json({ books: [] });
        }

        const counts = {};
        user.viewedCategories.forEach(cat => {
            counts[cat] = (counts[cat] || 0) + 1;
        });

        const favoriteCategory = Object.keys(counts)
            .reduce((a, b) => counts[a] > counts[b] ? a : b);

        const books = await getCol('books')
            .find({ category: favoriteCategory })
            .limit(4)
            .toArray();

        res.json({ books });

    } catch (err) {
        console.error("Recommendation error:", err.message);
        res.status(500).json({ books: [] });
    }
});

// ==========================================
//  SELL BOOKS PAGE ACCESS CONTROL
// ==========================================
app.get('/sell_books', async (req, res) => {
    try {
        await connectDB();

        const userId = req.cookies?.userId;
        if (!userId) {
            return res.redirect('/login.html'); // Redirect to login if not authenticated
        }

        const user = await getCol('users').findOne({ _id: new ObjectId(userId) });
        if (!user || user.accountType !== 'seller') {
            return res.status(403).send('Access denied. Only sellers can access this page.');
        }

        res.sendFile(path.join(__dirname, 'sell_books.html'));
    } catch (err) {
        console.error('Sell Books error:', err.message);
        res.status(500).send('Server error');
    }
});

// Alias: /api/sell-book -> reuse /api/seller/post-book logic for sell_books.html form
app.post('/api/sell-book', upload.single('bookImage'), async (req, res) => {
    try {
        await connectDB();
        const userId = req.cookies.userId;
        if (!userId) return res.status(401).json({ success: false, message: 'Not logged in' });

        let user;
        try {
            user = await getCol('users').findOne({ _id: new ObjectId(userId) });
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid session' });
        }

        if (!user || user.accountType !== 'seller') {
            return res.status(403).json({ success: false, message: 'Only sellers can post books' });
        }

        // Support both JSON and form-urlencoded field names
        const title = req.body.title || req.body.bookTitle;
        const author = req.body.author || req.body.bookAuthor;
        const description = req.body.description || req.body.bookDescription;
        const price = req.body.price || req.body.bookPrice;
        const category = req.body.category || 'general';
        const imageUrl = req.body.imageUrl || req.body.image || '';
        const status = req.body.status || 'In Stock';
        const paymentMethod = req.body.paymentMethod || user.paymentPreference || 'paypal';

        if (!title || !price) {
            return res.status(400).json({ success: false, message: 'Title and price are required.' });
        }

        const lastBook = await getCol('books').find({}).sort({ _id: -1 }).limit(1).toArray();
        const lastNumericId = lastBook.length ? (parseInt(lastBook[0].bookId) || 100) : 100;
        const bookId = String(lastNumericId + 1);

        const newBook = {
            bookId,
            title: title.trim(),
            author: (author || user.fullname).trim(),
            price: parseFloat(price),
            category: (category || 'general').toLowerCase(),
            description: (description || '').trim(),
            imageUrl: req.file ? '/uploads/' + req.file.filename : (imageUrl || '').trim(),
            image: req.file ? '/uploads/' + req.file.filename : (imageUrl || '').trim(),
            status: status || 'In Stock',
            sellerId: userId,
            sellerName: user.fullname,
            storeName: user.storeName || null,
            paymentMethod: paymentMethod,
            postedAt: new Date().toISOString(),
            isSellerBook: true
        };

        await getCol('books').insertOne(newBook);

        res.status(201).json({ success: true, message: 'Book posted successfully!', book: newBook });
    } catch (err) {
        console.error('Sell book error:', err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  LIVE STATS API
// ==========================================
app.get('/api/stats', async (req, res) => {
    try {
        await connectDB();
        const userCount = await getCol('users').countDocuments();
        const bookCount = await getCol('books').countDocuments();
        const cartCount = await getCol('carts').countDocuments();

        res.json({
            success: true,
            userCount,
            bookCount,
            cartCount
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
//  DEFAULT LANDING PAGE
// ==========================================
app.get('/', async (req, res) => {
    try {
        await connectDB();

        let userId = req.cookies?.userId;

        if (!userId) {
            // Create a guest session
            const result = await getCol('users').insertOne({
                viewedCategories: [],
                createdAt: new Date().toISOString()
            });

            userId = result.insertedId.toString();

            res.cookie("userId", userId, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
        }

        res.sendFile(path.join(__dirname, 'index.html'));
    } catch (err) {
        console.error("Home error:", err.message);
        res.status(500).send("Server error");
    }
});

// ==========================================
//  START SERVER (Local Only)
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    initDB().then(() => {
        app.listen(port, () => {
            console.log(`\n🚀 Book4U Server running at http://localhost:${port}`);
        });
    }).catch(err => {
        console.error('Failed to start server:', err.message);
    });
} else {
    // In production (Vercel), we initialize on first request or here
    // But we don't call app.listen()
    connectDB().catch(err => console.error("Initial DB connect failed:", err.message));
}

// Export for Vercel
module.exports = app;