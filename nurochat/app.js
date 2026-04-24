/* NuroChat Test Console – frontend logic */

const $ = (sel) => document.querySelector(sel);
const apiUrl   = () => $('#api-url').value.replace(/\/+$/, '');
const botId    = () => $('#bot-select').value;
const lang     = () => $('#lang-select').value;
const useStream = () => $('#stream-toggle').checked;

let conversationHistory = [];
let botData = {};

// ── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadBots();
  $('#api-url').addEventListener('change', loadBots);
  $('#bot-select').addEventListener('change', onBotChange);
  $('#chat-form').addEventListener('submit', onSubmit);
  $('#user-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#chat-form').requestSubmit(); }
  });
});

// ── Bot loading ─────────────────────────────────────────────────────────────

async function loadBots() {
  try {
    const res = await fetch(`${apiUrl()}/api/bots`);
    const data = await res.json();
    const sel = $('#bot-select');
    sel.innerHTML = '';
    botData = {};
    for (const bot of data.bots) {
      botData[bot.bot_id] = bot;
      const opt = document.createElement('option');
      opt.value = bot.bot_id;
      opt.textContent = bot.display_name || bot.bot_id;
      sel.appendChild(opt);
    }
    onBotChange();
  } catch {
    addSystemMessage('Failed to load bots. Check API URL.');
  }
}

function onBotChange() {
  conversationHistory = [];
  $('#messages').innerHTML = '';
  const id = botId();
  const bot = botData[id];
  if (bot && bot.welcome_message) {
    addMessage('assistant', bot.welcome_message);
  } else if (bot) {
    addSystemMessage(`Bot: ${bot.display_name || bot.bot_id}`);
  }
}

// ── Chat submission ─────────────────────────────────────────────────────────

async function onSubmit(e) {
  e.preventDefault();
  const input = $('#user-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  addMessage('user', text);
  conversationHistory.push({ role: 'user', content: prependLangHint(text) });

  const sendBtn = $('#send-btn');
  sendBtn.disabled = true;

  try {
    if (useStream()) {
      await sendStreaming();
    } else {
      await sendBlocking();
    }
  } catch (err) {
    addSystemMessage(`Error: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function prependLangHint(text) {
  const l = lang();
  if (l === 'auto') return text;
  const map = {
    en: 'Please respond in English.',
    es: 'Por favor responde en español.',
    fr: 'Veuillez répondre en français.',
    it: 'Per favore rispondi in italiano.',
    de: 'Bitte antworten Sie auf Deutsch.',
    ru: 'Пожалуйста, ответьте на русском языке.',
    'zh-TW': '請用繁體中文回覆。',
    'zh-CN': '请用简体中文回复。',
  };
  return (map[l] || '') + '\n' + text;
}

// ── Blocking request ────────────────────────────────────────────────────────

async function sendBlocking() {
  const res = await fetch(`${apiUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id: botId(), messages: conversationHistory, stream: false }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  addMessage('assistant', data.reply);
  conversationHistory.push({ role: 'assistant', content: data.reply });
}

// ── Streaming (SSE) request ─────────────────────────────────────────────────

async function sendStreaming() {
  const res = await fetch(`${apiUrl()}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bot_id: botId(), messages: conversationHistory, stream: true }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const msgEl = addMessage('assistant', '');
  let fullText = '';

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith('data:')) {
        const raw = line.slice(5).trim();
        if (!raw) continue;
        try {
          const payload = JSON.parse(raw);
          if (payload.chunk) {
            fullText += payload.chunk;
            renderMarkdown(msgEl, fullText);
            scrollToBottom();
          }
        } catch { /* ignore malformed */ }
      }
    }
  }

  conversationHistory.push({ role: 'assistant', content: fullText });
}

// ── Markdown rendering ──────────────────────────────────────────────────────

function renderMarkdown(el, text) {
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    el.innerHTML = DOMPurify.sanitize(marked.parse(text));
  } else {
    el.textContent = text;
  }
}

// ── DOM helpers ─────────────────────────────────────────────────────────────

function addMessage(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  if (role === 'assistant' && text) {
    renderMarkdown(el, text);
  } else {
    el.textContent = text;
  }
  $('#messages').appendChild(el);
  scrollToBottom();
  return el;
}

function addSystemMessage(text) {
  addMessage('system', text);
}

function scrollToBottom() {
  const c = $('#chat-container');
  c.scrollTop = c.scrollHeight;
}
