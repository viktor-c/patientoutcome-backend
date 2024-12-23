import mongoose from "mongoose";

const connectMongooseDB = async () => {
  try {
    await mongoose.connect(
      "mongodb://patientmanager:1234Test@localhost:27017/clinical-patientoutcome?authSource=admin",
      {},
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectMongooseDB;
