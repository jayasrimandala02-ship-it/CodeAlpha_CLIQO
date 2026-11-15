
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function makeAdmin() {
  try {
    const username = process.argv[2]?.trim().toLowerCase();

    if (!username) {
      console.log(
        "Usage: node backend/scripts/makeAdmin.js YOUR_USERNAME"
      );
      return;
    }

    await connectDB();

    const user = await User.findOne({ username });

    if (!user) {
      console.log("User not found. Register this account first.");
      return;
    }

    user.role = "admin";
    await user.save();

    console.log(`@${user.username} is now an admin.`);
  } catch (error) {
    console.error("Admin setup failed:", error.message);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

makeAdmin();
