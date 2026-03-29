import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import LandingPage     from "./components/LandingPage.jsx";
import WarmupScreen    from "./components/WarmupScreen.jsx";
import GeneratingScreen from "./components/GeneratingScreen.jsx";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const API_BASE        = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const COOLDOWN_SECS   = 30;
const MAX_TOPIC       = 400;
const DIFF_LIMITS     = { simple: 15, complex: 10 };
const MODELS = [
  { value: "gemini-2.5-flash",                   label: "Flash",  desc: "Fast · Good quality"   },
  { value: "gemini-2.5-pro",                      label: "Pro",    desc: "Best quality · Slower"  },
  { value: "gemini-2.5-flash-lite-preview-06-17", label: "Lite",   desc: "Fastest · Simple topics" },
];
const LETTERS = ["A", "B", "C", "D"];
const RIGHT   = ["Correct!", "Spot on.", "Nailed it.", "Exactly right.", "Well done."];
const WRONG   = ["Incorrect.", "Not quite.", "Wrong answer.", "That's off.", "Missed it."];
const pick    = arr => arr[Math.floor(Math.random() * arr.length)];

// ─── BOOTSTRAP & FONT INJECTION ───────────────────────────────────────────────
function injectAssets() {
  if (document.getElementById("bs-css")) return;

  // Bootstrap 5
  const bsCss       = document.createElement("link");
  bsCss.id          = "bs-css";
  bsCss.rel         = "stylesheet";
  bsCss.href        = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
  document.head.appendChild(bsCss);

  // Bootstrap Icons
  const biCss       = document.createElement("link");
  biCss.rel         = "stylesheet";
  biCss.href        = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
  document.head.appendChild(biCss);

  // Google Fonts — Inter + JetBrains Mono
  const fonts       = document.createElement("link");
  fonts.rel         = "stylesheet";
  fonts.href        = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
  document.head.appendChild(fonts);

  // MathJax — must be configured BEFORE the script loads
  if (!document.getElementById("mathjax-script")) {
    window.MathJax = {
      tex: {
        inlineMath:  [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        packages:    { "[+]": ["ams"] },
      },
      options: { skipHtmlTags: ["script","noscript","style","textarea"] },
      loader:  { load: ["[tex]/ams"] },
      startup: { typeset: false },
    };
    const mj   = document.createElement("script");
    mj.id      = "mathjax-script";
    mj.src     = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    mj.async   = true;
    document.head.appendChild(mj);
  }

  // Custom overrides on top of Bootstrap
  const style       = document.createElement("style");
  style.textContent = `
    :root {
      --bs-body-font-family: 'Inter', system-ui, sans-serif;
      --bs-body-bg: #0d0d10;
      --bs-body-color: #e8e8ec;
      --bs-border-color: rgba(255,255,255,0.09);
      --c-surface: #131317;
      --c-card: #1a1a1f;
      --c-card-hover: #1f1f26;
      --c-muted: #71717a;
      --c-subtle: rgba(255,255,255,0.05);
      --c-accent: #6366f1;
      --c-accent-glow: rgba(99,102,241,0.15);
      --c-success: #10b981;
      --c-danger: #f43f5e;
      --c-warning: #f59e0b;
      --mono: 'JetBrains Mono', monospace;
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      background: var(--bs-body-bg);
      color: var(--bs-body-color);
      font-family: var(--bs-body-font-family);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar        { width: 5px; }
    ::-webkit-scrollbar-track  { background: transparent; }
    ::-webkit-scrollbar-thumb  { background: #2a2a33; border-radius: 99px; }

    /* ── Cards ── */
    .p2q-card {
      background: var(--c-card);
      border: 1px solid var(--bs-border-color);
      border-radius: 14px;
      transition: border-color .2s, box-shadow .2s, transform .2s;
    }
    .p2q-card-hover:hover {
      border-color: rgba(255,255,255,0.16);
      box-shadow: 0 8px 32px rgba(0,0,0,0.35);
      transform: translateY(-2px);
      cursor: pointer;
    }

    /* ── Navbar ── */
    .p2q-nav {
      background: rgba(13,13,16,0.9);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid var(--bs-border-color);
      height: 58px;
    }

    /* ── Buttons ── */
    .btn-p2q-primary {
      background: var(--c-accent);
      color: #fff;
      border: none;
      font-weight: 600;
      letter-spacing: -.01em;
      transition: all .15s ease;
    }
    .btn-p2q-primary:hover:not(:disabled) {
      background: #818cf8;
      color: #fff;
      box-shadow: 0 0 0 3px var(--c-accent-glow);
    }
    .btn-p2q-primary:disabled { opacity: .4; }

    .btn-p2q-ghost {
      background: transparent;
      color: var(--c-muted);
      border: 1px solid var(--bs-border-color);
      transition: all .15s ease;
    }
    .btn-p2q-ghost:hover:not(:disabled) {
      background: var(--c-subtle);
      color: var(--bs-body-color);
      border-color: rgba(255,255,255,0.16);
    }

    .btn-p2q-icon {
      width: 34px; height: 34px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--c-subtle);
      border: 1px solid var(--bs-border-color);
      border-radius: 8px;
      color: var(--c-muted);
      font-size: .9rem;
      transition: all .15s;
      cursor: pointer;
      flex-shrink: 0;
    }
    .btn-p2q-icon:hover { background: #2a2a35; color: #fff; border-color: rgba(255,255,255,.16); }
    .btn-p2q-icon.active { background: var(--c-accent-glow); color: var(--c-accent); border-color: rgba(99,102,241,.3); }

    /* ── Form controls ── */
    .p2q-input {
      background: var(--c-card);
      border: 1px solid var(--bs-border-color);
      color: var(--bs-body-color);
      border-radius: 10px;
      font-family: var(--bs-body-font-family);
      transition: border-color .15s, box-shadow .15s;
    }
    .p2q-input:focus {
      background: var(--c-card);
      color: var(--bs-body-color);
      border-color: rgba(99,102,241,.5);
      box-shadow: 0 0 0 3px var(--c-accent-glow);
      outline: none;
    }
    .p2q-input::placeholder { color: #3f3f46; }

    /* ── Prompt shell ── */
    .prompt-shell {
      background: var(--c-card);
      border: 1px solid var(--bs-border-color);
      border-radius: 16px;
      transition: border-color .2s, box-shadow .2s;
    }
    .prompt-shell:focus-within {
      border-color: rgba(99,102,241,.45);
      box-shadow: 0 0 0 4px var(--c-accent-glow);
    }
    .prompt-input {
      background: transparent;
      border: none;
      outline: none;
      color: var(--bs-body-color);
      font-size: 1rem;
      font-family: inherit;
      width: 100%;
      padding: 0;
    }
    .prompt-input::placeholder { color: #3f3f46; }

    /* ── Settings popover ── */
    .settings-popover {
      position: absolute;
      left: 0; right: 0;
      background: #1c1c22;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.6);
      z-index: 200;
      transform-origin: top center;
      animation: popoverIn .18s cubic-bezier(.22,1,.36,1) both;
    }
    .settings-popover.above {
      bottom: calc(100% + 8px);
      top: auto;
      transform-origin: bottom center;
      animation: popoverInAbove .18s cubic-bezier(.22,1,.36,1) both;
    }
    .settings-popover.below { top: calc(100% + 8px); }

    @keyframes popoverIn      { from { opacity:0; transform:scaleY(.92) translateY(-6px); } to { opacity:1; transform:none; } }
    @keyframes popoverInAbove { from { opacity:0; transform:scaleY(.92) translateY(6px);  } to { opacity:1; transform:none; } }

    /* ── Diff selector ── */
    .diff-btn {
      flex: 1;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1.5px solid var(--bs-border-color);
      background: transparent;
      color: var(--c-muted);
      cursor: pointer;
      text-align: left;
      transition: all .15s;
      font-family: inherit;
    }
    .diff-btn:hover:not(.active) { background: var(--c-subtle); color: #fff; border-color: rgba(255,255,255,.15); }
    .diff-btn.active.simple  { border-color: var(--c-success); background: rgba(16,185,129,.1); color: var(--c-success); }
    .diff-btn.active.complex { border-color: #38bdf8;          background: rgba(56,189,248,.1); color: #38bdf8; }
    .diff-btn-label { font-size: .8125rem; font-weight: 600; display: block; }
    .diff-btn-desc  { font-size: .6875rem; margin-top: 2px; opacity: .65; display: block; }

    /* ── Model chips ── */
    .model-chip {
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--bs-border-color);
      background: transparent;
      color: var(--c-muted);
      cursor: pointer;
      font-size: .75rem;
      font-weight: 600;
      font-family: inherit;
      transition: all .15s;
      white-space: nowrap;
    }
    .model-chip:hover:not(.active) { background: var(--c-subtle); color: #fff; }
    .model-chip.active { border-color: rgba(99,102,241,.5); background: var(--c-accent-glow); color: #a5b4fc; }

    /* ── Option cards ── */
    .option-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 16px;
      border-radius: 11px;
      border: 1.5px solid var(--bs-border-color);
      background: var(--c-card);
      cursor: pointer;
      transition: border-color .15s, background .15s, transform .15s;
      user-select: none;
    }
    .option-card:hover:not(.disabled) {
      border-color: rgba(255,255,255,.18);
      background: var(--c-card-hover);
      transform: translateX(3px);
    }
    .option-card.selected { border-color: rgba(99,102,241,.55); background: rgba(99,102,241,.08); }
    .option-card.correct  { border-color: var(--c-success);     background: rgba(16,185,129,.09); }
    .option-card.wrong    { border-color: var(--c-danger);       background: rgba(244,63,94,.08);  }
    .option-card.disabled { cursor: default; }

    .opt-letter {
      width: 26px; height: 26px;
      border-radius: 7px;
      border: 1.5px solid var(--bs-border-color);
      background: rgba(255,255,255,.04);
      display: flex; align-items: center; justify-content: center;
      font-size: .6875rem; font-weight: 600; font-family: var(--mono);
      color: var(--c-muted);
      flex-shrink: 0;
      transition: all .15s;
    }
    .option-card.selected .opt-letter { background: var(--c-accent);   border-color: var(--c-accent);   color: #fff; }
    .option-card.correct  .opt-letter { background: var(--c-success);  border-color: var(--c-success);  color: #fff; }
    .option-card.wrong    .opt-letter { background: var(--c-danger);   border-color: var(--c-danger);   color: #fff; }

    /* ── Navigator dots ── */
    .nav-dot {
      aspect-ratio: 1;
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: .625rem; font-weight: 600; font-family: var(--mono);
      cursor: pointer;
      border: 1.5px solid var(--bs-border-color);
      background: rgba(255,255,255,.03);
      color: #3f3f46;
      transition: all .15s;
      position: relative;
    }
    .nav-dot:hover { border-color: rgba(255,255,255,.18); color: #aaa; }
    .nav-dot.cur   { border-color: var(--c-accent);  background: var(--c-accent-glow); color: #a5b4fc; font-weight: 700; }
    .nav-dot.ans   { border-color: rgba(255,255,255,.15); background: rgba(255,255,255,.05); color: #aaa; }
    .nav-dot.ok    { border-color: rgba(16,185,129,.4);   background: rgba(16,185,129,.1);  color: var(--c-success); }
    .nav-dot.bad   { border-color: rgba(244,63,94,.4);    background: rgba(244,63,94,.1);   color: var(--c-danger);  }
    .nav-dot.bkm::after {
      content:''; position:absolute; top:3px; right:3px;
      width:4px; height:4px; border-radius:50%; background:var(--c-warning);
    }

    /* ── Feedback ── */
    .feedback-panel {
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid var(--bs-border-color);
      background: var(--c-card);
      animation: slideUp .2s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }

    /* ── Score ring ── */
    .score-ring { position: relative; display: inline-block; }
    .score-ring svg { transform: rotate(-90deg); display: block; }
    .score-ring-center {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }

    /* ── Toasts ── */
    .p2q-toasts {
      position: fixed; top: 70px; right: 16px;
      z-index: 9999;
      display: flex; flex-direction: column; gap: 8px;
      pointer-events: none;
      max-width: 320px;
    }
    .p2q-toast {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 14px; border-radius: 10px; border: 1px solid;
      backdrop-filter: blur(16px);
      pointer-events: all; cursor: pointer;
      font-size: .8125rem;
      animation: toastIn .2s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes toastIn { from { opacity:0; transform:translateX(20px) scale(.95); } to { opacity:1; transform:none; } }
    .p2q-toast.info    { background:rgba(30,30,38,.95); border-color:rgba(255,255,255,.1);       color:#ccc; }
    .p2q-toast.success { background:rgba(16,185,129,.12); border-color:rgba(16,185,129,.3);     color:#6ee7b7; }
    .p2q-toast.error   { background:rgba(244,63,94,.12);  border-color:rgba(244,63,94,.3);       color:#fca5a5; }
    .p2q-toast.warn    { background:rgba(245,158,11,.12); border-color:rgba(245,158,11,.3);      color:#fcd34d; }

    /* ── Progress bar ── */
    .p2q-progress { height: 4px; background: rgba(255,255,255,.06); border-radius: 2px; overflow: hidden; }
    .p2q-progress-fill { height:100%; border-radius:2px; transition:width .4s ease; }

    /* ── Spinner ── */
    .p2q-spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(255,255,255,.08);
      border-top-color: var(--c-accent);
      border-radius: 50%;
      animation: spin .65s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Batch dots ── */
    .batch-dot {
      width: 9px; height: 9px; border-radius: 50%;
      background: rgba(255,255,255,.12);
      transition: background .3s, transform .3s;
    }
    .batch-dot.done   { background: var(--c-success); }
    .batch-dot.active { background: var(--c-accent); transform: scale(1.4); animation: bpulse .7s ease-in-out infinite; }
    @keyframes bpulse { 0%,100%{opacity:1} 50%{opacity:.5} }

    /* ── Page transitions ── */
    .page-enter { animation: pageIn .3s cubic-bezier(.22,1,.36,1) both; }
    @keyframes pageIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }

    /* ── History cards ── */
    .hist-card { transition: all .2s; }
    .hist-card:hover { border-color: rgba(255,255,255,.16) !important; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,.4); }

    /* ── Ghost cards ── */
    .ghost-bar { height:10px; border-radius:4px; background:rgba(255,255,255,.05); }
    .ghost-bar.w75 { width:75%; }
    .ghost-bar.w100{ width:100%; }
    .ghost-bar.w50 { width:50%; }
    .ghost-bar.w33 { width:33%; }

    /* ── Drawer ── */
    .p2q-drawer-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.6); z-index:500; backdrop-filter:blur(4px); animation:fadeIn .2s; }
    .p2q-drawer {
      position:fixed; right:0; top:0; bottom:0; width:320px;
      background:#14141a; border-left:1px solid var(--bs-border-color);
      z-index:501; overflow-y:auto; display:flex; flex-direction:column;
      animation:drawerIn .25s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes drawerIn { from{transform:translateX(100%)} to{transform:none} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @media(max-width:480px){ .p2q-drawer{width:100%;} }

    /* ── Cooldown bar ── */
    .cooldown-bar { height:2px; background:rgba(255,255,255,.06); border-radius:1px; overflow:hidden; }
    .cooldown-fill { height:100%; background:var(--c-accent); border-radius:1px; transition:width 1s linear; }

    /* ── Topic chip ── */
    .topic-chip {
      padding: 4px 13px;
      border-radius: 20px;
      border: 1px solid var(--bs-border-color);
      background: transparent;
      color: var(--c-muted);
      font-size: .75rem;
      font-family: inherit;
      cursor: pointer;
      transition: all .15s;
    }
    .topic-chip:hover { border-color: rgba(99,102,241,.4); color: #a5b4fc; background: var(--c-accent-glow); }

    /* ── Modal ── */
    .p2q-modal-content {
      background: #18181f !important;
      border: 1px solid rgba(255,255,255,.1) !important;
      border-radius: 16px !important;
      color: var(--bs-body-color) !important;
    }

    /* ── Sidebar ── */
    .quiz-sidebar {
      width: 250px;
      flex-shrink: 0;
      border-left: 1px solid var(--bs-border-color);
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      position: sticky;
      top: 58px;
      height: calc(100vh - 58px - 52px);
    }

    /* ── Mobile ── */
    @media(max-width:768px){
      .quiz-sidebar { display: none; }
      .quiz-layout  { flex-direction: column; }
    }

    /* ── Footer ── */
    .p2q-footer {
      border-top: 1px solid var(--bs-border-color);
      height: 52px;
      background: var(--bs-body-bg);
    }

    /* ── Result ring section ── */
    .result-hero { animation: pageIn .4s cubic-bezier(.22,1,.36,1) both; }

    /* ── Misc labels ── */
    .mono { font-family: var(--mono); }
    .text-muted-p2q { color: var(--c-muted) !important; }
    .border-subtle { border-color: var(--bs-border-color) !important; }
    .bg-card  { background: var(--c-card) !important; }
    .bg-surface { background: var(--c-surface) !important; }
    .pill-label {
      font-size: .6875rem; font-weight: 600; letter-spacing: .07em; text-transform: uppercase;
      color: var(--c-muted);
    }
  `;
  document.head.appendChild(style);
}

// ─── MATHJAX HELPERS ─────────────────────────────────────────────────────────
/**
 * Trigger MathJax to typeset a specific DOM element.
 * Safe to call even before MathJax has finished loading —
 * it queues the work via MathJax.startup.promise.
 */
function typesetElement(el) {
  if (!el) return;
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise([el]).catch(console.error);
  } else {
    // MathJax not ready yet — wait for it
    const id = setInterval(() => {
      if (window.MathJax?.typesetPromise) {
        clearInterval(id);
        window.MathJax.typesetPromise([el]).catch(console.error);
      }
    }, 100);
  }
}

/**
 * MathText — renders any string that may contain LaTeX.
 * Uses dangerouslySetInnerHTML so MathJax can see the raw $ delimiters,
 * then re-typesets the element after every content change.
 *
 * The text is XSS-safe because Gemini output never contains raw HTML tags —
 * only LaTeX math notation. If you want extra safety you can strip <> first.
 */
function MathText({ text, style, className }) {
  const ref = useRef(null);

  useEffect(() => {
    typesetElement(ref.current);
  }, [text]);

  if (!text) return null;
  return (
    <span
      ref={ref}
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────
function getCsrf() {
  const m = document.cookie.match("(^|;) ?csrftoken=([^;]*)(;|$)");
  return m ? m[2] : null;
}

class ApiError extends Error {
  constructor(msg, status, data) { super(msg); this.status = status; this.data = data; }
}

async function apiFetch(path, opts = {}, token = null) {
  const headers = { "Content-Type": "application/json" };
  const csrf    = getCsrf();
  if (csrf)  headers["X-CSRFToken"] = csrf;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${path}`, { credentials: "include", headers, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || data.detail || `HTTP ${res.status}`, res.status, data);
  return data;
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const storage = {
  getToken:      ()  => localStorage.getItem("p2q_token"),
  setToken:      (t) => localStorage.setItem("p2q_token", t),
  removeToken:   ()  => localStorage.removeItem("p2q_token"),
  getCooldownRem:()  => {
    const until = parseInt(localStorage.getItem("p2q_cd") || "0", 10);
    const rem   = Math.ceil((until - Date.now()) / 1000);
    return rem > 0 ? rem : 0;
  },
  setCooldown:   ()  => localStorage.setItem("p2q_cd", String(Date.now() + COOLDOWN_SECS * 1000)),
  saveQuiz:      (q) => { try { sessionStorage.setItem(`p2q_quiz_${q.id}`, JSON.stringify(q)); } catch {} },
  loadAttempt:   (id) => {
    try { const r = sessionStorage.getItem(`p2q_att_${id}`); return r ? JSON.parse(r) : { answers: {}, bookmarks: [], flags: [] }; }
    catch { return { answers: {}, bookmarks: [], flags: [] }; }
  },
  patchAnswer:   (id, order, idx) => {
    const a = storage.loadAttempt(id); a.answers[String(order)] = idx;
    try { sessionStorage.setItem(`p2q_att_${id}`, JSON.stringify(a)); } catch {}
    return a;
  },
  patchBookmark: (id, order, on) => {
    const a = storage.loadAttempt(id); const s = new Set(a.bookmarks);
    on ? s.add(order) : s.delete(order); a.bookmarks = [...s].sort((x,y)=>x-y);
    try { sessionStorage.setItem(`p2q_att_${id}`, JSON.stringify(a)); } catch {}
    return a;
  },
  clearAttempt:  (id) => sessionStorage.removeItem(`p2q_att_${id}`),
};

// ─── CONTEXTS ─────────────────────────────────────────────────────────────────
const ToastCtx = createContext(null);
const AuthCtx  = createContext(null);
const useToast = () => useContext(ToastCtx);
const useAuth  = () => useContext(AuthCtx);

// ─── TOAST PROVIDER ───────────────────────────────────────────────────────────
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info", ms = 4000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(t => [...t.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  }, []);

  const ICONS = { info: "→", success: "✓", error: "⚠", warn: "◌" };

  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div className="p2q-toasts">
        {toasts.map(t => (
          <div key={t.id} className={`p2q-toast ${t.type}`} onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
            <span style={{ flexShrink: 0 }}>{ICONS[t.type]}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ─── AUTH PROVIDER ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(() => storage.getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    apiFetch("/auth/profile/", {}, token)
      .then(u => setUser(u))
      .catch(() => { setToken(null); storage.removeToken(); })
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const data = await apiFetch("/auth/google/", { method: "POST", body: JSON.stringify({ access_token: credential }) });
    const jwt  = data.access;
    setToken(jwt); storage.setToken(jwt);
    const profile = await apiFetch("/auth/profile/", {}, jwt);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => { setUser(null); setToken(null); storage.removeToken(); }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try { const u = await apiFetch("/auth/profile/", {}, token); setUser(u); } catch {}
  }, [token]);

  const updatePrefs = useCallback(async (prefs) => {
    if (!token) return;
    const u = await apiFetch("/auth/profile/", { method: "PATCH", body: JSON.stringify(prefs) }, token);
    setUser(u); return u;
  }, [token]);

  return (
    <AuthCtx.Provider value={{ user, token, loading, loginWithGoogle, logout, refreshUser, updatePrefs }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ─── COOLDOWN HOOK ────────────────────────────────────────────────────────────
function useCooldown() {
  const [rem, setRem] = useState(() => storage.getCooldownRem());
  useEffect(() => {
    if (rem <= 0) return;
    const id = setInterval(() => {
      const r = storage.getCooldownRem(); setRem(r);
      if (r <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [rem]);
  return { remaining: rem, isOnCooldown: rem > 0, startCooldown: () => { storage.setCooldown(); setRem(storage.getCooldownRem()); } };
}

// ─── BACKEND HEALTH HOOK ─────────────────────────────────────────────────────
function useBackendHealth() {
  const [status, setStatus] = useState("checking"); // checking | ready | cold

  useEffect(() => {
    let cancelled  = false;
    let intervalId = null;

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/health/`, {
          signal: AbortSignal.timeout(4000),
          cache:  "no-store",
        });
        if (res.ok && !cancelled) {
          setStatus("ready");
          clearInterval(intervalId);
        }
      } catch {
        if (!cancelled) setStatus("cold");
      }
    };

    // First check immediately
    check();
    // Then poll every 5 seconds while cold
    intervalId = setInterval(check, 5000);

    return () => { cancelled = true; clearInterval(intervalId); };
  }, []);

  return status;
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function confetti() {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const COLS = ["#6366f1","#818cf8","#38bdf8","#10b981","#f4f4f5"];
  const pts = Array.from({length:100},()=>({x:Math.random()*canvas.width,y:-20,vx:(Math.random()-.5)*5,vy:Math.random()*3+1.5,w:Math.random()*9+4,h:Math.random()*5+3,rot:Math.random()*360,rv:(Math.random()-.5)*7,g:.1+Math.random()*.06,c:COLS[Math.floor(Math.random()*COLS.length)]}));
  let raf, alive=true;
  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pts.forEach(p=>{p.y+=p.vy;p.x+=p.vx;p.vy+=p.g;p.rot+=p.rv;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.c;ctx.globalAlpha=Math.max(0,1-p.y/canvas.height);ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();});
    if(alive && pts.some(p=>p.y<canvas.height+60)) raf=requestAnimationFrame(draw); else canvas.remove();
  }
  draw(); setTimeout(()=>{alive=false;cancelAnimationFrame(raf);canvas.remove();},4000);
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score, total, size = 130 }) {
  const [anim, setAnim] = useState(false);
  useEffect(() => { setTimeout(() => setAnim(true), 200); }, []);
  const pct  = total > 0 ? score / total : 0;
  const r    = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const dash = anim ? circ * pct : 0;
  const col  = pct >= .7 ? "var(--c-success)" : pct >= .4 ? "var(--c-warning)" : "var(--c-danger)";
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="6"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="6"
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{transition:"stroke-dasharray 1.3s cubic-bezier(.4,0,.2,1)"}} />
      </svg>
      <div className="score-ring-center">
        <span style={{fontWeight:700, fontSize: size*.19, letterSpacing:"-.04em", color: col}}>{score}/{total}</span>
        <span className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>{Math.round(pct*100)}%</span>
      </div>
    </div>
  );
}

// ─── GOOGLE SIGN-IN BUTTON ────────────────────────────────────────────────────
function GoogleBtn({ onSuccess, label = "Continue with Google" }) {
  const ref = useRef(null);
  const { loginWithGoogle } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          const u = await loginWithGoogle(credential);
          toast(`Welcome, ${u.display_name || u.email?.split("@")[0]}!`, "success");
          onSuccess?.(u);
        } catch (e) { toast(e.message || "Sign-in failed.", "error"); }
      },
    });
    window.google.accounts.id.renderButton(ref.current, {
      type:"standard", theme:"filled_black", size:"large",
      text:"continue_with", shape:"rectangular", width:300,
    });
  }, []);

  if (!GOOGLE_CLIENT_ID || !window.google) {
    return (
      <button className="btn w-100 d-flex align-items-center justify-content-center gap-2 py-2"
        style={{background:"#fff",color:"#3c4043",border:"1px solid #dadce0",fontWeight:500,borderRadius:8}}
        onClick={() => toast("Set VITE_GOOGLE_CLIENT_ID to enable sign-in.", "warn")}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {label}
      </button>
    );
  }
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", width:"100%" }}>
      <div ref={ref} />
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ page, quizMeta, onHome, onHistory, onProfile }) {
  const { user } = useAuth();
  return (
    <nav className="p2q-nav sticky-top d-flex align-items-center px-3 px-md-4 gap-3">
      <button className="btn p-0 d-flex align-items-center gap-2 text-decoration-none" onClick={onHome} style={{background:"none",border:"none"}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:"var(--c-accent)",flexShrink:0,display:"inline-block"}} />
        <span style={{fontWeight:700,fontSize:".9375rem",letterSpacing:"-.025em",color:"var(--bs-body-color)"}}>
          Prompt<span style={{color:"var(--c-accent)"}}>2</span>Quiz
        </span>
      </button>

      {quizMeta && (page === "quiz" || page === "results") && (
        <div className="d-none d-sm-flex align-items-center gap-2 ms-2 overflow-hidden">
          <span className="text-truncate" style={{fontSize:".75rem",color:"var(--c-muted)",maxWidth:200,background:"rgba(255,255,255,.04)",border:"1px solid var(--bs-border-color)",borderRadius:20,padding:"2px 10px"}}>
            {quizMeta.topic}
          </span>
          <span className="mono" style={{fontSize:".625rem",padding:"2px 8px",borderRadius:20,border:"1px solid",
            ...(quizMeta.difficulty==="simple"
              ? {background:"rgba(16,185,129,.1)",color:"var(--c-success)",borderColor:"rgba(16,185,129,.3)"}
              : {background:"rgba(56,189,248,.1)",color:"#38bdf8",borderColor:"rgba(56,189,248,.3)"})}}>
            {quizMeta.difficulty}
          </span>
        </div>
      )}

      <div className="ms-auto d-flex align-items-center gap-2">
        {user && (
          <button className="btn btn-p2q-ghost px-3 py-1" style={{fontSize:".8125rem",borderRadius:8}} onClick={onHistory}>
            <i className="bi bi-clock-history me-1" />History
          </button>
        )}
        <button className="btn p-0 d-flex align-items-center gap-2" style={{background:"none",border:"none"}} onClick={onProfile}>
          {user ? (
            user.avatar_url
              ? <img src={user.avatar_url} alt="" style={{width:28,height:28,borderRadius:"50%",border:"1px solid var(--bs-border-color)"}} />
              : <div style={{width:28,height:28,borderRadius:"50%",background:"var(--c-accent-glow)",border:"1px solid rgba(99,102,241,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:".75rem",color:"#a5b4fc"}}>
                  {(user.display_name||user.email||"?")[0].toUpperCase()}
                </div>
          ) : (
            <span style={{fontSize:".8125rem",color:"var(--c-muted)"}}>Sign in</span>
          )}
        </button>
      </div>
    </nav>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  const [helpOpen, setHelpOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!helpOpen) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setHelpOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [helpOpen]);

  const ITEMS = [
    { icon: "bi-lightning-charge", title: "Generate", text: "Type any topic and press Enter to generate a quiz." },
    { icon: "bi-sliders", title: "Settings", text: "Click ⚙ to choose difficulty, question count, and AI model." },
    { icon: "bi-bookmark", title: "Bookmarks", text: "Bookmark questions to revisit them in the review screen." },
    { icon: "bi-flag", title: "Flags", text: "Flag a question if you believe it has an error." },
    { icon: "bi-clock", title: "Cooldown", text: "A 30-second cooldown applies between quiz generations." },
  ];

  return (
    <footer className="p2q-footer d-flex align-items-center px-3 px-md-4">
      <span style={{fontWeight:600,fontSize:".8125rem",color:"#3f3f46"}}>P2<span style={{color:"var(--c-accent)",opacity:.7}}>Q</span></span>
      <div className="mx-auto position-relative" ref={ref}>
        <button className="btn btn-p2q-ghost px-3 py-1" style={{fontSize:".75rem",borderRadius:6}} onClick={() => setHelpOpen(o=>!o)}>
          <i className="bi bi-question-circle me-1" />Help
        </button>
        {helpOpen && (
          <div style={{position:"absolute",bottom:"calc(100% + 10px)",left:"50%",transform:"translateX(-50%)",width:"min(420px,calc(100vw - 32px))",background:"#18181f",border:"1px solid rgba(255,255,255,.1)",borderRadius:14,boxShadow:"0 20px 60px rgba(0,0,0,.6)",zIndex:300,animation:"popoverIn .18s cubic-bezier(.22,1,.36,1) both"}}>
            <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom border-subtle">
              <span style={{fontWeight:600,fontSize:".875rem"}}>Help &amp; Tips</span>
              <button className="btn-p2q-icon" onClick={() => setHelpOpen(false)}><i className="bi bi-x" /></button>
            </div>
            <div className="p-3 d-flex flex-column gap-3">
              {ITEMS.map(item => (
                <div key={item.title} className="d-flex gap-3 align-items-start">
                  <div style={{width:30,height:30,borderRadius:8,background:"var(--c-subtle)",border:"1px solid var(--bs-border-color)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <i className={`bi ${item.icon}`} style={{fontSize:".875rem",color:"var(--c-accent)"}} />
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:".8125rem",marginBottom:2}}>{item.title}</div>
                    <div style={{fontSize:".75rem",color:"var(--c-muted)",lineHeight:1.5}}>{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <span style={{fontSize:".6875rem",color:"#2a2a35"}} className="d-none d-sm-inline">Powered by Gemini AI</span>
    </footer>
  );
}

// ─── SETTINGS PANEL ───────────────────────────────────────────────────────────
function SettingsPanel({ anchorRef, open, onClose, settings, onChange }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState("below");

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    setPos(window.innerHeight - r.bottom < 300 ? "above" : "below");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (panelRef.current && !panelRef.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) onClose(); };
    const k = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);

  if (!open) return null;
  const maxQ = DIFF_LIMITS[settings.difficulty] ?? 15;

  return (
    <div ref={panelRef} className={`settings-popover ${pos}`}>
      <div className="p-3 d-flex flex-column gap-3">
        {/* Difficulty */}
        <div>
          <div className="pill-label mb-2">Difficulty</div>
          <div className="d-flex gap-2">
            {[{v:"simple",l:"Simple",d:"Clear, single-concept"},{v:"complex",l:"Complex",d:"Multi-step reasoning"}].map(({v,l,d}) => (
              <button key={v} className={`diff-btn ${v} ${settings.difficulty===v?"active":""}`}
                onClick={() => { onChange("difficulty",v); const cap=DIFF_LIMITS[v]; if(settings.numQuestions>cap) onChange("numQuestions",cap); }}>
                <span className="diff-btn-label">{l}</span>
                <span className="diff-btn-desc">{d}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex gap-3 flex-wrap">
          {/* Questions */}
          <div>
            <div className="pill-label mb-2">Questions</div>
            <div className="d-flex align-items-center" style={{background:"var(--c-card)",border:"1px solid var(--bs-border-color)",borderRadius:9,overflow:"hidden"}}>
              <button className="btn" style={{width:30,height:30,padding:0,color:"var(--c-muted)"}}
                onClick={() => onChange("numQuestions", Math.max(1, settings.numQuestions-1))} disabled={settings.numQuestions<=1}>−</button>
              <span className="mono" style={{minWidth:32,textAlign:"center",fontSize:".8125rem",fontWeight:600}}>{settings.numQuestions}</span>
              <button className="btn" style={{width:30,height:30,padding:0,color:"var(--c-muted)"}}
                onClick={() => onChange("numQuestions", Math.min(maxQ, settings.numQuestions+1))} disabled={settings.numQuestions>=maxQ}>+</button>
            </div>
          </div>

          {/* Model */}
          <div>
            <div className="pill-label mb-2">Model</div>
            <div className="d-flex gap-1 flex-wrap">
              {MODELS.map(m => (
                <button key={m.value} className={`model-chip ${settings.model===m.value?"active":""}`}
                  onClick={() => onChange("model", m.value)}>
                  {m.label}
                  <span style={{fontWeight:400,opacity:.55,marginLeft:4,fontSize:".625rem"}}>{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex align-items-center justify-content-between px-3 pb-3">
        <span className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>max {maxQ}Q for {settings.difficulty}</span>
        <button className="btn btn-p2q-ghost px-3 py-1" style={{fontSize:".75rem",borderRadius:6}} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

// ─── PROFILE DRAWER ───────────────────────────────────────────────────────────
function ProfileDrawer({ open, onClose }) {
  const { user, logout, updatePrefs } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    display_name: "", preferred_difficulty: "simple",
    preferred_model: "gemini-2.5-flash", preferred_num_questions: 5,
  });
  useEffect(() => { if (user) setPrefs({ display_name:user.display_name||"", preferred_difficulty:user.preferred_difficulty||"simple", preferred_model:user.preferred_model||"gemini-2.5-flash", preferred_num_questions:user.preferred_num_questions||5 }); }, [user?.email]);

  const save = async () => {
    setSaving(true);
    try { await updatePrefs(prefs); toast("Preferences saved.", "success"); }
    catch (e) { toast(e.message || "Failed.", "error"); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <>
      <div className="p2q-drawer-backdrop" onClick={onClose} />
      <div className="p2q-drawer">
        <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{borderBottom:"1px solid var(--bs-border-color)"}}>
          <span style={{fontWeight:600,fontSize:".9375rem"}}>{user ? "Profile" : "Sign in"}</span>
          <button className="btn-p2q-icon" onClick={onClose}><i className="bi bi-x" /></button>
        </div>

        <div className="flex-1 p-4 d-flex flex-column gap-4" style={{flex:1,overflowY:"auto"}}>
          {user ? (
            <>
              <div className="d-flex align-items-center gap-3">
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{width:44,height:44,borderRadius:"50%",border:"1px solid var(--bs-border-color)"}} />
                  : <div style={{width:44,height:44,borderRadius:"50%",background:"var(--c-accent-glow)",border:"1px solid rgba(99,102,241,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"1.125rem",color:"#a5b4fc",flexShrink:0}}>
                      {(user.display_name||user.email||"?")[0].toUpperCase()}
                    </div>}
                <div>
                  <div style={{fontWeight:600,fontSize:".9375rem"}}>{user.display_name||user.email?.split("@")[0]}</div>
                  <div className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>{user.email}</div>
                </div>
              </div>

              <hr style={{borderColor:"var(--bs-border-color)",margin:0}} />

              <div>
                <div className="pill-label mb-2">Streaks</div>
                <div className="d-grid gap-2" style={{gridTemplateColumns:"1fr 1fr 1fr",display:"grid"}}>
                  {[{v:`🔥 ${user.current_streak||0}`,l:"Current"},{v:user.longest_streak||0,l:"Longest"},{v:user.total_quizzes||0,l:"Quizzes"}].map(({v,l}) => (
                    <div key={l} className="text-center p2q-card p-2">
                      <div style={{fontWeight:700,fontSize:"1.125rem",lineHeight:1,marginBottom:3}}>{v}</div>
                      <div className="mono" style={{fontSize:".5625rem",color:"var(--c-muted)",textTransform:"uppercase",letterSpacing:".08em"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="pill-label mb-2">Preferences</div>
                <div className="d-flex flex-column gap-2">
                  <input className="p2q-input form-control" placeholder="Display name" value={prefs.display_name}
                    style={{fontSize:".8125rem",height:34}} onChange={e => setPrefs(p=>({...p,display_name:e.target.value}))} />
                  {[
                    {lbl:"Difficulty",key:"preferred_difficulty",opts:[{v:"simple",l:"Simple"},{v:"complex",l:"Complex"}]},
                    {lbl:"Model",key:"preferred_model",opts:MODELS.map(m=>({v:m.value,l:m.label}))},
                    {lbl:"Questions",key:"preferred_num_questions",opts:[3,5,7,10,15].map(n=>({v:n,l:n}))},
                  ].map(({lbl,key,opts}) => (
                    <div key={key} className="d-flex align-items-center justify-content-between">
                      <span style={{fontSize:".75rem",color:"var(--c-muted)"}}>{lbl}</span>
                      <select className="p2q-input form-select" value={prefs[key]} style={{width:"auto",height:30,fontSize:".75rem",padding:"0 28px 0 8px"}}
                        onChange={e => setPrefs(p=>({...p,[key]:typeof opts[0].v==="number"?+e.target.value:e.target.value}))}>
                        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                  <button className="btn btn-p2q-primary w-100 mt-1" style={{borderRadius:8}} onClick={save} disabled={saving}>
                    {saving ? "Saving…" : "Save preferences"}
                  </button>
                </div>
              </div>

              <div className="mt-auto">
                <button className="btn w-100" style={{borderRadius:8,background:"rgba(244,63,94,.1)",border:"1px solid rgba(244,63,94,.25)",color:"var(--c-danger)",fontWeight:500}} onClick={() => { logout(); onClose(); toast("Signed out.", "info"); }}>
                  <i className="bi bi-box-arrow-right me-2" />Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{fontSize:".875rem",color:"var(--c-muted)",lineHeight:1.65}}>
                Sign in to save your quiz history, track your streak, and share quizzes with others.
              </p>
              <GoogleBtn onSuccess={onClose} />
              <button className="btn btn-p2q-ghost w-100" style={{borderRadius:8}} onClick={onClose}>Continue as guest</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ onQuizReady }) {
  const { user, token } = useAuth();
  const toast = useToast();
  const { remaining, isOnCooldown, startCooldown } = useCooldown();

  const [topic,       setTopic]       = useState("");
  const [simplified,  setSimplified]  = useState(null);
  const [simplifying, setSimplifying] = useState(false);
  const [settings,    setSettings]    = useState({ difficulty:"simple", numQuestions:5, model:"gemini-2.5-flash" });
  const [settingsOpen,setSettingsOpen]= useState(false);
  const [loading,     setLoading]     = useState(false);
  const [batchProg,   setBatchProg]   = useState({ done:0, total:1 });
  const [fallbackNote,setFallbackNote]= useState("");

  const [topics,      setTopics]      = useState({});

  const shellRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user) setSettings({ difficulty:user.preferred_difficulty||"simple", numQuestions:user.preferred_num_questions||5, model:user.preferred_model||"gemini-2.5-flash" });
  }, [user?.email]);

  useEffect(() => { apiFetch("/topics/").then(setTopics).catch(()=>{}); }, []);

  // Status messages now handled by GeneratingScreen component

  const handleChange = useCallback((k, v) => {
    setSettings(p => {
      const n = {...p, [k]:v};
      if (k==="difficulty") { const cap=DIFF_LIMITS[v]; if(n.numQuestions>cap) n.numQuestions=cap; }
      return n;
    });
  }, []);

  const overLimit  = topic.length > MAX_TOPIC;
  const canSubmit  = !!(simplified||topic).trim() && !overLimit && !isOnCooldown && !loading;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const t = (simplified||topic).trim();
    if (!t || isOnCooldown || overLimit) return;
    setLoading(true);
    const total = Math.ceil(settings.numQuestions/3);
    setBatchProg({done:0,total});
    const id = setInterval(()=>setBatchProg(p=>p.done<p.total-1?{...p,done:p.done+1}:p),2400);
    try {
      const data = await apiFetch("/quiz/generate/", {method:"POST",body:JSON.stringify({topic:t,num_questions:settings.numQuestions,difficulty:settings.difficulty,model:settings.model,auto_simplify:false})}, token);
      clearInterval(id);
      startCooldown();
      if (data.fallbacks_used?.length) toast(`Switched to ${data.model_used} after initial model failed.`,"warn");
      data.warnings?.forEach(w=>toast(w,"warn"));
      storage.saveQuiz(data);
      onQuizReady(data);
    } catch (err) {
      clearInterval(id);
      if (err.status===429) toast(`Rate limit hit. Wait ${err.data?.retry_after||30}s.`,"error");
      else if (err.status===503) toast(`${err.message} Try fewer questions.`,"error");
      else toast(err.message||"Something went wrong.","error");
    } finally { setLoading(false); }
  };

  // Generating screen
  if (loading) return (
    <GeneratingScreen
      topic={simplified||topic}
      batchProg={batchProg}
      fallbackNote={fallbackNote}
    />
  );

  return (
    <div className="d-flex flex-column align-items-center page-enter" style={{flex:1,padding:"56px 20px 80px",gap:"36px"}}>
      {/* Hero */}
      <div className="text-center" style={{maxWidth:560}}>
        <div className="mono mb-3" style={{fontSize:".6875rem",letterSpacing:".14em",textTransform:"uppercase",color:"var(--c-muted)"}}>AI-powered quiz generator</div>
        <h1 style={{fontWeight:700,letterSpacing:"-.035em",lineHeight:1.1,fontSize:"clamp(1.875rem,4vw,2.625rem)",marginBottom:14}}>
          Turn any topic into<br/><span style={{color:"var(--c-accent)"}}>a real quiz</span>
        </h1>
        <p style={{fontSize:".9375rem",color:"var(--c-muted)",lineHeight:1.65,maxWidth:420,margin:"0 auto"}}>
          Paste a concept, paragraph, or keyword — get a structured MCQ quiz in seconds.
        </p>
      </div>

      {/* Prompt bar */}
      <div style={{width:"100%",maxWidth:680,position:"relative"}}>
        <form onSubmit={handleSubmit}>
          <div className="prompt-shell" ref={shellRef}>
            <div className="d-flex align-items-center gap-2 px-3 py-2" style={{minHeight:54}}>
              <button type="button" className={`btn-p2q-icon flex-shrink-0 ${settingsOpen?"active":""}`}
                onClick={()=>setSettingsOpen(o=>!o)} aria-label="Settings">
                <i className="bi bi-sliders" />
              </button>
              <input ref={inputRef} className="prompt-input" type="text" autoFocus autoComplete="off"
                placeholder="e.g. Python decorators, WW2, Quantum entanglement…"
                value={topic} onChange={e=>{setTopic(e.target.value);setSimplified(null);}} disabled={loading} />
              {topic.length>60 && (
                <span className="mono flex-shrink-0" style={{fontSize:".6875rem",color:overLimit?"var(--c-danger)":"var(--c-muted)"}}>{topic.length}/{MAX_TOPIC}</span>
              )}
              <button type="submit" disabled={!canSubmit} className="btn btn-p2q-primary flex-shrink-0"
                style={{width:34,height:34,padding:0,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <i className="bi bi-arrow-up" />
              </button>
            </div>

            {/* Simplify hint */}
            {topic.length>100 && !simplified && (
              <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{borderTop:"1px solid var(--bs-border-color)",background:"rgba(255,255,255,.02)"}}>
                <span style={{fontSize:".75rem",color:"var(--c-muted)"}}>Long topic — AI can simplify it first</span>
                <button type="button" className="btn btn-p2q-ghost px-3 py-1" style={{fontSize:".75rem",borderRadius:6}}
                  onClick={async()=>{setSimplifying(true);try{const r=await apiFetch("/quiz/simplify/",{method:"POST",body:JSON.stringify({topic})},token);if(r.simplified!==topic){setSimplified(r.simplified);toast(`Simplified: "${r.simplified}"`,"info");}else toast("Already concise.","info");}catch{toast("Simplification unavailable.","warn");}finally{setSimplifying(false);}}}
                  disabled={simplifying}>
                  {simplifying?<><span className="spinner-border spinner-border-sm me-1" style={{width:10,height:10,borderWidth:1.5}}/>Simplifying…</>:"Simplify"}
                </button>
              </div>
            )}

            {/* Simplified active */}
            {simplified && (
              <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{borderTop:"1px solid var(--bs-border-color)",background:"rgba(99,102,241,.06)"}}>
                <span className="mono text-truncate flex-1" style={{fontSize:".75rem",color:"#a5b4fc",marginRight:8}}>Using: "{simplified}"</span>
                <button type="button" className="btn btn-p2q-ghost px-2 py-1" style={{fontSize:".75rem",borderRadius:6,flexShrink:0}} onClick={()=>setSimplified(null)}>Revert</button>
              </div>
            )}

            {/* Cooldown */}
            {isOnCooldown && (
              <div className="px-3 py-2" style={{borderTop:"1px solid var(--bs-border-color)"}}>
                <div className="mono mb-1" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>Wait {remaining}s before generating again</div>
                <div className="cooldown-bar"><div className="cooldown-fill" style={{width:`${(remaining/COOLDOWN_SECS)*100}%`}}/></div>
              </div>
            )}
          </div>
        </form>

        {/* Settings popover */}
        <SettingsPanel anchorRef={shellRef} open={settingsOpen} onClose={()=>setSettingsOpen(false)} settings={settings} onChange={handleChange} />
      </div>

      {/* Settings summary badges */}
      {!settingsOpen && (
        <div className="d-flex gap-2 align-items-center flex-wrap justify-content-center">
          {[settings.difficulty, `${settings.numQuestions}Q`, MODELS.find(m=>m.value===settings.model)?.label||"Flash"].map(lbl=>(
            <button key={lbl} onClick={()=>setSettingsOpen(true)}
              style={{background:"rgba(255,255,255,.04)",border:"1px solid var(--bs-border-color)",borderRadius:20,padding:"3px 12px",fontSize:".6875rem",fontWeight:600,color:"var(--c-muted)",cursor:"pointer",fontFamily:"inherit"}}>
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* Topic suggestions */}
      {Object.keys(topics).length>0 && (
        <div style={{width:"100%",maxWidth:680}}>
          {Object.entries(topics).map(([cat,chips])=>(
            <div key={cat} className="mb-3">
              <div className="pill-label mb-2">{cat}</div>
              <div className="d-flex flex-wrap gap-2">
                {chips.map(t=>(
                  <button key={t} className="topic-chip" onClick={()=>{setTopic(t);setSimplified(null);inputRef.current?.focus();}}>{t}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QUIZ PAGE ────────────────────────────────────────────────────────────────
function QuizPage({ quiz, onFinish }) {
  const { token } = useAuth();
  const toast     = useToast();
  const questions = quiz.questions;
  const init      = storage.loadAttempt(quiz.id);

  const [cur,       setCur]       = useState(0);
  const [answers,   setAnswers]   = useState(init.answers||{});
  const [bookmarks, setBookmarks] = useState(new Set(init.bookmarks||[]));
  const [submitted, setSubmitted] = useState({});
  const [showFin,   setShowFin]   = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [flagOpen,  setFlagOpen]  = useState(false);
  const [flagReason,setFlagReason]= useState("wrong_answer");
  const [flagged,   setFlagged]   = useState(new Set());
  const flagRef = useRef(null);
  const startRef = useRef(Date.now());

  const q           = questions[cur];
  const isSubmitted = submitted[cur] !== undefined;
  const isCorrect   = submitted[cur] === true;
  const answered    = Object.keys(answers).length;

  useEffect(()=>{
    if(!flagOpen) return;
    const h = e => { if(flagRef.current && !flagRef.current.contains(e.target)) setFlagOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[flagOpen]);

  const selectOpt = useCallback((i) => {
    if (isSubmitted) return;
    setAnswers(a=>({...a,[String(cur)]:i}));
    storage.patchAnswer(quiz.id, cur, i);
  },[cur,isSubmitted,quiz.id]);

  const submitCur = useCallback(()=>{
    const c = answers[String(cur)]; if(c===undefined) return;
    setSubmitted(s=>({...s,[cur]: q.options[c]===q.answer}));
  },[cur,answers,q]);

  const toggleBm = useCallback(()=>{
    const on = !bookmarks.has(cur);
    const nb = new Set(bookmarks); on?nb.add(cur):nb.delete(cur); setBookmarks(nb);
    storage.patchBookmark(quiz.id,cur,on);
    if(token) apiFetch(`/quiz/${quiz.id}/bookmark/`,{method:"POST",body:JSON.stringify({question_order:cur,bookmarked:on})},token).catch(()=>{});
  },[cur,bookmarks,quiz.id,token]);

  const submitFlag = async () => {
    setFlagOpen(false); setFlagged(f=>new Set([...f,cur]));
    if(token) { try { await apiFetch(`/quiz/${quiz.id}/flag/`,{method:"POST",body:JSON.stringify({question_order:cur,reason:flagReason,note:""})},token); toast("Flagged — thanks.","success"); } catch(e){ toast(e.message,"error"); } }
    else toast("Flag saved locally.","info");
  };

  const finish = async () => {
    setShowFin(false); setFinishing(true);
    const timeTaken = Math.round((Date.now()-startRef.current)/1000);
    try {
      if (!token) {
        const results = questions.map((q,i)=>{ const ci=answers[String(i)]??null; const correct=ci!==null&&q.options[ci]===q.answer; return {order:i,question:q.question,options:q.options,answer:q.answer,explanation:q.explanation,topic:q.topic,difficulty_label:q.difficulty_label||"",chosen_index:ci,correct}; });
        const score = results.filter(r=>r.correct).length;
        onFinish({score,total:questions.length,percentage:Math.round(score/questions.length*100),results,bookmarks:[...bookmarks],suggested_difficulty:score/questions.length>=.85?"complex":"simple",time_taken_seconds:timeTaken},quiz);
        return;
      }
      await Promise.allSettled(Object.entries(answers).map(([o,c])=>apiFetch(`/quiz/${quiz.id}/answer/`,{method:"POST",body:JSON.stringify({question_order:+o,chosen_index:c})},token).catch(()=>{})));
      const result = await apiFetch(`/quiz/${quiz.id}/finish/`,{method:"POST",body:JSON.stringify({time_taken_seconds:timeTaken})},token);
      onFinish(result,quiz);
    } catch(e){ toast(e.message||"Failed to submit.","error"); }
    finally { setFinishing(false); }
  };

  const correctCount = Object.values(submitted).filter(Boolean).length;
  const wrongCount   = Object.values(submitted).filter(v=>!v).length;
  const unanswered   = questions.length - answered;

  return (
    <>
      <div className="d-flex quiz-layout page-enter" style={{flex:1}}>
        {/* Main */}
        <div style={{flex:1,padding:"28px 32px",overflowY:"auto",display:"flex",flexDirection:"column",gap:24}}>
          {/* Header */}
          <div className="d-flex align-items-start justify-content-between gap-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>{cur+1} / {questions.length}</span>
              {q.topic && <span style={{fontSize:".6875rem",padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,.04)",border:"1px solid var(--bs-border-color)",color:"var(--c-muted)"}}>{q.topic}</span>}
            </div>
            <div className="d-flex gap-1" ref={flagRef} style={{position:"relative"}}>
              <button className={`btn-p2q-icon ${bookmarks.has(cur)?"active":""}`} onClick={toggleBm} title="Bookmark"><i className="bi bi-bookmark" /></button>
              <button className={`btn-p2q-icon ${flagged.has(cur)?"active":""}`} onClick={()=>setFlagOpen(o=>!o)} title="Flag">
                <i className="bi bi-flag" />
              </button>
              {flagOpen && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,width:220,background:"#1c1c22",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,padding:14,boxShadow:"0 16px 48px rgba(0,0,0,.5)",zIndex:200,animation:"popoverIn .18s cubic-bezier(.22,1,.36,1) both"}}>
                  <div style={{fontWeight:600,fontSize:".8125rem",marginBottom:10}}>Flag question</div>
                  {[["wrong_answer","Wrong answer"],["bad_question","Poorly worded"],["off_topic","Off topic"],["other","Other"]].map(([v,l])=>(
                    <label key={v} className="d-flex align-items-center gap-2 py-1" style={{fontSize:".8125rem",color:"var(--c-muted)",cursor:"pointer"}}>
                      <input type="radio" name="fr" value={v} checked={flagReason===v} onChange={()=>setFlagReason(v)} style={{accentColor:"var(--c-accent)"}} />{l}
                    </label>
                  ))}
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-p2q-ghost px-3 py-1 flex-1" style={{fontSize:".75rem",borderRadius:6}} onClick={()=>setFlagOpen(false)}>Cancel</button>
                    <button className="btn btn-p2q-primary px-3 py-1 flex-1" style={{fontSize:".75rem",borderRadius:6}} onClick={submitFlag}>Submit</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Question */}
          <div key={cur} style={{fontWeight:600,fontSize:"1.0625rem",lineHeight:1.5,letterSpacing:"-.015em",animation:"slideUp .2s cubic-bezier(.22,1,.36,1) both"}}>
            <MathText text={q.question} style={{fontWeight:600,fontSize:"1.0625rem",lineHeight:1.5,letterSpacing:"-.015em"}} />
          </div>

          {/* Options */}
          <div className="d-flex flex-column gap-2" style={{animation:"slideUp .25s cubic-bezier(.22,1,.36,1) both"}}>
            {q.options.map((opt,i)=>{
              let cls="option-card";
              if(isSubmitted){cls+=" disabled"; if(q.options[i]===q.answer)cls+=" correct"; else if(answers[String(cur)]===i)cls+=" wrong";}
              else if(answers[String(cur)]===i)cls+=" selected";
              return (
                <div key={i} className={cls} onClick={()=>selectOpt(i)}>
                  <div className="opt-letter">{LETTERS[i]}</div>
                  <MathText text={opt} style={{flex:1,fontSize:".875rem",lineHeight:1.5}} />
                  {isSubmitted && q.options[i]===q.answer && <i className="bi bi-check-circle-fill ms-auto" style={{color:"var(--c-success)",flexShrink:0}} />}
                </div>
              );
            })}
          </div>

          {/* Feedback */}
          {isSubmitted && (
            <div className="feedback-panel">
              <div style={{fontWeight:700,fontSize:"1rem",marginBottom:12,color:isCorrect?"var(--c-success)":"var(--c-danger)"}}>
                {isCorrect ? pick(RIGHT) : pick(WRONG)}
              </div>
              <div style={{fontSize:".6875rem",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".08em",color:"var(--c-muted)",marginBottom:4}}>Correct answer</div>
              <MathText text={q.answer} style={{fontWeight:600,fontSize:".875rem",marginBottom:12,display:"block"}} />
              <div style={{fontSize:".6875rem",fontFamily:"var(--mono)",textTransform:"uppercase",letterSpacing:".08em",color:"var(--c-muted)",marginBottom:4}}>Explanation</div>
              <MathText text={q.explanation} style={{fontSize:".8125rem",color:"var(--c-muted)",lineHeight:1.65}} />
            </div>
          )}

          {/* Nav */}
          <div className="d-flex align-items-center justify-content-between mt-auto pt-3" style={{borderTop:"1px solid var(--bs-border-color)"}}>
            <button className="btn btn-p2q-ghost px-3" style={{borderRadius:8}} onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0}>
              <i className="bi bi-arrow-left me-1" />Prev
            </button>
            <div className="d-flex gap-2">
              {!isSubmitted && <button className="btn btn-p2q-primary px-4" style={{borderRadius:8}} onClick={submitCur} disabled={answers[String(cur)]===undefined}>Submit</button>}
              {cur<questions.length-1
                ? <button className="btn btn-p2q-ghost px-3" style={{borderRadius:8}} onClick={()=>setCur(c=>Math.min(questions.length-1,c+1))}>Next <i className="bi bi-arrow-right ms-1" /></button>
                : <button className="btn" style={{borderRadius:8,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.15)",color:"var(--bs-body-color)",fontWeight:600,padding:"6px 20px"}} onClick={()=>setShowFin(true)} disabled={finishing}>{finishing?"Submitting…":"Finish quiz"}</button>
              }
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="quiz-sidebar">
          {/* Progress */}
          <div>
            <div className="pill-label mb-2">Progress</div>
            <div className="d-flex justify-content-between mono mb-1" style={{fontSize:".6875rem",color:"var(--c-muted)"}}><span>{answered} answered</span><span>{unanswered} left</span></div>
            <div className="p2q-progress"><div className="p2q-progress-fill" style={{width:`${(answered/questions.length)*100}%`,background:"linear-gradient(90deg,var(--c-accent),#818cf8)"}} /></div>
          </div>

          {/* Stats */}
          <div>
            <div className="pill-label mb-2">Live stats</div>
            <div className="d-grid gap-1" style={{gridTemplateColumns:"1fr 1fr",display:"grid"}}>
              {[{v:correctCount,l:"Correct",c:"var(--c-success)"},{v:wrongCount,l:"Wrong",c:"var(--c-danger)"},{v:unanswered,l:"Left",c:"var(--bs-body-color)"},{v:bookmarks.size,l:"Bookmarked",c:"var(--c-warning)"}].map(({v,l,c})=>(
                <div key={l} className="p2q-card text-center" style={{padding:"10px 8px"}}>
                  <div style={{fontWeight:700,fontSize:"1.25rem",color:c,lineHeight:1,marginBottom:2}}>{v}</div>
                  <div className="mono" style={{fontSize:".5625rem",color:"var(--c-muted)",textTransform:"uppercase",letterSpacing:".08em"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigator */}
          <div>
            <div className="pill-label mb-2">Navigator</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
              {questions.map((_,i)=>{
                let cls="nav-dot";
                if(i===cur)cls+=" cur"; else if(submitted[i]===true)cls+=" ok"; else if(submitted[i]===false)cls+=" bad"; else if(answers[String(i)]!==undefined)cls+=" ans";
                if(bookmarks.has(i))cls+=" bkm";
                return <div key={i} className={cls} onClick={()=>setCur(i)}>{i+1}</div>;
              })}
            </div>
          </div>

          {/* Legend */}
          <div>
            <div className="pill-label mb-2">Legend</div>
            {[{cls:"nav-dot cur",l:"Current"},{cls:"nav-dot ans",l:"Answered"},{cls:"nav-dot ok",l:"Correct"},{cls:"nav-dot bad",l:"Wrong"}].map(({cls,l})=>(
              <div key={l} className="d-flex align-items-center gap-2 mb-1">
                <div className={cls} style={{width:12,height:12,borderRadius:3,fontSize:0,flexShrink:0}} />
                <span style={{fontSize:".6875rem",color:"var(--c-muted)"}}>{l}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* Confirm modal */}
      {showFin && (
        <div className="modal d-block" tabIndex="-1" style={{background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p2q-modal-content p-4">
              <h5 className="mb-2">Finish quiz?</h5>
              <p style={{fontSize:".875rem",color:"var(--c-muted)",marginBottom:20}}>
                You've answered <strong style={{color:"var(--bs-body-color)"}}>{answered}</strong> of <strong style={{color:"var(--bs-body-color)"}}>{questions.length}</strong>.
                {unanswered>0 ? ` ${unanswered} unanswered will be skipped.` : " All answered — ready!"}
              </p>
              <div className="d-flex gap-2 justify-content-end">
                <button className="btn btn-p2q-ghost px-4" style={{borderRadius:8}} onClick={()=>setShowFin(false)}>Keep going</button>
                <button className="btn btn-p2q-primary px-4" style={{borderRadius:8}} onClick={finish}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── RESULTS PAGE ─────────────────────────────────────────────────────────────
function ResultsPage({ result, quiz, onNewQuiz, onHistory }) {
  const { user, token, refreshUser } = useAuth();
  const toast = useToast();
  const { score,total,percentage,results,suggested_difficulty,time_taken_seconds,bookmarks=[] } = result;
  const bmSet = new Set(bookmarks);
  const [shareOpen,setShareOpen]=useState(false);
  const [shareUrl,setShareUrl]=useState("");
  const [copied,setCopied]=useState(false);
  const correct=results.filter(r=>r.correct).length;
  const wrong=results.filter(r=>!r.correct&&r.chosen_index!==null).length;
  const skipped=results.filter(r=>r.chosen_index===null).length;
  const mins=Math.floor((time_taken_seconds||0)/60);
  const secs=(time_taken_seconds||0)%60;
  const grade=percentage>=90?"Outstanding 🏆":percentage>=70?"Well done ✦":percentage>=50?"Good effort":"Keep going";

  useEffect(()=>{ if(percentage>=75)confetti(); storage.clearAttempt(quiz.id); if(user)refreshUser().catch(()=>{}); },[]);

  const openShare = async()=>{ if(!user){toast("Sign in to share.","warn");return;} try{const d=await apiFetch(`/quiz/${quiz.id}/share/`,{method:"POST",body:JSON.stringify({is_public:true})},token);setShareUrl(`${window.location.origin}/#/shared/${d.share_token}`);setShareOpen(true);}catch(e){toast(e.message,"error");} };

  return (
    <>
      <div className="page-enter" style={{flex:1,padding:"44px 20px 80px",maxWidth:800,margin:"0 auto",width:"100%",display:"flex",flexDirection:"column",gap:44}}>
        {/* Hero */}
        <div className="d-flex align-items-center gap-4 flex-wrap result-hero">
          <ScoreRing score={score} total={total} size={130} />
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontWeight:700,letterSpacing:"-.035em",fontSize:"clamp(1.5rem,4vw,2rem)",marginBottom:6}}>{grade}</h2>
            <p style={{color:"var(--c-muted)",marginBottom:4,fontSize:".875rem"}}>{score} of {total} correct</p>
            <p className="mono" style={{fontSize:".6875rem",color:"#3f3f46",marginBottom:14}}>{quiz.topic} · {quiz.difficulty}</p>
            {suggested_difficulty && suggested_difficulty!==quiz.difficulty && (
              <div className="d-inline-flex align-items-center gap-2 mb-3 px-3 py-2" style={{borderRadius:10,background:"var(--c-accent-glow)",border:"1px solid rgba(99,102,241,.25)",fontSize:".8125rem",color:"#a5b4fc"}}>
                <i className="bi bi-arrow-right-circle" />Try <strong>{suggested_difficulty}</strong> next time
              </div>
            )}
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-p2q-primary px-4" style={{borderRadius:8}} onClick={onNewQuiz}>New quiz</button>
              <button className="btn btn-p2q-ghost px-3" style={{borderRadius:8}} onClick={openShare}><i className="bi bi-share me-1"/>Share</button>
              <button className="btn btn-p2q-ghost px-3" style={{borderRadius:8}} onClick={()=>{const t=results.map((r,i)=>`Q${i+1}: ${r.question}\nAnswer: ${r.answer}\nYours: ${r.chosen_index!==null?r.options[r.chosen_index]:"Skipped"} — ${r.correct?"✓":"✗"}\n`).join("\n");navigator.clipboard?.writeText(`Prompt2Quiz — ${quiz.topic}\nScore: ${score}/${total} (${percentage}%)\n\n${t}`).catch(()=>{});toast("Copied!","success");}}><i className="bi bi-clipboard me-1"/>Copy</button>
              {user && <button className="btn btn-p2q-ghost px-3" style={{borderRadius:8}} onClick={onHistory}><i className="bi bi-clock-history me-1"/>History</button>}
            </div>
          </div>
        </div>

        {/* Streak */}
        {user && (user.current_streak||0)>0 && (
          <div className="d-flex align-items-center gap-3 p2q-card p-3" style={{animation:"slideUp .3s .2s cubic-bezier(.22,1,.36,1) both"}}>
            <span style={{fontSize:"1.75rem"}}>🔥</span>
            <div>
              <div style={{fontWeight:600,fontSize:".9375rem",marginBottom:2}}>{user.current_streak} day streak!</div>
              <div style={{fontSize:".8125rem",color:"var(--c-muted)"}}>Longest: {user.longest_streak} days · {user.total_quizzes} quizzes total</div>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div>
          <div style={{fontWeight:600,fontSize:".9375rem",marginBottom:14}}>Breakdown</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {[{v:correct,l:"Correct",c:"var(--c-success)"},{v:wrong,l:"Wrong",c:"var(--c-danger)"},{v:skipped,l:"Skipped",c:"var(--c-muted)"},{v:`${mins}m ${secs}s`,l:"Time",c:"#38bdf8"}].map(({v,l,c})=>(
              <div key={l} className="p2q-card text-center p-3">
                <div style={{fontWeight:700,fontSize:"1.625rem",letterSpacing:"-.04em",lineHeight:1,marginBottom:4,color:c}}>{v}</div>
                <div className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)",textTransform:"uppercase",letterSpacing:".07em"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Review */}
        <div>
          <div style={{fontWeight:600,fontSize:".9375rem",marginBottom:14}}>Review</div>
          <div className="d-flex flex-column gap-2">
            {results.map((r,i)=>{
              const st=r.correct?"correct":r.chosen_index===null?"skipped":"wrong";
              const ct=r.chosen_index!==null?r.options[r.chosen_index]:null;
              return (
                <div key={i} className="p2q-card p-3" style={{borderLeft:`3px solid ${st==="correct"?"var(--c-success)":st==="wrong"?"var(--c-danger)":"var(--bs-border-color)"}`}}>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                    <span className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>Q{i+1}</span>
                    <span style={{fontSize:".6875rem",fontWeight:600,padding:"2px 8px",borderRadius:20,border:"1px solid",
                      ...(st==="correct"?{background:"rgba(16,185,129,.1)",color:"var(--c-success)",borderColor:"rgba(16,185,129,.25)"}
                        :st==="wrong"?{background:"rgba(244,63,94,.1)",color:"var(--c-danger)",borderColor:"rgba(244,63,94,.25)"}
                        :{background:"rgba(255,255,255,.04)",color:"var(--c-muted)",borderColor:"var(--bs-border-color)"})}}>
                      {st==="correct"?"✓ Correct":st==="wrong"?"✗ Wrong":"— Skipped"}
                    </span>
                    {bmSet.has(r.order) && <span style={{fontSize:".75rem"}}>🔖</span>}
                  </div>
                  <div style={{fontWeight:500,fontSize:".875rem",marginBottom:10,lineHeight:1.5}}><MathText text={r.question} /></div>
                  <div className="d-flex gap-4 flex-wrap mb-2">
                    <div>
                      <div className="mono mb-1" style={{fontSize:".5625rem",textTransform:"uppercase",letterSpacing:".08em",color:"var(--c-muted)"}}>Correct</div>
                      <div style={{fontWeight:600,fontSize:".8125rem",color:"var(--c-success)"}}><MathText text={r.answer} /></div>
                    </div>
                    {ct && !r.correct && <div>
                      <div className="mono mb-1" style={{fontSize:".5625rem",textTransform:"uppercase",letterSpacing:".08em",color:"var(--c-muted)"}}>Your answer</div>
                      <div style={{fontWeight:600,fontSize:".8125rem",color:"var(--c-danger)"}}><MathText text={ct} /></div>
                    </div>}
                  </div>
                  <div style={{fontSize:".8125rem",color:"var(--c-muted)",lineHeight:1.65,paddingTop:10,borderTop:"1px solid var(--bs-border-color)"}}><MathText text={r.explanation} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {shareOpen && (
        <div className="modal d-block" style={{background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content p2q-modal-content p-4">
              <h5 className="mb-2">Share quiz</h5>
              <p style={{fontSize:".875rem",color:"var(--c-muted)",marginBottom:16}}>Anyone with this link can take the same quiz.</p>
              <div className="d-flex gap-2 mb-3">
                <input readOnly value={shareUrl} className="p2q-input form-control" style={{fontSize:".75rem",fontFamily:"var(--mono)"}} onClick={e=>e.target.select()} />
                <button className="btn btn-p2q-primary px-3 flex-shrink-0" style={{borderRadius:8}} onClick={()=>{navigator.clipboard?.writeText(shareUrl).catch(()=>{});setCopied(true);toast("Copied!","success");setTimeout(()=>setCopied(false),2000);}}>{copied?"Copied!":"Copy"}</button>
              </div>
              <div className="text-end"><button className="btn btn-p2q-ghost px-4" style={{borderRadius:8}} onClick={()=>setShareOpen(false)}>Close</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────
function HistoryPage({ onBack }) {
  const { user, token } = useAuth();
  const toast = useToast();
  const [quizzes,setQuizzes]=useState([]);
  const [page,setPage]=useState(1);
  const [pages,setPages]=useState(1);
  const [loading,setLoading]=useState(true);

  const load = async (p=1) => {
    setLoading(true);
    try { const d=await apiFetch(`/quiz/history/?page=${p}`,{},token); setQuizzes(d.quizzes);setPages(d.pages);setPage(p); }
    catch(e){ toast(e.message,"error"); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ if(user) load(); else setLoading(false); },[user]);

  if (!user) return (
    <div className="page-enter" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 20px 80px",position:"relative",overflow:"hidden",minHeight:"calc(100vh - 110px)"}}>
      {/* Ghost cards background */}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:0,opacity:.25,filter:"blur(3px)"}}>
        <div className="d-flex gap-3" style={{transform:"rotate(-3deg) scale(.85) translateY(60px)"}}>
          {[1,2,3].map(n=>(
            <div key={n} className="p2q-card p-3" style={{width:180}}>
              <div className="ghost-bar w75 mb-2" style={{height:12}} />
              <div className="ghost-bar w100 mb-2" />
              <div className="ghost-bar w50 mb-3" />
              <div className="ghost-bar w33" style={{height:24,borderRadius:6}} />
            </div>
          ))}
        </div>
      </div>

      <div className="text-center" style={{position:"relative",zIndex:1,maxWidth:440}}>
        <div style={{width:52,height:52,borderRadius:14,background:"var(--c-card)",border:"1px solid var(--bs-border-color)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.375rem",margin:"0 auto 20px"}}>📚</div>
        <h2 style={{fontWeight:700,letterSpacing:"-.03em",marginBottom:10}}>Your quizzes don't have to disappear</h2>
        <p style={{color:"var(--c-muted)",lineHeight:1.65,marginBottom:24,fontSize:".9375rem"}}>Sign in to save every quiz you take, track your daily streak, and share quizzes with others — all for free.</p>

        <div className="d-flex flex-column gap-2 mb-4 text-start">
          {[{icon:"📋",t:"Full quiz history",d:"Every quiz saved with score and date."},
            {icon:"🔥",t:"Daily streak",d:"Build a habit by quizzing every day."},
            {icon:"⤤",t:"Share quizzes",d:"Generate a public link for anyone."},
            {icon:"⚙",t:"Saved preferences",d:"Difficulty, model and count remembered."}].map(({icon,t,d})=>(
            <div key={t} className="d-flex align-items-center gap-3 p2q-card p-3">
              <div style={{width:32,height:32,borderRadius:8,background:"var(--c-accent-glow)",border:"1px solid rgba(99,102,241,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".9375rem",flexShrink:0}}>{icon}</div>
              <div>
                <div style={{fontWeight:600,fontSize:".8125rem"}}>{t}</div>
                <div style={{fontSize:".75rem",color:"var(--c-muted)"}}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        <GoogleBtn onSuccess={()=>{load();}} label="Sign in with Google" />
        <button className="btn mt-3" style={{background:"none",border:"none",color:"var(--c-muted)",fontSize:".8125rem"}} onClick={onBack}>
          Continue as guest — quizzes won't be saved
        </button>
      </div>
    </div>
  );

  return (
    <div className="page-enter" style={{flex:1,padding:"36px 20px 72px",maxWidth:1000,margin:"0 auto",width:"100%"}}>
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <button className="btn btn-p2q-ghost px-3" style={{borderRadius:8,fontSize:".8125rem"}} onClick={onBack}><i className="bi bi-arrow-left me-1"/>Back</button>
          <h5 style={{fontWeight:700,margin:0}}>History</h5>
        </div>
        {user && <span className="mono" style={{fontSize:".6875rem",color:"var(--c-muted)"}}>{user.display_name||user.email?.split("@")[0]} · {user.total_quizzes||0} quizzes</span>}
      </div>

      {loading ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {Array.from({length:6}).map((_,i)=>(
            <div key={i} className="p2q-card" style={{height:140,animation:"bpulse 1.5s ease infinite",animationDelay:`${i*.1}s`}} />
          ))}
        </div>
      ) : quizzes.length===0 ? (
        <div className="text-center py-5">
          <div style={{fontSize:"2rem",marginBottom:12,opacity:.3}}>◎</div>
          <div style={{fontWeight:600,marginBottom:6}}>No quizzes yet</div>
          <div style={{fontSize:".875rem",color:"var(--c-muted)"}}>Generate your first quiz to see it here.</div>
        </div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:28}}>
            {quizzes.map(q=>{
              const pct=q.percentage??null;
              const col=pct===null?"var(--c-muted)":pct>=70?"var(--c-success)":pct>=40?"var(--c-warning)":"var(--c-danger)";
              return (
                <div key={q.id} className="p2q-card hist-card p-3">
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                    <div style={{fontWeight:600,fontSize:".9375rem",lineHeight:1.35,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{q.topic}</div>
                    {pct!==null && <span style={{fontWeight:700,fontSize:"1.375rem",letterSpacing:"-.04em",color:col,flexShrink:0}}>{pct}%</span>}
                  </div>
                  <div className="d-flex gap-1 flex-wrap mb-2">
                    {[q.num_questions+"Q",q.difficulty,!q.completed&&"incomplete"].filter(Boolean).map(c=>(
                      <span key={c} className="mono" style={{fontSize:".625rem",padding:"2px 7px",borderRadius:20,background:"rgba(255,255,255,.04)",border:"1px solid var(--bs-border-color)",color:"var(--c-muted)"}}>{c}</span>
                    ))}
                  </div>
                  {pct!==null && <div style={{height:3,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:2}} /></div>}
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="mono" style={{fontSize:".625rem",color:"#3f3f46"}}>{new Date(q.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</span>
                    <button className="btn btn-p2q-ghost px-2 py-1" style={{fontSize:".6875rem",borderRadius:6}} onClick={()=>{navigator.clipboard?.writeText(`${window.location.origin}/#/shared/${q.share_token}`).catch(()=>{});toast("Link copied.","success");}}>Share</button>
                  </div>
                </div>
              );
            })}
          </div>
          {pages>1 && (
            <div className="d-flex gap-1 justify-content-center">
              {Array.from({length:pages},(_,i)=>i+1).map(p=>(
                <button key={p} onClick={()=>load(p)}
                  style={{width:32,height:32,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--mono)",fontSize:".75rem",cursor:"pointer",border:"1px solid var(--bs-border-color)",fontWeight:p===page?600:400,
                    ...(p===page?{background:"var(--c-accent-glow)",borderColor:"rgba(99,102,241,.3)",color:"#a5b4fc"}:{background:"rgba(255,255,255,.03)",color:"var(--c-muted)"})}}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
function AppShell() {
  const backendStatus = useBackendHealth();

  useEffect(() => {
    injectAssets();
    if (!GOOGLE_CLIENT_ID || document.getElementById("gsi")) return;
    const s = document.createElement("script");
    s.id = "gsi"; s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }, []);

  // Pages: landing | warmup | home | quiz | results | history
  const [page,       setPage]       = useState("landing");
  const [quiz,       setQuiz]       = useState(null);
  const [result,     setResult]     = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-advance from warmup to home when backend becomes ready
  useEffect(() => {
    if (backendStatus === "ready" && page === "warmup") {
      setPage("home");
    }
  }, [backendStatus, page]);

  const goHome = () => { setPage("home"); setQuiz(null); setResult(null); };

  // When user clicks "Start a quiz" on landing page
  const handleEnter = () => {
    if (backendStatus === "ready") {
      setPage("home");
    } else {
      // Backend cold — show warmup while it wakes up
      setPage("warmup");
    }
  };

  const showNav = page !== "landing";

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh" }}>
      {showNav && (
        <Navbar page={page} quizMeta={quiz && (page==="quiz"||page==="results") ? {topic:quiz.topic,difficulty:quiz.difficulty} : null}
          onHome={goHome} onHistory={()=>setPage("history")} onProfile={()=>setDrawerOpen(true)} />
      )}

      <div style={{flex:1,display:"flex",flexDirection:"column"}}>
        {page==="landing"  && <LandingPage  onEnter={handleEnter} backendStatus={backendStatus} />}
        {page==="warmup"   && <WarmupScreen onReady={()=>setPage("home")} />}
        {page==="home"     && <HomePage    onQuizReady={d=>{setQuiz(d);setPage("quiz");}} />}
        {page==="quiz"     && quiz && <QuizPage quiz={quiz} onFinish={(r,q)=>{setResult(r);setQuiz(q);setPage("results");}} />}
        {page==="results"  && result && quiz && <ResultsPage result={result} quiz={quiz} onNewQuiz={goHome} onHistory={()=>setPage("history")} />}
        {page==="history"  && <HistoryPage onBack={goHome} />}
      </div>

      {showNav && <Footer />}
      <ProfileDrawer open={drawerOpen} onClose={()=>setDrawerOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  );
}