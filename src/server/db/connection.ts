import { createServerOnlyFn } from "@tanstack/react-start";
import mongoose from "mongoose";

let isConnected = false;

export const connectDB = createServerOnlyFn(() => {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env",
    );
  }

  return async () => {
    if (isConnected) {
      return;
    }

    try {
      await mongoose.connect(MONGODB_URI);
      isConnected = true;
      console.log("MongoDB connected successfully");
    } catch (error) {
      console.error("MongoDB connection error:", error);
      throw new Error("Failed to connect to MongoDB");
    }
  };
});
