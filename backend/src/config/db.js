import mongoose from "mongoose";

export async function connectDatabase() {
  const primaryUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/synthora";
  const fallbackUri = "mongodb://127.0.0.1:27017/synthora";

  try {
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected successfully to ${primaryUri.includes("@") ? "MongoDB Atlas" : primaryUri}`);
  } catch (primaryError) {
    if (primaryUri !== fallbackUri) {
      console.warn(`⚠️ Failed to connect to primary MongoDB (${primaryError.message}). Falling back to local MongoDB...`);
      try {
        await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB connected successfully to local MongoDB (${fallbackUri})`);
        return;
      } catch (fallbackError) {
        throw new Error(`MongoDB connection failed on both primary (${primaryError.message}) and fallback (${fallbackError.message})`);
      }
    }
    throw primaryError;
  }
}
