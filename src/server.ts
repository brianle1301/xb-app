import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import mongoose from "mongoose";

// Store the connection promise - initialized once, awaited on each request
let dbConnection: Promise<typeof mongoose> | null = null;

function connectDB() {
  if (!dbConnection) {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error(
        "Please define the MONGODB_URI environment variable inside .env",
      );
    }
    dbConnection = mongoose.connect(MONGODB_URI).then((m) => {
      console.log("MongoDB connected successfully");
      return m;
    });
  }
  return dbConnection;
}

// Start connecting at server startup
connectDB();

export default createServerEntry({
  async fetch(request) {
    await connectDB();
    return handler.fetch(request);
  },
});
