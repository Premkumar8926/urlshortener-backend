// Import necessary modules
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./Database/DbConfig.js"; // MongoDB connection file
import userRoutes from "./Routers/user.router.js"; // User routes
import shortUrlRoutes from "./Routers/shortUrl.router.js"; // URL shortener routes

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON requests

// Define Routes
app.use("/api/user", userRoutes); // User-related routes
app.use("/", shortUrlRoutes); // URL Shortener routes

// Connect to MongoDB
connectDB();

// Start the Express server on the specified port or default to port 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`App is listening on PORT ${PORT}`);
});
