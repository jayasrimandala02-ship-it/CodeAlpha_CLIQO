
const $ = (id) => document.getElementById(id);

const state = {
  token: localStorage.getItem("cliqo_token") || "",
  user: null,
  mode: "login",
  posts: [],
  filter: "all",
  savedMode: false
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $("toast").classList.add("hidden"), 3000);
}

function msg(message) {
  $("authMessage").textContent = message;
  $("authMessage").classList.toggle("hidden", !message);
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };

  if (state.token) {
    headers.Authorization = "Bearer " + state.token;
  }

  if (!(opts.body instanceof FormData) && opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch("/api" + path, {
    ...opts,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw Error(data.message || "Request failed");
  }

  return data;
}

// AUTH MODAL

function openAuth(mode = "login") {
  state.mode = mode;
  updateMode();
  msg("");
  $("passwordInput").value = "";
  $("authModal").classList.remove("hidden");
}

function updateMode() {
  const reg = state.mode === "register";

  $("modalTitle").textContent = reg
    ? "Find your people"
    : "Welcome back";

  $("modalSub").textContent = reg
    ? "Create your CLIQO account and join the conversation."
    : "Sign in to your little corner of the internet.";

  $("registerTab").classList.toggle("active", reg);
  $("loginTab").classList.toggle("active", !reg);

  ["nameWrap", "usernameWrap"].forEach(id => {
    $(id).classList.toggle("hidden", !reg);
  });

  $("emailWrap").classList.toggle("hidden", !reg);
  $("loginNameWrap").classList.toggle("hidden", reg);

  $("emailInput").required = reg;
  $("loginNameInput").required = !reg;

  $("submitAuth").textContent = reg
    ? "Create my account ↗"
    : "Log in";
}

// HEADER

function header() {
  ["openLogin", "openRegister"].forEach(id => {
    $(id).classList.toggle("hidden", !!state.user);
  });

  $("logoutBtn").classList.toggle("hidden", !state.user);
  $("composer").classList.toggle("hidden", !state.user);
  $("savedTab").classList.toggle("hidden", !state.user);
  $("mobileNav").classList.toggle("hidden", !state.user);

  if (state.user) {
    $("composerAvatar").textContent =
      (state.user.name || "U")[0].toUpperCase();
  }
}

async function loadMe() {
  if (!state.token) return;

  try {
    state.user = await api("/users/me");
  } catch (error) {
    state.token = "";
    state.user = null;
    localStorage.removeItem("cliqo_token");
  }

  header();
}

// TIME AGO

function ago(date) {
  const seconds = Math.max(
    0,
    (Date.now() - new Date(date).getTime()) / 1000
  );

  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";

  return Math.floor(seconds / 86400) + "d ago";
}

// RENDER POSTS

function render() {
  if (!state.posts.length) {
    $("posts").innerHTML = `
      <div class="empty">
        <strong>Nothing here just yet ✨</strong>
        Be the first to share a moment with the CLIQO community.
      </div>
    `;
    return;
  }

  $("posts").innerHTML = state.posts.map(p => {
    const author = p.author || {
      id: "",
      name: "CLIQO member",
      username: "member"
    };

    let media = "";

    if (p.mediaUrl) {
      let url = "";

      try {
        const parsed = new URL(p.mediaUrl, location.origin);

        if (["http:", "https:"].includes(parsed.protocol)) {
          url = parsed.href;
        }
      } catch (error) {
        url = "";
      }

      if (url) {
        media = p.mediaType === "video"
          ? `<video class="postvideo" src="${esc(url)}" controls playsinline preload="metadata"></video>`
          : `<img class="postimage" src="${esc(url)}" alt="Post photo" loading="lazy" onerror="this.remove()">`;
      }
    }

    const commentsHTML = (p.comments || []).map(c => {
      const isMine = Boolean(
        state.user &&
        (
          c.isMine ||
          (c.author && String(state.user.id) === String(c.author.id))
        )
      );

      return `
        <div class="comment" data-comment-id="${esc(c.id)}">
          <div class="comment-content">
            <strong>${esc(c.author?.name || "Member")}</strong>
            <span class="comment-text">${esc(c.text)}</span>
          </div>

          ${isMine ? `
            <div class="comment-actions">
              <button type="button" class="action"
                data-action="edit-comment"
                data-comment-id="${esc(c.id)}">Edit</button>

              <button type="button" class="action"
                data-action="delete-comment"
                data-comment-id="${esc(c.id)}">Delete</button>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    const isPostOwner = state.user &&
      String(state.user.id) === String(author.id);

    return `
      <article class="post" data-id="${esc(p.id)}">

        <div class="posthead">
          <div class="avatar">
            ${esc((author.name || "C")[0].toUpperCase())}
          </div>

          <div>
            <div class="author">${esc(author.name)}</div>
            <div class="handle">@${esc(author.username)}</div>
          </div>

          <time class="date">${esc(ago(p.createdAt))}</time>
        </div>

        ${p.text ? `<p class="posttext">${esc(p.text)}</p>` : ""}
        ${media}

        <div class="postactions">
          <button class="action ${p.likedByMe ? "liked" : ""}"
            data-action="like">
            ♡ ${Number(p.likesCount || 0)} Likes
          </button>

          <button class="action ${p.savedByMe ? "liked" : ""}"
            data-action="save">
            ${p.savedByMe ? "★ Saved" : "☆ Save"}
          </button>

          <span class="date">
            ${(p.comments || []).length} comments
          </span>

          ${isPostOwner ? `
            <button class="action" data-action="delete">Delete</button>
          ` : ""}

          <button class="action" data-action="profile">Profile</button>
        </div>

        <div class="commentlist">
          ${commentsHTML}
        </div>

        ${state.user ? `
          <form class="commentform">
            <input name="comment" maxlength="500"
              placeholder="Write a kind comment..." required>
            <button type="submit">Send</button>
          </form>
        ` : `
          <p class="handle">Log in to like and comment.</p>
        `}

      </article>
    `;
  }).join("");
}

// LOAD POSTS

async function loadPosts() {
  try {
    const suffix = state.savedMode
      ? "/saved/mine"
      : state.filter === "all"
        ? "/"
        : `/?type=${encodeURIComponent(state.filter)}`;

    const result = await api("/posts" + suffix);

    state.posts = Array.isArray(result) ? result : [];
    render();

  } catch (error) {
    $("posts").innerHTML = `
      <div class="empty">
        <strong>Could not load the feed</strong>
        ${esc(error.message)}
      </div>
    `;
  }
}

// FEED FILTERS

function setFilter(filter, saved = false) {
  state.filter = filter;
  state.savedMode = saved;

  document.querySelectorAll(".filter[data-filter]").forEach(button => {
    button.classList.toggle(
      "active",
      !saved && button.dataset.filter === filter
    );
  });

  $("savedTab").classList.toggle("active", saved);

  $("feedTitle").textContent = saved
    ? "Saved posts"
    : filter === "image"
      ? "Photos"
      : filter === "video"
        ? "Reels"
        : "Explore posts";

  $("profilePanel").classList.add("hidden");

  loadPosts();
}

// AUTH CONTROLS

$("openLogin").onclick = () => openAuth("login");
$("openRegister").onclick = () => openAuth("register");

$("heroJoin").onclick = () => {
  openAuth(state.user ? "login" : "register");
};

$("loginTab").onclick = () => {
  state.mode = "login";
  updateMode();
  msg("");
};

$("registerTab").onclick = () => {
  state.mode = "register";
  updateMode();
  msg("");
};

$("closeModal").onclick = () => {
  $("authModal").classList.add("hidden");
};

$("authModal").onclick = event => {
  if (event.target.dataset.close) {
    $("authModal").classList.add("hidden");
  }
};

document.onkeydown = event => {
  if (event.key === "Escape") {
    $("authModal").classList.add("hidden");
    $("profileEditModal").classList.add("hidden");
  }
};

// LOGIN AND REGISTER

$("authForm").onsubmit = async event => {
  event.preventDefault();
  msg("");

  const reg = state.mode === "register";

  const body = reg
    ? {
        name: $("nameInput").value.trim(),
        username: $("usernameInput").value.trim(),
        email: $("emailInput").value.trim(),
        password: $("passwordInput").value
      }
    : {
        emailOrUsername: $("loginNameInput").value.trim(),
        password: $("passwordInput").value
      };

  $("submitAuth").disabled = true;

  try {
    const data = await api(
      reg ? "/auth/register" : "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    );

    state.token = data.token;
    state.user = data.user;

    localStorage.setItem("cliqo_token", data.token);

    $("authModal").classList.add("hidden");

    header();
    activateScreen("home");

    toast(reg ? "Welcome to CLIQO 💜" : "Welcome back! 💜");

  } catch (error) {
    msg(error.message);
  } finally {
    $("submitAuth").disabled = false;
  }
};

// LOGOUT

$("logoutBtn").onclick = () => {
  state.token = "";
  state.user = null;
  state.savedMode = false;

  localStorage.removeItem("cliqo_token");

  header();

  document.body.classList.remove("app-mode");
  document.body.removeAttribute("data-screen");

  $("landingHero").classList.remove("hidden");
  $("landingFeatures").classList.remove("hidden");

  $("profilePanel").classList.add("hidden");
  $("notificationsPanel").classList.add("hidden");
  $("posts").classList.remove("hidden");
  $("searchbar").classList.remove("hidden");
  $("feedtabs").classList.remove("hidden");
  $("composer").classList.add("hidden");

  loadPosts();

  toast("You have logged out.");
};

// MEDIA UPLOAD

$("mediaFile").onchange = () => {
  const file = $("mediaFile").files[0];

  $("fileHint").textContent = file
    ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
    : "Images or videos up to 50 MB";
};

// CREATE POST

$("publishPost").onclick = async () => {
  const text = $("postText").value.trim();
  const file = $("mediaFile").files[0];
  const mediaUrl = $("mediaUrl").value.trim();

  if (!text && !file && !mediaUrl) {
    return toast("Add a caption or choose a photo/video.");
  }

  if (file && file.size > 50 * 1024 * 1024) {
    return toast("File must be 50 MB or smaller.");
  }

  const fd = new FormData();
  fd.append("text", text);

  if (file) fd.append("media", file);

  if (mediaUrl) {
    fd.append("mediaUrl", mediaUrl);
    fd.append(
      "mediaType",
      /\.(mp4|webm|mov)(\?.*)?$/i.test(mediaUrl)
        ? "video"
        : "image"
    );
  }

  $("publishPost").disabled = true;

  try {
    await api("/posts", {
      method: "POST",
      body: fd
    });

    $("postText").value = "";
    $("mediaFile").value = "";
    $("mediaUrl").value = "";
    $("fileHint").textContent = "Images or videos up to 50 MB";

    activateScreen("home");
    toast("Your moment is live ✨");

  } catch (error) {
    toast(error.message);
  } finally {
    $("publishPost").disabled = false;
  }
};

// POST ACTIONS

$("posts").onclick = async event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const card = button.closest("[data-id]");
  if (!card) return;

  const postId = card.dataset.id;
  const action = button.dataset.action;

  if (action === "profile") {
    const post = state.posts.find(
      p => String(p.id) === String(postId)
    );

    if (post?.author?.id) {
      activateScreen("profile", post.author.id);
    }
    return;
  }

  if (action === "cancel-edit") {
    await loadPosts();
    return;
  }

  if (!state.user) {
    openAuth("login");
    return;
  }

  try {
    if (action === "like") {
      await api(`/posts/${postId}/like`, {
        method: "POST",
        body: "{}"
      });
      await loadPosts();
      return;
    }

    if (action === "save") {
      await api(`/posts/${postId}/save`, {
        method: "POST",
        body: "{}"
      });
      await loadPosts();
      toast("Saved posts updated.");
      return;
    }

    if (action === "delete") {
      if (!confirm("Delete this post?")) return;

      await api(`/posts/${postId}`, {
        method: "DELETE"
      });

      await loadPosts();
      toast("Post deleted.");
      return;
    }

    // EDIT COMMENT

    if (action === "edit-comment") {
      const commentId = button.dataset.commentId;

      const post = state.posts.find(
        p => String(p.id) === String(postId)
      );

      const comment = post?.comments?.find(
        c => String(c.id) === String(commentId)
      );

      if (!comment) {
        toast("Comment not found.");
        return;
      }

      const commentBox = button.closest(".comment");
      const content = commentBox.querySelector(".comment-content");

      content.innerHTML = `
        <form class="edit-comment-form">
          <textarea name="editedText"
            maxlength="500" required>${esc(comment.text)}</textarea>

          <div class="edit-comment-actions">
            <button type="submit">Save</button>
            <button type="button" data-action="cancel-edit">
              Cancel
            </button>
          </div>
        </form>
      `;

      content.querySelector("textarea").focus();
      return;
    }

    // DELETE COMMENT

    if (action === "delete-comment") {
      const commentId = button.dataset.commentId;

      if (!confirm("Are you sure you want to delete this comment?")) {
        return;
      }

      await api(`/posts/${postId}/comments/${commentId}`, {
        method: "DELETE"
      });

      await loadPosts();
      toast("Comment deleted 💗");
    }

  } catch (error) {
    toast(error.message);
  }
};

// ADD COMMENT AND SAVE EDITED COMMENT

$("posts").onsubmit = async event => {
  const form = event.target;

  // SAVE EDITED COMMENT

  if (form.matches(".edit-comment-form")) {
    event.preventDefault();

    const card = form.closest("[data-id]");
    const comment = form.closest(".comment");

    const commentId = comment.dataset.commentId;
    const text = form.elements.editedText.value.trim();

    if (!text) {
      toast("Comment cannot be empty.");
      return;
    }

    const saveButton = form.querySelector('[type="submit"]');
    saveButton.disabled = true;

    try {
      await api(
        `/posts/${card.dataset.id}/comments/${commentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ text })
        }
      );

      await loadPosts();
      toast("Comment updated 💗");

    } catch (error) {
      toast(error.message);
      saveButton.disabled = false;
    }

    return;
  }

  // ADD NEW COMMENT

  if (!form.matches(".commentform")) return;

  event.preventDefault();

  const card = form.closest("[data-id]");
  const text = form.elements.comment.value.trim();

  if (!text) return;

  const sendButton = form.querySelector("button");
  sendButton.disabled = true;

  try {
    await api(`/posts/${card.dataset.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ text })
    });

    await loadPosts();
    toast("Comment added 💗");

  } catch (error) {
    toast(error.message);
  } finally {
    sendButton.disabled = false;
  }
};

// FEED FILTER BUTTONS

document.querySelectorAll(".filter[data-filter]").forEach(button => {
  button.onclick = () => setFilter(button.dataset.filter);
});

$("savedTab").onclick = () => {
  if (!state.user) {
    openAuth("login");
    return;
  }

  setFilter("all", true);
};

// SEARCH USERS

let searchTimer;

$("userSearch").oninput = () => {
  clearTimeout(searchTimer);

  const query = $("userSearch").value.trim();

  searchTimer = setTimeout(async () => {
    if (!query) {
      $("searchResults").innerHTML = "";
      return;
    }

    try {
      const users = await api(
        "/users/search?q=" + encodeURIComponent(query)
      );

      $("searchResults").className = "searchresults";

      $("searchResults").innerHTML = users.map(user => `
        <div class="searchuser" data-user="${esc(user.id)}">
          <div class="avatar">
            ${esc((user.name || "U")[0].toUpperCase())}
          </div>

          <div>
            <strong>${esc(user.name)}</strong>
            <div class="handle">
              @${esc(user.username)} · ${Number(user.followersCount || 0)} followers
            </div>
          </div>

          <button class="action" data-profile="${esc(user.id)}">
            View profile
          </button>
        </div>
      `).join("") || "No people found.";

    } catch (error) {
      toast(error.message);
    }
  }, 250);
};

$("searchResults").onclick = event => {
  const button = event.target.closest("[data-profile]");

  if (button) {
    activateScreen("profile", button.dataset.profile);
  }
};

// FOLLOWERS AND FOLLOWING

async function showPeopleList(userId, type) {
  const panel = $("profilePanel");

  try {
    const data = await api(`/users/${userId}/${type}`);
    const users = data.users || [];

    const title = type === "followers"
      ? "Followers"
      : "Following";

    const listHTML = users.length
      ? users.map(person => `
          <div class="person-row">
            <button class="person-info"
              data-open-profile="${esc(person.id)}">

              <span class="avatar">
                ${esc((person.name || "U")[0].toUpperCase())}
              </span>

              <span>
                <strong>${esc(person.name)}</strong>
                <span class="handle">@${esc(person.username)}</span>
              </span>
            </button>

            ${
              state.user &&
              String(state.user.id) !== String(person.id)
                ? `
                  <button
                    class="btn ${person.isFollowing ? "following-btn" : "primary"}"
                    data-person-follow="${esc(person.id)}">
                    ${person.isFollowing ? "Following" : "Follow"}
                  </button>
                `
                : ""
            }
          </div>
        `).join("")
      : `<p class="empty">No ${title.toLowerCase()} yet.</p>`;

    panel.querySelector("#peopleListArea").innerHTML = `
      <div class="people-heading">
        <h3>${title}</h3>
        <button class="action" id="backToProfile">
          ← Back to profile
        </button>
      </div>

      ${listHTML}
    `;

    panel.querySelector("#backToProfile").onclick = () => {
      showProfile(userId);
    };

    panel.querySelectorAll("[data-open-profile]").forEach(button => {
      button.onclick = () => {
        showProfile(button.dataset.openProfile);
      };
    });

    panel.querySelectorAll("[data-person-follow]").forEach(button => {
      button.onclick = async () => {
        const targetId = button.dataset.personFollow;
        button.disabled = true;

        try {
          const result = await api(`/users/${targetId}/follow`, {
            method: "POST",
            body: "{}"
          });

          toast(result.following
            ? "Following 💗"
            : "Unfollowed 💗"
          );

          await showPeopleList(userId, type);

        } catch (error) {
          toast(error.message);
          button.disabled = false;
        }
      };
    });

  } catch (error) {
    toast(error.message);
  }
}

// SHOW USER PROFILE

async function showProfile(id, switchScreen = true) {
  if (!id) return;

  if (
    switchScreen &&
    state.user &&
    document.body.dataset.screen !== "profile"
  ) {
    activateScreen("profile", id);
    return;
  }

  const panel = $("profilePanel");

  try {
    const user = await api(
      "/users/" + encodeURIComponent(id)
    );

    const mine = state.user &&
      String(state.user.id) === String(user.id);

    panel.classList.remove("hidden");

    panel.innerHTML = `
      <div class="profiletop profile-hero">

        <div class="profile-avatar">
          ${
            user.avatarUrl
              ? `<img src="${esc(user.avatarUrl)}"
                  alt="Profile photo"
                  onerror="this.style.display='none'">`
              : esc((user.name || "U")[0].toUpperCase())
          }
        </div>

        <div class="profile-identity">
          <h3>${esc(user.name)}</h3>
          <div class="handle">@${esc(user.username)}</div>
        </div>

        ${
          !mine && state.user
            ? `
              <button
                class="btn ${user.isFollowing ? "following-btn" : "primary"}"
                id="followBtn">
                ${user.isFollowing ? "Following" : "Follow"}
              </button>
            `
            : ""
        }
      </div>

      <p class="profile-bio">
        ${esc(user.bio || "Finding my people on CLIQO.")}
      </p>

      <div class="profile-stats">
        <div class="profile-stat">
          <strong id="profilePostCount">0</strong>
          <span>Posts</span>
        </div>

        <button class="profile-stat" id="showFollowers">
          <strong>${Number(user.followersCount || 0)}</strong>
          <span>Followers</span>
        </button>

        <button class="profile-stat" id="showFollowing">
          <strong>${Number(user.followingCount || 0)}</strong>
          <span>Following</span>
        </button>
      </div>

      <div class="profile-tools">
        ${
          mine
            ? `
              <button class="btn light" id="editProfileBtn">
                Edit profile
              </button>
              <button class="btn light" id="shareProfileBtn">
                Share profile
              </button>
            `
            : `
              <button class="btn light" id="shareProfileBtn">
                Share profile
              </button>
            `
        }
      </div>

      <div class="profile-tabs">
        <button class="active" data-profile-tab="posts">▦ Posts</button>

        ${
          mine
            ? `<button data-profile-tab="saved">☆ Saved</button>`
            : ""
        }

        <button data-profile-tab="tagged">♧ Tagged</button>
      </div>

      <div id="profileGrid" class="profile-grid"></div>
      <div id="peopleListArea"></div>
    `;

    panel.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    $("showFollowers").onclick = () => {
      showPeopleList(user.id, "followers");
    };

    $("showFollowing").onclick = () => {
      showPeopleList(user.id, "following");
    };

    const grid = $("profileGrid");

    const profilePosts = await api(
      "/posts?author=" + encodeURIComponent(user.id)
    );

    $("profilePostCount").textContent = profilePosts.length;

    // PROFILE GRID

    const showGrid = items => {
      grid.innerHTML = items.length
        ? items.map(post => `
            <button class="profile-tile"
              data-open-post="${esc(post.id)}">

              ${
                post.mediaUrl
                  ? post.mediaType === "video"
                    ? `
                      <span class="tile-reel">▷</span>
                      <video src="${esc(post.mediaUrl)}" muted></video>
                    `
                    : `<img src="${esc(post.mediaUrl)}" alt="Post">`
                  : `
                    <span class="tile-caption">
                      ${esc(post.text || "CLIQO")}
                    </span>
                  `
              }
            </button>
          `).join("")
        : `<p class="empty">No posts to show yet.</p>`;
    };

    showGrid(profilePosts);

    // PROFILE TABS

    panel.querySelectorAll("[data-profile-tab]").forEach(tab => {
      tab.onclick = async () => {
        panel.querySelectorAll("[data-profile-tab]").forEach(item => {
          item.classList.toggle("active", item === tab);
        });

        try {
          if (tab.dataset.profileTab === "saved" && mine) {
            const saved = await api("/posts/saved/mine");
            showGrid(saved);
          } else if (tab.dataset.profileTab === "posts") {
            showGrid(profilePosts);
          } else {
            grid.innerHTML = `
              <p class="empty">Tagged posts will appear here.</p>
            `;
          }
        } catch (error) {
          toast(error.message);
        }
      };
    });

    // OPEN PROFILE POST

    grid.onclick = event => {
      const tile = event.target.closest("[data-open-post]");
      if (!tile) return;

      const post = profilePosts.find(
        item => String(item.id) === tile.dataset.openPost
      );

      if (post) {
        activateScreen("home");
      }
    };

    // EDIT PROFILE

    const editBtn = $("editProfileBtn");

    if (editBtn) {
      editBtn.onclick = () => {
        $("editDisplayName").value = user.name || "";
        $("editBio").value = user.bio || "";
        $("editAvatarUrl").value = user.avatarUrl || "";

        $("profileEditMessage").classList.add("hidden");
        $("profileEditModal").classList.remove("hidden");

        $("editDisplayName").focus();
      };
    }

    // SHARE PROFILE - NO PROMPT

    const shareBtn = $("shareProfileBtn");

    if (shareBtn) {
      shareBtn.onclick = async () => {
        const link = location.origin +
          "/?profile=" + encodeURIComponent(user.id);

        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(link);
          } else {
            const input = document.createElement("textarea");

            input.value = link;
            input.style.position = "fixed";
            input.style.opacity = "0";

            document.body.appendChild(input);
            input.select();

            const copied = document.execCommand("copy");
            input.remove();

            if (!copied) {
              throw new Error("Clipboard copy failed");
            }
          }

          toast("Profile link copied 💗");

        } catch (error) {
          toast("Could not copy link. Profile URL: " + link);
        }
      };
    }

    // FOLLOW PROFILE

    const followButton = $("followBtn");

    if (followButton) {
      followButton.onclick = async () => {
        followButton.disabled = true;

        try {
          const result = await api(`/users/${user.id}/follow`, {
            method: "POST",
            body: "{}"
          });

          toast(result.following
            ? "Following 💗"
            : "Unfollowed 💗"
          );

          await showProfile(user.id, false);

        } catch (error) {
          toast(error.message);
          followButton.disabled = false;
        }
      };
    }

  } catch (error) {
    toast(error.message);
  }
}

// PROFILE EDIT MODAL

function closeProfileEditor() {
  $("profileEditModal").classList.add("hidden");
}

$("closeProfileEdit").addEventListener(
  "click",
  closeProfileEditor
);

$("profileEditModal").addEventListener("click", event => {
  if (event.target.dataset.profileClose) {
    closeProfileEditor();
  }
});

// SAVE PROFILE CHANGES

$("profileEditForm").addEventListener("submit", async event => {
  event.preventDefault();

  const name = $("editDisplayName").value.trim();
  const bio = $("editBio").value.trim();
  const avatarUrl = $("editAvatarUrl").value.trim();

  const message = $("profileEditMessage");

  if (!name) {
    message.textContent = "Please enter your display name.";
    message.classList.remove("hidden");
    return;
  }

  try {
    state.user = await api("/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        name,
        bio,
        avatarUrl
      })
    });

    closeProfileEditor();
    header();

    toast("Profile updated 💗");

    await showProfile(state.user.id, false);

  } catch (error) {
    message.textContent = error.message;
    message.classList.remove("hidden");
  }
});

// NOTIFICATIONS

async function loadNotifications(markAsRead = true) {
  const panel = $("notificationsPanel");

  try {
    if (markAsRead) {
      await api("/notifications/read-all", {
        method: "PATCH"
      });
    }

    const data = await api("/notifications");

    const badge = $("notificationBadge");

    badge.textContent = data.unreadCount > 9
      ? "9+"
      : data.unreadCount;

    badge.classList.toggle(
      "hidden",
      !data.unreadCount
    );

    panel.classList.remove("hidden");

    panel.innerHTML = `
      <div class="notification-heading">
        <div>
          <span class="eyebrow">YOUR COMMUNITY</span>
          <h2>Activity</h2>
        </div>
      </div>

      ${
        data.notifications.length
          ? data.notifications.map(notification => {
              const actor = notification.actor || {
                name: "Someone",
                username: "member"
              };

              const words =
                notification.type === "follow"
                  ? "started following you"
                  : notification.type === "like"
                    ? "liked your post"
                    : "commented on your post";

              return `
                <button
                  class="notification-item ${notification.read ? "" : "unread"}"
                  data-notification="${esc(notification.id)}">

                  <span class="notification-avatar">
                    ${esc((actor.name || "S")[0].toUpperCase())}
                  </span>

                  <span>
                    <strong>${esc(actor.name)}</strong>
                    ${words}

                    <small>
                      @${esc(actor.username)} ·
                      ${esc(ago(notification.createdAt))}
                    </small>
                  </span>

                  <b>
                    ${
                      notification.type === "follow"
                        ? "＋"
                        : notification.type === "like"
                          ? "♡"
                          : "▤"
                    }
                  </b>
                </button>
              `;
            }).join("")
          : `
            <div class="empty">
              No activity yet. When people follow, like or comment,
              you'll see it here. 💗
            </div>
          `
      }
    `;

    panel.querySelectorAll("[data-notification]").forEach(item => {
      item.onclick = async () => {
        const notificationId = item.dataset.notification;

        try {
          await api(`/notifications/${notificationId}/read`, {
            method: "PATCH"
          });

          item.classList.remove("unread");

          const fresh = await api("/notifications");

          badge.textContent = fresh.unreadCount > 9
            ? "9+"
            : fresh.unreadCount;

          badge.classList.toggle(
            "hidden",
            !fresh.unreadCount
          );

        } catch (error) {
          toast(error.message);
        }
      };
    });

  } catch (error) {
    panel.classList.remove("hidden");

    panel.innerHTML = `
      <div class="empty">${esc(error.message)}</div>
    `;
  }
}

// SCREEN NAVIGATION

function activateScreen(target, profileId = null) {
  if (!state.user) {
    openAuth("login");
    return;
  }

  document.body.classList.add("app-mode");
  document.body.dataset.screen = target;

  document.querySelectorAll("[data-nav]").forEach(button => {
    const active = button.dataset.nav === target;

    button.classList.toggle("active", active);

    button.setAttribute(
      "aria-current",
      active ? "page" : "false"
    );
  });

  // HERO AND FEATURES VISIBLE ONLY ON HOME

  const isHome = target === "home";

  $("landingHero").classList.toggle("hidden", !isHome);
  $("landingFeatures").classList.toggle("hidden", !isHome);

  // HIDE ALL SCREEN CONTENT FIRST

  $("profilePanel").classList.add("hidden");
  $("notificationsPanel").classList.add("hidden");
  $("composer").classList.add("hidden");
  $("searchbar").classList.add("hidden");
  $("posts").classList.add("hidden");
  $("feedtabs").classList.add("hidden");

  $("feedTitle").textContent =
    target.charAt(0).toUpperCase() + target.slice(1);

  // HOME

  if (target === "home") {
    $("posts").classList.remove("hidden");
    $("feedtabs").classList.remove("hidden");
    $("searchbar").classList.remove("hidden");
    $("composer").classList.remove("hidden");

    $("feedTitle").textContent = "Home";

    setFilter("all");
  }

  // SEARCH

  else if (target === "search") {
    $("searchbar").classList.remove("hidden");

    $("feedTitle").textContent = "Search";

    $("userSearch").focus();
  }

  // CREATE

  else if (target === "create") {
    $("composer").classList.remove("hidden");

    $("feedTitle").textContent = "Create a post";

    $("postText").focus();
  }

  // NOTIFICATIONS

  else if (target === "notifications") {
    $("notificationsPanel").classList.remove("hidden");

    $("feedTitle").textContent = "Activity";

    loadNotifications();
  }

  // PROFILE

  else if (target === "profile") {
    $("profilePanel").classList.remove("hidden");

    $("feedTitle").textContent = "Profile";

    showProfile(profileId || state.user.id, false);
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// NAVIGATION BUTTONS

document.querySelectorAll("[data-nav]").forEach(button => {
  button.onclick = () => {
    activateScreen(button.dataset.nav);
  };
});

// START APPLICATION

(async function startApplication() {
  header();

  await loadMe();

  header();

  await loadPosts();

  if (state.user) {
    const requestedProfile =
      new URLSearchParams(location.search).get("profile");

    if (requestedProfile) {
      activateScreen("profile", requestedProfile);
    } else {
      activateScreen("home");
    }

    loadNotifications(false);
  }

  toast("Welcome to CLIQO 💜");
})();
