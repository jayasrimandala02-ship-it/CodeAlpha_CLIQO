# CLIQO — Social Media Starter
A responsive social media starter built with HTML, CSS, vanilla JavaScript, Node.js, Express and MongoDB.

## Features
- Register, login, logout (bcrypt password hashing + JWT)
- Create text/photo/video posts using an uploaded file or image/video URL
- Separate All posts, Photos and Reels feeds
- Like/unlike posts, comment on posts
- Profiles, user search, follow/unfollow, followers/following counts
- Save/unsave posts for the signed-in user
- Delete your own posts
- Responsive lavender, pink, purple and white UI

## Run
1. Install Node.js 18 or newer.
2. Open this folder in VS Code.
3. Run `npm.cmd install`
4. Copy `.env.example` to `.env` in this root folder.
5. Put your MongoDB connection string in `MONGODB_URI` and a long random value in `JWT_SECRET`.
6. Run `npm.cmd run dev`
7. Open http://localhost:5000

Uploads are saved locally under `backend/uploads`; for production, use object storage (e.g. S3/Cloudinary) because local disk may be ephemeral. Keep `.env` private and never commit it. This is a starter; add production security controls, moderation, rate limits and validation before public launch.