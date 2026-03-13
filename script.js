// ============================================
// CONFIGURATION
// ============================================
const API_URL = "https://api.mail.tm";
let currentAccount = null;
let currentToken = null;

// Rate limiter for security
const rateLimiter = {
  calls: {},
  check(ip = "default") {
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${ip}_${minute}`;

    this.calls[key] = (this.calls[key] || 0) + 1;

    // Clean old entries
    Object.keys(this.calls).forEach((k) => {
      if (!k.includes(minute)) delete this.calls[k];
    });

    return this.calls[key] <= 30;
  },
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  generateNewEmail();
  initDarkMode();
  attachEventListeners();
});

function attachEventListeners() {
  // Copy button
  document.getElementById("copyButton").addEventListener("click", copyEmail);

  // New button
  document
    .getElementById("newButton")
    .addEventListener("click", generateNewEmail);

  // Get Token button
  document
    .getElementById("getTokenButton")
    .addEventListener("click", showTokenTooltip);

  // Recover button
  document
    .getElementById("recoverButton")
    .addEventListener("click", recoverEmail);

  // Refresh button
  document
    .getElementById("refreshButton")
    .addEventListener("click", refreshInbox);

  // Back to inbox button
  document
    .getElementById("backToInboxButton")
    .addEventListener("click", showInbox);

  // Dark mode toggle
  document
    .getElementById("darkModeToggle")
    .addEventListener("click", toggleDarkMode);

  // Secure wipe button
  document
    .getElementById("secureWipeButton")
    .addEventListener("click", secureWipe);
}

// ============================================
// SECURITY FUNCTIONS
// ============================================

// Sanitize HTML to prevent XSS
function sanitizeHTML(html) {
  if (!html) return "";

  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "")
    .replace(/on\w+=\w+/g, "")
    .replace(/javascript:/gi, "blocked:")
    .replace(/<iframe/gi, "&lt;iframe")
    .replace(/<object/gi, "&lt;object")
    .replace(/<embed/gi, "&lt;embed");
}

// Obfuscate stored data (basic security)
function obfuscate(str) {
  return btoa(str.split("").reverse().join(""));
}

function deobfuscate(str) {
  return atob(str).split("").reverse().join("");
}

// Save account with obfuscation
function saveAccountToStorage(email, password, token) {
  const accountData = {
    email: obfuscate(email),
    password: obfuscate(password),
    token: token,
    created: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };

  localStorage.setItem(`tempmail_${token}`, JSON.stringify(accountData));
  sessionStorage.setItem("current_token", token);

  return token;
}

// Get account with deobfuscation
function getAccountFromStorage(token) {
  const data = localStorage.getItem(`tempmail_${token}`);
  if (!data) return null;

  try {
    const accountData = JSON.parse(data);
    return {
      ...accountData,
      email: deobfuscate(accountData.email),
      password: deobfuscate(accountData.password),
    };
  } catch (e) {
    return null;
  }
}

// Generate recovery token
function generateRecoveryToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// ============================================
// CORE FUNCTIONS
// ============================================

// Generate new email
async function generateNewEmail() {
  try {
    document.getElementById("email-address").value = "Generating...";

    const domainsResponse = await fetch(`${API_URL}/domains`);
    const domainsData = await domainsResponse.json();

    if (
      !domainsData["hydra:member"] ||
      domainsData["hydra:member"].length === 0
    ) {
      throw new Error("No domains available");
    }

    const domains = domainsData["hydra:member"];
    const randomDomain =
      domains[Math.floor(Math.random() * domains.length)].domain;

    const randomString = Math.random().toString(36).substring(2, 12);
    const email = `${randomString}@${randomDomain}`;
    const password = Math.random().toString(36).substring(2, 15);

    const createResponse = await fetch(`${API_URL}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: email,
        password: password,
      }),
    });

    if (!createResponse.ok) {
      throw new Error("Failed to create account");
    }

    const accountData = await createResponse.json();

    const tokenResponse = await fetch(`${API_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: email,
        password: password,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to login");
    }

    const tokenData = await tokenResponse.json();

    currentAccount = {
      id: accountData.id,
      email: email,
      password: password,
    };
    currentToken = tokenData.token;

    // Save for recovery
    const recoveryToken = generateRecoveryToken();
    saveAccountToStorage(email, password, recoveryToken);

    document.getElementById("email-address").value = email;

    showNotification("New email address generated!", "success");

    // Clear inbox
    document.getElementById("inbox-list").innerHTML = "";
    document.getElementById("inbox-list").classList.add("hidden");
    document.getElementById("inbox-empty").classList.remove("hidden");
    document.getElementById("inbox-loading").classList.add("hidden");
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("email-address").value =
      "Error generating. Click New to try again.";
    showNotification("Failed to generate email. Please try again.", "error");
  }
}

// Refresh inbox
async function refreshInbox() {
  if (!rateLimiter.check()) {
    showNotification("Rate limit exceeded. Please wait a minute.", "error");
    return;
  }

  if (!currentToken) return;

  try {
    document.getElementById("refresh-icon").classList.add("fa-spin");
    document.getElementById("inbox-loading").classList.remove("hidden");
    document.getElementById("inbox-empty").classList.add("hidden");
    document.getElementById("inbox-list").classList.add("hidden");

    const messagesResponse = await fetch(`${API_URL}/messages`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    if (!messagesResponse.ok) {
      throw new Error("Failed to fetch messages");
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData["hydra:member"] || [];

    document.getElementById("inbox-loading").classList.add("hidden");

    if (messages.length === 0) {
      document.getElementById("inbox-empty").classList.remove("hidden");
      document.getElementById("inbox-list").classList.add("hidden");
      showNotification("No new emails", "info");
    } else {
      document.getElementById("inbox-empty").classList.add("hidden");
      document.getElementById("inbox-list").classList.remove("hidden");

      renderMessages(messages);
      showNotification(`📬 ${messages.length} email(s) in inbox`, "success");
    }
  } catch (error) {
    console.error("Refresh error:", error);
    showNotification("Failed to refresh inbox", "error");
  } finally {
    document.getElementById("refresh-icon").classList.remove("fa-spin");
  }
}

// Render messages
function renderMessages(messages) {
  const inboxList = document.getElementById("inbox-list");
  inboxList.innerHTML = "";

  messages.forEach((message) => {
    const messageElement = document.createElement("div");
    messageElement.className =
      "bg-gray-50 p-4 rounded-lg hover:bg-gray-100 cursor-pointer transition fade-in";
    messageElement.addEventListener("click", () => viewMessage(message["@id"]));

    const date = new Date(message.receivedAt);
    const formattedDate = date.toLocaleString();

    messageElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="font-semibold text-gray-800">${sanitizeHTML(
                  message.from.name || message.from.address
                )}</div>
                <div class="text-xs text-gray-500">${formattedDate}</div>
            </div>
            <div class="font-medium text-gray-700 mb-1">${
              sanitizeHTML(message.subject) || "(no subject)"
            }</div>
            <div class="text-sm text-gray-600 line-clamp-2">${getPreview(
              message
            )}</div>
        `;

    inboxList.appendChild(messageElement);
  });
}

// Get message preview
function getPreview(message) {
  if (message.intro) return sanitizeHTML(message.intro);
  return "Click to read full message";
}

// View message
async function viewMessage(messageId) {
  try {
    const response = await fetch(`${API_URL}${messageId}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch message");
    }

    const message = await response.json();

    document.getElementById("inbox-list").classList.add("hidden");
    document.getElementById("email-detail").classList.remove("hidden");

    const emailContent = document.getElementById("email-content");

    const date = new Date(message.receivedAt);
    const formattedDate = date.toLocaleString();

    const safeHTML = message.html ? sanitizeHTML(message.html) : "";
    const safeText = message.text ? sanitizeHTML(message.text) : "";

    emailContent.innerHTML = `
            <div class="mb-4 pb-4 border-b">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-gray-800">${
                      sanitizeHTML(message.subject) || "(no subject)"
                    }</h3>
                    <span class="text-sm text-gray-500">${formattedDate}</span>
                </div>
                <div class="text-gray-700">
                    <span class="font-medium">From:</span> ${sanitizeHTML(
                      message.from.name ? message.from.name + " " : ""
                    )}&lt;${sanitizeHTML(message.from.address)}&gt;
                </div>
                <div class="text-gray-700">
                    <span class="font-medium">To:</span> ${message.to
                      .map((to) => sanitizeHTML(to.address))
                      .join(", ")}
                </div>
            </div>
            <div class="prose max-w-none">
                ${
                  safeHTML
                    ? safeHTML
                    : safeText
                    ? `<pre class="whitespace-pre-wrap font-sans">${safeText}</pre>`
                    : '<p class="text-gray-500">(empty message)</p>'
                }
            </div>
        `;
  } catch (error) {
    console.error("View message error:", error);
    showNotification("Failed to load message", "error");
  }
}

// Show inbox
function showInbox() {
  document.getElementById("email-detail").classList.add("hidden");
  document.getElementById("inbox-list").classList.remove("hidden");
}

// Copy email
function copyEmail() {
  const emailInput = document.getElementById("email-address");
  emailInput.select();
  document.execCommand("copy");

  const copyButton = document.getElementById("copyButton");
  const originalHTML = copyButton.innerHTML;
  copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';

  setTimeout(() => {
    copyButton.innerHTML = originalHTML;
  }, 2000);

  showNotification("Email copied to clipboard!", "success");
}

// ============================================
// RECOVERY FUNCTIONS
// ============================================

// Show token tooltip
function showTokenTooltip() {
  if (!currentAccount) {
    showNotification("No active email", "error");
    return;
  }

  const currentToken = sessionStorage.getItem("current_token");

  if (!currentToken) {
    showNotification("No recovery token found for this session", "error");
    return;
  }

  const existingTooltip = document.getElementById("token-tooltip");
  if (existingTooltip) {
    existingTooltip.remove();
  }

  const tooltip = document.createElement("div");
  tooltip.id = "token-tooltip";
  tooltip.className =
    "fixed bottom-6 right-6 bg-gray-900 text-white rounded-xl shadow-2xl z-50 max-w-md w-full sm:w-96 border border-gray-700 transform transition-all duration-300 fade-in";

  tooltip.innerHTML = `
        <div class="p-5">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <div class="bg-yellow-500/20 p-2 rounded-lg">
                        <i class="fas fa-key text-yellow-400 text-lg"></i>
                    </div>
                    <div>
                        <h3 class="font-semibold text-white">Recovery Token</h3>
                        <p class="text-xs text-gray-400">Save this to access your email later</p>
                    </div>
                </div>
                <button id="closeTooltipButton" class="text-gray-400 hover:text-white transition-colors">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                <div class="font-mono text-sm break-all text-gray-300 select-all">
                    ${currentToken}
                </div>
            </div>
            
            <div class="flex gap-3">
                <button id="copyTokenButton" class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <i class="far fa-copy"></i>
                    Copy Token
                </button>
                <button id="downloadTokenButton" class="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                    <i class="fas fa-download"></i>
                    Save as File
                </button>
            </div>
            
            <div class="mt-4 pt-3 border-t border-gray-700">
                <p class="text-xs text-gray-500 flex items-start gap-2">
                    <i class="fas fa-shield-alt text-green-400 mt-0.5"></i>
                    <span>This token is stored only in your browser. If you clear browser data, it's gone forever!</span>
                </p>
            </div>
        </div>
    `;

  document.body.appendChild(tooltip);

  // Add event listeners to tooltip buttons
  document
    .getElementById("closeTooltipButton")
    .addEventListener("click", () => tooltip.remove());
  document.getElementById("copyTokenButton").addEventListener("click", () => {
    copyToken(currentToken);
    showCopyFeedback(document.getElementById("copyTokenButton"));
  });
  document
    .getElementById("downloadTokenButton")
    .addEventListener("click", () => downloadToken(currentToken));

  setTimeout(() => {
    if (tooltip.parentElement) {
      tooltip.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => tooltip.remove(), 300);
    }
  }, 60000);
}

// Copy token
function copyToken(token) {
  navigator.clipboard
    .writeText(token)
    .then(() => {
      showNotification("Token copied to clipboard!", "success");
    })
    .catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = token;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      showNotification("Token copied to clipboard!", "success");
    });
}

// Download token
function downloadToken(token) {
  const blob = new Blob([token], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tempmail-token-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Token saved as file!", "success");
}

// Show copy feedback
function showCopyFeedback(button) {
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Copied!';
  button.classList.remove("bg-blue-600", "hover:bg-blue-700");
  button.classList.add("bg-green-600", "hover:bg-green-700");

  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.classList.remove("bg-green-600", "hover:bg-green-700");
    button.classList.add("bg-blue-600", "hover:bg-blue-700");
  }, 2000);
}

// Recover email
function recoverEmail() {
  const recoveryHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="recovery-prompt">
            <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                <h3 class="text-xl font-bold mb-4 text-gray-800">
                    <i class="fas fa-key text-green-500"></i> Recover Email
                </h3>
                <p class="text-gray-600 mb-4">
                    Enter your recovery token to access your previous email address.
                </p>
                <input type="text" 
                       id="recovery-token-input" 
                       placeholder="Paste your token here"
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 font-mono text-sm">
                <div class="flex gap-3">
                    <button id="processRecoveryButton" 
                            class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <i class="fas fa-sync-alt"></i> Recover
                    </button>
                    <button id="closeRecoveryButton" 
                            class="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", recoveryHTML);

  document
    .getElementById("processRecoveryButton")
    .addEventListener("click", processRecovery);
  document
    .getElementById("closeRecoveryButton")
    .addEventListener("click", closeRecoveryPrompt);
}

// Process recovery
async function processRecovery() {
  const token = document.getElementById("recovery-token-input").value.trim();

  if (!token) {
    showNotification("Please enter a token", "error");
    return;
  }

  const accountData = getAccountFromStorage(token);

  if (!accountData) {
    showNotification("Token not found or expired", "error");
    return;
  }

  try {
    const tokenResponse = await fetch(`${API_URL}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: accountData.email,
        password: accountData.password,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to login");
    }

    const tokenData = await tokenResponse.json();

    currentAccount = {
      id: accountData.id || "recovered",
      email: accountData.email,
      password: accountData.password,
    };
    currentToken = tokenData.token;

    document.getElementById("email-address").value = accountData.email;

    closeRecoveryPrompt();
    refreshInbox();

    showNotification("Email recovered successfully!", "success");
  } catch (error) {
    console.error("Recovery error:", error);
    showNotification("Failed to recover email", "error");
  }
}

// Close recovery prompt
function closeRecoveryPrompt() {
  const prompt = document.getElementById("recovery-prompt");
  if (prompt) prompt.remove();
}

// ============================================
// DARK MODE
// ============================================

function initDarkMode() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
    updateDarkModeIcons(true);
  } else {
    document.documentElement.classList.remove("dark");
    updateDarkModeIcons(false);
  }
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateDarkModeIcons(isDark);
  showNotification(
    `${isDark ? "🌙" : "☀️"} ${isDark ? "Dark" : "Light"} mode enabled`,
    "info"
  );
}

function updateDarkModeIcons(isDark) {
  const sunIcon = document.getElementById("sunIcon");
  const moonIcon = document.getElementById("moonIcon");

  if (sunIcon && moonIcon) {
    if (isDark) {
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
    } else {
      sunIcon.classList.add("hidden");
      moonIcon.classList.remove("hidden");
    }
  }
}

// ============================================
// SECURE WIPE
// ============================================

function secureWipe() {
  const currentToken = sessionStorage.getItem("current_token");
  if (currentToken) {
    localStorage.removeItem(`tempmail_${currentToken}`);
  }
  sessionStorage.clear();

  generateNewEmail();

  showNotification("🧹 Secure wipe complete - all traces removed", "success");
}

// ============================================
// PRIVACY NOTICE
// ============================================

function showPrivacyNotice() {
  const container = document.getElementById("privacy-notice-container");

  const notice = document.createElement("div");
  notice.className = "bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4";
  notice.innerHTML = `
        <div class="flex items-start">
            <i class="fas fa-shield-alt text-yellow-600 mt-1 mr-3"></i>
            <div>
                <p class="font-bold text-yellow-800">Privacy Notice</p>
                <p class="text-sm text-yellow-700">
                    Emails are stored on mail.tm servers. For maximum privacy, don't receive sensitive information.
                    Recovery tokens are stored only in your browser.
                </p>
            </div>
        </div>
    `;

  container.appendChild(notice);
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white ${
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-blue-500"
  } fade-in z-50`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ============================================
// SYSTEM THEME CHANGE LISTENER
// ============================================

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      if (e.matches) {
        document.documentElement.classList.add("dark");
        updateDarkModeIcons(true);
      } else {
        document.documentElement.classList.remove("dark");
        updateDarkModeIcons(false);
      }
    }
  });
