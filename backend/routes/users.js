const router = require("express").Router();
const mongoose = require("mongoose");

const User = require("../models/User");
const Notification = require("../models/Notification");
const requireAuth = require("../middleware/auth");

// User details safe to send to the frontend
function publicUser(user, currentUserId) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || "",
    followersCount: user.followers.length,
    followingCount: user.following.length,
    isFollowing: user.followers.some(
      (id) => id.toString() === currentUserId.toString()
    ),
  };
}

// Logged-in user's own profile
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    res.json({
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      followersCount: user.followers.length,
      followingCount: user.following.length,
    });
  } catch (error) {
    console.error("Load my profile error:", error.message);
    res.status(500).json({ message: "Could not load your profile." });
  }
});


// Update own profile details
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const name = String(req.body.name ?? req.user.name).trim();
    const bio = String(req.body.bio ?? req.user.bio ?? "").trim();
    const avatarUrl = String(req.body.avatarUrl ?? req.user.avatarUrl ?? "").trim();
    if (!name || name.length > 60) return res.status(400).json({ message: "Name must be 1–60 characters." });
    if (bio.length > 180) return res.status(400).json({ message: "Bio must be 180 characters or less." });
    if (avatarUrl) { try { const u = new URL(avatarUrl); if (!["http:", "https:"].includes(u.protocol)) throw new Error(); } catch { return res.status(400).json({ message: "Profile photo must be a valid HTTP/HTTPS URL." }); } }
    const user = await User.findByIdAndUpdate(req.user._id, { $set: { name, bio, avatarUrl } }, { new: true }).select("-passwordHash");
    res.json({ id: user._id.toString(), name: user.name, username: user.username, email: user.email, bio: user.bio || "", avatarUrl: user.avatarUrl || "", followersCount: user.followers.length, followingCount: user.following.length });
  } catch (error) { console.error("Update profile error:", error.message); res.status(500).json({ message: "Could not update profile." }); }
});

// Search users — frontend expects an array
router.get("/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) return res.json([]);

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
      ],
    })
      .select("name username bio avatarUrl followers following")
      .limit(30);

    res.json(users.map((user) => publicUser(user, req.user._id)));
  } catch (error) {
    console.error("Search users error:", error.message);
    res.status(500).json({ message: "Could not search users." });
  }
});

// Get all users
router.get("/", requireAuth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
    })
      .select("name username bio avatarUrl followers following createdAt")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      users: users.map((user) => publicUser(user, req.user._id)),
    });
  } catch (error) {
    console.error("Get users error:", error.message);
    res.status(500).json({ message: "Could not load users." });
  }
});

// Get a user's followers
router.get("/:id/followers", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await User.findById(req.params.id).populate(
      "followers",
      "name username bio avatarUrl followers"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      users: user.followers.map((person) =>
        publicUser(person, req.user._id)
      ),
    });
  } catch (error) {
    console.error("Load followers error:", error.message);
    res.status(500).json({ message: "Could not load followers." });
  }
});

// Get a user's following list
router.get("/:id/following", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await User.findById(req.params.id).populate(
      "following",
      "name username bio avatarUrl followers"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({
      users: user.following.map((person) =>
        publicUser(person, req.user._id)
      ),
    });
  } catch (error) {
    console.error("Load following error:", error.message);
    res.status(500).json({ message: "Could not load following." });
  }
});

// Follow or unfollow a user
router.post("/:id/follow", requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentId = req.user._id.toString();

    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (targetId === currentId) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const targetUser = await User.findById(targetId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyFollowing = req.user.following.some(
      (id) => id.toString() === targetId
    );

    if (alreadyFollowing) {
      await User.findByIdAndUpdate(currentId, {
        $pull: { following: targetId },
      });

      await User.findByIdAndUpdate(targetId, {
        $pull: { followers: currentId },
      });

      return res.json({ following: false, message: "Unfollowed." });
    }

    await User.findByIdAndUpdate(currentId, {
      $addToSet: { following: targetId },
    });

    await User.findByIdAndUpdate(targetId, {
      $addToSet: { followers: currentId },
    });

    // Notify the person who received the new follower
    await Notification.create({
      recipient: targetId,
      actor: currentId,
      type: "follow",
    });

    res.json({ following: true, message: "Now following." });
  } catch (error) {
    console.error("Follow user error:", error.message);
    res.status(500).json({ message: "Could not update follow status." });
  }
});

// Get one profile by MongoDB ID OR username
router.get("/:identifier", requireAuth, async (req, res) => {
  try {
    const identifier = req.params.identifier;

    const user = mongoose.isValidObjectId(identifier)
      ? await User.findById(identifier).select("-passwordHash -email")
      : await User.findOne({
          username: identifier.toLowerCase(),
        }).select("-passwordHash -email");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json(publicUser(user, req.user._id));
  } catch (error) {
    console.error("Get profile error:", error.message);
    res.status(500).json({ message: "Could not load profile." });
  }
});

module.exports = router;
