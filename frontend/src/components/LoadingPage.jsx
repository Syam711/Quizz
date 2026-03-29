import { useState, useEffect, useRef } from "react";

const FEATURES = [
  { icon: "⚡", title: "AI-Powered", desc: "Gemini generates sharp, accurate questions on any topic" },
  { icon: "🎯", title: "Any Topic", desc: "Code, history, science, literature — paste anything" },
  { icon: "📊", title: "Track Progress", desc: "Sign in to save history and build a daily streak" },
  { icon: "🔗", title: "Share Quizzes", desc: "Generate a link and challenge your friends" },
];

const SAMPLE_TOPICS = [
  "Python Decorators", "WW2 Turning Points", "Quantum Entanglement",
  "React Hooks", "Organic Chemistry", "Roman History",
  "Machine Learning Basics", "Shakespeare Plays",
];

// Animated typing effect for the hero headline
function TypewriterText({ words }) {
  const [idx, setIdx]     = useState(0);
  const [chars, setChars] = useState(0);
  const [del, setDel]     = useState(false);

  useEffect(() => {
    const word = words[idx];
    if (!del && chars < word.length) {
      const t = setTimeout(() => setChars(c => c + 1), 65);
      return () => clearTimeout(t);
    }
    if (!del && chars === word.length) {
      const t = setTimeout(() => setDel(true), 1800);
      return () => clearTimeout(t);
    }
    if (del && chars > 0) {
      const t = setTimeout(() => setChars(c => c - 1), 35);
      return () => clearTimeout(t);
    }
    if (del && chars === 0) {
      setDel(false);
      setIdx(i => (i + 1) % words.length);
    }
  }, [chars, del, idx, words]);

  return (
    <span style={{ color: "var(--c-accent)" }}>
      {words[idx].slice(0, chars)}
      <span style={{ borderRight: "2px solid var(--c-accent)", marginLeft: 1, animation: "blink 1s step-end infinite" }} />
    </span>
  );
}

// Floating particle background
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let W = canvas.width  = canvas.offsetWidth;
    let H = canvas.height = canvas.offsetHeight;

    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.4 + 0.1,
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,102,241,${p.a})`;
        ctx.fill();
      });

      // Draw connecting lines between close particles
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", resize);
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", opacity: 0.7,
      }}
    />
  );
}

export default function LandingPage({ onEnter, backendStatus }) {
  const [visible, setVisible] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const statusColor =
    backendStatus === "ready"   ? "var(--c-success)" :
    backendStatus === "checking"? "var(--c-warning)"  :
    backendStatus === "cold"    ? "#f59e0b"           : "var(--c-muted)";

  const statusLabel =
    backendStatus === "ready"   ? "Server ready" :
    backendStatus === "checking"? "Connecting…"  :
    backendStatus === "cold"    ? "Warming up…"  : "Offline";

  const statusDot =
    backendStatus === "ready" ? "pulse-green" : "pulse-amber";

  return (
    <div style={{
      minHeight: "calc(100vh - 58px)",
      display: "flex", flexDirection: "column",
      background: "var(--bs-body-bg)",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes floatUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)} 50%{box-shadow:0 0 0 6px rgba(16,185,129,0)} }
        @keyframes pulse-amber { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.5)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .land-hero   { animation: floatUp .7s cubic-bezier(.22,1,.36,1) both; }
        .land-sub    { animation: floatUp .7s .15s cubic-bezier(.22,1,.36,1) both; }
        .land-cta    { animation: floatUp .7s .28s cubic-bezier(.22,1,.36,1) both; }
        .land-chips  { animation: floatUp .7s .4s  cubic-bezier(.22,1,.36,1) both; }
        .land-feats  { animation: floatUp .7s .52s cubic-bezier(.22,1,.36,1) both; }
        .feat-card {
          transition: all .25s cubic-bezier(.22,1,.36,1);
          cursor: default;
        }
        .feat-card:hover {
          border-color: rgba(99,102,241,.35) !important;
          background: rgba(99,102,241,.07) !important;
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,.3);
        }
        .cta-btn {
          background: linear-gradient(135deg, #6366f1, #818cf8, #6366f1);
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
          border: none; color: #fff;
          font-weight: 700; font-size: 1.0625rem;
          padding: 14px 40px; border-radius: 12px;
          cursor: pointer; font-family: inherit;
          transition: transform .2s, box-shadow .2s;
          box-shadow: 0 4px 24px rgba(99,102,241,.45);
          letter-spacing: -.01em;
        }
        .cta-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 40px rgba(99,102,241,.6);
        }
        .cta-btn:active { transform: scale(.98); }
        .topic-chip-land {
          padding: 5px 14px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.04);
          font-size: .75rem; color: var(--c-muted);
          transition: all .18s;
        }
        .topic-chip-land:hover {
          border-color: rgba(99,102,241,.4);
          color: #a5b4fc; background: rgba(99,102,241,.08);
        }
        .status-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .status-dot.pulse-green { background: var(--c-success); animation: pulse-green 2s ease infinite; }
        .status-dot.pulse-amber { background: #f59e0b; animation: pulse-amber 1.5s ease infinite; }
        .gradient-text {
          background: linear-gradient(135deg, #f4f4f5, #a5b4fc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Particle background */}
      <ParticleField />

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "-20%", left: "50%",
        transform: "translateX(-50%)",
        width: "70vw", height: "60vh",
        background: "radial-gradient(ellipse, rgba(99,102,241,.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Hero section */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "60px 20px 40px",
        position: "relative", zIndex: 1,
        opacity: visible ? 1 : 0, transition: "opacity .3s",
      }}>

        {/* Status pill */}
        <div className="d-flex align-items-center gap-2 mb-4" style={{
          padding: "6px 14px", borderRadius: 20,
          background: "rgba(255,255,255,.04)",
          border: "1px solid rgba(255,255,255,.09)",
          fontSize: ".75rem", color: statusColor,
          fontFamily: "var(--mono)",
        }}>
          <div className={`status-dot ${statusDot}`} />
          {statusLabel}
        </div>

        {/* Headline */}
        <h1 className="land-hero text-center" style={{
          fontWeight: 800, letterSpacing: "-.045em",
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          lineHeight: 1.05, marginBottom: 20, maxWidth: 720,
        }}>
          <span className="gradient-text">Quiz yourself on</span>
          <br />
          <TypewriterText words={SAMPLE_TOPICS} />
        </h1>

        {/* Subheading */}
        <p className="land-sub text-center" style={{
          fontSize: "clamp(1rem, 2vw, 1.1875rem)",
          color: "var(--c-muted)", lineHeight: 1.7,
          maxWidth: 520, marginBottom: 36,
        }}>
          Paste any topic, paragraph, or concept — get a structured
          multiple-choice quiz with explanations in seconds, powered by Gemini AI.
        </p>

        {/* CTA */}
        <div className="land-cta d-flex align-items-center gap-3 flex-wrap justify-content-center mb-4">
          <button className="cta-btn" onClick={onEnter}>
            Start a quiz →
          </button>
          <span style={{ fontSize: ".8125rem", color: "var(--c-muted)" }}>
            Free · No sign-up required
          </span>
        </div>

        {/* Sample topic chips */}
        <div className="land-chips d-flex flex-wrap gap-2 justify-content-center mb-16" style={{ maxWidth: 600 }}>
          {SAMPLE_TOPICS.map(t => (
            <span key={t} className="topic-chip-land">{t}</span>
          ))}
        </div>

        {/* Feature cards */}
        <div className="land-feats" style={{ maxWidth: 820, width: "100%", marginTop: 40 }}>
          <div className="row g-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="col-12 col-sm-6 col-md-3">
                <div
                  className="feat-card h-100 p-3 rounded-3"
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "1px solid rgba(255,255,255,.08)",
                    animationDelay: `${i * 0.08}s`,
                  }}
                  onMouseEnter={() => setHoveredFeature(i)}
                  onMouseLeave={() => setHoveredFeature(null)}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: ".875rem", marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--c-muted)", lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom fade */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
        background: "linear-gradient(transparent, var(--bs-body-bg))",
        pointerEvents: "none",
      }} />
    </div>
  );
}