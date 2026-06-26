import app from "./app.js"
import { initDB } from "./data/db.js"
import dotenv from "dotenv"
dotenv.config()
// Initialize Local JSON Databases (runs asynchronously)
initDB()
  .then(() => {
    console.log("Mock database files initialized successfully.")
  })
  .catch((err) => {
    console.error("Failed to initialize mock databases:", err)
  })

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
