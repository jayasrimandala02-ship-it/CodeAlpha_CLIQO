
const requireAuth = require("./auth");

module.exports = function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    console.log("ADMIN ROLE CHECK:", req.user.username, JSON.stringify(req.user.role));
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access only.",
      });
    }

    next();
  });
};
