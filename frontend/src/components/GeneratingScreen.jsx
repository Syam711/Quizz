import { useState, useEffect, useRef } from "react";

const FALLBACK_FACTS = [
  "Honey never spoils — archaeologists found 3000-year-old honey in Egyptian tombs still edible.",
  "A group of flamingos is called a 'flamboyance'.",
  "The Eiffel Tower grows about 15cm taller in summer due to thermal expansion.",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "A day on Venus is longer than a year on Venus.",
  "Octopuses have three hearts, blue blood, and nine brains.",
  "The first computer bug was a literal bug — a moth trapped in a relay in 1947.",
  "Bananas are berries, but strawberries are not.",
  "The shortest war in history lasted 38–45 minutes (Anglo-Zanzibar War, 1896).",
  "There are more possible chess games than atoms in the observable universe.",
  "Wombat poop is cube-shaped — the only known animal to produce cube feces.",
  "A bolt of lightning contains enough energy to toast 100,000 slices of bread.",
  "Sharks are older than trees — they've existed for ~450 million years.",
  "Oxford University is older than the Aztec Empire.",
  "The average cloud weighs about 500,000 kg.",
];

async function fetchFact() {
  try {
    const res  = await fetch("https://opentdb.com/api.php?amount=1&type=boolean", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data.results?.[0]) {
      const q    = data.results[0];
      const text = q.question
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&ldquo;/g, '"')
        .replace(/&rdquo;/g, '"');
      const ans  = q.correct_answer === "True" ? "True ✓" : "False ✗";
      return `${text} — ${ans}`;
    }
  } catch { /* fall through to fallback */ }
  return FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
}

const MSGS = [
  "Generating your quiz…",
  "Crafting questions…",
  "Calibrating difficulty…",
  "Polishing explanations…",
  "Almost there…",
];

export default function GeneratingScreen({ topic, batchProg, fallbackNote }) {
  const [fact,    setFact]    = useState("");
  const [msgIdx,  setMsgIdx]  = useState(0);
  const [factAnim,setFactAnim]= useState(false);
  const [dots,    setDots]    = useState(0);
  const factRef = useRef(null);

  // Rotate status messages
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % MSGS.length), 2200);
    return () => clearInterval(id);
  }, []);

  // Animate dots
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);

  // Load first fact, then refresh every 8s
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const f = await fetchFact();
      if (!cancelled) {
        setFactAnim(false);
        setTimeout(() => { if (!cancelled) { setFact(f); setFactAnim(true); } }, 100);
      }
    };

    load();
    const id = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div style={{
      minHeight: "calc(100vh - 110px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "60px 20px", gap: 36,
    }}>
      <style>{`
        @keyframes spinRing {
          to { transform: rotate(360deg); }
        }
        @keyframes factSlide {
          from { opacity:0; transform: translateY(12px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes batchPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
        .fact-enter { animation: factSlide .45s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      {/* Spinner ring */}
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          border: "3px solid rgba(99,102,241,.12)",
          borderTopColor: "var(--c-accent)",
          animation: "spinRing .7s linear infinite",
          boxShadow: "0 0 20px rgba(99,102,241,.3)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.375rem",
        }}>✦</div>
      </div>

      {/* Status text */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: "1.0625rem", marginBottom: 6, letterSpacing: "-.015em" }}>
          {MSGS[msgIdx]}{"." .repeat(dots)}
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: ".8125rem", color: "var(--c-muted)" }}>
          "{topic}"
        </div>
      </div>

      {/* Batch progress */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: ".6875rem", color: "var(--c-muted)", marginBottom: 10 }}>
          batch {batchProg.done + 1} / {batchProg.total}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {Array.from({ length: batchProg.total }).map((_, i) => (
            <div key={i} style={{
              width: i < batchProg.done ? 28 : i === batchProg.done ? 12 : 8,
              height: 8, borderRadius: 4,
              background:
                i < batchProg.done  ? "var(--c-success)" :
                i === batchProg.done ? "var(--c-accent)"  : "rgba(255,255,255,.1)",
              transition: "all .4s cubic-bezier(.22,1,.36,1)",
              boxShadow: i === batchProg.done ? "0 0 8px rgba(99,102,241,.6)" : "none",
            }} />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ height: 2, background: "rgba(255,255,255,.06)", borderRadius: 1, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 1,
            background: "linear-gradient(90deg, #6366f1, #818cf8)",
            width: `${Math.round((batchProg.done / Math.max(batchProg.total, 1)) * 85 + 5)}%`,
            transition: "width .6s cubic-bezier(.22,1,.36,1)",
          }} />
        </div>
      </div>

      {/* Fallback notice */}
      {fallbackNote && (
        <div style={{
          padding: "8px 16px", borderRadius: 8,
          background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)",
          fontSize: ".75rem", color: "#fcd34d", fontFamily: "var(--mono)", maxWidth: 400, textAlign: "center",
        }}>
          ⚡ {fallbackNote}
        </div>
      )}

      {/* Did you know */}
      {fact && (
        <div
          key={fact}
          className="fact-enter"
          style={{
            maxWidth: 480, width: "100%",
            padding: "18px 22px", borderRadius: 14,
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div style={{ fontFamily: "var(--mono)", fontSize: ".6875rem", color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 8 }}>
            💡 Did you know?
          </div>
          <div style={{ fontSize: ".875rem", color: "var(--bs-body-color)", lineHeight: 1.65 }}>
            {fact}
          </div>
        </div>
      )}
    </div>
  );
}