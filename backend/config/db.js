
const mongoose = require("mongoose");
const dns = require("dns");

// MongoDB Atlas DNS lookup settings
dns.setServers(["8.8.8.8", "8.8.4.4"]);

module.exports = async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI missing. Add it to .env");
  }

  try {
    await mongoose.connect(
      uri,
      process.env.MONGODB_DATABASE
        ? { dbName: process.env.MONGODB_DATABASE }
        : {}
    );

    console.log(`MongoDB connected: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("MongoDB error:", error.message);
    console.error(
      "Topology:",
      error.reason?.message || "No additional details"
    );
    throw error;
  }
};

