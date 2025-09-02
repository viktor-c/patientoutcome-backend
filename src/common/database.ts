import { env } from "@/common/utils/envConfig";
import { logger } from "@/common/utils/logger";
import mongoose from "mongoose";

// Set Mongoose debug mode only in development environment
if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true);
}

const connectMongooseDB = async () => {
  try {
    await mongoose.connect(env.MONGO_URI, {});
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error({ error }, "MongoDB connection error");
    process.exit(1);
  }
};

export default connectMongooseDB;
