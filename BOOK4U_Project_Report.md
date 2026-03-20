# BOOK4U — Online Bookstore Web Application
## Project Report

**Student Name:** Ruhama Kassahun
**LinkedIn:** [linkedin.com/in/ruhama-kassahun-55506735b](https://www.linkedin.com/in/ruhama-kassahun-55506735b)
**Project Title:** BOOK4U – A Full-Stack Online Bookstore with AI Chat Support
**Submission Date:** March 2026

---

## 1. SUMMARY

BOOK4U is a fully functional, full-stack online bookstore web application developed using **Node.js**, **Express.js**, **MongoDB**, and vanilla **HTML/CSS/JavaScript**. The system allows users to browse a catalog of books, register and log in to personal accounts, add books to a shopping cart, and complete purchases through **PayPal integration**. An administrative panel is also provided, allowing authorized admins to manage the book catalog — adding or removing books in real time.

A standout feature of the platform is an integrated **AI-powered chatbot** built on the **xAI Grok model** (accessed through the OpenAI-compatible SDK), which assists users with book recommendations and general bookstore inquiries.

The application follows a **client-server architecture**: the frontend consists of static HTML pages styled with a single unified CSS file, while the backend exposes a RESTful API over HTTP that handles all business logic, authentication, and database operations. All sensitive user data — including passwords — is hashed using the SHA-256 algorithm before storage.

BOOK4U demonstrates how modern web technologies can be combined to create a seamless, secure, and dynamic e-commerce experience without relying on a heavy framework, making it approachable to build and easy to understand.

---

## 2. OBJECTIVE AND SCOPE

### Objective

The primary objective of BOOK4U is to develop a complete, end-to-end online bookstore platform that:

- Enables **users** to discover, explore, and purchase books online across different categories (Fiction, Educational, Non-Fiction, Anime).
- Provides **secure user authentication** — registration and login — with server-side password hashing.
- Implements a **persistent shopping cart** linked to each user's account in the database.
- Integrates **PayPal** as a payment gateway, allowing per-book and full-cart checkout.
- Offers an **admin panel** for authorized administrators to add new books and remove existing ones.
- Incorporates an **AI chatbot** to answer user queries about the bookstore in real time.

### Scope

| In Scope | Out of Scope |
|---|---|
| User registration and login | OAuth / social logins (Google, Facebook) |
| Book catalog with categories and prices | Book reviews and ratings by users |
| Shopping cart (add, remove, clear) | Advanced search and filtering |
| PayPal checkout integration | Physical inventory / warehouse management |
| Admin panel (add/delete books) | Multi-vendor / seller marketplace |
| AI chatbot (xAI Grok) | Multi-language support |
| Local MongoDB database | Cloud database deployment |

---

## 3. INTRODUCTION

### 3.1 Background

Online bookstores have transformed the way people access literature, educational material, and entertainment. Platforms like Amazon and Google Books have demonstrated that digital book retail is both viable and highly demanded. BOOK4U aims to implement a simplified but fully operational version of such a system, suitable for small-to-medium scale deployment.

### 3.2 Key Concepts

**Full-Stack Web Application:** An application where both the client-side (what the user sees) and the server-side (data processing, business logic) are developed together into a single cohesive system.

**RESTful API:** A design pattern for web services where the server exposes URLs (endpoints) that the client calls using standard HTTP methods: `GET`, `POST`, `DELETE`, etc.

**NoSQL Database (MongoDB):** MongoDB stores data as flexible JSON-like **documents** grouped into **collections** (equivalent to tables in SQL). Unlike relational databases, there is no fixed schema — each document can have different fields.

**Password Hashing:** Instead of storing a user's raw password, a one-way mathematical function (SHA-256) is applied to it. The result — the hash — is what gets stored. Even if the database is compromised, the original passwords cannot be recovered.

**AI Chatbot:** An AI language model (Grok, developed by xAI) is connected to the backend. When a user sends a message, the server forwards it to the xAI API and returns the AI's response to the user.

### 3.3 System Pages

| Page | File | Purpose |
|---|---|---|
| Home | `index (1).html` | Landing page with animated book elements |
| Shop | `shop.html` | Browse and add books to cart |
| My Cart | `mycart.html` | View cart, see total, and checkout via PayPal |
| Sign Up | `signup.html` | New user registration form |
| Login | `login.html` | Existing user login form |
| About | `about.html` | About the bookstore |
| Contact | `contact.html` | Contact form |
| Admin | `admin.html` | Admin panel to manage books |

---

## 4. HARDWARE & SOFTWARE USED

### 4.1 Hardware Requirements

| Component | Minimum Specification |
|---|---|
| Processor | Intel Core i3 or equivalent |
| RAM | 4 GB |
| Storage | 500 MB free disk space |
| Network | Internet connection (for PayPal & AI API) |
| Operating System | Windows 10 / macOS / Linux |

### 4.2 Software Used

#### Backend
| Software | Version | Role |
|---|---|---|
| **Node.js** | v18+ | JavaScript runtime environment |
| **Express.js** | v5.2.1 | HTTP web server and REST API framework |
| **MongoDB** | v7 (local) | NoSQL database for all data storage |
| **mongodb (driver)** | v7.0.0 | Node.js client library for MongoDB |
| **openai (SDK)** | v6.21.0 | OpenAI-compatible library used to call xAI Grok API |
| **dotenv** | v17.2.4 | Loads environment variables from `.env` file |
| **crypto** (built-in) | Node.js built-in | SHA-256 password hashing |

#### Frontend
| Technology | Role |
|---|---|
| **HTML5** | Structure of all web pages |
| **CSS3** (vanilla) | Styling, animations, responsive layout |
| **JavaScript (ES6+)** | Client-side logic, API calls using `fetch()` |
| **PayPal JS SDK** | In-page PayPal checkout button rendering |

#### Development Tools
| Tool | Purpose |
|---|---|
| **Visual Studio Code** | Code editor |
| **MongoDB Compass** | GUI to view and manage the MongoDB database |
| **Postman** (optional) | Testing API endpoints |

#### External Services
| Service | Purpose |
|---|---|
| **xAI Grok API** | AI chatbot responses (`grok-beta` model) |
| **PayPal** | Payment gateway for book purchases |

---

## 5. DATABASE: COLLECTIONS AND FIELDS

### Database Name: `book4u`
**Database Engine:** MongoDB (local instance on `mongodb://127.0.0.1:27017`)

---

### Collection 1: `users`

Stores registered customer accounts.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique MongoDB ID |
| `fullname` | String | User's full name (min 4 characters) |
| `username` | String | Unique username (min 3 characters, lowercase) |
| `email` | String | Unique email address (lowercase) |
| `address` | String | Delivery address |
| `password` | String | SHA-256 hashed password |
| `cartBookCount` | Number | Count of items currently in the user's cart |
| `createdAt` | String (ISO Date) | Account creation timestamp |

**Indexes:** Unique index on `email`; unique sparse index on `username`

---

### Collection 2: `books`

Stores the book catalog shown in the shop.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique MongoDB ID |
| `bookId` | String | Human-readable sequential ID (e.g., `"1"`, `"2"`) |
| `title` | String | Book title |
| `author` | String | Author name |
| `category` | String | Category: `fiction`, `educational`, `non-fiction`, `anime` |
| `price` | Number | Sale price in USD |
| `originalPrice` | Number | Original price (if on discount) |
| `badge` | String | Optional label: `BESTSELLER`, `NEW`, `SALE` |
| `pages` | Number | Number of pages |
| `description` | String | Short book description |
| `imageUrl` / `image` | String | URL to book cover image |
| `addedAt` | Date | Timestamp when book was added |

**Indexes:** Unique index on `bookId`

---

### Collection 3: `carts`

Stores individual cart items, one document per book per user.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique MongoDB ID |
| `userId` | String | References the `_id` of the user who owns this cart item |
| `bookId` | String | References the `bookId` of the book |
| `bookTitle` | String | Book title (denormalized for display) |
| `bookCategory` | String | Book category |
| `bookPrice` | Number | Price at time of adding to cart |
| `addedAt` | String (ISO Date) | Timestamp when item was added |

**Indexes:** Index on `userId`

---

### Collection 4: `purchases`

Records completed transactions after PayPal checkout.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique MongoDB ID |
| `userId` | String | User who made the purchase (`"guest"` if not logged in) |
| `transactionId` | String | PayPal transaction ID |
| `books` | Array | Array of purchased cart item objects |
| `totalAmount` | Number | Total amount paid |
| `purchasedAt` | String (ISO Date) | Purchase timestamp |
| `status` | String | Always `"confirmed"` after successful payment |

---

### Collection 5: `admins`

Stores admin accounts with hashed passwords.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated unique MongoDB ID |
| `username` | String | Admin username (default: `"admin"`) |
| `password` | String | SHA-256 hashed password |
| `createdAt` | Date | Timestamp when admin was created |

**Indexes:** Unique index on `username`

---

### Database Architecture Diagram

```
MongoDB: book4u
├── users        → Registered customers
├── books        → Book catalog (seeded with 8 books on first run)
├── carts        → Shopping cart items (linked to users by userId)
├── purchases    → Confirmed PayPal transactions
└── admins       → Admin accounts (1 default seeded on first run)
```

---

## 6. METHODOLOGY

### 6.1 Development Approach

BOOK4U was developed using an **iterative, feature-by-feature** development methodology. Each major feature was designed, implemented, tested, and integrated in sequence before moving on to the next.

**Phase 1 — Setup:**
- Initialized the Node.js project with `npm` and installed dependencies (`express`, `mongodb`, `openai`, `dotenv`).
- Set up the Express server with static file serving and JSON body parsing.
- Connected to a local MongoDB instance and wrote the `initDB()` function to automatically create collections, indexes, and seed initial data.

**Phase 2 — User Authentication:**
- Designed the `/api/register` endpoint with full validation (field presence, length, email format, uniqueness of email and username).
- Implemented SHA-256 password hashing using Node.js's built-in `crypto` module.
- Designed the `/api/login` endpoint to verify credentials and return user session data.

**Phase 3 — Book Catalog & Shopping Cart:**
- Connected the `shop.html` frontend to `/api/books` to dynamically render book cards from the database.
- Built cart API endpoints: add item, get cart, remove item, and clear cart.
- Cart items are stored persistently in MongoDB, so they survive page refreshes.

**Phase 4 — Checkout & PayPal Integration:**
- Integrated the PayPal JavaScript SDK on the cart page.
- On successful PayPal payment, the frontend calls `/api/purchase` with the `transactionId` and cart items to record the transaction and clear the cart.

**Phase 5 — Admin Panel:**
- Built `/api/admin/login` to authenticate admins against the `admins` collection.
- Protected admin routes (`POST /api/admin/books`, `DELETE /api/admin/books/:id`) with an API key header middleware (`requireAdmin`).
- The admin panel allows real-time book management without touching the database directly.

**Phase 6 — AI Chatbot:**
- Integrated the xAI Grok API using the OpenAI-compatible SDK.
- The `POST /chat` endpoint takes a user message, sends it to Grok with a system prompt defining the bookstore context, and returns the AI's reply.

### 6.2 Innovation Highlights

- **Auto-seeding database:** On first startup, the server checks if collections are empty and seeds 8 books and a default admin account automatically.
- **No session tokens:** The system uses a simple client-side `localStorage` approach to persist user sessions, reducing backend complexity.
- **Dual image fields:** Book documents store both `imageUrl` and `image` fields for compatibility across different parts of the frontend.
- **Unified CSS file:** All pages share a single `style (1).css` stylesheet, ensuring visual consistency with minimal duplication.

---

## 7. RESULTS AND DISCUSSIONS

### 7.1 Functional Results

All core features of the BOOK4U platform were implemented and tested successfully:

| Feature | Status | Notes |
|---|---|---|
| User Registration | ✅ Working | Validates email, username, password; rejects duplicates |
| User Login | ✅ Working | Matches hashed password; returns cart count |
| Book Catalog Display | ✅ Working | Dynamically loaded from MongoDB via `/api/books` |
| Add to Cart | ✅ Working | Persistent cart saved to `carts` collection |
| Cart View & Total | ✅ Working | Calculates total price from cart items |
| Remove from Cart | ✅ Working | Removes item and decrements user's cart count |
| PayPal Checkout | ✅ Working | Records purchase in `purchases` collection |
| Admin Login | ✅ Working | Authenticated against `admins` collection |
| Add Book (Admin) | ✅ Working | Auto-generates `bookId`; saves to `books` collection |
| Delete Book (Admin) | ✅ Working | Accepts both MongoDB `_id` and `bookId` |
| AI Chatbot | ✅ Working | Responds using xAI Grok model via API key in `.env` |

### 7.2 Discussion

**Security:** Password hashing ensures that even if the database is accessed without authorization, raw passwords are not exposed. The admin panel adds an extra layer of protection through the `x-admin-key` header.

**Scalability:** The current MongoDB setup is local. For production deployment, the connection URI in `server.js` can be changed to a cloud MongoDB URI (e.g., MongoDB Atlas) with no other code changes required.

**User Experience:** The dynamic AI chatbot significantly improves the shopping experience by allowing natural language queries, reducing the need for a traditional FAQ page.

**Limitation:** The current system does not implement JWT or session cookie-based authentication. The user's ID and name are stored in `localStorage` on the browser, which is suitable for a learning project but should be replaced with proper session management in a production system.

### 7.3 Conclusion

BOOK4U successfully demonstrates how a complete, production-like web application can be built using lightweight, open-source tools. The combination of **Express.js** for the backend API, **MongoDB** for flexible data storage, **PayPal** for real financial transactions, and **xAI Grok** for intelligent user interaction makes this project stand out as a well-rounded, modern web system. The project provides a strong foundation that can be extended with features such as user order history, book reviews, wishlist functionality, and cloud deployment.
