# BOOK4U — Online Bookstore Web Application
## Project Report

**Student Name:** Ruhama Kassahun
**LinkedIn:** [linkedin.com/in/ruhama-kassahun-55506735b](https://www.linkedin.com/in/ruhama-kassahun-55506735b)
**Project Title:** BOOK4U – A Full-Stack Multi-Vendor Online Bookstore with AI Chat Support
**Submission Date:** March 2026

---

## 1. SUMMARY

BOOK4U is a fully functional, full-stack online bookstore web application developed using **Node.js**, **Express.js**, **MongoDB**, and vanilla **HTML/CSS/JavaScript**. The platform has evolved into a robust **multi-vendor system**, allowing users to register as either **buyers** or **sellers**. Buyers can browse the vast catalog, add items to their persistent shopping carts, and complete transactions. Sellers have dedicated tools to post their own books to the marketplace. An administrative panel is also provided, allowing authorized admins to moderate the platform's inventory.

A standout modern feature of the platform is an integrated **AI-powered shopping assistant** built using the **Google Gemini Pro model** (`gemini-2.5-flash`), which interacts with users and recommends books directly from the dynamic live database.

The application leverages a unified **client-server architecture**: the frontend consists of static client-side views enriched with asynchronous `fetch` logic, while the backend serves RESTful APIs, handles secure cookie-based authentication, and securely stores hashed passwords (using the SHA-256 algorithm). BOOK4U stands as a robust demonstration of modern full-stack engineering, marrying streamlined data management with an interactive and intelligent user experience.

---

## 2. OBJECTIVE AND SCOPE

### Objective

The primary objective of BOOK4U is to develop a robust, end-to-end online bookstore with multi-vendor support:

- Enable **two distinct user flows** — Buyers (who purchase books) and Sellers (who list new inventory).
- Provide **secure cookie-based authentication**, with server-side password hashing.
- Manage a **persistent shopping cart** synced seamlessly between frontend localStorage and the backend MongoDB database.
- Process transactions reliably and track user order history.
- Provide a dedicated **Admin panel** to maintain oversight over the catalog.
- Deliver an **intelligent AI chatbot (Gemini)** capable of parsing real-time inventory to guide shoppers.

### Scope

| In Scope | Out of Scope |
|---|---|
| Role-based user accounts (Buyer, Seller, Admin) | OAuth / Social logins (Google, Facebook) |
| Book cataloging by categories with dynamic search | Advanced recommendation algorithms (AI aside) |
| Dedicated Seller Dashboard (Post Books) | Inventory/Warehouse Management for physical shipping |
| Persistent Shopping Cart (Cookies & MongoDB) | Multi-language support |
| AI Chatbot (Google Gemini 2.5) | Cloud scaling / Microservices |
| Payment confirmation and transaction tracking | Automated financial payouts to sellers |

---

## 3. INTRODUCTION

### 3.1 Background

With digital commerce expanding rapidly, platforms need to transcend standard retail by allowing community-driven marketplaces (multi-vendor systems) and intelligent shopping experiences. BOOK4U meets this need by providing an accessible space where users can buy quality books while independent sellers can securely list their own items.

### 3.2 Key Concepts

**RESTful API:** A web service design where the backend exposes standardized HTTP endpoints (`GET`, `POST`, `DELETE`) for seamless client-server data exchange.

**Role-Based Access Control (RBAC):** Users are internally categorized into `buyer`, `seller`, or elevated to `admin`, ensuring that features like the Seller Dashboard (`/sell_books.html`) remain securely restricted.

**Multi-tiered Authentication:** Instead of relying entirely on simple client-side tokens, robust session authentication is maintained using `cookie-parser` via securely encrypted server-set cookies.

**Generative AI Integration:** Powered by Google's Gemini API, the platform dynamically aggregates real-time MongoDB catalog data and injects it into a prompt context, ensuring the conversational assistant is always aware of the live inventory.

### 3.3 System Pages

| Page | File | Purpose |
|---|---|---|
| **Home** | `index.html` | Landing page featuring dynamic recommendations |
| **Shop** | `shop.html` | Client-filtered, responsive grid of the book catalog |
| **Sell Books** | `sell_books.html` | Seller-only dashboard for uploading new inventory via APIs |
| **My Cart** | `mycart.html` | Persistent order summary and checkout gateway |
| **Buyer Sign Up** | `buyer_signup.html` | Dedicated registration pipeline for readers/buyers |
| **Seller Sign Up** | `seller_signup.html` | Registration tailored for store owners and vendors |
| **Login** | `login.html` | Secure session gateway |
| **Admin** | `admin.html` | Elevated panel to manage the entire catalog via API Key validation |

---

## 4. HARDWARE & SOFTWARE USED

### Software Stack

#### Backend
| Software | Version | Role |
|---|---|---|
| **Node.js** | v18+ | JavaScript runtime environment |
| **Express.js** | v5.2.1 | Fast, unopinionated routing & web server |
| **MongoDB / driver**| v7.0.0 | NoSQL database & native connection logic |
| **@google/generative-ai**| v0.24.1 | Native Google Gemini AI SDK integration |
| **cookie-parser**| v1.4.7 | Middleware for secure auth-session cookies |
| **multer** | v2.1.1 | Handling multipart form data for book cover uploads |

#### Frontend
| Technology | Role |
|---|---|
| **HTML5 & CSS3** | Structural markup and responsive styling |
| **Vanilla JavaScript** | DOM manipulation, `fetch()` API calls, and local state management |

---

## 5. DATABASE: COLLECTIONS AND FIELDS

### Database Name: `book4u`

---

### Collection 1: `users`
Tracks both buyers and sellers across the platform.

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated ID |
| `accountType` | String | Defines explicit role: `"buyer"` or `"seller"` |
| `fullname`, `username`| String | Identity details (username configured as a unique sparse index) |
| `email`, `password` | String | Unique login credentials (password is SHA-256 hashed) |
| `storeName` | String | Seller-specific identifier applied only to seller accounts |
| `viewedCategories` | Array | Internal tracking of read-history to inform local recommendations |

### Collection 2: `books`
Contains the system's dynamic catalog, including globally seeded text and user-injected media.

| Field | Type | Description |
|---|---|---|
| `bookId` | String | Sequential human-readable tracking ID (Unique index) |
| `title`, `author` | String | Book metadata |
| `category`, `price` | String/Num| Searching and sorting metadata |
| `image`, `imageUrl`| String | URL path to cover art (uploaded dynamically via `multer`) |
| `sellerId` | String | Links user account if the book was self-published or added by a seller |
| `isSellerBook` | Boolean | `True` flag applied if user-generated content |

### Collection 3: `carts` & Collection 4: `purchases`
Act as synchronized shopping pipelines. The `carts` collection continuously backs up frontend interactions (`userId` indexed) to persist carts across devices, whilst `purchases` acts as an immutable ledger of finalized checkouts.

### Collection 5: `admins`
System-generated elevated accounts using cryptographic validation containing `hashed passwords`.

---

## 6. METHODOLOGY

**Phase 1 — Core Architecture:**
- Set up an Express.js backend coupled with advanced middleware arrays: utilizing `multer` for fluid binary file extraction and `cookie-parser` for maintaining safe HTTP authentication.
- Built explicit `initDB()` logic to dynamically auto-seed the schema with an original 12 books across 4 major categories.

**Phase 2 — Multi-Vendor Auth & Sessions:**
- Split user registrations into structurally unique buyer and seller specific pipelines.
- Configured a dual-state authentication flow: securely assigned HTTP-only `.cookie()` responses sync logically to frontend global objects parsing authenticated state directly via browser tools.

**Phase 3 — Interactive Shop & Cart:**
- Generated dynamic grid rendering scripts fetching `/api/books` payloads constantly.
- Implemented multidirectional Cart synchronization: adding local cache items registers locally and securely maps to MongoDB's `carts` entity.

**Phase 4 — Conversational AI Assistant:**
- Integrated the raw Google generative AI SDK (`gemini-2.5-flash`) at an open `/chat` endpoint.
- Adopted an explicit context-injection pattern: the system generates real-time inventory contexts directly mapped from the MongoDB NoSQL `books` list and places them directly into system-level prompt matrices, essentially building a highly specialized store clerk.

---

## 7. RESULTS AND DISCUSSIONS

### 7.1 Key Functional Results

| Feature | Status | Notes |
|---|---|---|
| Buyer / Seller Auth | ✅ Working | Employs cookie-based multi-tier sessions with persistent user objects. |
| Catalog & Filters | ✅ Working | Seamless live-filtering built via async fetches to backend categories. |
| User Book Uploads | ✅ Working | `multer` efficiently handles stream inputs writing to `/uploads`. |
| Persistent Cart | ✅ Working | Synchronizes cached items seamlessly across browser resets. |
| Tailored Recommendations| ✅ Working | `/api/recommendations` utilizes tracked user history patterns. |
| AI Chatbot | ✅ Working | Context-aware responses via `gemini-2.5-flash` system prompting. |

### 7.2 Discussion

**Security Standards:** Password security achieved via built-in computational `crypto` functionality and explicit `requireAdmin` middleware guards API integrity tightly against exploitation natively. Using browser session tokens reduces reliance purely on exposed window protocols.

**Modern Iteration Highlights:** The use of form payloads with `multer` for direct image manipulation empowers the shift to a community vendor platform directly. This mirrors fully-deployed scalable E-commerce infrastructures successfully without excessive abstract libraries. Injecting real NoSQL database snapshots over AI REST hooks greatly eliminates native hallucination possibilities typically associated with general LLM models.

### 7.3 Conclusion

BOOK4U operates successfully as a comprehensive, lightweight, scalable E-commerce solution. Transitioning from a simple transactional platform, it actively employs dynamic local artificial intelligence, robust role-based workflows, multipart content uploads natively, and complex state synchronization. The overall architecture is highly functional and represents an academic benchmark in deploying fluid Express/MongoDB ecosystems accurately to full scale in modern real-world simulation scenarios.
