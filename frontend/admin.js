
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector) => document.querySelector(selector);

  const loginPage = $("#loginPage");
  const dashboardPage = $("#dashboardPage");
  const loginForm = $("#adminLoginForm");
  const usernameInput = $("#emailOrUsername");
  const passwordInput = $("#password");
  const togglePassword = $("#togglePassword");
  const loginButton = $("#loginButton");
  const loginButtonText = $("#loginButtonText");
  const loginMessage = $("#loginMessage");
  const dashboardMessage = $("#dashboardMessage");

  const TOKEN_KEY = "cliqo_admin_token";
  let adminInfo = null;
  let allUsers = [];
  let allPosts = [];

  function showLogin(message = "", isError = true) {
    dashboardPage.hidden = true;
    loginPage.hidden = false;

    loginMessage.textContent = message;
    loginMessage.className = "form-message" + (message ? (isError ? " error" : " success") : "");

    if (message) {
      passwordInput.focus();
    }
  }

  function showDashboard() {
    loginPage.hidden = true;
    dashboardPage.hidden = false;

    const name = adminInfo?.name || adminInfo?.username || "Administrator";

    $("#sidebarAdminName").textContent = name;
    $("#adminAvatar").textContent = name.charAt(0).toUpperCase();
    $("#welcomeTitle").textContent = `Welcome back, ${name}`;

    showSection("overview");
  }

  function setLoginLoading(loading) {
    loginButton.disabled = loading;
    loginButtonText.textContent = loading ? "Verifying..." : "Sign in to dashboard";
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  async function apiRequest(url, options = {}) {
    const token = sessionStorage.getItem(TOKEN_KEY);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      throw new Error(
        data.message || "Admin access denied. Please sign in again."
      );
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
  }

  // Show / hide password
  togglePassword.addEventListener("click", () => {
    const showing = passwordInput.type === "text";

    passwordInput.type = showing ? "password" : "text";
    togglePassword.textContent = showing ? "Show" : "Hide";
    togglePassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    togglePassword.setAttribute("aria-pressed", String(!showing));
  });

  // Admin login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailOrUsername = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!emailOrUsername || !password) {
      showLogin("Please enter your username/email and password.");
      return;
    }

    setLoginLoading(true);
    showLogin("");

    try {
      const loginData = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ emailOrUsername, password }),
      });

      if (!loginData.token) {
        throw new Error("Login succeeded but no session token was returned.");
      }

      sessionStorage.setItem(TOKEN_KEY, loginData.token);

      // Confirm this account really has administrator access.
      const verification = await apiRequest("/api/admin/verify");

      adminInfo = verification.admin;

      if (!adminInfo || adminInfo.role !== "admin") {
        throw new Error("This account does not have administrator access.");
      }

      passwordInput.value = "";
      showDashboard();
      await loadDashboard();
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      adminInfo = null;
      showLogin(error.message || "Could not sign in. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  });

  // Switch between dashboard sections
  function showSection(section) {
    const sections = {
      overview: $("#overviewSection"),
      users: $("#usersSection"),
      posts: $("#postsSection"),
    };

    Object.entries(sections).forEach(([name, element]) => {
      element.hidden = name !== section;
    });

    document.querySelectorAll("[data-section]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.section === section && button.classList.contains("nav-link")
      );
    });

    $("#pageTitle").textContent = {
      overview: "Dashboard overview",
      users: "Community users",
      posts: "Community posts",
    }[section] || "Dashboard";

    dashboardMessage.textContent = "";

    if (section === "users") loadUsers();
    if (section === "posts") loadPosts();
  }

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });

  async function loadDashboard() {
    dashboardMessage.textContent = "";

    try {
      const data = await apiRequest("/api/admin/stats");
      const stats = data.stats || {};

      $("#totalUsers").textContent = stats.totalUsers ?? 0;
      $("#totalPosts").textContent = stats.totalPosts ?? 0;
      $("#totalAdmins").textContent = stats.totalAdmins ?? stats.admins ?? 0;

      renderRecentUsers(data.recentUsers || []);
      renderRecentPosts(data.recentPosts || []);
    } catch (error) {
      dashboardMessage.textContent = error.message;
    }
  }

  function renderRecentUsers(users) {
    const body = $("#recentUsersBody");

    if (!users.length) {
      body.innerHTML = '<tr><td colspan="3" class="empty-state">No users found.</td></tr>';
      return;
    }

    body.innerHTML = users.map((user) => `
      <tr>
        <td>
          <div class="member-cell">
            <span class="member-avatar">${escapeHTML((user.name || user.username || "U").charAt(0).toUpperCase())}</span>
            <span>${escapeHTML(user.name || "Unnamed user")}</span>
          </div>
        </td>
        <td><span class="role-pill ${user.role === "admin" ? "" : "user"}">${escapeHTML(user.role || "user")}</span></td>
        <td>${escapeHTML(formatDate(user.createdAt))}</td>
      </tr>
    `).join("");
  }

  function renderRecentPosts(posts) {
    const container = $("#recentPostsList");

    if (!posts.length) {
      container.innerHTML = '<p class="empty-state">No posts found.</p>';
      return;
    }

    container.innerHTML = posts.map((post) => `
      <article class="post-item">
        <strong>${escapeHTML(post.username || post.authorName || post.user?.username || "Community member")}</strong>
        <p>${escapeHTML(post.content || post.caption || post.text || "No text content")}</p>
        <small>${escapeHTML(formatDate(post.createdAt))}</small>
      </article>
    `).join("");
  }

  async function loadUsers() {
    const body = $("#allUsersBody");
    body.innerHTML = '<tr><td colspan="5" class="empty-state">Loading users…</td></tr>';

    try {
      const data = await apiRequest("/api/admin/users");
      allUsers = data.users || [];

      if (!allUsers.length) {
        body.innerHTML = '<tr><td colspan="5" class="empty-state">No users found.</td></tr>';
        return;
      }

      body.innerHTML = allUsers.map((user) => `
        <tr>
          <td>${escapeHTML(user.name || "—")}</td>
          <td>${escapeHTML(user.username || "—")}</td>
          <td>${escapeHTML(user.email || "—")}</td>
          <td><span class="role-pill ${user.role === "admin" ? "" : "user"}">${escapeHTML(user.role || "user")}</span></td>
          <td>${escapeHTML(formatDate(user.createdAt))}</td>
        </tr>
      `).join("");
    } catch (error) {
      body.innerHTML = `<tr><td colspan="5" class="empty-state">${escapeHTML(error.message)}</td></tr>`;
    }
  }

  async function loadPosts() {
    const container = $("#allPostsList");
    container.innerHTML = '<p class="empty-state">Loading posts…</p>';

    try {
      const data = await apiRequest("/api/admin/posts");
      allPosts = data.posts || [];

      if (!allPosts.length) {
        container.innerHTML = '<p class="empty-state">No posts found.</p>';
        return;
      }

      container.innerHTML = allPosts.map((post) => `
        <article class="post-item">
          <strong>${escapeHTML(post.username || post.authorName || post.user?.username || "Community member")}</strong>
          <p>${escapeHTML(post.content || post.caption || post.text || "No text content")}</p>
          <small>Posted: ${escapeHTML(formatDate(post.createdAt))}</small>
        </article>
      `).join("");
    } catch (error) {
      container.innerHTML = `<p class="empty-state">${escapeHTML(error.message)}</p>`;
    }
  }

  $("#refreshUsers").addEventListener("click", loadUsers);
  $("#refreshPosts").addEventListener("click", loadPosts);

  // Logout
  $("#logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    adminInfo = null;
    allUsers = [];
    allPosts = [];
    loginForm.reset();
    passwordInput.type = "password";
    togglePassword.textContent = "Show";
    togglePassword.setAttribute("aria-pressed", "false");
    showLogin("You have been signed out.", false);
  });

  // Restore the session only after server verifies admin access.
  async function restoreSession() {
    const token = sessionStorage.getItem(TOKEN_KEY);

    if (!token) {
      showLogin();
      return;
    }

    try {
      const verification = await apiRequest("/api/admin/verify");
      adminInfo = verification.admin;

      if (!adminInfo || adminInfo.role !== "admin") {
        throw new Error("This account does not have administrator access.");
      }

      showDashboard();
      await loadDashboard();
    } catch {
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin("Please sign in with your administrator account.");
    }
  }

  restoreSession();
});
