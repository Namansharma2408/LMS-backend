import app from "./app.js"
import { initDB } from "./data/db.js"
import dotenv from "dotenv";
dotenv.config();
// Initialize Local JSON Databases (runs asynchronously)
initDB()
  .then(() => {
    console.log("Mock database files initialized successfully.")
  })
  .catch((err) => {
    console.error("Failed to initialize mock databases:", err)
  })

console.log("NODE_ENV:", process.env.NODE_ENV)
console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI)
console.log("URI starts with:", process.env.MONGODB_URI?.substring(0, 20))
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
