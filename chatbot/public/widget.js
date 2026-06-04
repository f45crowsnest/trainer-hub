// widget.js
// The animated chat mascot that floats in the bottom-right of the trainer hub.
// Add it to a page with:  <script src="widget.js"></script>

(function () {
  // Live URLs (the backend on Render, the animation on GitHub Pages):
  const BACKEND_URL = 'https://trainer-hub-chatbot.onrender.com/chat';
  const ANIMATION_URL = 'https://f45crowsnest.github.io/trainer-hub/chatbot/public/live-chatbot.json';

  // Load the Lottie player library (this is what plays the animated character).
  const lottieScript = document.createElement('script');
  lottieScript.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
  document.head.appendChild(lottieScript);

  // --- styles ---
  const style = document.createElement('style');
  style.textContent = `
    @keyframes hub-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
    #hub-chat-btn { position: fixed; bottom: 14px; right: 14px; width: 130px; height: 130px;
      cursor: pointer; z-index: 9999; animation: hub-float 3s ease-in-out infinite;
      transition: transform .2s ease; filter: drop-shadow(0 6px 10px rgba(0,0,0,.2)); }
    #hub-chat-btn:hover { transform: scale(1.08); }
    #hub-chat-btn lottie-player { width: 100%; height: 100%; pointer-events: none; }
    #hub-chat-panel { position: fixed; bottom: 155px; right: 18px; width: 390px; max-width: 94vw;
      height: 580px; max-height: 80vh; background: #161618; border: 1px solid #2a2a2e; border-radius: 14px; display: none;
      flex-direction: column; overflow: hidden; box-shadow: 0 12px 34px rgba(0,0,0,.5);
      z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #hub-chat-panel.open { display: flex; }
    #hub-chat-head { background: #0f0f10; color: #fff; padding: 14px 16px; font-weight: 700; border-bottom: 2px solid #ffb400; }
    #hub-chat-head small { display: block; font-weight: 400; color: #ffb400; font-size: 12px; }
    #hub-chat-log { flex: 1; padding: 14px; overflow-y: auto; background: #161618; }
    .hub-msg { margin: 6px 0; padding: 9px 12px; border-radius: 12px; max-width: 85%;
      font-size: 14px; line-height: 1.4; white-space: pre-wrap; }
    .hub-msg.user { background: #ffb400; color: #111; margin-left: auto; border-bottom-right-radius: 4px; font-weight: 500; }
    .hub-msg.bot { background: #242427; color: #ececec; border: 1px solid #34343a; border-bottom-left-radius: 4px; }
    #hub-chat-form { display: flex; border-top: 1px solid #2a2a2e; background: #0f0f10; }
    #hub-chat-input { flex: 1; border: none; padding: 13px; font-size: 14px; outline: none; background: #0f0f10; color: #fff; }
    #hub-chat-input::placeholder { color: #888; }
    #hub-chat-send { border: none; background: #ffb400; color: #111; padding: 0 18px; cursor: pointer; font-weight: 700; }
  `;
  document.head.appendChild(style);

  // --- the floating animated mascot (this is the button) ---
  const btn = document.createElement('div');
  btn.id = 'hub-chat-btn';
  btn.innerHTML = `<lottie-player src="${ANIMATION_URL}" background="transparent" speed="1" loop autoplay></lottie-player>`;

  // --- the chat panel ---
  const panel = document.createElement('div');
  panel.id = 'hub-chat-panel';
  panel.innerHTML = `
    <div id="hub-chat-head">Trainer Hub Assistant<small>Ask me about coaching, ops or sales</small></div>
    <div id="hub-chat-log"></div>
    <form id="hub-chat-form">
      <input id="hub-chat-input" placeholder="Type your question..." autocomplete="off" />
      <button id="hub-chat-send" type="submit">Send</button>
    </form>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const log = panel.querySelector('#hub-chat-log');
  const form = panel.querySelector('#hub-chat-form');
  const input = panel.querySelector('#hub-chat-input');

  // remember the recent conversation so the bot has context
  const history = [];

  // open / close the chat when the mascot is clicked
  btn.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) input.focus();
  });

  // add a message bubble to the log
  function addMessage(text, who) {
    const div = document.createElement('div');
    div.className = 'hub-msg ' + who;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  // send a message when the form is submitted
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    input.value = '';

    const thinking = addMessage('...', 'bot');

    try {
      const res = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'Sorry, something went wrong.';

      thinking.textContent = reply;

      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: reply });
      while (history.length > 8) history.shift();
    } catch (err) {
      thinking.textContent = 'Sorry, I could not reach the assistant. Is the server running?';
    }
  });
})();
