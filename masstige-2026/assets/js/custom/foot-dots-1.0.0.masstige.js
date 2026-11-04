// 푸터 도트 로고 — 평소 롤링, 마우스 올리면 멈추고 도트가 커서에 흩어짐
// 참고: unitedcarriers.com 푸터 파티클 (ease·friction·force 값 동일 계열)
(() => {
  "use strict";

  const roll = document.querySelector(".foot_roll");
  if (!roll) return;
  const track = roll.querySelector(".foot_roll_track");
  const imgs = Array.from(roll.querySelectorAll(".foot_roll_item"));
  if (!track || !imgs.length) return;

  const mq = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1025px)");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  // 조절값
  const RADIUS = 80; // 커서 반경(px)
  const FORCE = 90; // 밀어내는 힘
  const COLOR = "#fff";

  let dots = null; // svg 도트 중심 [x, y, ...] (viewBox 단위)
  let vbW = 0;
  let dotR = 0;
  let loading = null;

  let canvas = null;
  let ctx = null;
  let n = 0;
  let ox, oy, px, py, vx, vy, ease, tEase, fric;
  let r = 1;
  let w = 0;
  let h = 0;

  let on = false; // 캔버스 모드
  let hover = false;
  let moving = false;
  let moveTimer = 0;
  let raf = 0;
  const mouse = { x: -9999, y: -9999 };

  // svg path(M/m + a 원) → 도트 중심 좌표
  const parse = (txt) => {
    const vb = txt.match(/viewBox="[\d.\s-]+?\s([\d.]+)\s[\d.]+"/);
    vbW = vb ? parseFloat(vb[1]) : 3080;
    const a = txt.match(/a([\d.]+)\s/);
    dotR = a ? parseFloat(a[1]) : 1.15;

    const out = [];
    const re = /([Mm])\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/g;
    let sx = 0;
    let sy = 0;
    let m;
    while ((m = re.exec(txt))) {
      const x = parseFloat(m[2]);
      const y = parseFloat(m[3]);
      if (m[1] === "M") {
        sx = x;
        sy = y;
      } else {
        sx += x;
        sy += y;
      }
      out.push(sx + dotR, sy);
    }
    return new Float32Array(out);
  };

  const load = () => {
    if (!loading) {
      const src = imgs[0].currentSrc || imgs[0].src;
      loading = fetch(src)
        .then((res) => res.text())
        .then((txt) => {
          dots = parse(txt);
        })
        .catch(() => {
          dots = new Float32Array(0);
        });
    }
    return loading;
  };

  const makeCanvas = () => {
    canvas = document.createElement("canvas");
    canvas.className = "foot_roll_canvas";
    canvas.setAttribute("aria-hidden", "true");
    roll.appendChild(canvas);
    ctx = canvas.getContext("2d");
  };

  // 멈춘 위치 그대로 파티클 생성
  const build = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rr = roll.getBoundingClientRect();
    w = rr.width;
    h = rr.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const list = [];
    imgs.forEach((img) => {
      const ir = img.getBoundingClientRect();
      if (ir.right < rr.left || ir.left > rr.right) return;
      const s = ir.width / vbW;
      const left = ir.left - rr.left;
      const top = ir.top - rr.top;
      r = dotR * s;
      for (let i = 0; i < dots.length; i += 2) {
        const x = left + dots[i] * s;
        if (x < -r || x > w + r) continue;
        const y = top + dots[i + 1] * s;
        if (y > h + r) continue;
        list.push(x, y);
      }
    });

    n = list.length / 2;
    ox = new Float32Array(n);
    oy = new Float32Array(n);
    px = new Float32Array(n);
    py = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    ease = new Float32Array(n);
    tEase = new Float32Array(n);
    fric = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      ox[i] = px[i] = list[i * 2];
      oy[i] = py[i] = list[i * 2 + 1];
      ease[i] = 0.04 + Math.random() * 0.04;
      tEase[i] = 0.2 + Math.random() * 0.2;
      fric[i] = 0.8 + Math.random() * 0.15;
    }
  };

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLOR;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      ctx.moveTo(px[i] + r, py[i]);
      ctx.arc(px[i], py[i], r, 0, Math.PI * 2);
    }
    ctx.fill();
  };

  const tick = () => {
    raf = 0;
    const rr = roll.getBoundingClientRect();
    const mx = mouse.x - rr.left;
    const my = mouse.y - rr.top;
    const R2 = RADIUS * RADIUS;
    const push = hover && moving;
    let rest = true;

    for (let i = 0; i < n; i++) {
      if (push) {
        const dx = mx - px[i];
        const dy = my - py[i];
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 1;
          const f = (-(RADIUS - d) / RADIUS) * FORCE * (0.5 + Math.random());
          ease[i] = tEase[i];
          vx[i] += (dx / d) * f + (Math.random() - 0.5);
          vy[i] += (dy / d) * f + (Math.random() - 0.5);
        }
      }
      vx[i] *= fric[i];
      vy[i] *= fric[i];
      px[i] += vx[i] + (ox[i] - px[i]) * ease[i];
      py[i] += vy[i] + (oy[i] - py[i]) * ease[i];
      if (rest && (Math.abs(ox[i] - px[i]) > 0.3 || Math.abs(oy[i] - py[i]) > 0.3)) rest = false;
    }
    draw();

    // 커서가 나가고 제자리로 돌아오면 롤링 재개
    if (!hover && rest) {
      stop();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const start = () => {
    if (on) return;
    on = true;
    if (!canvas) makeCanvas();
    build();
    draw();
    roll.classList.add("is_dots");
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    on = false;
    roll.classList.remove("is_dots");
  };

  const inside = (x, y) => {
    const rr = roll.getBoundingClientRect();
    return x >= rr.left && x <= rr.right && y >= rr.top && y <= rr.bottom;
  };

  const onMove = (e) => {
    if (!mq.matches || reduce.matches) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    const now = inside(e.clientX, e.clientY);

    if (now && !hover) {
      hover = true;
      load().then(() => {
        if (hover && dots && dots.length) start();
      });
    } else if (!now && hover) {
      hover = false;
    }

    if (hover) {
      moving = true;
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => {
        moving = false;
      }, 100);
      if (on && !raf) raf = requestAnimationFrame(tick);
    }
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => {
    hover = false;
  });
  window.addEventListener("resize", () => {
    hover = false;
    if (on) stop();
  });
})();
