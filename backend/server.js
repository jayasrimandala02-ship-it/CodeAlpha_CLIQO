
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const auth = require("./routes/auth");
const posts = require("./routes/posts");
const users = require("./routes/users");
const admin = require("./routes/admin");
const notifications = require("./routes/notifications");
const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// Frontend files
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "CLIQO" });
});

// Admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(frontendPath, "admin.html"));
});

// API routes
app.use("/api/auth", auth);
app.use("/api/posts", posts);
app.use("/api/users", users);
app.use("/api/admin", admin);
app.use("/api/notifications", notifications);
// Frontend fallback — keep this last
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "API route not found." });
  }

  res.sendFile(path.join(frontendPath, "index.html"));
});

// Start only after MongoDB connects
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CLIQO running at http://localhost:${PORT}`);
      console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed!");
    console.error(error.message);
    process.exit(1);
  });
