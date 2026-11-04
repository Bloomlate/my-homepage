// 메인 페이지: 비주얼 이미지 시퀀스 · 카드 펼침 섹션
(() => {
  "use strict";

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const smooth = (t) => t * t * (3 - 2 * t);
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  // sticky 무대의 top 값 (헤더 높이)
  const stickyTop = (el) => parseFloat(getComputedStyle(el).top) || 0;

  // 고정 구간 진행률 0~1: 무대가 헤더 아래에 붙는 순간 0, 섹션 끝이 화면 아래에 닿으면 1
  // hold: 끝에서 제외할 길이(px) — 이 구간은 마지막 상태(1)로 고정
  const pinProgress = (section, top, stageH, hold = 0) => {
    const rect = section.getBoundingClientRect();
    const range = rect.height - stageH - hold;
    return range > 0 ? clamp((top - rect.top) / range, 0, 1) : 0;
  };

  // [미사용] 히어로 타이핑 — Typewriter JS
  // 되살리려면: typewriter-core.min.js(이미 js.html) + 아래 함수 주석 해제 + initHeroType() 호출 복구
  // + index.html .hero_type data-type-line* 마크업으로 되돌리기
  // ※ 헤더 타이핑은 common.js initBrandType
  /*
  const initHeroType = () => {
    const el = document.querySelector(".hero_type");
    if (!el) return;

    const line1 = el.getAttribute("data-type-line1") || "AI가 발견하고,";
    const line2 = el.getAttribute("data-type-line2") || "세계가 주목하도록.";
    const full = `<span class="hero_line">${line1}</span><br><span class="hero_line">${line2}</span>`;

    if (reduceMotion) {
      el.innerHTML = full;
      return;
    }

    const Tw =
      typeof Typewriter !== "undefined"
        ? Typewriter.default || Typewriter
        : null;
    if (!Tw) {
      el.innerHTML = full;
      return;
    }

    const tw = new Tw(el, {
      cursor: " ",
      delay: 70,
      deleteSpeed: 40,
      loop: true,
      autoStart: false,
      pauseFor: 1800,
      cursorClassName: "Typewriter__cursor",
      wrapperClassName: "Typewriter__wrapper",
    });

    tw.typeString(`<span class="hero_line">${line1}</span>`)
      .typeString("<br>")
      .typeString(`<span class="hero_line">${line2}</span>`)
      .pauseFor(1800)
      .deleteAll(40)
      .pauseFor(600)
      .start();
  };
  */

  // 리빌: 15% 보이면 한 번 페이드업
  const initReveal = () => {
    const items = document.querySelectorAll(".main-visual .reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("on"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("on");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    items.forEach((el) => io.observe(el));
  };

  // 히어로 — 25 YEARS 붙어서 등장 → 벌어지며 중간 카피 페이드인
  const initHeroYearsIntro = () => {
    const wrap = document.querySelector(".hero_years");
    if (!wrap) return;
    const num = wrap.querySelector(".hero_years_num");
    const en = wrap.querySelector(".hero_years_en");
    const ko = wrap.querySelector(".hero_years_ko");
    if (!num || !en || !ko) return;

    const done = () => {
      wrap.classList.add("is_ready");
      if (typeof gsap !== "undefined") {
        gsap.set([num, en, ko], { clearProps: "transform,opacity,visibility" });
      }
    };
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 최종 레이아웃 깜빡임 방지 — 폰트 로드 전에도 숨김
    if (typeof gsap !== "undefined") {
      gsap.set([num, en, ko], { autoAlpha: 0 });
    }

    if (typeof gsap === "undefined" || reduce) {
      done();
      return;
    }

    const run = () => {
      const mobile =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 767.98px)").matches;

      // 모바일: 최종 세로 배치 기준 → 25·YEARS를 가운데로 붙였다가 위아래로 벌림
      if (mobile) {
        wrap.classList.add("is_ready"); // ko 높이 펼친 최종 레이아웃으로 측정
        gsap.set([num, en, ko], { x: 0, y: 0, autoAlpha: 0 });
        const numRect = num.getBoundingClientRect();
        const enRect = en.getBoundingClientRect();
        const center = (numRect.top + enRect.bottom) / 2;
        const togetherTop = center - (numRect.height + enRect.height) / 2;
        let numFromY = togetherTop - numRect.top;
        let enFromY = togetherTop + numRect.height - enRect.top;
        if (!Number.isFinite(numFromY)) numFromY = 0;
        if (!Number.isFinite(enFromY)) enFromY = 0;

        gsap.set(num, { y: numFromY });
        gsap.set(en, { y: enFromY });
        gsap.set(ko, { scale: 0.96 });

        gsap
          .timeline({ delay: 0.15, onComplete: done })
          .to([num, en], {
            autoAlpha: 1,
            duration: 0.55,
            ease: "power2.out",
          })
          .to(num, { y: 0, duration: 1.2, ease: "power3.inOut" }, "+=0.35")
          .to(en, { y: 0, duration: 1.2, ease: "power3.inOut" }, "<")
          .to(
            ko,
            { autoAlpha: 1, scale: 1, duration: 0.8, ease: "power2.out" },
            "-=0.6",
          );
        return;
      }

      // 최종 자리 측정 → 가운데로 모은 뒤 다시 벌림
      gsap.set([num, en, ko], { x: 0, y: 0, autoAlpha: 0 });
      const wrapRect = wrap.getBoundingClientRect();
      const numRect = num.getBoundingClientRect();
      const enRect = en.getBoundingClientRect();
      const pairGap = 20;
      const togetherW = numRect.width + pairGap + enRect.width;
      const centerX = wrapRect.left + wrapRect.width / 2;
      const togetherLeft = centerX - togetherW / 2;
      let numFrom = togetherLeft - numRect.left;
      let enFrom = togetherLeft + numRect.width + pairGap - enRect.left;
      if (!Number.isFinite(numFrom)) numFrom = 0;
      if (!Number.isFinite(enFrom)) enFrom = 0;

      gsap.set(num, { x: numFrom, autoAlpha: 0 });
      gsap.set(en, { x: enFrom, autoAlpha: 0 });
      gsap.set(ko, { autoAlpha: 0 });

      gsap
        .timeline({ delay: 0.15, onComplete: done })
        .to([num, en], {
          autoAlpha: 1,
          duration: 0.55,
          ease: "power2.out",
        })
        .to(num, { x: 0, duration: 1.2, ease: "power3.inOut" }, "+=0.35")
        .to(en, { x: 0, duration: 1.2, ease: "power3.inOut" }, "<")
        .to(ko, { autoAlpha: 1, duration: 0.8, ease: "power2.out" }, "-=0.6");
    };

    const start = () => requestAnimationFrame(() => requestAnimationFrame(run));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start).catch(start);
    } else {
      start();
    }
  };

  // 비주얼: 스크롤 진행률에 맞는 시퀀스 프레임을 캔버스에 그림
  const initVisual = () => {
    const section = document.querySelector(".main-visual");
    const canvas = section && section.querySelector(".visual_canvas");
    if (!canvas) return;
    const stage = section.querySelector(".visual_stage");
    const ctx = canvas.getContext("2d");

    const CFG = {
      dir: canvas.dataset.dir || "./assets/images/main/sequence/", // 프레임 폴더 (canvas data-dir)
      count: parseInt(canvas.dataset.count, 10) || 61, // 프레임 수 (canvas data-count)
      start: parseInt(canvas.dataset.start, 10) || 1, // 시작 프레임 인덱스 (0=frame_001)
      // 끝 프레임 인덱스 — 미지정이면 마지막. 검은 꼬리 자르려면 data-end로 앞당김
      end:
        canvas.dataset.end !== undefined && canvas.dataset.end !== ""
          ? parseInt(canvas.dataset.end, 10)
          : NaN,
      reverse:
        canvas.dataset.reverse === "true" || canvas.dataset.reverse === "1", // 역재생
      prefix: "frame_", // 파일명 앞부분
      ext: ".webp", // 확장자
      pad: 3, // 번호 자릿수 (001)
      lerp: 0.12, // 스크롤을 따라가는 비율 (매 프레임 남은 거리의 12%)
      parallel: 6, // 동시에 불러올 프레임 수
    };

    const frames = new Array(CFG.count);
    const loaded = new Array(CFG.count).fill(false);
    let top = 0;
    let stageH = 0;
    let smoothed = 0;
    let lastIdx = -1;
    let lastDrawn = -1;
    let raf = 0;
    let cw = 0;
    let ch = 0;

    // 미리 디코딩해 둔 프레임 (ImageBitmap) — 현재 위치 주변만 보관
    // <img>를 바로 그리면 매번 디코딩(약 25ms) → 비트맵은 약 1ms
    // 디코딩은 blob에서 원본 크기로 (리사이즈 옵션을 주면 메인 스레드가 막힘)
    const BM = { ahead: 24, behind: 6, parallel: 6 };
    const blobs = new Array(CFG.count);
    const bitmaps = new Map();
    const pending = new Set();
    let canBitmap = "createImageBitmap" in window;
    let gen = 0; // 캔버스 크기가 바뀌면 이전 비트맵 무효
    let dir = 1;
    let prevIdx = -1;
    let inView = true;

    const src = (i) =>
      CFG.dir + CFG.prefix + String(i + 1).padStart(CFG.pad, "0") + CFG.ext;
    // wipe 구간은 시퀀스 마지막 프레임으로 고정 (리스트 핀 구간은 배경 진행)
    const needPin = section.querySelector(".need_pin");
    const needBody = needPin && needPin.querySelector(".need_body");
    const wipeTrack = needPin && needPin.querySelector(".need_wipe_track");
    const wipeLen = () => {
      if (!needPin || !needBody) return 0;
      // 모바일 트랙(display≠contents)이면 트랙 기준, PC는 pin − body
      if (wipeTrack && getComputedStyle(wipeTrack).display !== "contents") {
        return Math.max(0, wipeTrack.offsetHeight - window.innerHeight);
      }
      return Math.max(
        0,
        needPin.offsetHeight -
          Math.max(needBody.offsetHeight, window.innerHeight),
      );
    };
    const progress = () => pinProgress(section, top, stageH, wipeLen());
    // start ~ end 프레임 매핑 / reverse면 end→start로 역재생
    const currentIdx = () => {
      const start = clamp(CFG.start, 0, CFG.count - 1);
      const end = clamp(
        Number.isFinite(CFG.end) ? CFG.end : CFG.count - 1,
        start,
        CFG.count - 1,
      );
      const span = Math.max(1, end - start);
      const t = CFG.reverse ? 1 - smoothed : smoothed;
      return start + Math.round(t * span);
    };
    const measure = () => {
      top = stickyTop(stage);
      stageH = stage.offsetHeight;
    };

    // 아직 안 불러온 프레임이면 가장 가까운 불러온 프레임으로 대신 표시
    const nearestLoaded = (idx) => {
      for (let d = 0; d < CFG.count; d++) {
        if (idx - d >= 0 && loaded[idx - d]) return idx - d;
        if (idx + d < CFG.count && loaded[idx + d]) return idx + d;
      }
      return -1;
    };

    const clearBitmaps = () => {
      bitmaps.forEach((b) => b.close());
      bitmaps.clear();
    };

    // blob → 비트맵 디코딩은 메인 스레드 밖에서 처리
    const makeBitmap = (i) => {
      if (!blobs[i] || bitmaps.has(i) || pending.has(i)) return;
      if (pending.size >= BM.parallel) return;
      const g = gen;
      pending.add(i);
      createImageBitmap(blobs[i])
        .then((b) => {
          pending.delete(i);
          if (g !== gen || !inView) {
            b.close();
            return;
          }
          bitmaps.set(i, b);
          prime();
        })
        .catch(() => {
          // 미지원 브라우저는 기존 방식으로
          pending.delete(i);
          canBitmap = false;
        });
    };

    // 진행 방향 앞쪽을 더 많이 준비, 범위 밖은 반환
    const prime = () => {
      if (!canBitmap || !inView) return;
      const idx = currentIdx();
      const lo = idx - (dir > 0 ? BM.behind : BM.ahead);
      const hi = idx + (dir > 0 ? BM.ahead : BM.behind);
      bitmaps.forEach((b, i) => {
        if (i < lo || i > hi) {
          b.close();
          bitmaps.delete(i);
        }
      });
      for (let d = 0; d <= BM.ahead; d++) {
        const a = idx + d * dir;
        const b = idx - d * dir;
        if (a >= lo && a <= hi && a >= 0 && a < CFG.count) makeBitmap(a);
        if (d && b >= lo && b <= hi && b >= 0 && b < CFG.count) makeBitmap(b);
        if (pending.size >= BM.parallel) return;
      }
    };

    // 화면을 꽉 채우게 가운데 기준으로 그림 (object-cover)
    const draw = () => {
      const idx = currentIdx();
      if (idx !== prevIdx) {
        if (prevIdx >= 0) dir = idx > prevIdx ? 1 : -1;
        prevIdx = idx;
        prime();
      }
      const bm = bitmaps.get(idx);
      const use = bm ? idx : nearestLoaded(idx);
      if (use < 0 || (idx === lastIdx && use === lastDrawn)) return;
      lastIdx = idx;
      lastDrawn = use;
      canvas.classList.add("on");
      // 비트맵이 아직 없으면 기존 방식(<img>)
      const f = bm || frames[use];
      const fw = bm ? bm.width : f.naturalWidth;
      const fh = bm ? bm.height : f.naturalHeight;
      const s = Math.max(cw / fw, ch / fh);
      const dw = fw * s;
      const dh = fh * s;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(f, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    // 캔버스 해상도 = 무대 크기 × DPR(최대 2)
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(stage.clientWidth * dpr));
      const h = Math.max(1, Math.round(stage.clientHeight * dpr));
      if (w === cw && h === ch) return;
      canvas.width = cw = w;
      canvas.height = ch = h;
      lastIdx = lastDrawn = -1;
      draw(); // 크기를 바꾸면 캔버스가 지워지므로 다시 그림
    };

    const tick = () => {
      raf = 0;
      const target = progress();
      smoothed += (target - smoothed) * CFG.lerp;
      if (Math.abs(target - smoothed) < 1e-4) smoothed = target;
      draw();
      if (smoothed !== target) schedule();
    };

    function schedule() {
      if (!raf) raf = requestAnimationFrame(tick);
    }

    // 프레임 하나 불러오기 (decode까지 끝낸 뒤 사용 → 스크롤 중 끊김 방지)
    const loadFrame = (i) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        const done = () => {
          frames[i] = img;
          loaded[i] = true;
          prime();
          const idx = currentIdx();
          if (lastDrawn < 0 || Math.abs(idx - i) < Math.abs(idx - lastDrawn)) {
            lastIdx = -1;
            schedule();
          }
          resolve();
        };
        img.onload = () => {
          if (img.decode) img.decode().then(done, done);
          else done();
        };
        img.onerror = () => resolve(); // 빠진 프레임은 건너뜀 (이웃 프레임으로 대체)
        // blob으로 한 번만 받아 <img>와 비트맵이 같이 사용
        fetch(src(i))
          .then((r) => (r.ok ? r.blob() : Promise.reject()))
          .then((b) => {
            blobs[i] = b;
            img.src = URL.createObjectURL(b);
          })
          .catch(() => {
            img.src = src(i);
          });
      });

    // 현재 재생 위치부터 양쪽으로 펼치며 로드 (역재생 시 끝 프레임 우선)
    const loadAll = async () => {
      const first = currentIdx();
      await loadFrame(first);
      const queue = [];
      for (let d = 1; d < CFG.count; d++) {
        const a = first - d;
        const b = first + d;
        if (a >= 0 && !loaded[a]) queue.push(a);
        if (b < CFG.count && !loaded[b]) queue.push(b);
      }
      const worker = async () => {
        while (queue.length) await loadFrame(queue.shift());
      };
      await Promise.all(Array.from({ length: CFG.parallel }, worker));
    };

    measure();
    smoothed = progress();
    sizeCanvas();
    if ("ResizeObserver" in window)
      new ResizeObserver(sizeCanvas).observe(stage);
    window.addEventListener("resize", () => {
      measure();
      sizeCanvas();
      schedule();
    });
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("load", () => {
      measure();
      schedule();
    });

    // 비주얼을 벗어나면 비트맵 반환 (메모리), 다가오면 다시 준비
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([e]) => {
          inView = e.isIntersecting;
          if (inView) {
            prime();
          } else {
            gen++;
            clearBitmaps();
          }
        },
        { rootMargin: "100% 0px" },
      ).observe(section);
    }
    loadAll();
  };

  // 4×4 행렬 (열 우선, CSS matrix3d와 같은 순서)
  const mul = (a, b) => {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[r] * b[c * 4] +
          a[4 + r] * b[c * 4 + 1] +
          a[8 + r] * b[c * 4 + 2] +
          a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  };
  const T = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const Sc = (x, y, z) => [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
  const Rx = (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
  };
  const Ry = (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  };
  const Rz = (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  };
  const euler = (v) => mul(mul(Rx(v[0]), Ry(v[1])), Rz(v[2])); // XYZ 순서
  const transpose3 = (m) => [
    m[0],
    m[4],
    m[8],
    0,
    m[1],
    m[5],
    m[9],
    0,
    m[2],
    m[6],
    m[10],
    0,
    0,
    0,
    0,
    1,
  ];
  const lerp3 = (a, b, t) => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
  const matrix3d = (m, digits) =>
    "matrix3d(" +
    m.map((v) => +v.toFixed(digits)).join(",") +
    ") translate(-50%, -50%)";

  // 카드 무대 진행률을 받는 함수 목록 (creed 채움이 같은 무대에서 이어짐)
  const stageHooks = [];

  // 카드 무대 구간: 0~CARD_END 카드·타이틀 / CARD_END~1 영문 등장·채움
  const CARD_END = 0.72;

  // 챗봇 → 카드 전환: 카드 트랙 앞쪽 100vh (SCSS $card-intro와 같게)
  const INTRO_VH = 1;
  const INTRO_HOLD = 0.5; // 챗봇 고정 후 원 시작 전 대기 (50vh — 체크 카드 등장 시간)
  const INTRO_COVER = 1; // 원이 화면을 다 덮는 지점 (50vh 동안 확대 → 100vh)
  const INTRO_IN = [0.7, 0.82]; // 카드·타이틀 페이드인 (원 40% 지점 70vh ~ 82vh)
  const INTRO_IN_M = [0.77, 0.84]; // 모바일(768 이하): 세로 화면은 원이 빨리 차서 더 늦게

  // 챗봇: 하단이 화면 하단에 닿으면 고정 / 카드 섹션을 그만큼 끌어올려 겹침
  const initChatPin = () => {
    const chat = document.querySelector(".main_chatbot");
    const card = document.querySelector(".main_card");
    if (!chat || !card) return;
    let key = "";
    const set = () => {
      const vh = window.innerHeight;
      const h = chat.offsetHeight;
      const next = vh + "/" + h;
      if (next === key) return;
      const first = !key;
      key = next;
      chat.style.setProperty("--chat-top", Math.min(0, vh - h) + "px");
      card.style.setProperty("--chat-h", Math.min(h, vh) + "px");
      // 챗봇 높이가 바뀌면(이미지 로드 등) 카드 위치 다시 계산
      if (!first)
        requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    };
    set();
    if ("ResizeObserver" in window) new ResizeObserver(set).observe(chat);
    window.addEventListener("resize", set);
  };

  // 카드 섹션: 겹친 카드 → 대각선 펼침 → 앞으로 밀려남 + 마우스로 카메라 기울기
  const initCard = () => {
    const section = document.querySelector(".main_card");
    if (!section) return;
    const track = section.querySelector(".card_track") || section;
    const stage = section.querySelector(".card_stage");
    const deck = section.querySelector(".card_deck");
    const copy = section.querySelector(".card_copy");
    const cover = section.querySelector(".card_cover");
    const cards = Array.from(deck.querySelectorAll(".card_item"));
    const N = cards.length;
    if (!N) return;

    // 카드 구간 진행률(0~CARD_END를 0~1로) — 카피 페이드아웃으로 끝 (creed와 겹치지 않음)
    const PHASES = {
      fanStart: 0.08,
      fanEnd: 0.33,
      flyStart: 0.33,
      flyEnd: 1,
      copyMove: [0.72, 0.86],
      copyFade: [0.86, 1],
    };
    const OPACITY_STACKED = 1; // 겹친 상태: 첫 카드만 또렷하게
    const OPACITY_FANNED = 0.82; // 펼친 상태: 반투명
    const OPACITY_FADE = 0.5; // 펼침 구간의 앞 50% 동안 불투명 → 반투명
    // 두께: .card_deck data-depth (카드 너비 대비). 0/미지정=두께 없음, 예: 0.022
    const CARD_DEPTH = Math.max(0, parseFloat(deck.dataset.depth || "0") || 0);
    const CARD_RADIUS = 0.046; // 모서리 반경 (카드 너비 대비, CSS border-radius와 같게)
    const CORNER_SEGMENTS = 2; // 둥근 모서리 옆면 조각 수
    const TILT_MAX = (3 * Math.PI) / 180; // 마우스 기울기 최대 3°
    const TILT_EASE = 0.09; // 기울기가 따라오는 속도(초)
    const SCROLL_EASE = 0.12; // 스크롤을 따라가는 속도(초)
    const FOV = 40; // 카메라 세로 시야각(°)

    // 원본 씬 값 (3D 월드 단위, Y축 위쪽)
    const SCENE = {
      camera: [0.8086, 8.816, 1.0662],
      groupPos: { from: [0.422, 8.67, -0.309], to: [0.646, 8.83, -0.349] }, // 카드 묶음 위치
      groupRot: { from: [0, 0, 0], to: [0.7274, -1.0973, 0.2016] }, // 카드 묶음 회전 → 대각선
      inner: [0.0514 + 0.3358, 0.0716 + 0.103], // 하위 그룹 오프셋 (x, y)
      flyZ: { from: -0.001, to: 2.075 }, // 밀려날 때 이동량
      unit: 0.02, // 카드 배치 스케일
      cardZ: { start: 10, stackStep: -0.2, fanStep: -6 }, // 카드 i: z = 10-0.2i → -6i
      cardRot: {
        from: [Math.PI, 0, Math.PI / 2],
        to: [2.8798, -0.3054, 1.3963],
      },
      cardSize: [10.8, 14.4], // 카드 크기 (3:4)
    };

    // 겹친 상태에서 카드가 정면을 보게 하는 기준 회전의 역회전
    const R0_INV = transpose3(euler(SCENE.cardRot.from));

    cards.forEach((el, i) => {
      el.style.zIndex = String(N - i); // 앞 카드가 위로
    });

    // 앞면(.card_face) 감싸기 + data-depth>0일 때만 옆면(.card_edge) 생성
    const EDGE_COUNT = 4 + 4 * CORNER_SEGMENTS;
    const edgesOf = cards.map((card) => {
      const face = document.createElement("div");
      face.className = "card_face";
      while (card.firstChild) face.appendChild(card.firstChild);
      card.appendChild(face);
      const list = [];
      if (CARD_DEPTH > 0) {
        for (let k = 0; k < EDGE_COUNT; k++) {
          const edge = document.createElement("i");
          edge.className = "card_edge";
          edge.setAttribute("aria-hidden", "true");
          card.insertBefore(edge, face);
          list.push(edge);
        }
      }
      return list;
    });

    let raf = 0;
    let last = 0;
    let prog = 0; // 섹션 진행률 (보간값)
    let inView = true;
    const tilt = { x: 0, y: 0 };
    const tiltTarget = { x: 0, y: 0 };

    let vw = 0;
    let vh = 0;
    let secTop = 0;
    let secLen = 1;
    let introPx = 1; // 챗봇 → 카드 전환 구간(px)
    let f = 1000; // CSS perspective 거리(px)
    let S = 1; // 월드 단위 → px
    let spread = 1; // 펼침 간격 배율 (세로 화면에서 줄임)
    let flyScale = 1; // 밀려나는 거리 배율 (세로 화면에서 줄임)
    let E = null; // 카드 요소(px) → 카드 모델 좌표
    let copyMoveY = 0; // 카피 중심 → 뷰포트 세로 중앙 (px, 보통 음수=위로)

    // 두께: 앞면 뒤로 d만큼, 카드 둘레를 따라 옆면 조각을 세움 (CARD_DEPTH=0이면 no-op)
    const layoutEdges = (w, h) => {
      if (CARD_DEPTH <= 0 || !edgesOf.some((list) => list.length)) return;
      const d = Math.max(2, w * CARD_DEPTH);
      const r = w * CARD_RADIUS;
      const parts = [
        [w, h / 2, 0, h - 2 * r], // 오른쪽 [중심 x, 중심 y, 바깥 방향(°), 길이]
        [w / 2, h, 90, w - 2 * r], // 아래
        [0, h / 2, 180, h - 2 * r], // 왼쪽
        [w / 2, 0, 270, w - 2 * r], // 위
      ];
      // 둥근 모서리는 원호를 짧은 면으로 나눠 근사
      const step = 90 / CORNER_SEGMENTS;
      const half = ((step / 2) * Math.PI) / 180;
      const chord = 2 * r * Math.sin(half);
      const inset = r * Math.cos(half);
      [
        [w - r, r, 270],
        [w - r, h - r, 0],
        [r, h - r, 90],
        [r, r, 180],
      ].forEach(([cx, cy, start]) => {
        for (let k = 0; k < CORNER_SEGMENTS; k++) {
          const a = ((start + (k + 0.5) * step) * Math.PI) / 180;
          parts.push([
            cx + inset * Math.cos(a),
            cy + inset * Math.sin(a),
            start + (k + 0.5) * step,
            chord,
          ]);
        }
      });

      const styles = parts.map(([mx, my, deg, len]) => {
        const a = (deg * Math.PI) / 180;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        // 가로 = 둘레 방향, 세로 = 뒤쪽(-z), 앞면 = 바깥쪽 → 밖에서만 보임
        const m = [ny, -nx, 0, 0, 0, 0, -1, 0, nx, ny, 0, 0, mx, my, -d / 2, 1];
        return {
          width: (len + 1).toFixed(2) + "px", // 1px 겹쳐 이음매 방지
          height: d.toFixed(2) + "px",
          transform: matrix3d(m, 5),
          hl: (0.24 - 0.14 * ny).toFixed(3), // 윗면은 밝게, 아랫면은 덜 밝게
        };
      });

      edgesOf.forEach((list) =>
        list.forEach((el, k) => {
          const st = styles[k];
          el.style.width = st.width;
          el.style.height = st.height;
          el.style.transform = st.transform;
          el.style.setProperty("--hl", st.hl);
        }),
      );
    };

    // 화면 크기에 맞춰 카메라·카드 크기 다시 계산 (테스트 card-fan-3d와 동일)
    const layout = () => {
      vw = stage.clientWidth || window.innerWidth;
      vh = stage.clientHeight || window.innerHeight;
      const rect = track.getBoundingClientRect();
      secTop = rect.top + window.scrollY;
      introPx = Math.max(1, window.innerHeight * INTRO_VH);
      secLen = Math.max(1, track.offsetHeight - vh - introPx);

      // 세로로 긴 화면일수록 살짝 멀리서 보고 간격을 줄여 대각선이 화면에 더 들어오게
      const k = clamp((vw / vh - 0.5) / (1.4 - 0.5), 0, 1); // 0: 폰 세로, 1: 데스크톱
      const zoom = lerp(0.74, 1, k);
      spread = lerp(0.6, 1, k);
      flyScale = lerp(0.55, 1, k);

      f = (vh / 2 / Math.tan((FOV * Math.PI) / 180 / 2)) * zoom;
      deck.style.perspective = f.toFixed(2) + "px";

      // 카드 요소 크기: 화면에 보이는 크기의 약 2배로 래스터 (선명하면서 메모리 절약)
      const wPx = Math.round(clamp(f * 0.38, 240, 560));
      const hPx = Math.round((wPx * 4) / 3);
      cards.forEach((el) => {
        el.style.width = wPx + "px";
        el.style.height = hPx + "px";
      });

      const worldW = SCENE.cardSize[0] * SCENE.unit;
      S = wPx / worldW;
      const kPx = SCENE.cardSize[0] / wPx;
      E = mul(R0_INV, Sc(kPx, -kPx, kPx)); // CSS(아래로 +y) → 3D(위로 +y)

      layoutEdges(wPx, hPx);

      // 카피 블록 중심을 sticky 무대 세로 중앙으로 옮길 거리
      const copyMid = copy.offsetTop + copy.offsetHeight / 2;
      copyMoveY = vh / 2 - copyMid;
    };

    const render = () => {
      // 전환: 원이 중앙에서 커지며 덮음 → 카드·타이틀 페이드인
      const it = clamp((window.scrollY - secTop) / introPx, 0, 1);
      const inRange = vw <= 768 ? INTRO_IN_M : INTRO_IN;
      const cardIn = smooth(seg(it, inRange[0], inRange[1]));
      if (cover) {
        const sc = smooth(seg(it, INTRO_HOLD, INTRO_COVER));
        const r = (Math.hypot(vw, vh) / 2 + 2) * sc; // 화면 대각선 절반까지
        cover.style.clipPath = "circle(" + r.toFixed(1) + "px at 50% 50%)";
      }

      const cp = seg(prog, 0, CARD_END);
      const fanLinear = seg(cp, PHASES.fanStart, PHASES.fanEnd);
      const uFan = smooth(fanLinear);
      const uFly = seg(cp, PHASES.flyStart, PHASES.flyEnd);
      const baseOpacity = lerp(
        OPACITY_STACKED,
        OPACITY_FANNED,
        smooth(seg(fanLinear, 0, OPACITY_FADE)),
      );

      // 카메라 (마우스 기울기: Y→X 순서 회전의 역행렬)
      const rotX = tilt.y * TILT_MAX;
      const rotY = -tilt.x * TILT_MAX;
      const c = SCENE.camera;
      const V = mul(mul(Rx(-rotX), Ry(-rotY)), T(-c[0], -c[1], -c[2]));

      // 카드 묶음 → 하위 그룹(밀려남 포함) → 배치 스케일
      const gp = lerp3(SCENE.groupPos.from, SCENE.groupPos.to, uFan);
      const gr = lerp3(SCENE.groupRot.from, SCENE.groupRot.to, uFan);
      const flyZ = lerp(SCENE.flyZ.from, SCENE.flyZ.to * flyScale, uFly);
      const M = mul(
        mul(T(gp[0], gp[1], gp[2]), euler(gr)),
        mul(
          T(SCENE.inner[0], SCENE.inner[1], flyZ),
          Sc(SCENE.unit, SCENE.unit, SCENE.unit),
        ),
      );

      const VM = mul(V, M); // 카메라 기준 배치 좌표
      const P = mul(T(0, 0, f), Sc(S, -S, S)); // 카메라 좌표 → CSS px
      const PVM = mul(P, VM);
      const R = mul(
        euler(lerp3(SCENE.cardRot.from, SCENE.cardRot.to, uFan)),
        E,
      );

      for (let i = 0; i < N; i++) {
        const z = lerp(
          SCENE.cardZ.start + SCENE.cardZ.stackStep * i,
          SCENE.cardZ.fanStep * i * spread,
          uFan,
        );
        const el = cards[i];

        // 카메라에 너무 가까우면 서서히 숨김 (CSS 3D는 카메라 뒤를 그리지 못함)
        const depth = -(VM[14] + VM[10] * z);
        const near = seg(depth, 0.12, 0.3);
        if (near <= 0) {
          el.style.visibility = "hidden";
          continue;
        }
        // 등장 중엔 맨 앞 카드만 (뒤 카드가 반투명으로 겹쳐 보이지 않게)
        const inK = i === 0 ? cardIn : cardIn >= 1 ? 1 : 0;
        el.style.visibility = inK > 0 ? "visible" : "hidden";
        el.style.setProperty("--o", (baseOpacity * near * inK).toFixed(3)); // 앞면·옆면에 함께 적용
        el.style.transform = matrix3d(mul(mul(PVM, T(0, 0, z)), R), 6);
      }

      // 카피: 중앙 이동 후 Y 고정 → 완전히 페이드아웃 (creed와 겹침 X)
      const uMove = smooth(seg(cp, PHASES.copyMove[0], PHASES.copyMove[1]));
      const uFade = smooth(seg(cp, PHASES.copyFade[0], PHASES.copyFade[1]));
      const moveAmt = cp >= PHASES.copyMove[1] ? 1 : uMove;
      copy.style.opacity = ((1 - uFade) * cardIn).toFixed(3);
      copy.style.visibility = uFade >= 1 || cardIn <= 0 ? "hidden" : "visible";
      copy.style.transform =
        "translate3d(0," + (copyMoveY * moveAmt).toFixed(1) + "px,0)";

      // 같은 무대의 영문 채움
      stageHooks.forEach((fn) => fn(prog));
    };

    // card_track 기준 스크롤 진행률 (카드 + 영문 전체)
    const targetProgress = () =>
      clamp((window.scrollY - secTop - introPx) / secLen, 0, 1);

    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      const target = targetProgress();
      prog = reduceMotion
        ? target
        : prog + (target - prog) * (1 - Math.exp(-dt / SCROLL_EASE));
      if (Math.abs(target - prog) < 1e-4) prog = target;
      // 무대 고정이 풀린 구간(0·1)에선 바로 맞춤 — 빠른 스크롤에도 타이틀·영문이 무대와 함께 밀려 보이지 않게
      if (target >= 1 || target <= 0) prog = target;

      const kt = reduceMotion ? 1 : 1 - Math.exp(-dt / TILT_EASE);
      tilt.x += (tiltTarget.x - tilt.x) * kt;
      tilt.y += (tiltTarget.y - tilt.y) * kt;
      if (Math.abs(tiltTarget.x - tilt.x) < 1e-4) tilt.x = tiltTarget.x;
      if (Math.abs(tiltTarget.y - tilt.y) < 1e-4) tilt.y = tiltTarget.y;

      render();

      if (prog !== target || tilt.x !== tiltTarget.x || tilt.y !== tiltTarget.y)
        kick();
    };

    // 화면에 보일 때만 돎
    function kick() {
      if (raf || !inView) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          kick();
        },
        { rootMargin: "200px 0px" },
      ).observe(track);
    }

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", () => {
      layout();
      kick();
    });
    window.addEventListener("load", () => {
      layout();
      kick();
    });

    // 마우스 위치를 -1~1로 → 카메라 기울기
    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        const r = stage.getBoundingClientRect();
        tiltTarget.x = clamp((e.clientX - r.left) / r.width, 0, 1) * 2 - 1;
        tiltTarget.y = 1 - clamp((e.clientY - r.top) / r.height, 0, 1) * 2;
        kick();
      },
      { passive: true },
    );
    document.documentElement.addEventListener("mouseleave", () => {
      tiltTarget.x = 0;
      tiltTarget.y = 0;
      kick();
    });

    // 첫 화면: 배치 후 이미지가 준비되면 카드 묶음 페이드 인
    layout();
    prog = targetProgress();
    render();
    const ready = cards.map((el) => {
      const img = el.querySelector("img");
      if (!img || img.complete) return Promise.resolve();
      return new Promise((res) => {
        img.addEventListener("load", res, { once: true });
        img.addEventListener("error", res, { once: true });
      });
    });
    Promise.race([
      Promise.all(ready),
      new Promise((res) => setTimeout(res, 2500)),
    ]).then(() => {
      deck.classList.add("on");
    });
  };

  // creed: 페이드인 → 채움(유지) → 텍스트+패널 100px 간격으로 일반 스크롤
  const initCreed = () => {
    const section = document.querySelector(".main_card");
    const block = section && section.querySelector(".creed_block");
    const intro = section && section.querySelector(".creed_intro");
    const fill = intro && intro.querySelector(".creed_fill");
    const panel = block && block.querySelector(".creed_panel");
    if (!section || !block || !intro || !fill || !panel) return;

    const preferred = (fill.getAttribute("data-lines") || "")
      .split("|")
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const raw =
      preferred.join(" ") ||
      (fill.getAttribute("data-text") || fill.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
    if (!raw) return;

    const cards = Array.from(block.querySelectorAll(".creed_card"));
    let builtKey = "";
    let fillProgress = 0;
    let cardsIn = false;

    const escapeHtml = (s) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const wrapByWidth = (text, width, probe) => {
      const words = text.split(" ");
      const lines = [];
      let cur = "";
      words.forEach((word) => {
        const next = cur ? `${cur} ${word}` : word;
        probe.textContent = next;
        if (cur && probe.offsetWidth > width) {
          lines.push(cur);
          cur = word;
        } else {
          cur = next;
        }
      });
      if (cur) lines.push(cur);
      return lines;
    };

    const applyFillProgress = (p) => {
      fillProgress = clamp(p, 0, 1);
      const lines = fill.querySelectorAll(".creed_line");
      const n = lines.length;
      if (!n) return;
      lines.forEach((line, i) => {
        const start = i / n;
        const end = (i + 1) / n;
        const t = clamp(
          (fillProgress - start) / Math.max(1e-6, end - start),
          0,
          1,
        );
        line.style.setProperty("--p", `${(t * 100).toFixed(2)}%`);
      });
    };

    const splitLines = () => {
      const width = Math.floor(fill.clientWidth);
      if (width < 40) return;

      const key = `${width}|${raw}|${preferred.join("|")}`;
      if (key === builtKey) {
        applyFillProgress(fillProgress);
        return;
      }
      builtKey = key;

      const cs = getComputedStyle(fill);
      const probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText = [
        "position:absolute",
        "visibility:hidden",
        "pointer-events:none",
        "white-space:nowrap",
        `font:${cs.font}`,
        `letter-spacing:${cs.letterSpacing}`,
        `text-transform:${cs.textTransform}`,
      ].join(";");
      fill.textContent = "";
      fill.appendChild(probe);

      let lines = [];
      if (preferred.length) {
        const fits = preferred.every((line) => {
          probe.textContent = line;
          return probe.offsetWidth <= width;
        });
        lines = fits
          ? preferred.slice()
          : wrapByWidth(preferred.join(" "), width, probe);
      } else {
        lines = wrapByWidth(raw, width, probe);
      }
      probe.remove();

      fill.innerHTML = lines
        .map((line) => {
          const t = escapeHtml(line);
          return `<span class="creed_line" style="--p:0%">${t}</span>`;
        })
        .join("");
      fill.classList.add("is_split");
      applyFillProgress(fillProgress);
    };

    // 상단 텍스트 + 카드 — 화면에 들어온 것만 하나씩 등장
    const ups = Array.from(
      block.querySelectorAll(
        ".creed_eng_sub, .creed_eng_title, .creed_lead, .creed_desc",
      ),
    );
    ups.forEach((el) => el.classList.add("creed_up"));
    const revealEls = ups.concat(cards);

    const revealCards = () => {
      if (cardsIn) return;
      cardsIn = true;
      revealEls.forEach((el) => el.classList.add("is_in"));
    };

    splitLines();

    // 패널이 영문을 다 덮으면 숨김 (섹션 끝에서 패널 아래로 다시 비치지 않게)
    // 위로 올려 패널이 내려가면 덮이기 전 상태로 다시 보임
    let hideRaf = 0;
    const syncHide = () => {
      hideRaf = 0;
      const covered =
        panel.getBoundingClientRect().top <= fill.getBoundingClientRect().top;
      intro.style.visibility = covered ? "hidden" : "";
    };
    const onHideScroll = () => {
      if (!hideRaf) hideRaf = requestAnimationFrame(syncHide);
    };
    window.addEventListener("scroll", onHideScroll, { passive: true });
    window.addEventListener("resize", onHideScroll);
    syncHide();

    if (typeof IntersectionObserver !== "undefined") {
      let order = 0;
      let orderTimer = 0;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            // 동시에 들어온 요소는 0.15초씩 순차
            const el = entry.target;
            window.setTimeout(() => el.classList.add("is_in"), order++ * 150);
            clearTimeout(orderTimer);
            orderTimer = setTimeout(() => (order = 0), 200);
          });
        },
        { rootMargin: "0px 0px -10% 0px" },
      );
      revealEls.forEach((el) => io.observe(el));
    } else {
      revealCards();
    }

    const settleFinal = () => {
      fill.style.opacity = "1";
      applyFillProgress(1);
      revealCards();
    };

    if (
      reduceMotion ||
      typeof gsap === "undefined" ||
      typeof ScrollTrigger === "undefined"
    ) {
      settleFinal();
      return;
    }

    // 카피 페이드아웃 끝난 뒤 같은 무대 중앙에서 → 페이드인 → 채움 (텍스트는 사라지지 않음)
    const FILL_IN = [CARD_END + 0.01, CARD_END + 0.05];
    const FILL_RUN = [CARD_END + 0.06, 0.97];
    fill.style.opacity = "0";
    stageHooks.push((p) => {
      fill.style.opacity = seg(p, FILL_IN[0], FILL_IN[1]).toFixed(3);
      applyFillProgress(seg(p, FILL_RUN[0], FILL_RUN[1]));
    });
    window.dispatchEvent(new Event("scroll"));

    let resizeRaf = 0;
    window.addEventListener("resize", () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        splitLines();
        ScrollTrigger.refresh();
      });
    });
  };

  // Originkit Scan Grid — button.html getCornerPaths / armFor
  const IDLE_BRACKET = 8;
  const HOVER_BRACKET = 65;
  const BRACKET_MS = 300;

  const armFor = (pct, w, h) => ((pct / 100) * Math.min(w, h)) / 2;

  // 얇은 need_link에서도 idle/hover가 보이게 최소 arm
  const armTargets = (w, h) => ({
    idle: Math.max(8, armFor(IDLE_BRACKET, w, h)),
    hover: Math.max(14, armFor(HOVER_BRACKET, w, h)),
  });

  const easeInOut = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const getCornerPaths = (w, h, r, arm) => {
    const clampedR = Math.min(r, w / 2, h / 2);
    const so = 0.75;
    const R = Math.max(0.01, clampedR - so);
    const R0 = clampedR;
    const armH = Math.min(arm, Math.max(0, h / 2 - R0));
    const armW = Math.min(arm, Math.max(0, w / 2 - R0));

    return {
      tl: `M ${so} ${R0 + armH} L ${so} ${R0} A ${R} ${R} 0 0 1 ${R0} ${so} L ${R0 + armW} ${so}`,
      tr: `M ${w - R0 - armW} ${so} L ${w - R0} ${so} A ${R} ${R} 0 0 1 ${w - so} ${R0} L ${w - so} ${R0 + armH}`,
      br: `M ${w - so} ${h - R0 - armH} L ${w - so} ${h - R0} A ${R} ${R} 0 0 1 ${w - R0} ${h - so} L ${w - R0 - armW} ${h - so}`,
      bl: `M ${R0 + armW} ${h - so} L ${R0} ${h - so} A ${R} ${R} 0 0 1 ${so} ${h - R0} L ${so} ${h - R0 - armH}`,
    };
  };

  const paintBracketArm = (link, arm) => {
    const svg = link.querySelector(".need_link_svg");
    if (!svg) return;
    const w = link.clientWidth;
    const h = link.clientHeight;
    if (w < 1 || h < 1) return;

    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const paths = getCornerPaths(w, h, 0, arm);
    const map = { tl: "is_tl", tr: "is_tr", br: "is_br", bl: "is_bl" };
    Object.keys(map).forEach((k) => {
      const el = svg.querySelector(`.need_br.${map[k]}`);
      if (el) el.setAttribute("d", paths[k]);
    });
  };

  const initScanGridLinks = (root) => {
    const links = (root || document).querySelectorAll(".need_link");
    links.forEach((link) => {
      let hovered = false;
      let arm = 8;
      let raf = 0;

      const sizeArm = () => {
        const w = link.clientWidth;
        const h = link.clientHeight;
        if (w < 1 || h < 1) return null;
        return armTargets(w, h);
      };

      const paint = () => paintBracketArm(link, arm);

      // Framer와 동일: arm 길이를 0.3s easeInOut으로 보간
      const tweenTo = (to, animate) => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (!animate || reduceMotion) {
          arm = to;
          paint();
          return;
        }
        const from = arm;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / BRACKET_MS);
          arm = from + (to - from) * easeInOut(t);
          paint();
          if (t < 1) raf = requestAnimationFrame(tick);
          else {
            arm = to;
            raf = 0;
          }
        };
        raf = requestAnimationFrame(tick);
      };

      const sync = (animate) => {
        const t = sizeArm();
        if (!t) return;
        tweenTo(hovered ? t.hover : t.idle, animate);
      };

      // 초기·리사이즈는 즉시, hover/leave만 애니
      sync(false);
      const ro = new ResizeObserver(() => {
        const t = sizeArm();
        if (!t) return;
        // 리사이즈 중엔 목표 arm만 맞춰 스냅 (비율 유지)
        arm = hovered ? t.hover : t.idle;
        paint();
      });
      ro.observe(link);

      link.addEventListener("mouseenter", () => {
        hovered = true;
        sync(true);
      });
      link.addEventListener("mouseleave", () => {
        hovered = false;
        sync(true);
      });
      link.addEventListener("focus", () => {
        hovered = true;
        sync(true);
      });
      link.addEventListener("blur", () => {
        hovered = false;
        sync(true);
      });

      // 패널 전환 시 외부에서 다시 그리기용
      link._scanPaint = () => {
        hovered = false;
        sync(false);
      };
    });
  };

  // 크리드 — 중앙 페이드인 → 스크롤 채움 → 패널(그리드)은 아래 문서흐름으로 등장
  // creed는 initCard 한 sticky 무대에서 처리

  // 스텝 카드 01→04 순차 페이드업
  const initStep = () => {
    const section = document.querySelector(".main_step");
    if (!section) return;
    const cards = Array.from(section.querySelectorAll(".step_card"));
    if (!cards.length) return;

    const timers = [];
    const clearTimers = () => {
      while (timers.length) window.clearTimeout(timers.pop());
    };

    const setOn = (on) => {
      clearTimers();
      if (!on) {
        cards.forEach((card) => card.classList.remove("is_on"));
        return;
      }
      cards.forEach((card, i) => {
        timers.push(
          window.setTimeout(() => card.classList.add("is_on"), i * 280),
        );
      });
    };

    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: section,
        start: "top 50%",
        onEnter: () => setOn(true),
        onLeaveBack: () => setOn(false),
      });
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setOn(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setOn(true);
          else if (entry.boundingClientRect.top > 0) setOn(false);
        });
      },
      { threshold: 0.25 },
    );
    io.observe(section);
  };

  // CMS — 히어로 우하단 축소(가역) + 6칸 라인 드로잉(가역)

  // main_suite — 미디어 clip / 리스트 보더 / 카피·아이템 페이드업
  const initCms = () => {
    const section = document.querySelector(".main_suite");
    if (!section) return;

    const media = section.querySelector("[data-suite-media]");
    const list = section.querySelector("[data-suite-list]");
    const items = list ? Array.from(list.querySelectorAll(".suite_item")) : [];
    const video = media && media.querySelector("video");
    // 왼쪽 회색 영문 + 오른쪽 카피 + 리스트 — 화면에 들어온 것만 하나씩
    const fadeEls = [
      ...section.querySelectorAll(".suite_eng, .suite_lead, .suite_desc > p"),
      ...items,
    ];

    const showMedia = (on) => {
      if (!media) return;
      media.classList.toggle("is_show", on);
      if (on && video && video.play) {
        const p = video.play();
        if (p) p.catch(() => {});
      }
    };

    const showEl = (el, delay) => {
      if (typeof gsap !== "undefined") {
        gsap.to(el, {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          delay,
          ease: "power3.out",
          clearProps: "transform,opacity,visibility",
        });
      }
      // 리스트 항목은 보더 라인도 같이
      if (items.includes(el)) {
        window.setTimeout(() => el.classList.add("is_on"), delay * 1000);
      }
    };

    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      showMedia(true);
      items.forEach((item) => item.classList.add("is_on"));
      return;
    }

    if (typeof gsap !== "undefined" && fadeEls.length) {
      gsap.set(fadeEls, { autoAlpha: 0, y: 40 });
    }

    // 사진 clip 등장은 기존 그대로
    if (media && typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: media,
        start: "top 80%",
        onEnter: () => showMedia(true),
        onLeaveBack: () => showMedia(false),
      });
    } else if (media) {
      showMedia(true);
    }

    let order = 0;
    let orderTimer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          // 동시에 들어온 요소는 0.15초씩 순차
          showEl(entry.target, 0.15 * order++);
          clearTimeout(orderTimer);
          orderTimer = setTimeout(() => (order = 0), 200);
        });
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    fadeEls.forEach((el) => io.observe(el));
  };

  // 챗봇 끝 → 암전 / 다음 흰 섹션(main_light) 진입 → 흰색 복귀
  const initReasonBg = (lenis) => {
    const reason = document.querySelector(".main-counter");
    const chatbot = document.querySelector(".main_chatbot");
    const card = document.querySelector(".main_card");
    if (!chatbot) return;

    const header = document.querySelector(".header");
    const creedPanel = card && card.querySelector(".creed_panel");
    const light = document.querySelector(".main_suite");
    const scenes = [reason, chatbot, card].filter(Boolean);
    const track = card && card.querySelector(".card_track");
    let dark = false;

    const releaseReasonGpu = () => {
      if (!reason) return;
      reason.style.transform = "";
      reason.style.translate = "";
      reason.style.willChange = "auto";
    };

    const probe = () => {
      const vh = window.innerHeight || 1;
      // 암전 ON: 카드 무대의 원이 화면을 다 덮은 뒤
      const enterDark = track
        ? track.getBoundingClientRect().top <= -vh * INTRO_VH * INTRO_COVER
        : false;
      // 암전 OFF: 흰 creed 풀커버가 화면을 덮는 순간
      const leaveDark = creedPanel
        ? creedPanel.getBoundingClientRect().top <= 2
        : light
          ? light.getBoundingClientRect().top <= -Math.round(vh * 0.3)
          : card
            ? card.getBoundingClientRect().bottom <= 40
            : false;
      const next = enterDark && !leaveDark;
      if (next === dark) return;
      dark = next;
      document.body.classList.toggle("is_scene_dark", dark);
      releaseReasonGpu();
      scenes.forEach((el) => {
        el.setAttribute("data-header", dark ? "white" : "black");
      });
      // 헤더색은 data-header 기준으로 다시 계산
      if (header) window.dispatchEvent(new Event("scroll"));
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        probe();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", probe);
    if (lenis && typeof lenis.on === "function") lenis.on("scroll", onScroll);
    probe();
  };

  // 장면 4 니즈: 스크롤로 1→4 전환 + 클릭 시 해당 구간으로 스크롤
  const initNeed = (lenis) => {
    const pin = document.querySelector(".need_pin");
    const body = pin && pin.querySelector(".need_body");
    if (!pin || !body) return;

    const list = body.querySelector(".need_list");
    const items = list && list.querySelectorAll("li");
    const panels = body.querySelectorAll(".need_panel");
    if (!list || !items.length || !panels.length) return;

    const n = items.length;
    let cur = -1;

    const activate = (idx) => {
      if (idx === cur) return;
      cur = idx;
      items.forEach((el, i) => el.classList.toggle("is_on", i === idx));
      panels.forEach((el, i) => el.classList.toggle("is_on", i === idx));
      // 숨겨진 패널은 크기 0 → 활성화 후 브래킷 경로 재계산
      requestAnimationFrame(() => {
        const link = panels[idx] && panels[idx].querySelector(".need_link");
        if (link && link._scanPaint) link._scanPaint();
      });
    };

    // 진행률 0~1 → 니즈 인덱스 (처음 100vh, 이후 wipe는 4번째 고정)
    const progress = () =>
      clamp(-pin.getBoundingClientRect().top / window.innerHeight, 0, 1);

    const update = () => {
      const idx = Math.min(n - 1, Math.floor(progress() * n));
      activate(idx);
      items.forEach((el, i) =>
        el.setAttribute("aria-pressed", i === idx ? "true" : "false"),
      );
    };

    // 클릭한 항목 구간 중앙으로 스크롤 → 패널이 열리는 것처럼 보임
    const scrollToIdx = (idx) => {
      const i = clamp(idx, 0, n - 1);
      const vh = window.innerHeight;
      const targetP = (i + 0.5) / n;
      const y = window.scrollY + pin.getBoundingClientRect().top + targetP * vh;
      if (lenis) {
        lenis.scrollTo(y, {
          duration: reduceMotion ? 0 : 1.15,
          immediate: reduceMotion,
        });
      } else {
        window.scrollTo({
          top: y,
          behavior: reduceMotion ? "auto" : "smooth",
        });
      }
    };

    items.forEach((el, i) => {
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    });

    // 이벤트 위임
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li");
      if (!li || !list.contains(li)) return;
      scrollToIdx([...items].indexOf(li));
    });
    list.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const li = e.target.closest("li");
      if (!li || !list.contains(li)) return;
      e.preventDefault();
      scrollToIdx([...items].indexOf(li));
    });

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    initScanGridLinks(body);
  };

  // 화면 전환 — 리스트 핀된 뒤 띠 scrub + 다음 섹션(main-counter) yPercent
  // PC: pin 겹침 / 모바일: wipe 트랙이 상단에 닿은 뒤 전환
  const initWipe = () => {
    const pin = document.querySelector(".need_pin");
    const body = pin && pin.querySelector(".need_body");
    const track = pin && pin.querySelector(".need_wipe_track");
    const bars = pin && gsap.utils.toArray(".need_wipe_bar", pin);
    // main-reason → main-counter 로 교체됨
    const next = document.querySelector(".main-counter");
    if (!pin || !body || !bars || !bars.length || !next) return;

    // force3D 잔여 제거 (남으면 배경 명도 단차)
    const releaseGpu = () => {
      gsap.set(next, { clearProps: "transform" });
      next.style.transform = "";
      next.style.translate = "";
      next.style.willChange = "auto";
    };

    // 이전에 숨겼던 pin opacity 잔여 제거
    gsap.set(pin, { clearProps: "opacity,visibility" });
    gsap.set(next, { yPercent: 100, force3D: true });

    // 모바일: 트랙이 화면에 닿은 뒤 전환 / PC: 리스트 핀 직후
    const useTrack = () =>
      track && getComputedStyle(track).display !== "contents";

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: pin,
        start: () => {
          if (useTrack()) {
            // 트랙 top = 뷰포트 top → 리스트·핀 끝난 뒤
            return `top+=${Math.max(0, track.offsetTop)} top`;
          }
          const over = Math.max(0, body.offsetHeight - window.innerHeight);
          return over ? `top top-=${over}` : "top top";
        },
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (self.progress >= 1) releaseGpu();
        },
        onLeave: () => {
          releaseGpu();
          // 카운터 모션 — wipe 완전히 끝난 뒤 1회
          document.dispatchEvent(new CustomEvent("need-wipe-done"));
        },
        onEnterBack: () => gsap.set(next, { yPercent: 0, force3D: true }),
        onRefresh: (self) => {
          if (self.progress >= 1) releaseGpu();
        },
      },
      defaults: { ease: "none" },
    });

    tl.addLabel("stripes_start");
    for (let e = 0; e < 5; e++) {
      const s = (0.45 * (4 - e)) / 4;
      const a = s + 0.45;
      tl.to(
        bars[e],
        { scaleY: 1, duration: a - s, ease: "none" },
        `stripes_start+=${s}`,
      );
    }

    tl.fromTo(
      next,
      { yPercent: 100 },
      {
        yPercent: 0,
        duration: 0.7,
        ease: "none",
        onComplete: () => {
          releaseGpu();
          document.dispatchEvent(new CustomEvent("need-wipe-done"));
        },
      },
      "stripes_start+=0.15",
    );
  };

  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  // Lenis는 common.js에서 공통 초기화 — 메인은 GSAP ticker로 이관
  const bindLenisGsap = (lenis) => {
    if (!lenis || typeof gsap === "undefined") return lenis;
    if (typeof window.__lenisStopRaf === "function") window.__lenisStopRaf();
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return lenis;
  };

  // initHeroType(); // [미사용] 히어로 타이핑 — 되살리려면 주석 해제
  // reason 태그: 세트가 화면보다 짧으면 채워 넣고, 동일 세트 복제로 여백 없이 롤링
  const initReasonTags = () => {
    const tracks = document.querySelectorAll(".main-reason .tags_row .track");
    if (!tracks.length) return;

    const fillTrack = (track) => {
      let group = track.querySelector(".track_group");
      if (!group) {
        group = document.createElement("div");
        group.className = "track_group";
        while (track.firstChild) group.appendChild(track.firstChild);
        track.appendChild(group);
      }
      if (!track.dataset.seed) track.dataset.seed = group.innerHTML;

      track.replaceChildren();
      group = document.createElement("div");
      group.className = "track_group";
      group.innerHTML = track.dataset.seed;
      track.appendChild(group);

      const minW = Math.ceil((window.innerWidth || 1) * 1.05);
      let guard = 0;
      while (group.scrollWidth < minW && guard < 12) {
        group.insertAdjacentHTML("beforeend", track.dataset.seed);
        guard += 1;
      }

      track.appendChild(group.cloneNode(true));
    };

    const refresh = () => tracks.forEach(fillTrack);
    refresh();

    let raf = 0;
    window.addEventListener("resize", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        refresh();
      });
    });
  };

  // main-counter — wipe 끝난 뒤 1회만 재생 (중간에 보였다가 숨김→재시작 방지)
  const initCounter = () => {
    const sec = document.querySelector(".main-counter");
    if (!sec) return;
    if (reduceMotion) {
      sec.classList.add("is_play");
      return;
    }
    if (typeof gsap === "undefined") return;

    // 채움 끝 색은 CSS --color-final만 사용 (JS가 color를 읽어 #000으로 덮지 않음)
    const armLines = (el) => {
      if (!el) return [];
      const lines = [...el.children];
      lines.forEach((line) => {
        // 인라인 잔여 제거 → .sub는 CSS #ccc, 나머지는 #000
        line.style.removeProperty("--color-final");
        line.classList.add("is_line");
      });
      gsap.set(lines, { "--bg-progress": 0 });
      return lines;
    };

    const thumb = sec.querySelector(".counter_thumb");
    const thumbMedia = thumb && thumb.querySelector("img, video");
    const rule = sec.querySelector(".counter_line");
    const items = [...sec.querySelectorAll(".counter_item")];
    let played = false;

    // 썸네일 영상 — 화면에 보일 때만 재생
    if (thumbMedia && thumbMedia.play && "IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach(({ isIntersecting }) => {
          if (isIntersecting) {
            const p = thumbMedia.play();
            if (p) p.catch(() => {});
          } else {
            thumbMedia.pause();
          }
        });
      }).observe(thumbMedia);
    }

    const play = () => {
      if (played) return;
      played = true;

      items.forEach((item) => armLines(item.querySelector(".label")));
      const desc = sec.querySelector(".counter_desc p");

      sec.classList.add("is_play");

      const tl = gsap.timeline();
      // 오른쪽 설명 — 페이드업 (왼쪽 썸네일·타이틀은 처음부터 보임)
      if (desc) {
        tl.fromTo(
          desc,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            clearProps: "transform,opacity,visibility",
          },
          0,
        );
      }
      if (rule) {
        gsap.set(rule, { scaleX: 0, transformOrigin: "left top" });
        tl.to(
          rule,
          {
            scaleX: 1,
            duration: 1.2,
            ease: "power1.out",
            clearProps: "transform",
          },
          0.2,
        );
      }

      // 오른쪽 숫자 — 화면에 들어온 항목만 하나씩 재생
      gsap.set(items, { autoAlpha: 0, y: 40 });
      let order = 0;
      let orderTimer = 0;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            io.unobserve(entry.target);
            // 동시에 들어온 항목은 0.15초씩 순차
            showItem(entry.target, 0.15 * order++);
            clearTimeout(orderTimer);
            orderTimer = setTimeout(() => (order = 0), 200);
          });
        },
        { rootMargin: "0px 0px -15% 0px" },
      );
      // 첫 화면 항목은 제목 모션과 박자 맞춤
      setTimeout(() => items.forEach((item) => io.observe(item)), 350);
    };

    const showItem = (item, delay) => {
      gsap.to(item, {
        autoAlpha: 1,
        y: 0,
        duration: 1,
        delay,
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      });
      const label = item.querySelector(".label");
      if (label && label.children.length) {
        const labelLines = [...label.children];
        gsap.to(labelLines, {
          "--bg-progress": 100,
          duration: 1.5,
          stagger: 0.12,
          delay: delay + 0.02,
          ease: "power1.out",
          onComplete: () =>
            labelLines.forEach((l) => {
              l.classList.remove("is_line");
              l.style.removeProperty("--bg-progress");
            }),
        });
      }
      const el = item.querySelector("[data-count]");
      if (!el) return;
      const text = el.getAttribute("data-count") || "0";
      const comma = text.includes(",");
      const end = parseFloat(text.replace(/,/g, "")) || 0;
      const obj = { value: 0 };
      gsap.to(obj, {
        value: end,
        duration: 1,
        delay,
        ease: "power1.out",
        onUpdate: () => {
          const v = Math.round(obj.value);
          el.textContent = comma ? v.toLocaleString("en-US") : String(v);
        },
      });
    };

    // wipe 완료 이벤트(1회). 핀 없으면 스크롤로 대체
    document.addEventListener("need-wipe-done", play, { once: true });
    const pin = document.querySelector(".need_pin");
    if (!pin && typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: sec.querySelector(".counter_inner") || sec,
        start: "top 85%",
        once: true,
        onEnter: play,
      });
    } else if (pin && typeof ScrollTrigger !== "undefined") {
      // 이미 wipe를 지나 들어온 경우(새로고침 등)
      ScrollTrigger.create({
        trigger: pin,
        start: "bottom bottom",
        once: true,
        onEnter: play,
      });
    }
  };

  // 서비스 리스트가 핀 박스 위로 넘친 만큼 --list-over로 보정 → 타이틀과 간격 유지
  const initListGap = () => {
    const pin = document.querySelector(".need_pin");
    const body = pin && pin.querySelector(".need_body");
    const list = body && body.querySelector(".svc_list");
    if (!list) return;
    let last = -1;
    const set = () => {
      const over = Math.max(
        0,
        Math.round(
          body.getBoundingClientRect().top - list.getBoundingClientRect().top,
        ),
      );
      pin.style.setProperty("--list-over", over + "px");
      // 모바일: 리스트가 화면보다 길면 하단이 화면 하단에 닿을 때 고정 (sticky top)
      const needTop = Math.min(0, window.innerHeight - body.offsetHeight);
      pin.style.setProperty("--need-top", needTop + "px");
      const changed = last >= 0 && over !== last;
      last = over;
      return changed;
    };
    set();
    window.addEventListener("resize", set);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (set() && typeof ScrollTrigger !== "undefined")
          ScrollTrigger.refresh();
      });
    }
  };

  initListGap();
  initReveal();
  initHeroYearsIntro();
  initVisual();
  const lenis = bindLenisGsap(window.__lenis || null);

  initNeed(lenis);
  initReasonTags();
  initChatPin();
  initCard();
  initCreed();
  initReasonBg(lenis);
  initCms();
  initCounter();

  // 푸터 메뉴 → 메인 섹션 스크롤 이동 (서브에선 index.html#id 로 이동 후 여기서 위치 보정)
  // data-anchor-vh: 섹션 상단 + 화면높이 배수 (카드 섹션은 원 전환 구간 건너뜀)
  const initAnchors = (lenis) => {
    const targetY = (el) => {
      const extra = parseFloat(el.dataset.anchorVh || 0) * window.innerHeight;
      return el.getBoundingClientRect().top + window.scrollY + extra;
    };
    const go = (el, instant) => {
      const y = Math.max(0, targetY(el));
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(y, { immediate: !!instant, duration: 1.4 });
      } else {
        window.scrollTo({ top: y, behavior: instant ? "auto" : "smooth" });
      }
    };

    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href*="#sec-"]');
      if (!a) return;
      const el = document.getElementById(a.hash.slice(1));
      if (!el) return;
      e.preventDefault();
      go(el);
      history.replaceState(null, "", a.hash);
    });

    // 서브에서 들어온 경우: 레이아웃이 잡힌 뒤 정확한 위치로
    const hashEl =
      location.hash.startsWith("#sec-") &&
      document.getElementById(location.hash.slice(1));
    if (hashEl) {
      window.addEventListener("load", () =>
        setTimeout(() => go(hashEl, true), 150),
      );
    }
  };
  initAnchors(lenis);

  // geo-stack — 샘플(geo-stack.html) 배경 전환 그대로 (is_scene_dark 와 분리)
  const initGeoStack = () => {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined")
      return;

    const reduce = reduceMotion;
    const bgfx = document.querySelector(".bg_fx");

    const geo = document.querySelector(".main_geo");
    if (geo) {
      const grid = geo.querySelector(".is_c2 .grid");
      if (grid) {
        const ns = "http://www.w3.org/2000/svg";
        const addLine = (x1, y1, x2, y2) => {
          const l = document.createElementNS(ns, "line");
          l.setAttribute("x1", x1);
          l.setAttribute("y1", y1);
          l.setAttribute("x2", x2);
          l.setAttribute("y2", y2);
          grid.appendChild(l);
        };
        for (let i = 0; i < 13; i++)
          addLine(33.19, 66.375 + i * 10.6875, 355.5, 66.375 + i * 10.6875);
        for (let i = 0; i < 28; i++)
          addLine(33.19 + i * 11.9375, 66.375, 33.19 + i * 11.9375, 194.6);
      }

      if (!reduce) {
        gsap.from(geo.querySelectorAll(".geo_head > *"), {
          y: 40,
          autoAlpha: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: geo.querySelector(".geo_head"),
            start: "top 80%",
          },
        });
      }

      const count = (tl, el, at) => {
        const to = parseFloat(el.dataset.to);
        const dec = parseInt(el.dataset.dec || 0, 10);
        const o = { v: 0 };
        el.textContent = (0).toFixed(dec);
        tl.to(
          o,
          {
            v: to,
            duration: 1.2,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = o.v.toFixed(dec);
            },
          },
          at,
        );
      };

      const builds = {
        is_c1: (card, tl) => {
          tl.from(
            card.querySelectorAll(".bars .fill"),
            { "--p": 0, duration: 1.1, stagger: 0.12, ease: "power3.out" },
            0,
          ).from(
            card.querySelectorAll(".bars .cnt"),
            { autoAlpha: 0, duration: 0.4, stagger: 0.12 },
            0.5,
          );
          card.querySelectorAll(".cnt").forEach((el) => count(tl, el, 0.1));
        },
        is_c2: (card, tl) => {
          tl.from(
            card.querySelector(".ring"),
            {
              attr: { "stroke-dashoffset": 100 },
              duration: 1.4,
              ease: "power3.out",
            },
            0,
          )
            .fromTo(
              card.querySelector(".needle"),
              { rotation: -180, svgOrigin: "193.8 194.6" },
              {
                rotation: -21,
                svgOrigin: "193.8 194.6",
                duration: 1.4,
                ease: "power3.out",
              },
              0,
            )
            .from(
              card.querySelector(".core"),
              {
                scale: 0,
                svgOrigin: "193.8 194.6",
                duration: 0.8,
                ease: "back.out(1.6)",
              },
              0.2,
            )
            .from(
              card.querySelectorAll(".legend li"),
              { y: 6, autoAlpha: 0, duration: 0.5, stagger: 0.1 },
              0.3,
            );
          card.querySelectorAll(".cnt").forEach((el) => count(tl, el, 0));
        },
        is_c3: (card, tl) => {
          tl.from(
            card.querySelectorAll(".bar"),
            { scaleY: 0, duration: 1.2, stagger: 0.15, ease: "power3.out" },
            0,
          );
          card.querySelectorAll(".cnt").forEach((el) => count(tl, el, 0.1));
        },
        is_c4: (card, tl) => {
          tl.from(
            card.querySelector(".glow"),
            {
              scaleX: 0,
              svgOrigin: "18 118",
              duration: 1.3,
              ease: "power3.out",
            },
            0,
          )
            .from(
              card.querySelector(".knob"),
              { x: -272, duration: 1.3, ease: "power3.out" },
              0,
            )
            .from(
              card.querySelectorAll(".stats div"),
              {
                y: 16,
                autoAlpha: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: "power2.out",
              },
              0.3,
            );
          card.querySelectorAll(".cnt").forEach((el) => count(tl, el, 0.3));
        },
      };

      geo.querySelectorAll(".geo_card").forEach((card) => {
        const key = [...card.classList].find((c) => builds[c]);
        if (!key || reduce) return;
        const tl = gsap.timeline({ paused: true });
        builds[key](card, tl);
        ScrollTrigger.create({
          trigger: card,
          start: "top 65%",
          onEnter: () => tl.restart(),
          onLeaveBack: () => tl.pause(0),
        });
      });
    }

    const worry = document.querySelector(".main_worry");
    if (worry && window.Matter) {
      const { Engine, Bodies, Composite } = Matter;
      const stage = worry.querySelector(".worry_drop");
      const pills = [...stage.querySelectorAll("li")];
      const DW = 1920;
      const DH = 518;
      const ZL = 690;
      const ZR = 1870;
      let engine = null;
      let raf = 0;
      let timers = [];
      let bodies = [];
      let started = false;
      let lastW = window.innerWidth;

      const isMo = () => window.innerWidth <= 767;
      const place = (el, x, y, a) => {
        el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${y - el.offsetHeight / 2}px) rotate(${a}rad)`;
      };
      const mapX = (x, W) => {
        if (isMo()) return ((x - ZL) / (ZR - ZL)) * W;
        return (x / DW) * W;
      };
      const stop = () => {
        cancelAnimationFrame(raf);
        timers.forEach(clearTimeout);
        timers = [];
        if (engine) {
          Composite.clear(engine.world, false);
          Engine.clear(engine);
        }
        engine = null;
        bodies = [];
      };
      const reset = () => {
        stop();
        started = false;
        pills.forEach((el) => {
          el.classList.remove("is_on");
          el.style.transform = "";
        });
      };
      const placeStatic = () => {
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        pills.forEach((el) => {
          const y =
            H - (DH - parseFloat(el.dataset.y)) * (isMo() ? 0.6 : W / DW);
          place(
            el,
            mapX(parseFloat(el.dataset.x), W),
            y,
            (parseFloat(el.dataset.r) * Math.PI) / 180,
          );
          el.classList.add("is_on");
        });
      };
      const start = () => {
        reset();
        started = true;
        if (reduce) {
          placeStatic();
          return;
        }
        const W = stage.clientWidth;
        const H = stage.clientHeight;
        const zl = isMo() ? 0 : (ZL / DW) * W;
        const t = 200;
        engine = Engine.create({ enableSleeping: true });
        engine.gravity.y = 1.2;
        Composite.add(engine.world, [
          Bodies.rectangle(W / 2, H + t / 2, W * 2, t, { isStatic: true }),
          Bodies.rectangle(zl - t / 2, 0, t, H * 4, { isStatic: true }),
          Bodies.rectangle(W + t / 2, 0, t, H * 4, { isStatic: true }),
        ]);
        pills.forEach((el, i) => {
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          const half = Math.max(w, h) / 2;
          const x = Math.min(
            Math.max(mapX(parseFloat(el.dataset.x), W), zl + half * 0.6),
            W - half * 0.6,
          );
          const a = (parseFloat(el.dataset.r) * Math.PI) / 180;
          timers.push(
            setTimeout(() => {
              if (!engine) return;
              const b = Bodies.rectangle(x, -h - 60, w, h, {
                chamfer: { radius: h / 2 - 1 },
                angle: a,
                restitution: 0.3,
                friction: 0.5,
                frictionAir: 0.012,
                density: 0.002,
              });
              Composite.add(engine.world, b);
              bodies.push([el, b]);
              place(el, b.position.x, b.position.y, b.angle);
              el.classList.add("is_on");
            }, i * 160),
          );
        });
        let last = performance.now();
        const tick = (now) => {
          if (!engine) return;
          Engine.update(engine, Math.min(now - last, 32));
          last = now;
          bodies.forEach(([el, b]) =>
            place(el, b.position.x, b.position.y, b.angle),
          );
          if (
            bodies.length === pills.length &&
            bodies.every(([, b]) => b.isSleeping)
          )
            return;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      };

      ScrollTrigger.create({
        trigger: worry,
        start: "top 70%",
        onEnter: () => {
          if (!started) start();
        },
      });
      ScrollTrigger.create({
        trigger: worry,
        start: "top bottom",
        onLeaveBack: reset,
      });
      let rt = 0;
      window.addEventListener("resize", () => {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        clearTimeout(rt);
        rt = setTimeout(() => {
          if (started) start();
        }, 200);
      });
    }

    // bg_fx 구역 — faq가 잡으면 검정 우선, 아니면 voucher 타임라인(0.38)으로 흰/보라
    let bgZone = "auto"; // auto | faq
    let voucherPurple = false;
    let bgTweening = false;
    const PURPLE = "#4f2472";
    const WHITE = "#ffffff";
    const BLACK = "#000000";

    const applyVoucherBg = (atPurple = voucherPurple, opts = {}) => {
      // faq 구간이어도 플래그는 갱신 (leaveBack 때 잘못된 색으로 깜빡이지 않게)
      voucherPurple = !!atPurple;
      if (!bgfx || bgZone === "faq") return;
      const color = voucherPurple ? PURPLE : WHITE;
      if (opts.smooth) {
        bgTweening = true;
        gsap.to(bgfx, {
          backgroundColor: color,
          duration: opts.dur ?? 0.8,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            bgTweening = false;
          },
        });
        return;
      }
      // FAQ→보라 트윈 중엔 scrub set 이 끼어들어 깜빡이지 않게
      if (bgTweening) return;
      gsap.set(bgfx, { backgroundColor: color });
    };

    // 수출바우처 배경 블러 + 카드 뒤집기 (샘플: 배경은 .bg_fx 한 장만)
    const voucher = document.querySelector(".main_voucher");
    if (voucher) {
      const glow = voucher.querySelector(".voucher_glow");
      const stage = voucher.querySelector(".voucher_stage");
      const tit = voucher.querySelector(".voucher_tit");
      const cards = voucher.querySelectorAll(".voucher_flip");
      const note = voucher.querySelector(".voucher_note");
      if (stage) gsap.set(stage, { clearProps: "backgroundColor" });

      // 진입 전 풀사이즈 글로우/잔여 보라 트윈 방지
      if (glow) {
        gsap.set(glow, {
          scaleX: 0.42,
          scaleY: 0.12,
          yPercent: 0,
          borderTopLeftRadius: "50% 100%",
          borderTopRightRadius: "50% 100%",
          autoAlpha: 1,
        });
      }

      if (reduce) {
        gsap.set(cards, { rotationY: 180 });
        gsap.set(tit, { filter: "blur(12px)", opacity: 0.6 });
        if (bgfx) gsap.set(bgfx, { backgroundColor: PURPLE });
      } else {
        // 위에서 내려올 때 흰 배경으로 맞춘 뒤 글로우 시작
        ScrollTrigger.create({
          trigger: voucher,
          start: "top bottom",
          end: "top top",
          onEnter: () => {
            if (bgZone === "faq") return;
            bgTweening = false;
            gsap.killTweensOf(bgfx, "backgroundColor");
            applyVoucherBg(false);
          },
          onLeaveBack: () => {
            if (bgZone === "faq") return;
            bgTweening = false;
            gsap.killTweensOf(bgfx, "backgroundColor");
            applyVoucherBg(false);
          },
        });

        const mm = gsap.matchMedia();
        mm.add(
          { mo: "(max-width: 767px)", pc: "(min-width: 768px)" },
          (ctx) => {
            const mo = ctx.conditions.mo;
            const dur = mo ? 0.12 : 0.3;
            const gap = mo ? 0.11 : 0.08;
            let tl;
            const syncBg = () => {
              if (!tl) return;
              applyVoucherBg(tl.time() >= 0.38);
            };
            tl = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: voucher,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.6,
                // FAQ overwrite 에 안 깨지게 배경은 onUpdate 로만 동기화
                onUpdate: syncBg,
                onRefresh: syncBg,
              },
            });

            // 흰 화면에서 블러 도형이 아래부터 확대
            tl.fromTo(
              glow,
              {
                scaleX: 0.42,
                scaleY: 0.12,
                yPercent: 0,
                borderTopLeftRadius: "50% 100%",
                borderTopRightRadius: "50% 100%",
              },
              {
                scaleX: 1,
                scaleY: 1,
                yPercent: 0,
                borderTopLeftRadius: "50% 40%",
                borderTopRightRadius: "50% 40%",
                duration: 0.3,
                ease: "power1.out",
              },
              0,
            )
              .to(
                glow,
                {
                  scaleX: 1.4,
                  scaleY: 1.5,
                  duration: 0.1,
                  ease: "power1.out",
                },
                0.3,
              )
              .to(glow, { autoAlpha: 0, duration: 0.02 }, 0.4)
              .fromTo(
                tit,
                { filter: "blur(0px)", opacity: 1 },
                {
                  filter: "blur(12px)",
                  opacity: 0.6,
                  duration: 0.36,
                  ease: "power1.inOut",
                },
                0.38,
              )
              .fromTo(
                cards,
                { y: () => window.innerHeight },
                { y: 0, duration: dur, ease: "power2.out", stagger: gap },
                0.4,
              )
              .fromTo(
                cards,
                { rotationY: 0 },
                {
                  rotationY: 180,
                  duration: dur,
                  ease: "power3.inOut",
                  stagger: gap,
                },
                0.4,
              )
              .fromTo(
                note,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.06 },
                0.86,
              )
              .to({}, { duration: 0.08 });
          },
        );
      }
    }

    // FAQ~문의 — 검정 / 위로 벗어나면 voucher progress 에 맞춰 흰·보라 복구
    const faq = document.querySelector(".main_faq");
    const consult = document.querySelector(".main_consult");
    if (faq) {
      gsap.set(faq, { clearProps: "backgroundColor" });
      if (consult) gsap.set(consult, { clearProps: "backgroundColor" });

      const toBlack = (dur = 0.8) => {
        if (!bgfx) return;
        bgZone = "faq";
        gsap.to(bgfx, {
          backgroundColor: BLACK,
          duration: dur,
          ease: "power2.out",
          overwrite: true,
        });
      };
      const lockBlack = () => {
        if (!bgfx) return;
        bgZone = "faq";
        gsap.set(bgfx, { backgroundColor: BLACK });
      };
      // FAQ에서 위로 → 검정에서 보라로 페이드 (한 번에 set 하면 깜빡임)
      const releaseFaqBg = (smooth = true) => {
        bgZone = "auto";
        applyVoucherBg(true, smooth ? { smooth: true, dur: 0.8 } : {});
      };

      ScrollTrigger.create({
        trigger: faq,
        start: "top 55%",
        endTrigger: consult || faq,
        end: consult ? "bottom bottom" : "bottom top",
        onEnter: () => toBlack(0.8),
        onEnterBack: () => toBlack(0.8),
        onLeaveBack: () => releaseFaqBg(true),
        onRefresh: (self) => {
          if (self.isActive) lockBlack();
          else if (self.progress <= 0) releaseFaqBg(false);
        },
      });

      requestAnimationFrame(() => {
        if (faq.getBoundingClientRect().top <= window.innerHeight * 0.55)
          lockBlack();
        else applyVoucherBg(voucherPurple);
      });

      faq.querySelectorAll(".faq_item").forEach((item) => {
        const btn = item.querySelector(".faq_q");
        const panel = item.querySelector(".faq_a");
        if (!btn || !panel) return;
        btn.addEventListener("click", () => {
          const open = !item.classList.contains("is_on");
          item.classList.toggle("is_on", open);
          btn.setAttribute("aria-expanded", open);
          gsap.fromTo(
            panel,
            { height: open ? 0 : panel.scrollHeight },
            {
              height: open ? panel.scrollHeight : 0,
              duration: 0.4,
              ease: "power2.out",
              onComplete: () => {
                gsap.set(panel, { clearProps: "height" });
                ScrollTrigger.refresh();
              },
            },
          );
        });
      });
    }
  };

  // 비주얼 영상: 화면 밖에선 정지, 들어오기 한 화면 전부터 미리 재생
  const initVideos = () => {
    const vids = document.querySelectorAll(".visual_feature video");
    if (!vids.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (isIntersecting) {
            const p = target.play();
            if (p) p.catch(() => {});
          } else {
            target.pause();
          }
        });
      },
      { rootMargin: "100% 0px" },
    );
    vids.forEach((v) => io.observe(v));
  };

  initVideos();
  initStep();
  initGeoStack();
  if (typeof ScrollTrigger !== "undefined") {
    initWipe();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
})();
