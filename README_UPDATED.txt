CLIQO — Updated Social Media Platform
======================================

This project is an Express + MongoDB social platform with a lavender/pink CLIQO identity.

Included in this update
-----------------------
- Landing page expanded to match the supplied CLIQO screenshot: large white hero, CLIQO branding, persistent tagline, pink/lavender feature cards.
- Original palette retained: purple #30203f, pink #f3a2c0, lavender #eee5ff.
- Single-page Instagram-inspired navigation: Home, Search, Reels, Activity, Profile.
- Existing authentication, post publishing, photo/video uploads, likes, saved posts, follow/unfollow, followers/following, and admin dashboard retained.
- Own comments can be edited or deleted; backend ownership checks are enforced.
- Profile includes bio, follower/following counts, posts, saved posts, Edit Profile and Share Profile.
- Edit Profile now opens an in-app form instead of browser prompt dialogs.
- Opening Activity marks notifications as read automatically and refreshes the unread badge. Loading the app in the background does not mark notifications read.
- Toast messages remain at the bottom and automatically disappear after 3 seconds.
- Header tagline is permanent static text and does not disappear.

Run locally
-----------
1. Install Node.js (LTS) and MongoDB.
2. Open this folder in VS Code / terminal.
3. Run: npm install
4. Create a `.env` file in the project root with:

   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/cliqo
   JWT_SECRET=replace_this_with_a_long_random_secret
   CORS_ALLOWED_ORIGINS=http://localhost:5000

5. Start MongoDB.
6. Run: npm start
7. Open: http://localhost:5000

Admin
-----
Use the existing backend/scripts/createAdmin.js or makeAdmin.js workflow included in the project. Read the script before running it and provide the account details it requests.

Notes
-----
- This is an Instagram-inspired independent app, not Instagram itself and it does not connect to Instagram accounts.
- Real-time chat, Stories, and a full production Reels recommendation system are not present in this supplied starter project.
- The app requires a working MongoDB connection and a configured `.env` file; those are environment-specific and are not included in the ZIP.
