# Nexus LMS Backend

This is the API backend for the **Nexus LMS** system. It is built using Node.js, Express, Cors, Mongoose, JsonWebToken, and BcryptJS. 

Currently, the backend stores data locally using JSON files in the `/data` directory. However, all data schemas are validated using Mongoose models, and password hashing/JWT utilities are integrated directly into the schemas. This makes transitioning to a live MongoDB database as simple as connecting Mongoose to your cluster URI.

---

## Technical Features

1. **Express & CORS Setup**: Built with ES6 Modules (`import`/`export`), with pre-configured cross-origin request policies (`cors`) to connect with the frontend easily.
2. **Mongoose Models**: Full schema structures for `User`, `Course`, `Transaction`, `Coupon`, and `Enrollment` located in `src/models/`.
3. **Authentication & Security**: Instance methods on the `User` schema handle:
   - Password hashing on signup/creation (`bcryptjs`)
   - Password comparison (`bcryptjs`)
   - JWT Signing (`jsonwebtoken`)
4. **Role-Based Access Control (RBAC)**: Route middleware allows restricting APIs based on roles (`admin`, `instructor`, `student`).
5. **Local JSON Database Adapter**: A customized database helper in `src/data/db.js` synchronizes in-memory and file-based records, instantiating Mongoose model objects on-the-fly to validate schema constraints and run instance methods.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The server will run on port `5000` by default.

---

## API Endpoints Reference

### 🔐 Authentication

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/signup` | Public | Register a new student/instructor | `{ name, email, password, role }` |
| **POST** | `/api/auth/login` | Public | Login & receive JWT | `{ email, password }` |
| **GET** | `/api/auth/me` | Private | Retrieve active profile details | *Headers: Authorization Bearer `<token>`* |

### 📚 Course Management

| Method | Endpoint | Access | Description | Request Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/courses` | Public | Get all courses | None |
| **GET** | `/api/courses/:id` | Public | Get details of a single course | `id` |
| **POST** | `/api/courses` | Instructor / Admin | Create a new course | `{ name, price, status, gradient, description, curriculum }` |
| **PUT** | `/api/courses/:id` | Instructor (Owner) / Admin | Update course metadata | `{ name, price, status, gradient, description, curriculum }` |
| **DELETE** | `/api/courses/:id` | Admin | Delete a course | `id` |
| **POST** | `/api/courses/:id/enroll` | Private (Student) | Buy/enroll in a course. Generates transactional, progress, and enrollment logs. | `{ gateway }` |

### 👥 User Management

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/users` | Admin | List all registered users | None |
| **GET** | `/api/users/:id` | Admin | Get a single user's detail | `id` |
| **POST** | `/api/users` | Admin | Add a new user directly | `{ name, email, password, role }` |
| **PUT** | `/api/users/:id` | Admin | Update user details or suspend/activate | `{ role, status }` |
| **DELETE** | `/api/users/:id` | Admin | Delete a user account | `id` |

### 💳 Payments & Transactions

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/payments/transactions` | Admin | List all checkout history | None |
| **POST** | `/api/payments/transactions` | Private | Manually log a transaction | `{ courseName, amount, gateway, status }` |
| **PUT** | `/api/payments/transactions/:id/refund` | Admin | Mark transaction status as Refunded | `id` |

### 🏷️ Coupon Management

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/coupons` | Instructor / Admin | List all promotional coupons | None |
| **POST** | `/api/coupons` | Instructor / Admin | Create discount coupon | `{ code, discount, type, maxUses, expiry }` |
| **POST** | `/api/coupons/validate` | Private | Check if coupon code is valid | `{ code }` |
| **DELETE** | `/api/coupons/:code` | Instructor / Admin | Remove coupon code | `code` |

### 🎓 Enrollments & Progress Tracking

| Method | Endpoint | Access | Description | Request Body |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/enrollments` | Admin | List all enrollments across system | None |
| **GET** | `/api/enrollments/my` | Private | Get current user's course progress list | None |
| **PUT** | `/api/enrollments/progress` | Private | Update student's lesson progress % (Auto-issues certificate at 100%) | `{ courseId, progress }` |
| **POST** | `/api/enrollments/grant` | Admin | Manually grant course access to student | `{ studentEmail, courseId, courseName }` |

---

## How to Migrate to MongoDB

When you are ready to use a MongoDB database instead of the JSON files:

1. Open `src/index.js` and add:
   ```javascript
   import mongoose from 'mongoose';
   
   mongoose.connect('your_mongodb_connection_uri')
     .then(() => console.log('Connected to MongoDB'))
     .catch(err => console.error('MongoDB connection error:', err));
   ```
2. Replace JSON imports (e.g. `getUsers`, `saveUsers`, etc.) inside the controllers with standard Mongoose queries:
   - *Example: Replace `const userData = getUsers().find(...)` with `const user = await User.findOne({ email });`*
   - *Example: Replace `users.push(newUser); saveUsers(users);` with `await User.create(newUser);`*
