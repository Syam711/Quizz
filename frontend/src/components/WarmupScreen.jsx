import { useState, useEffect, useRef, useCallback } from "react";

/* ─── GAME 1: Typing Speed Test ──────────────────────────────────────────── */
const TYPING_PASSAGES = [
  "The quick brown fox jumps over the lazy dog near the riverbank at sunrise.",
  "Knowledge is the foundation of all great achievements in science and art.",
  "Practice makes perfect when you dedicate time and effort to your goals.",
  "Artificial intelligence is reshaping how we learn, work, and create things.",
  "A curious mind that never stops asking questions will always keep growing.",
];

function TypingGame() {
  const passage   = useRef(TYPING_PASSAGES[Math.floor(Math.random() * TYPING_PASSAGES.length)]);
  const [input,   setInput]   = useState("");
  const [start,   setStart]   = useState(null);
  const [done,    setDone]    = useState(false);
  const [wpm,     setWpm]     = useState(0);
  const [acc,     setAcc]     = useState(0);
  const inputRef  = useRef(null);

  const text = passage.current;

  const handleChange = (e) => {
    const val = e.target.value;
    if (!start && val.length === 1) setStart(Date.now());
    setInput(val);

    if (val === text) {
      const mins   = (Date.now() - start) / 60000;
      const words  = text.split(" ").length;
      const errors = [...val].filter((c, i) => c !== text[i]).length;
      setWpm(Math.round(words / mins));
      setAcc(Math.round(((val.length - errors) / val.length) * 100));
      setDone(true);
    }
  };

  const reset = () => { setInput(""); setStart(null); setDone(false); inputRef.current?.focus(); };

  const chars = [...text].map((char, i) => {
    let color = "var(--c-muted)";
    if (i < input.length) color = input[i] === char ? "var(--c-success)" : "var(--c-danger)";
    return <span key={i} style={{ color }}>{char}</span>;
  });

  return (
    <div style={{ maxWidth: 560, width: "100%" }}>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: 4 }}>⌨️ Typing Speed Test</div>
        <div style={{ fontSize: ".8125rem", color: "var(--c-muted)" }}>Type the passage below as fast as you can</div>
      </div>

      {!done ? (
        <>
          <div style={{
            fontFamily: "var(--mono)", fontSize: ".9375rem", lineHeight: 1.9,
            padding: "16px 20px", borderRadius: 12,
            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)",
            marginBottom: 14, letterSpacing: ".02em",
          }}>
            {chars}
          </div>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={handleChange}
            placeholder="Start typing here…"
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)",
              color: "var(--bs-body-color)", fontFamily: "var(--mono)", fontSize: ".9375rem",
              outline: "none",
            }}
          />
          {start && (
            <div style={{ fontSize: ".75rem", color: "var(--c-muted)", marginTop: 8, textAlign: "right", fontFamily: "var(--mono)" }}>
              {Math.round(input.length / text.length * 100)}% complete
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20 }}>
            {[{ v: wpm, l: "WPM" }, { v: `${acc}%`, l: "Accuracy" }].map(({ v, l }) => (
              <div key={l} style={{ padding: "20px 28px", borderRadius: 12, background: "rgba(99,102,241,.1)", border: "1px solid rgba(99,102,241,.25)" }}>
                <div style={{ fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-.04em", color: "var(--c-accent)", lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: ".6875rem", color: "var(--c-muted)", marginTop: 4, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: ".9375rem", color: "var(--c-muted)", marginBottom: 16 }}>
            {wpm > 60 ? "🔥 Great speed!" : wpm > 40 ? "👍 Nice job!" : "💪 Keep practising!"}
          </div>
          <button onClick={reset} style={{ padding: "9px 24px", borderRadius: 8, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", color: "#a5b4fc", fontFamily: "inherit", cursor: "pointer", fontSize: ".875rem", fontWeight: 500 }}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── GAME 2: Reaction Time ───────────────────────────────────────────────── */
function ReactionGame() {
  const [phase,   setPhase]   = useState("idle");   // idle | waiting | go | result
  const [times,   setTimes]   = useState([]);
  const [start,   setStart]   = useState(null);
  const timerRef  = useRef(null);

  const begin = () => {
    setPhase("waiting");
    const delay = 2000 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setStart(Date.now());
      setPhase("go");
    }, delay);
  };

  const click = () => {
    if (phase === "waiting") {
      clearTimeout(timerRef.current);
      setPhase("idle");
      return;
    }
    if (phase === "go") {
      const rt = Date.now() - start;
      const next = [...times, rt].slice(-5);
      setTimes(next);
      setPhase("result");
    }
    if (phase === "result" || phase === "idle") {
      begin();
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  const bgColor =
    phase === "waiting" ? "rgba(99,102,241,.08)" :
    phase === "go"      ? "rgba(16,185,129,.15)" :
    phase === "result"  ? "rgba(99,102,241,.08)" :
                          "rgba(255,255,255,.04)";

  const borderColor =
    phase === "go" ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.09)";

  return (
    <div style={{ maxWidth: 480, width: "100%" }}>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: 4 }}>⚡ Reaction Time</div>
        <div style={{ fontSize: ".8125rem", color: "var(--c-muted)" }}>
          Click when the box turns green · Average of 5 tries
        </div>
      </div>

      <div
        onClick={click}
        style={{
          height: 200, borderRadius: 16,
          background: bgColor, border: `1px solid ${borderColor}`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all .15s", userSelect: "none",
          gap: 8,
        }}
      >
        {phase === "idle" && <><div style={{ fontSize: "2rem" }}>👆</div><div style={{ fontSize: ".9375rem", color: "var(--c-muted)" }}>Click to start</div></>}
        {phase === "waiting" && <><div style={{ fontSize: "2rem", animation: "blink 1s step-end infinite" }}>🔴</div><div style={{ fontSize: ".9375rem", color: "var(--c-muted)" }}>Wait for green…</div><div style={{ fontSize: ".75rem", color: "var(--c-muted)", opacity: .6 }}>(click to cancel)</div></>}
        {phase === "go" && <><div style={{ fontSize: "2rem" }}>🟢</div><div style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--c-success)" }}>CLICK NOW!</div></>}
        {phase === "result" && <><div style={{ fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-.04em", color: "var(--c-accent)" }}>{times[times.length - 1]}ms</div><div style={{ fontSize: ".875rem", color: "var(--c-muted)" }}>Click to go again</div></>}
      </div>

      {times.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
          {times.map((t, i) => (
            <span key={i} style={{ fontFamily: "var(--mono)", fontSize: ".75rem", padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", color: "var(--c-muted)" }}>
              {t}ms
            </span>
          ))}
          {avg && <span style={{ fontFamily: "var(--mono)", fontSize: ".75rem", padding: "3px 10px", borderRadius: 20, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#a5b4fc" }}>avg {avg}ms</span>}
        </div>
      )}
    </div>
  );
}

/* ─── GAME 3: Word Association ────────────────────────────────────────────── */
const WORD_CHAINS = [
  { word: "OCEAN",   hints: ["🌊", "blue", "deep"], answer: "WATER" },
  { word: "FIRE",    hints: ["🔥", "hot", "burns"], answer: "HEAT" },
  { word: "CLOCK",   hints: ["⏰", "tick", "round"], answer: "TIME" },
  { word: "LIBRARY", hints: ["📚", "quiet", "pages"], answer: "BOOKS" },
  { word: "GARDEN",  hints: ["🌱", "green", "grows"], answer: "PLANTS" },
  { word: "STORM",   hints: ["⛈️", "loud", "dark"], answer: "THUNDER" },
  { word: "COMPASS", hints: ["🧭", "north", "navigate"], answer: "DIRECTION" },
  { word: "CANDLE",  hints: ["🕯️", "wax", "flame"], answer: "LIGHT" },
];

function WordGame() {
  const [idx,    setIdx]   = useState(() => Math.floor(Math.random() * WORD_CHAINS.length));
  const [input,  setInput] = useState("");
  const [hintN,  setHintN] = useState(0);
  const [state,  setState] = useState("playing"); // playing | correct | wrong
  const [score,  setScore] = useState(0);
  const [round,  setRound] = useState(1);
  const inputRef = useRef(null);

  const item = WORD_CHAINS[idx];

  const check = () => {
    const guess = input.trim().toUpperCase();
    if (guess === item.answer) {
      setState("correct");
      setScore(s => s + Math.max(3 - hintN, 1));
    } else {
      setState("wrong");
    }
  };

  const next = () => {
    const nextIdx = (idx + 1) % WORD_CHAINS.length;
    setIdx(nextIdx); setInput(""); setHintN(0); setState("playing"); setRound(r => r + 1);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div style={{ maxWidth: 480, width: "100%" }}>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: 4 }}>🧠 Word Association</div>
        <div style={{ fontSize: ".8125rem", color: "var(--c-muted)" }}>What word does this make you think of?</div>
      </div>

      <div style={{ textAlign: "center", padding: "28px 20px", borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: ".6875rem", color: "var(--c-muted)", marginBottom: 12, letterSpacing: ".12em", textTransform: "uppercase" }}>Round {round} · Score {score}</div>
        <div style={{ fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-.04em", marginBottom: 20, color: "var(--bs-body-color)" }}>
          {item.word}
        </div>

        {/* Hints */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, minHeight: 28 }}>
          {item.hints.slice(0, hintN).map((h, i) => (
            <span key={i} style={{ padding: "3px 12px", borderRadius: 20, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", fontSize: ".8125rem", color: "#fcd34d" }}>{h}</span>
          ))}
        </div>

        {state === "playing" && (
          <>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <input
                ref={inputRef}
                autoFocus
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && input.trim() && check()}
                placeholder="Your answer…"
                style={{ padding: "10px 16px", borderRadius: 8, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "var(--bs-body-color)", fontFamily: "inherit", fontSize: ".9375rem", outline: "none", width: 200 }}
              />
              <button onClick={check} disabled={!input.trim()}
                style={{ padding: "10px 18px", borderRadius: 8, background: "var(--c-accent)", border: "none", color: "#fff", fontFamily: "inherit", fontSize: ".875rem", fontWeight: 600, cursor: "pointer", opacity: input.trim() ? 1 : .4 }}>
                Check
              </button>
            </div>
            {hintN < item.hints.length && (
              <button onClick={() => setHintN(n => n + 1)}
                style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, background: "transparent", border: "1px solid rgba(245,158,11,.25)", color: "#fcd34d", fontFamily: "inherit", fontSize: ".75rem", cursor: "pointer" }}>
                💡 Hint ({item.hints.length - hintN} left)
              </button>
            )}
          </>
        )}

        {state === "correct" && (
          <div>
            <div style={{ color: "var(--c-success)", fontWeight: 700, fontSize: "1.125rem", marginBottom: 8 }}>✓ Correct! +{Math.max(3 - hintN, 1)} points</div>
            <div style={{ fontSize: ".875rem", color: "var(--c-muted)", marginBottom: 14 }}>Answer: <strong style={{ color: "var(--bs-body-color)" }}>{item.answer}</strong></div>
            <button onClick={next} style={{ padding: "9px 24px", borderRadius: 8, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.25)", color: "var(--c-success)", fontFamily: "inherit", cursor: "pointer", fontSize: ".875rem", fontWeight: 500 }}>Next word →</button>
          </div>
        )}

        {state === "wrong" && (
          <div>
            <div style={{ color: "var(--c-danger)", fontWeight: 700, fontSize: "1.0625rem", marginBottom: 6 }}>✗ Not quite</div>
            <div style={{ fontSize: ".875rem", color: "var(--c-muted)", marginBottom: 14 }}>The answer was: <strong style={{ color: "var(--bs-body-color)" }}>{item.answer}</strong></div>
            <button onClick={next} style={{ padding: "9px 24px", borderRadius: 8, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "var(--c-muted)", fontFamily: "inherit", cursor: "pointer", fontSize: ".875rem" }}>Next word →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── WARMUP SCREEN ───────────────────────────────────────────────────────── */
const GAMES = [TypingGame, ReactionGame, WordGame];
const GAME_NAMES = ["Typing Speed Test", "Reaction Game", "Word Association"];

export default function WarmupScreen({ onReady }) {
  const [GameComponent] = useState(() => GAMES[Math.floor(Math.random() * GAMES.length)]);
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState(0);

  // Pulse progress bar slowly while waiting
  useEffect(() => {
    const id = setInterval(() => setProgress(p => p < 90 ? p + 0.4 : p), 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: "calc(100vh - 110px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", padding: "40px 20px 60px",
      gap: 32, position: "relative", zIndex: 1,
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes warmIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .warmup-enter { animation: warmIn .5s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* Header */}
      <div className="warmup-enter text-center" style={{ maxWidth: 540 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", fontSize: ".75rem", color: "#fcd34d", fontFamily: "var(--mono)", marginBottom: 16 }}>
          <span style={{ animation: "blink 1.2s step-end infinite" }}>◉</span>
          Server warming up{"." .repeat(dots)}
        </div>
        <h2 style={{ fontWeight: 700, fontSize: "1.375rem", letterSpacing: "-.025em", marginBottom: 8 }}>
          Stay sharp while you wait
        </h2>
        <p style={{ fontSize: ".875rem", color: "var(--c-muted)", lineHeight: 1.65 }}>
          The server takes ~30 seconds to wake up on first load.
          We'll take you in automatically the moment it's ready.
        </p>
      </div>

      {/* Progress bar */}
      <div className="warmup-enter" style={{ width: "100%", maxWidth: 460 }} >
        <div style={{ height: 4, background: "rgba(255,255,255,.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 2,
            background: "linear-gradient(90deg, #6366f1, #818cf8)",
            width: `${progress}%`,
            transition: "width .4s ease",
            boxShadow: "0 0 12px rgba(99,102,241,.6)",
          }} />
        </div>
        <div style={{ fontSize: ".6875rem", color: "var(--c-muted)", fontFamily: "var(--mono)", marginTop: 6, textAlign: "right" }}>
          connecting to server…
        </div>
      </div>

      {/* The mini game */}
      <div className="warmup-enter d-flex justify-content-center w-100" style={{ animationDelay: ".15s" }}>
        <GameComponent />
      </div>

      {/* Manual skip button */}
      <div className="warmup-enter" style={{ animationDelay: ".25s" }}>
        <button onClick={onReady}
          style={{ padding: "8px 20px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,.1)", color: "var(--c-muted)", fontFamily: "inherit", fontSize: ".8125rem", cursor: "pointer" }}>
          Skip and try anyway →
        </button>
      </div>
    </div>
  );
}