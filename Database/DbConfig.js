import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config(); // Configure dotenv to load environment variables from a .env file

const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB connected");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    }
  };

export default connectDB;