import { env } from "@/common/utils/envConfig";
import mongoose from "mongoose";

// Set Mongoose debug mode only in development environment
if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true);
}

const connectMongooseDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {});
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectMongooseDB;
