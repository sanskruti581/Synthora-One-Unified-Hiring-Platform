import mongoose from "mongoose";

export async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it to backend/.env or project .env.");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
}
