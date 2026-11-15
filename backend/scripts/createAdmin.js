
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

async function createAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !email || !password || password.length < 12) {
      throw new Error(
        "Set ADMIN_USERNAME, ADMIN_EMAIL and a password of at least 12 characters in .env"
      );
    }

    await connectDB();

    const userByUsername = await User.findOne({ username });
    const userByEmail = await User.findOne({ email });

    if (
      userByUsername &&
      userByEmail &&
      userByUsername._id.toString() === userByEmail._id.toString()
    ) {
      userByUsername.role = "admin";
      userByUsername.passwordHash = await bcrypt.hash(password, 12);
      await userByUsername.save();

      console.log("Existing account verified by username and email.");
      console.log("Admin role assigned and password updated.");
      return;
    }

    if (userByUsername || userByEmail) {
      throw new Error(
        "Username or email belongs to a different account. No changes made."
      );
    }

    await User.create({
      name: "CLIQO Admin",
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "admin",
    });

    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Admin setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createAdmin();
