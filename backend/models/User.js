
const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 24
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    // User permissions
    role: {
  type: String,
  enum: ["user", "admin"],
  default: "user"
},
    bio: {
      type: String,
      default: "",
      maxlength: 180
    },

    avatarUrl: {
      type: String,
      default: ""
    },

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post"
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", schema);
