# CLIQO – Your World. Your People.

CLIQO is a social media web application designed to connect people, encourage interaction, and create a simple and engaging online community.

Users can create accounts, log in, share posts, interact with content, and explore other profiles through a user-friendly interface.

## 🚀 Features

- User Registration and Login
- Secure Authentication
- User Profiles
- Create and Share Posts
- Like and Comment on Posts
- Edit Comments
- Explore Other Users
- Profile Sharing
- Responsive User Interface

## 🛠️ Technologies Used

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB
- Mongoose

**Tools**
- Git
- GitHub
- Visual Studio Code
- npm

## 📁 Project Structure

```text
CLIQO/
│
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── script.js
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jayasrimandala02-ship-it/CodeAlpha_CLIQO.git
```

### 2. Navigate to the Project Folder

```bash
cd CodeAlpha_CLIQO
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root directory.

Add the required configuration variables:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Use the exact variable names expected by your backend code. Never upload your actual `.env` file or secrets to GitHub.

### 5. Start the Application

```bash
npm start
```

For development:

```bash
npm run dev
```

## 🔐 Security

- Sensitive credentials are stored in environment variables.
- `.env` and `node_modules` are excluded from Git using `.gitignore`.
- Authentication is handled through the backend.

## 🔮 Future Enhancements

- Real-time Chat
- Notifications
- Follow and Unfollow Users
- Image and Video Uploads
- Advanced Search
- Direct Messaging
- Improved Mobile Experience

## 👩‍💻 Author

**Jayashree**

GitHub: [@jayasrimandala02-ship-it](https://github.com/jayasrimandala02-ship-it)

## ⭐ Support

If you like this project, consider giving the repository a star!

---

**CLIQO – Your World. Your People.**