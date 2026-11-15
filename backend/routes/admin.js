
const router = require("express").Router();

const requireAdmin = require("../middleware/adminAuth");
const User = require("../models/User");
const Post = require("../models/Post");

// Verify administrator session
router.get("/verify", requireAdmin, (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Dashboard statistics
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalAdmins,
      recentUsers,
      recentPosts,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      User.countDocuments({ role: "admin" }),
      User.find()
        .select("name username email role createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Post.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        totalAdmins,
      },
      recentUsers,
      recentPosts,
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      message: "Could not load dashboard statistics.",
    });
  }
});

// Registered users
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, users });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      message: "Could not load users.",
    });
  }
});

// Community posts
router.get("/posts", requireAdmin, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, posts });
  } catch (error) {
    console.error("Admin posts error:", error);

    res.status(500).json({
      message: "Could not load posts.",
    });
  }
});

module.exports = router;
