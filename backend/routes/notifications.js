const router = require("express").Router();

const Notification = require("../models/Notification");
const requireAuth = require("../middleware/auth");

// Get notifications for logged-in user
router.get("/", requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id,
    })
      .populate("actor", "name username avatarUrl")
      .populate("post", "text mediaUrl mediaType")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({
      notifications: notifications.map((item) => ({
        id: item._id.toString(),
        type: item.type,
        read: item.read,
        actor: item.actor
          ? {
              id: item.actor._id.toString(),
              name: item.actor.name,
              username: item.actor.username,
              avatarUrl: item.actor.avatarUrl || "",
            }
          : null,
        post: item.post
          ? {
              id: item.post._id.toString(),
              text: item.post.text,
              mediaUrl: item.post.mediaUrl,
            }
          : null,
        createdAt: item.createdAt,
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error.message);
    res.status(500).json({ message: "Could not load notifications." });
  }
});

// Mark one notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.user._id,
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json({ message: "Notification marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Could not update notification." });
  }
});

// Mark all notifications as read
router.patch("/read-all", requireAuth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Could not update notifications." });
  }
});

module.exports = router;