import express from "express"
import cors from "cors"
import helmet from "helmet"

// Route imports
import authRoutes from "./routes/authRoutes.js"
import courseRoutes from "./routes/courseRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import couponRoutes from "./routes/couponRoutes.js"
import enrollmentRoutes from "./routes/enrollmentRoutes.js"
import searchRoutes from "./routes/searchRoutes.js"

const app = express()

// Middlewares
app.use(helmet())

const allowed = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://lms-frontend-nine-gilt.vercel.app",
]
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowed.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
  }),
)

app.use(express.json({ limit: "10kb" }))

// API Routes
app.use("/api/auth", authRoutes)
app.use("/api/courses", courseRoutes)
app.use("/api/users", userRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/coupons", couponRoutes)
app.use("/api/enrollments", enrollmentRoutes)
app.use("/api/search", searchRoutes)

import mongoose from "mongoose"
import { getMongoDBURI } from "./data/db.js"

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    console.log("Attempting MongoDB connection...")

    await mongoose.connect(process.env.MONGODB_URI)

    console.log("Connected!")

    res.json({
      status: "ok",
      readyState: mongoose.connection.readyState,
    })
  } catch (err) {
    console.error("Mongo connection error:", err)

    res.status(500).json({
      error: err.message,
      name: err.name,
      code: err.code,
      readyState: mongoose.connection.readyState,
    })
  }
})
// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` })
})

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode =
    err.statusCode ||
    err.status ||
    (res.statusCode !== 200 ? res.statusCode : 500)
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  })
})

export default app
