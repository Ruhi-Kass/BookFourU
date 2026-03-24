# 📚 Book4U - Your Ultimate Online Bookstore

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D%2014.0.0-green)
![MongoDB](https://img.shields.io/badge/mongodb-latest-green)

**Book4U** is a premium, responsive e-commerce platform designed for book enthusiasts. It offers a seamless experience for both **Buyers** (browsing, real-time stats, and secure checkout) and **Sellers** (listing management and store profiles).

---

## ✨ Key Features

### 🛒 For Buyers
- **Modern Shop Experience**: Browse books by category with real-time stats for active members, books listed, and active carts.
- **Dynamic Cart**: Persistent shopping cart that saves your selections locally, with duplicate prevention and easy checkout.
- **Secure Authentication**: Dedicated buyer registration and login flows.
- **Rich Book Previews**: Hover effects for full descriptions and high-quality cover images.

### 🏪 For Sellers
- **Seller Panel**: Dedicated interface to post new book listings with status badges (In Stock, New, Bestseller).
- **Listing Management**: Upload book covers, set prices, and choose payment preferences (PayPal/Bank Transfer).
- **Verified Status**: Sellers are identified by their store names in the marketplace.

### 🚀 Platform Highlights
- **Real-Time Dashboard**: Live site-wide metrics (Total Members, Books, Active Carts) powered by a custom backend API.
- **Premium UI**: Site-wide dark-green theme with glassmorphism effects, smooth animations, and a unified responsive design.
- **Robust Backend**: Node.js/Express server with MongoDB for reliable data persistence.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+), Inter Font Family.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB (Native Driver).
- **Animations**: CSS Keyframes & staggered entrance effects.

---

## ⚙️ Prerequisites

- **Node.js** (v14 or higher)
- **MongoDB** (Local instance or Atlas) running on port `27017`.

---

## 📥 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Ruhi-Kass/BookFourU.git
   cd BookFourU
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Initialize the Database**:
   Ensure MongoDB is running, then run the setup script:
   ```bash
   node reset_db.js
   ```

---

## 🏃‍♂️ Usage

1. **Start the Development Server**:
   ```bash
   npm start
   ```
   *The server will run at [http://localhost:3000](http://localhost:3000)*

2. **Explore the Site**:
   - **Home**: View live stats and featured categories.
   - **Shop**: Browse our full collection and add books to your cart.
   - **Sell**: Register as a seller to list your own books.
   - **My Cart**: Review your selections and proceed to the verified transaction checkout.

---

## 📂 Project Architecture

```
BOOK4U/
├── server.js        # Core Express server & API endpoints
├── script.js        # Frontend logic & State management
├── style.css        # Global design system & animations
├── index.html       # Home landing page
├── shop.html        # Marketplace & Listings
├── sell_books.html  # Seller listing form
├── mycart.html      # Cart & Payment Modal
├── data/            # Local data structure
└── uploads/         # Seller-uploaded book images
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Made with ❤️ by the Book4U Team.*
