# 📚 BOOK4U - Your One-Stop Online Bookstore

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D%2014.0.0-green)
![MongoDB](https://img.shields.io/badge/mongodb-latest-green)

**BOOK4U** is a modern, responsive e-commerce application designed for book lovers. It enables users to browse a wide variety of genres, manage their shopping carts, and securely register and log in to track their shopping experience.

---

## 🚀 Features

-   **User Authentication**: Secure Signup and Login functionality with password hashing.
-   **Dynamic Product Catalog**: Browse books by category (Educational, Fiction, Non-Fiction, Children's) or search by title/author.
-   **Shopping Cart**: Fully functional cart with local storage persistence (items remain after refresh).
-   **Responsive Design**: Optimized for desktops, tablets, and mobile devices.
-   **File Uploads**: Checkout process includes a payment proof upload feature.
-   **Contact Form**: Users can send messages directly through the platform.

---

## 🛠️ Technology Stack

-   **Frontend**: HTML5, CSS3, JavaScript (ES6+)
-   **Backend**: Node.js, Express.js
-   **Database**: MongoDB (Native Driver)
-   **Styling**: Custom CSS with responsive styling
-   **Icons**: FontAwesome & Custom Assets

---

## ⚙️ Prerequisites

Before running the application, ensure you have the following installed:

1.  **[Node.js](https://nodejs.org/)** (v14 or higher)
2.  **[MongoDB](https://www.mongodb.com/try/download/community)** (Community Server) running locally on default port `27017`.

---

## 📥 Installation

1.  **Clone the repository** (or download source code):
    ```bash
    git clone https://github.com/yourusername/book4u.git
    cd book4u
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Start MongoDB**:
    Ensure your local MongoDB instance is running.
    ```bash
    # Command depends on your OS, typically:
    mongod
    ```

4.  **Initialize Database (Optional)**:
    To ensure the database users collection is set up correctly with unique indexes, you can run:
    ```bash
    node reset_db.js
    ```

---

## 🏃‍♂️ Usage

1.  **Start the Server**:
    ```bash
    node server.js
    ```
    *You should see: `Server running at http://localhost:3000`*

2.  **Open in Browser**:
    Navigate to [http://localhost:3000](http://localhost:3000)

3.  **Explore**:
    -   **Register**: Create a new account at `/signup.html`.
    -   **Shop**: Browse books at `/shop.html`.
    -   **Cart**: View your selections at `/mycart.html`.

---

## 📂 Project Structure

```
BOOK4U/
├── assets/             # Images and logos
├── data/               # Static data files
├── node_modules/       # Dependencies
├── index.html      # Home Page
├── shop.html           # Shop & Product Listing
├── mycart.html         # Shopping Cart
├── login.html          # Login Page
├── signup.html         # Registration Page
├── contact.html        # Contact Page
├── about.html          # About Us Page
├── script.js       # Main Frontend Logic
├── server.js           # Node.js Express Backend
├── style.css       # Global Stylesheet
└── reset_db.js         # Database Utility Script
```

---

## 🔮 Future Improvements

-   [ ] Payment Gateway Integration (Stripe/PayPal)
-   [ ] User Profile Dashboard
-   [ ] Admin Panel for adding/removing books
-   [ ] Book Reviews and Ratings

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by the BOOK4U Team.
