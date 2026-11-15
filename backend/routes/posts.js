
const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");

const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(
            null,
            crypto.randomBytes(16).toString("hex") +
            path.extname(file.originalname).toLowerCase()
        );
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed =
            /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/.test(
                file.mimetype
            );

        if (allowed) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Only JPG, PNG, GIF, WEBP images or MP4, WEBM, MOV videos are allowed."
                )
            );
        }
    }
});

function shape(p, uid = "", saved = []) {
    return {
        id: p._id,
        text: p.text,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        createdAt: p.createdAt,

        author: p.author
            ? {
                id: p.author._id,
                name: p.author.name,
                username: p.author.username,
                avatarUrl: p.author.avatarUrl
            }
            : null,

        likesCount: p.likes.length,
        likedByMe: p.likes.some(
            x => x.toString() === uid
        ),

        savedByMe: saved.some(
            x => x.toString() === p._id.toString()
        ),

        comments: p.comments.map(c => ({
            id: c._id,
            text: c.text,
            createdAt: c.createdAt,

            author: c.author
                ? {
                    id: c.author._id,
                    name: c.author.name,
                    username: c.author.username
                }
                : null,

            isMine:
                !!uid &&
                !!c.author &&
                c.author._id.toString() === uid
        }))
    };
}


// GET ALL POSTS
router.get("/", async (req, res) => {
    try {
        const filter = {};

        if (req.query.type === "image") {
            filter.mediaType = "image";
        }

        if (req.query.type === "video") {
            filter.mediaType = "video";
        }
        if (req.query.author) {
            filter.author = req.query.author;
        }

        let uid = "";
        let saved = [];

        const h = req.headers.authorization;

        if (h && h.startsWith("Bearer ")) {
            try {
                const jwt = require("jsonwebtoken");
                const d = jwt.verify(
                    h.slice(7),
                    process.env.JWT_SECRET
                );

                const u = await User.findById(d.sub);

                if (u) {
                    uid = u._id.toString();
                    saved = u.savedPosts;
                }
            } catch {}
        }

        const ps = await Post.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("author", "name username avatarUrl")
            .populate("comments.author", "name username");

        res.json(ps.map(p => shape(p, uid, saved)));

    } catch {
        res.status(500).json({
            message: "Could not load posts."
        });
    }
});


// CREATE POST
router.post("/", auth, upload.single("media"), async (req, res) => {
    let filePath = req.file?.path;

    try {
        const text = String(req.body.text || "").trim();
        const url = String(req.body.mediaUrl || "").trim();

        if (!text && !req.file && !url) {
            return res.status(400).json({
                message: "Add a caption or choose media."
            });
        }

        if (text.length > 2000) {
            return res.status(400).json({
                message: "Caption is too long."
            });
        }

        let mediaUrl = "";
        let mediaType = "none";

        if (req.file) {
            mediaUrl = "/uploads/" + path.basename(req.file.path);

            mediaType = req.file.mimetype.startsWith("image/")
                ? "image"
                : "video";

        } else if (url) {
            let u;

            try {
                u = new URL(url);
            } catch {
                return res.status(400).json({
                    message: "Enter a valid media URL."
                });
            }

            if (!["http:", "https:"].includes(u.protocol)) {
                return res.status(400).json({
                    message: "Only HTTP/HTTPS URLs are allowed."
                });
            }

            mediaUrl = url;
            mediaType =
                req.body.mediaType === "video" ? "video" : "image";
        }

        let p = await Post.create({
            author: req.user._id,
            text,
            mediaUrl,
            mediaType
        });

        p = await p.populate("author", "name username avatarUrl");

        res.status(201).json(
            shape(p, req.user._id.toString(), req.user.savedPosts)
        );

    } catch (e) {
        if (filePath) {
            fs.unlink(filePath, () => {});
        }

        res.status(400).json({
            message: e.message || "Could not create post."
        });
    }
});


// LIKE / UNLIKE POST
router.post("/:id/like", auth, async (req, res) => {
    try {
        const p = await Post.findById(req.params.id);

        if (!p) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        const liked = p.likes.some(
            x => x.equals(req.user._id)
        );

        if (liked) {
            p.likes.pull(req.user._id);
        } else {
            p.likes.addToSet(req.user._id);
        }

        await p.save();

        if (!liked && !p.author.equals(req.user._id)) {
            await Notification.create({ recipient: p.author, actor: req.user._id, type: "like", post: p._id });
        }

        res.json({
            liked: !liked,
            likesCount: p.likes.length
        });

    } catch {
        res.status(400).json({
            message: "Invalid post."
        });
    }
});


// ADD COMMENT
router.post("/:id/comments", auth, async (req, res) => {
    try {
        const text = String(req.body.text || "").trim();

        if (!text || text.length > 500) {
            return res.status(400).json({
                message: "Comment must be 1–500 characters."
            });
        }

        const p = await Post.findById(req.params.id);

        if (!p) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        p.comments.push({
            author: req.user._id,
            text
        });

        await p.save();

        if (!p.author.equals(req.user._id)) {
            await Notification.create({ recipient: p.author, actor: req.user._id, type: "comment", post: p._id });
        }

        await p.populate("comments.author", "name username");

        const c = p.comments[p.comments.length - 1];

        res.status(201).json({
            id: c._id,
            text: c.text,
            createdAt: c.createdAt,

            author: {
                id: c.author._id,
                name: c.author.name,
                username: c.author.username
            },

            isMine: true
        });

    } catch {
        res.status(400).json({
            message: "Could not add comment."
        });
    }
});



// EDIT OWN COMMENT
router.patch("/:id/comments/:commentId", auth, async (req, res) => {
    try {
        const text = String(req.body.text || "").trim();

        if (!text || text.length > 500) {
            return res.status(400).json({
                message: "Comment must be 1–500 characters."
            });
        }

        const p = await Post.findById(req.params.id);

        if (!p) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        const comment = p.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found."
            });
        }

        if (
            !comment.author ||
            comment.author.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({
                message: "You can edit only your own comments."
            });
        }

        comment.set({ text: text });

        p.markModified("comments");

        await p.save();

        res.status(200).json({
            success: true,
            message: "Comment updated successfully.",
            id: comment._id,
            text: comment.text
        });

    } catch (error) {
        console.error("COMMENT EDIT ERROR:", error);

        res.status(500).json({
            message: error.message || "Could not update comment."
        });
    }
});



// DELETE OWN COMMENT
router.delete("/:id/comments/:commentId", auth, async (req, res) => {
    try {
        const p = await Post.findById(req.params.id);

        if (!p) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        const comment = p.comments.id(req.params.commentId);

        if (!comment) {
            return res.status(404).json({
                message: "Comment not found."
            });
        }

        if (!comment.author || !comment.author.equals(req.user._id)) {
            return res.status(403).json({
                message: "You can delete only your own comments."
            });
        }

        comment.deleteOne();

        await p.save();

        res.json({
            message: "Comment deleted successfully.",
            commentId: req.params.commentId
        });

    } catch {
        res.status(400).json({
            message: "Could not delete comment."
        });
    }
});


// DELETE OWN POST
router.delete("/:id", auth, async (req, res) => {
    try {
        const p = await Post.findById(req.params.id);

        if (!p) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        if (!p.author.equals(req.user._id)) {
            return res.status(403).json({
                message: "You can delete only your own posts."
            });
        }

        if (p.mediaUrl && p.mediaUrl.startsWith("/uploads/")) {
            fs.unlink(
                path.join(uploadDir, path.basename(p.mediaUrl)),
                () => {}
            );
        }

        await p.deleteOne();

        res.json({
            message: "Post deleted."
        });

    } catch {
        res.status(400).json({
            message: "Could not delete post."
        });
    }
});


// SAVE / UNSAVE POST
router.post("/:id/save", auth, async (req, res) => {
    try {
        const p = await Post.findById(req.params.id);

        if (!p) {
            return res.status(404).json({
                message: "Post not found."
            });
        }

        const yes = req.user.savedPosts.some(
            x => x.equals(p._id)
        );

        if (yes) {
            req.user.savedPosts.pull(p._id);
        } else {
            req.user.savedPosts.addToSet(p._id);
        }

        await req.user.save();

        res.json({
            saved: !yes
        });

    } catch {
        res.status(400).json({
            message: "Could not save post."
        });
    }
});


// GET SAVED POSTS
router.get("/saved/mine", auth, async (req, res) => {
    try {
        const u = await User.findById(req.user._id)
            .select("savedPosts");

        const ps = await Post.find({
            _id: { $in: u.savedPosts }
        })
            .sort({ createdAt: -1 })
            .populate("author", "name username avatarUrl")
            .populate("comments.author", "name username");

        res.json(
            ps.map(p =>
                shape(p, req.user._id.toString(), u.savedPosts)
            )
        );

    } catch {
        res.status(500).json({
            message: "Could not load saved posts."
        });
    }
});


// UPLOAD ERROR HANDLER
router.use((err, req, res, next) => {
    res.status(400).json({
        message: err.message || "Upload failed."
    });
});

module.exports = router;
