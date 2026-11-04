// 커서 트레일 (Constellation) — originkit Multi-Effect Cursor 포팅
// 사용: <script src=".../cursor-fx-1.0.0.masstige.js" data-color="#763fa3"></script>
// data-color / data-size / data-intensity / data-flow / data-length 로 조절
(() => {
  "use strict";

  const script = document.currentScript;
  const ds = (script && script.dataset) || {};
  const num = (v, d) => (v !== undefined && v !== "" ? Number(v) : d);
  const opt = {
    color: ds.color || "#763fa3",
    size: num(ds.size, 6), // 점 크기
    intensity: num(ds.intensity, 10), // 점 개수
    flow: num(ds.flow, 6), // 움직임 따라가는 정도
    length: num(ds.length, 10), // 남는 시간
  };

  // 마우스 환경에서만, 모션 줄이기 설정이면 끔
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const hex = opt.color.replace("#", "");
  const full = hex.length < 6 ? hex.split("").map((c) => c + c).join("") : hex;
  const n = parseInt(full.slice(0, 6), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
  const rgba = (a) => `rgba(${rgb}, ${Math.max(0, Math.min(1, a))})`;

  // 원본 상수 (60fps 기준 → 주사율 무관하게 동일)
  const LIFE = Math.max(1, Math.min(20, opt.length)) * 0.15;
  const MAX = 100;
  const RATE = 1 / 60;
  const IDLE = 100;
  const SMOOTH = 0.05;
  const LEAD = 0.012;
  const LEAD_MAX = 14;
  const TAU = Math.PI * 2;
  const decay = (k, dt) => Math.pow(k, dt * 60);

  // cubic-bezier(.4, 0, .2, 1)
  const ease = ((x1, y1, x2, y2) => {
    const b = (a, c, t) => {
      const s = 1 - t;
      return 3 * s * s * t * a + 3 * s * t * t * c + t * t * t;
    };
    return (p) => {
      const x = Math.max(0, Math.min(1, p));
      let t = x;
      for (let i = 0; i < 8; i++) {
        const s = 1 - t;
        const d = 3 * s * s * x1 + 6 * s * t * (x2 - x1) + 3 * t * t * (1 - x2);
        if (Math.abs(d) < 1e-6) break;
        t = Math.max(0, Math.min(1, t - (b(x1, x2, t) - x) / d));
      }
      return b(y1, y2, t);
    };
  })(0.4, 0, 0.2, 1);

  const canvas = document.createElement("canvas");
  canvas.className = "cursor_fx";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    zIndex: "9999",
    pointerEvents: "none",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // 기본 커서 숨김 (링크·랜야드 등 인라인 cursor 포함)
  const hide = document.createElement("style");
  hide.textContent =
    "html.is_cursor_fx, html.is_cursor_fx * { cursor: none !important; }";
  document.head.appendChild(hide);
  document.documentElement.classList.add("is_cursor_fx");

  let w = 1;
  let h = 1;
  const resize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * d);
    canvas.height = Math.floor(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    kick();
  };

  let parts = [];
  let x = 0;
  let y = 0;
  let px = 0;
  let py = 0;
  let vx = 0;
  let vy = 0;
  let has = false;
  let inside = false;
  let lastMove = 0;
  let acc = 0;
  let raf = 0;
  let last = 0;

  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  // 커서 위치에 점 생성
  const spawn = () => {
    const b = opt.flow / 10;
    const count = Math.max(1, Math.round(opt.intensity * 0.6));
    for (let i = 0; i < count; i++) {
      const a = (TAU * i) / count + Math.random() * 0.2;
      const d = opt.size * 0.2 * Math.random();
      parts.push({
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        vx: vx * b * 0.1 + (Math.random() - 0.5) * 8,
        vy: vy * b * 0.1 + (Math.random() - 0.5) * 8,
        size: opt.size * (0.8 + Math.random() * 0.4),
        age: 0,
        alpha: 1,
      });
    }
    while (parts.length > MAX) parts.shift();
  };

  const draw = (dt, hx, hy) => {
    for (const p of parts) {
      p.vx *= decay(0.96, dt);
      p.vy *= decay(0.96, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.age / LIFE;
      p.alpha = 1 - ease(k);
      const r = Math.max(0.5, p.size * (1 - k * 0.2));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, rgba(p.alpha));
      g.addColorStop(0.7, rgba(p.alpha * 0.6));
      g.addColorStop(1, rgba(0));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
    }

    // 가까운 점끼리 연결선
    const link = opt.size * 5;
    const cnt = Math.min(parts.length, 40);
    ctx.lineWidth = 1;
    for (let i = 0; i < cnt; i++) {
      const a = parts[i];
      for (let j = i + 1; j < Math.min(i + 5, cnt); j++) {
        const b = parts[j];
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist >= link) continue;
        ctx.strokeStyle = rgba((1 - dist / link) * a.alpha * b.alpha * 0.5);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // 커서 머리 (번짐 + 흰 코어)
    if (!inside) return;
    const s = opt.size * 1.5;
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, s * 2.5);
    glow.addColorStop(0, rgba(0.4));
    glow.addColorStop(1, rgba(0));
    ctx.beginPath();
    ctx.arc(hx, hy, s * 2.5, 0, TAU);
    ctx.fillStyle = glow;
    ctx.fill();
    const core = ctx.createRadialGradient(hx, hy, 0, hx, hy, s);
    core.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    core.addColorStop(0.3, rgba(1));
    core.addColorStop(1, rgba(0.8));
    ctx.beginPath();
    ctx.arc(hx, hy, s, 0, TAU);
    ctx.fillStyle = core;
    ctx.fill();
  };

  function frame(t) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
    last = t;
    ctx.clearRect(0, 0, w, h);

    // 커서 속도 (부드럽게) → 머리가 진행 방향으로 살짝 앞섬
    if (dt > 0) {
      const k = 1 - Math.exp(-dt / SMOOTH);
      vx += ((x - px) / dt - vx) * k;
      vy += ((y - py) / dt - vy) * k;
    }
    px = x;
    py = y;
    const lead = (v) => Math.max(-LEAD_MAX, Math.min(LEAD_MAX, v * LEAD));

    const moving = inside && t - lastMove < IDLE;
    acc += dt;
    while (acc >= RATE) {
      acc -= RATE;
      if (has && moving) spawn();
    }
    parts.forEach((p) => (p.age += dt));
    parts = parts.filter((p) => p.age < LIFE);

    draw(dt, x + lead(vx), y + lead(vy));

    // 점이 다 사라지고 멈추면 루프 정지 (마지막 장면 유지)
    if (parts.length || moving || Math.abs(vx) + Math.abs(vy) > 1) {
      raf = requestAnimationFrame(frame);
    }
  }

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      if (!has) {
        has = true;
        px = e.clientX;
        py = e.clientY;
      }
      inside = true;
      x = e.clientX;
      y = e.clientY;
      lastMove = performance.now();
      kick();
    },
    { passive: true },
  );
  // 창 밖으로 나가면 머리 숨김
  document.addEventListener("mouseout", (e) => {
    if (e.relatedTarget) return;
    inside = false;
    kick();
  });
  window.addEventListener("blur", () => {
    inside = false;
    kick();
  });
  window.addEventListener("resize", resize);
  resize();
})();
