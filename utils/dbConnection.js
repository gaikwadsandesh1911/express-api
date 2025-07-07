import mongoose from "mongoose";

export const dbConnect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected successfully to database");
  } catch (error) {
    console.error("❌ Cannot connect to the database");
    throw error; // Let the index.js handle this
  }
};