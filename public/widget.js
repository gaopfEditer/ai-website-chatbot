(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var botId = script.getAttribute("data-bot-id");
  if (!botId) {
    console.error("[SiteBot] Missing data-bot-id on widget script");
    return;
  }

  var scriptUrl = script.src || "";
  var apiBase = scriptUrl.replace(/\/widget\.js(\?.*)?$/, "");

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  var conversationId = localStorage.getItem("sitebot_conv_" + botId);
  if (!conversationId) {
    conversationId = uuid();
    localStorage.setItem("sitebot_conv_" + botId, conversationId);
  }

  var state = {
    open: false,
    messages: [],
    leadMode: false,
    leadReason: "unknown_question",
    config: null,
  };

  var root = document.createElement("div");
  root.id = "sitebot-root";
  root.setAttribute("data-testid", "sitebot-root");
  root.innerHTML =
    '<button type="button" id="sitebot-toggle" data-testid="sitebot-toggle" aria-label="Open chat">Chat</button>' +
    '<div id="sitebot-panel" data-testid="sitebot-panel" hidden>' +
    '<header><strong id="sitebot-title">Assistant</strong><button type="button" id="sitebot-close">×</button></header>' +
    '<div id="sitebot-messages"></div>' +
    '<form id="sitebot-form"><input id="sitebot-input" data-testid="sitebot-input" placeholder="Ask a question…" autocomplete="off" /><button type="submit" data-testid="sitebot-send">Send</button></form>' +
    '<form id="sitebot-lead" data-testid="sitebot-lead" hidden>' +
    '<p id="sitebot-lead-hint">Leave your details and we will follow up.</p>' +
    '<input name="name" placeholder="Name" required />' +
    '<input name="email" type="email" placeholder="Email" required />' +
    '<textarea name="need" placeholder="What do you need?" required></textarea>' +
    '<button type="submit">Submit</button></form>' +
    "</div>";

  var style = document.createElement("style");
  style.textContent =
    "#sitebot-root{position:fixed;bottom:20px;right:20px;z-index:99999;font-family:system-ui,sans-serif;font-size:14px}" +
    "#sitebot-toggle{border:none;border-radius:999px;padding:14px 18px;background:#0d9488;color:#fff;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.2)}" +
    "#sitebot-panel{position:absolute;bottom:56px;right:0;width:320px;max-height:420px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.15)}" +
    "#sitebot-panel header{display:flex;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #eee}" +
    "#sitebot-messages{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px}" +
    ".sitebot-msg{padding:8px 10px;border-radius:8px;max-width:92%;white-space:pre-wrap}" +
    ".sitebot-user{align-self:flex-end;background:#ecfdf5}" +
    ".sitebot-bot{align-self:flex-start;background:#f3f4f6}" +
    "#sitebot-form,#sitebot-lead{display:flex;flex-direction:column;gap:6px;padding:10px;border-top:1px solid #eee}" +
    "#sitebot-form{flex-direction:row}" +
    "#sitebot-input{flex:1;padding:8px;border:1px solid #ddd;border-radius:8px}" +
    "#sitebot-lead input,#sitebot-lead textarea{padding:8px;border:1px solid #ddd;border-radius:8px}";
  document.head.appendChild(style);
  document.body.appendChild(root);

  var toggle = root.querySelector("#sitebot-toggle");
  var panel = root.querySelector("#sitebot-panel");
  var closeBtn = root.querySelector("#sitebot-close");
  var messagesEl = root.querySelector("#sitebot-messages");
  var form = root.querySelector("#sitebot-form");
  var input = root.querySelector("#sitebot-input");
  var leadForm = root.querySelector("#sitebot-lead");

  function addMessage(text, who) {
    state.messages.push({ text: text, who: who });
    var div = document.createElement("div");
    div.className = "sitebot-msg sitebot-" + who;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function fetchConfig() {
    return fetch(apiBase + "/api/widget/config?botId=" + encodeURIComponent(botId))
      .then(function (r) {
        return r.json();
      })
      .then(function (cfg) {
        state.config = cfg;
        root.querySelector("#sitebot-title").textContent = cfg.businessName || "Assistant";
        if (state.messages.length === 0 && cfg.greeting) addMessage(cfg.greeting, "bot");
      })
      .catch(function () {
        addMessage("Assistant is temporarily unavailable.", "bot");
      });
  }

  function sendChat(message) {
    return fetch(apiBase + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botId: botId, conversationId: conversationId, message: message }),
    }).then(function (r) {
      return r.json();
    });
  }

  toggle.addEventListener("click", function () {
    state.open = true;
    panel.hidden = false;
    if (!state.config) fetchConfig();
  });
  closeBtn.addEventListener("click", function () {
    state.open = false;
    panel.hidden = true;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMessage(text, "user");
    sendChat(text).then(function (data) {
      if (data.error) {
        addMessage(data.error, "bot");
        return;
      }
      addMessage(data.reply, "bot");
      if (data.suggestLeadCapture) {
        state.leadMode = true;
        state.leadReason = data.leadReason || "unknown_question";
        leadForm.hidden = false;
        form.hidden = true;
      }
    });
  });

  leadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(leadForm);
    var payload = {
      botId: botId,
      conversationId: conversationId,
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      need: String(fd.get("need") || ""),
      reason: state.leadReason,
    };
    fetch(apiBase + "/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        addMessage(data.message || "Thanks! We will be in touch.", "bot");
        leadForm.hidden = true;
        form.hidden = false;
        state.leadMode = false;
        leadForm.reset();
      });
  });

  fetchConfig();
})();
