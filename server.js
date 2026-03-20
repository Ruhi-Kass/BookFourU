require('dotenv').config();
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const crypto = require('crypto');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cookieParser = require("cookie-parser");

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
app.use(express.static(path.join(__dirname), { index: false }));

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
                // 📚 EDUCATIONAL (3 Books)
                { bookId: '1', title: 'Learning Python', author: 'Sarah J.', category: 'educational', price: 14.99, pages: 400, description: 'Master Python from scratch.' },
                { bookId: '2', title: 'Mastering Linux', author: 'Linus T.', category: 'educational', price: 19.99, pages: 350, description: 'The ultimate guide to Linux systems.' },
                { bookId: '3', title: 'Web Development 101', author: 'Dev Team', category: 'educational', price: 12.99, pages: 280, description: 'Build your first website.' },

                // 📖 FICTION (3 Books)
                { bookId: '4', title: 'The Silent Forest', author: 'Emma Woods', category: 'fiction', price: 11.99, pages: 320, description: 'A thrilling mystery in the woods.' },
                { bookId: '5', title: 'Echoes of Time', author: 'Arthur C.', category: 'fiction', price: 15.50, pages: 410, description: 'A journey across different eras.' },
                { bookId: '6', title: 'The Last Hero', author: 'Jack Black', category: 'fiction', price: 13.99, pages: 290, description: 'An epic fantasy adventure.' },

                // 📕 NON-FICTION (3 Books)
                { bookId: '7', title: 'History Uncovered', author: 'Robert B.', category: 'non-fiction', price: 16.99, pages: 380, description: 'Untold stories from the past.' },
                { bookId: '8', title: 'Atomic Habits', author: 'James Clear', category: 'non-fiction', price: 18.00, pages: 320, description: 'Build good habits and break bad ones.' },
                { bookId: '9', title: 'Deep Work', author: 'Cal Newport', category: 'non-fiction', price: 17.50, pages: 300, description: 'Rules for focused success.' },

                // 🎌 anime mangas (3 Books)
                { bookId: '10', title: 'Jujutsu Battles Vol 1', author: 'Gege A.', category: 'anime mangas', price: 9.99, pages: 200, description: 'Curses, sorcerers, and epic fights.' },
                { bookId: '11', title: 'Ninja Chronicles', author: 'Masashi K.', category: 'anime mangas', price: 8.99, pages: 190, description: 'The journey of a young ninja.' },
                { bookId: '12', title: 'Hero Academy', author: 'Kohei H.', category: 'anime mangas', price: 10.50, pages: 210, description: 'A world where everyone has superpowers.' }
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
app.post('/chat', async(req, res) => {
    const userMessage = req.body.message;
    const pageContext = req.body.context || "General Page";

    if (!userMessage) return res.status(400).json({ reply: "Please say something!" });

    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({ reply: "AI not configured." });
        }

        // --- STEP 1: FETCH LIVE BOOKS FROM MONGODB ---
        await connectDB(); // Make sure database is connected
        const liveBooks = await getCol('books').find({}).toArray();

        // Format the books into a readable list for the AI (e.g., "- The Great Adventure ($9.99)")
        const bookListString = liveBooks.map(book =>
            `- ${book.title} by ${book.author} (Category: ${book.category}, Price: $${book.price})`
        ).join('\n');
        // ---------------------------------------------

        // --- STEP 2: BUILD THE SMART PROMPT ---
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

        // --- STEP 3: SEND TO GEMINI ---
        const result = await aiModel.generateContent(prompt);
        const response = await result.response;

        res.json({ reply: response.text() });

    } catch (error) {
        console.error("Gemini AI Error:", error.message);
        res.status(500).json({ reply: "Error connecting to AI." });
    }
});

// ==========================================
//  BOOKS ENDPOINTS
// ==========================================
app.get('/api/books', async(req, res) => {
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
app.post('/api/register', async(req, res) => {
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
            viewedCategories: [],
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
app.post('/api/login', async(req, res) => {
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
app.post('/api/cart/add', async(req, res) => {
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
app.get('/api/cart/:userId', async(req, res) => {
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
app.delete('/api/cart/remove/:itemId', async(req, res) => {
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
app.delete('/api/cart/clear/:userId', async(req, res) => {
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
app.post('/api/purchase', async(req, res) => {
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
//  USERS LIST (for admin visibility)
// ==========================================
app.get('/api/users', async(req, res) => {
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
app.post('/api/admin/login', async(req, res) => {
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
app.post('/api/admin/books', requireAdmin, async(req, res) => {
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
app.delete('/api/admin/books/:id', requireAdmin, async(req, res) => {
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

app.get('/', async(req, res) => {
    try {
        await connectDB();

        let userId = req.cookies.userId;

        if (!userId) {
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
app.get('/', async(req, res) => {
    try {
        await connectDB();

        console.log("HOME ROUTE HIT"); // 👈 ADD THIS

        let userId = req.cookies?.userId;

        if (!userId) {
            console.log("CREATING COOKIE"); // 👈 ADD THIS

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
app.get('/', async(req, res) => {
    try {
        await connectDB();

        console.log("HOME ROUTE HIT"); // 👈 ADD THIS

        let userId = req.cookies?.userId;

        if (!userId) {
            console.log("CREATING COOKIE"); // 👈 ADD THIS

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
//  TRACK BOOK VIEW
// ==========================================
app.post("/api/track-view", async(req, res) => {
    try {
        await connectDB();

        const { category } = req.body;
        const userId = req.cookies.userId;

        if (!category || !userId) {
            return res.json({ success: false });
        }

        await getCol('users').updateOne({ _id: new ObjectId(userId) }, { $push: { viewedCategories: category } });

        res.json({ success: true });

    } catch (err) {
        console.error("Track view error:", err.message);
        res.status(500).json({ success: false });
    }
});
// ==========================================
//  RECOMMEND BOOKS
// ==========================================
app.get("/api/recommendations", async(req, res) => {
    try {
        await connectDB();

        const userId = req.cookies.userId;
        if (!userId) return res.json({ books: [] });

        const user = await getCol('users').findOne({ _id: new ObjectId(userId) });

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