// 랜야드 카드 - cvnt.in 푸터 방식 (Vercel 3D 배지 구조)
// three.js 렌더링 + Rapier 물리엔진 + MeshLine 끈, 물리·광택 값은 레퍼런스와 동일

// 물리·화면 값
// 카드는 슬롯에 맞추고, 물리 끈은 슬롯 바로 위(짧게). 보이는 끈만 캔버스 상단까지 그림
const P = {
  gravity: -40,
  step: 1 / 60,
  damping: 2.4,
  segment: 0.7,
  top: 4.2,
  rope: 0.22, // 슬롯 위 짧은 물리 끈 (3마디)
  anchor: 1.15,
  ball: 0.1,
  card: [0.88, 1.25, 0.012],
  minSpeed: 10,
  maxSpeed: 50,
  spinBack: 0.25,
  fov: 25,
  cameraZ: 15,
  maxDpr: 1.5,
  texWidth: 1024,
  ratio: 0.7163915,
  hangExtra: 0, // px, +면 카드·클립 위로
};

// 카드·고리 배치 (레퍼런스 모델과 같은 크기·위치, 형태는 직접 제작)
const M = {
  group: { y: -1.7, z: -0.05, scale: 2.45 },
  card: {
    y: 0.5229,
    z: 0.0034,
    scale: 0.5,
    w: 1.432783,
    h: 2,
    r: 0.04, // 모서리 둥글기 (h 2 기준, 0.05 ≈ 8px)
    depth: 0.00806,
    face: 0.00462844325,
  },
  hook: { x: -0.0004, y: 1.0254, z: 0.0004, scale: 0.093 },
  clip: { x: -0.0004, y: 1.1738, z: 0.0001, scale: 0.0686 },
};

const isFile = location.protocol === "file:";

document.querySelectorAll("[data-lanyard]").forEach(initLanyard);

function initLanyard(el) {
  const foot = el.closest("footer") || el.parentElement;
  const notice = foot.querySelector(".foot_notice");
  const opt = {
    front: el.dataset.front || "",
    back: el.dataset.back || el.dataset.front || "",
    band: el.dataset.band || "",
    // data-band-gradient: "카드쪽색,최상단색" — 예: #8D68B4,#F5F2F7
    bandGradient: el.dataset.bandGradient || "",
    alt: el.dataset.alt || "",
    minWidth: Number(el.dataset.minWidth) || 1024,
    // data-hang-extra: 슬롯 기준 미세조절(px, +면 위)
    hangExtra:
      el.dataset.hangExtra !== undefined ? Number(el.dataset.hangExtra) : 0,
  };
  const mq = matchMedia("(min-width: " + opt.minWidth + "px)");
  let app = null;
  let booting = null;
  let failed = false;
  let near = false;
  let seen = false;

  const sync = () => {
    // PC 너비가 아니면 3D를 아예 만들지 않음 (이미 만들었으면 정리)
    if (!mq.matches) {
      if (app) {
        app.destroy();
        app = null;
      }
      return;
    }
    if (near && !app && !booting && !failed) {
      booting = boot(el, opt, notice)
        .then((a) => {
          app = a;
        })
        .catch((err) => {
          failed = true;
          console.warn("[lanyard]", err);
        })
        .finally(() => {
          booting = null;
          sync();
        });
    }
    if (app) app.setActive(seen);
  };

  // 로드 후 한가할 때 미리 준비 — 푸터 근처 스크롤 중 끊김 방지
  const warm = () => {
    near = true;
    sync();
  };
  const idle = (fn) =>
    window.requestIdleCallback
      ? requestIdleCallback(fn, { timeout: 4000 })
      : setTimeout(fn, 1500);
  if (document.readyState === "complete") idle(warm);
  else window.addEventListener("load", () => idle(warm), { once: true });
  // 빠르게 내려온 경우 대비 — 푸터 1500px 전에도 준비
  new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) warm();
    },
    { rootMargin: "1500px 0px" },
  ).observe(foot);
  // 15% 이상 보이면 물리·렌더링 시작, 화면에서 완전히 벗어나면 정지
  new IntersectionObserver(
    ([e]) => {
      if (e.intersectionRatio >= 0.15) seen = true;
      else if (!e.isIntersecting) seen = false;
      sync();
    },
    { threshold: [0, 0.15] },
  ).observe(foot);
  mq.addEventListener("change", sync);

  // 이미지를 푸터에 끌어다 놓으면 바로 교체 (1장: 앞면, 2장: 앞·뒷면)
  foot.addEventListener("dragover", (e) => {
    if (app && e.dataTransfer && [...e.dataTransfer.types].includes("Files"))
      e.preventDefault();
  });
  foot.addEventListener("drop", (e) => {
    const files = [...(e.dataTransfer ? e.dataTransfer.files : [])].filter(
      (f) => f.type.startsWith("image/"),
    );
    if (!app || !files.length) return;
    e.preventDefault();
    app.setImages(
      URL.createObjectURL(files[0]),
      files[1] ? URL.createObjectURL(files[1]) : null,
    );
  });
}

async function boot(el, opt, notice) {
  // 이미지는 라이브러리와 동시에 받기 시작
  const images = Promise.all([
    loadImage(opt.front),
    loadImage(opt.back),
    opt.band ? loadImage(opt.band) : null,
  ]);
  const [THREE, ML, RAPIER] = await Promise.all([
    import("three"),
    import("meshline"),
    import("rapier").then((m) => m.default),
  ]);
  // Rapier 초기화 때 나오는 라이브러리 자체 안내 경고(동작과 무관)만 숨김
  const warn = console.warn;
  console.warn = (...args) => {
    if (
      !String(args[0]).includes("deprecated parameters for the initialization")
    )
      warn.apply(console, args);
  };
  try {
    await RAPIER.init();
  } finally {
    console.warn = warn;
  }
  return createLanyard({ THREE, ML, RAPIER, el, opt, notice, images });
}

function createLanyard({ THREE, ML, RAPIER, el, opt, notice, images }) {
  const { MeshLineGeometry, MeshLineMaterial } = ML;
  const clamp = THREE.MathUtils.clamp;
  let disposed = false;
  const foot = el.closest("footer") || el.parentElement;
  const slot = foot.querySelector(".foot_card_slot");
  if (Number.isFinite(opt.hangExtra)) P.hangExtra = opt.hangExtra;

  // 렌더러 (투명 배경, 고해상도는 1.5배까지)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(Math.max(window.devicePixelRatio || 1, 1), P.maxDpr),
  );
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute("role", "img");
  if (opt.alt) canvas.setAttribute("aria-label", opt.alt);
  el.prepend(canvas);
  el.classList.add("is_on");
  const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(P.fov, 1, 0.1, 1000);
  camera.position.set(0, 0, P.cameraZ);
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI));
  const envRT = makeEnvironment(THREE, renderer);
  scene.environment = envRT.texture;

  // 물리 세계 (레퍼런스 설정과 동일)
  const world = new RAPIER.World({ x: 0, y: P.gravity, z: 0 });
  world.timestep = P.step;
  const ip = world.integrationParameters;
  ip.numSolverIterations = 4;
  ip.numInternalPgsIterations = 1;
  ip.normalizedAllowedLinearError = 0.001;
  ip.normalizedPredictionDistance = 0.002;
  ip.minIslandSize = 128;
  ip.maxCcdSubsteps = 1;
  ip.contact_natural_frequency = 30;
  world.lengthUnit = 1;

  const makeBody = (fixed) => {
    const desc = fixed
      ? RAPIER.RigidBodyDesc.fixed()
      : RAPIER.RigidBodyDesc.dynamic();
    const body = world.createRigidBody(desc.setCanSleep(true));
    body.setLinearDamping(P.damping);
    body.setAngularDamping(P.damping);
    return body;
  };
  // 고정점 - 마디1 - 마디2 - 마디3 - 카드
  const fixed = makeBody(true);
  const j1 = makeBody();
  const j2 = makeBody();
  const j3 = makeBody();
  const card = makeBody();
  const bodies = [fixed, j1, j2, j3, card];
  // 센서만 — 짧은 끈에서 카드·마디끼리 부딪혀 들썩이는 것 방지
  [j1, j2, j3].forEach((b) =>
    world.createCollider(RAPIER.ColliderDesc.ball(P.ball).setSensor(true), b),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(...P.card).setSensor(true),
    card,
  );

  const ZERO = { x: 0, y: 0, z: 0 };
  world.createImpulseJoint(
    RAPIER.JointData.rope(P.rope, ZERO, ZERO),
    fixed,
    j1,
    true,
  );
  world.createImpulseJoint(
    RAPIER.JointData.rope(P.rope, ZERO, ZERO),
    j1,
    j2,
    true,
  );
  world.createImpulseJoint(
    RAPIER.JointData.rope(P.rope, ZERO, ZERO),
    j2,
    j3,
    true,
  );
  world.createImpulseJoint(
    RAPIER.JointData.spherical(ZERO, { x: 0, y: P.anchor, z: 0 }),
    j3,
    card,
    true,
  );

  // 재질 - 카드 몸체(검정)·금속 고리·앞뒷면(클리어코트 광택)
  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.0364, 0.0364, 0.0364),
    metalness: 1,
    roughness: 0.3,
  });
  const base = new THREE.MeshStandardMaterial({
    color: "#06070d",
    roughness: 0.34,
    metalness: 0.05,
    envMapIntensity: 0.55,
  });
  const faceMaterial = () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0.03,
      clearcoat: 0.74,
      clearcoatRoughness: 0.08,
      reflectivity: 1,
      envMapIntensity: 2.45,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

  // 카드 묶음 (물리 카드 위치를 그대로 따라감)
  const cardRoot = new THREE.Group();
  const visual = new THREE.Group();
  visual.position.set(0, M.group.y, M.group.z);
  visual.scale.setScalar(M.group.scale);
  cardRoot.add(visual);
  scene.add(cardRoot);

  const cardNode = new THREE.Group();
  cardNode.position.set(0, M.card.y, M.card.z);
  cardNode.scale.setScalar(M.card.scale);
  visual.add(cardNode);

  const slab = new THREE.ExtrudeGeometry(
    roundedRect(THREE, M.card.w, M.card.h, M.card.r),
    { depth: M.card.depth, bevelEnabled: false, curveSegments: 24 },
  );
  slab.translate(0, 0, -M.card.depth / 2);
  cardNode.add(new THREE.Mesh(slab, base));

  const front = new THREE.Mesh(
    faceGeometry(THREE, M.card.w, M.card.h, M.card.r, false),
    faceMaterial(),
  );
  front.position.z = M.card.face;
  const back = new THREE.Mesh(
    faceGeometry(THREE, M.card.w, M.card.h, M.card.r, true),
    faceMaterial(),
  );
  back.position.z = -M.card.face;
  back.rotation.y = Math.PI;
  [front, back].forEach((m) => {
    m.renderOrder = 1;
    m.visible = false;
  });
  cardNode.add(front, back);

  const hookNode = new THREE.Group();
  hookNode.position.set(M.hook.x, M.hook.y, M.hook.z);
  hookNode.scale.setScalar(M.hook.scale);
  hookNode.add(new THREE.Mesh(hookGeometry(THREE), metal));
  const clipNode = new THREE.Group();
  clipNode.position.set(M.clip.x, M.clip.y, M.clip.z);
  clipNode.scale.setScalar(M.clip.scale);
  clipGeometries(THREE).forEach((g) => clipNode.add(new THREE.Mesh(g, metal)));
  visual.add(hookNode, clipNode);

  // 끈 (MeshLine) — 끝 캡은 캔버스 밖으로, 보이는 상단 = 그라데이션 끝색
  const BAND_TIP_PAD = 48; // px, MeshLine 대각 캡을 화면 밖으로
  let bandOverFrac = 0.1;
  let bandTex = makeBandTexture(THREE, null, opt.bandGradient, bandOverFrac);
  const bandMat = new MeshLineMaterial({
    color: new THREE.Color("white"),
    depthTest: true,
    depthWrite: false,
    transparent: !!opt.bandGradient,
    resolution: new THREE.Vector2(1, 1),
    map: bandTex,
    useMap: 1,
    repeat: new THREE.Vector2(1, 1),
    lineWidth: 1.5,
  });
  if (opt.bandGradient) bandMat.toneMapped = false;
  const band = new THREE.Mesh(new MeshLineGeometry(), bandMat);
  band.frustumCulled = false;
  scene.add(band);

  const refreshBandTex = (overFrac) => {
    if (!opt.bandGradient) return;
    const next = Math.max(0.04, Math.min(0.35, overFrac));
    if (Math.abs(next - bandOverFrac) < 0.01) return;
    bandOverFrac = next;
    const tex = makeBandTexture(THREE, null, opt.bandGradient, bandOverFrac);
    bandMat.map = tex;
    bandTex.dispose();
    bandTex = tex;
  };

  // 카드 이미지 적용
  const faceTex = { front: null, back: null };
  const setFace = (mesh, key, img) => {
    const { texture, ok } = makeCardTexture(THREE, img, aniso);
    mesh.material.map = texture;
    mesh.material.needsUpdate = true;
    mesh.visible = true;
    if (faceTex[key]) faceTex[key].dispose();
    faceTex[key] = texture;
    return ok;
  };
  const setImages = async (frontSrc, backSrc) => {
    const [f, b] = await Promise.all([
      loadImage(frontSrc),
      backSrc ? loadImage(backSrc) : null,
    ]);
    if (disposed) return;
    setFace(front, "front", f);
    if (backSrc) setFace(back, "back", b);
  };
  images.then(([f, b, bandImg]) => {
    if (disposed) return;
    const okFront = setFace(front, "front", f);
    const okBack = setFace(back, "back", b || f);
    if (bandImg) {
      const next = makeBandTexture(THREE, bandImg, opt.bandGradient);
      bandMat.map = next;
      bandTex.dispose();
      bandTex = next;
    }
    // 텍스처 업로드·셰이더 컴파일 미리 — 첫 화면 진입 때 멈춤 방지
    [faceTex.front, faceTex.back, bandTex].forEach(
      (t) => t && renderer.initTexture(t),
    );
    if (renderer.compileAsync)
      renderer.compileAsync(scene, camera).catch(() => {});
    if (isFile && (!okFront || !okBack) && notice) {
      notice.textContent =
        "파일을 직접 열면(file://) 브라우저 보안 때문에 카드 이미지가 보이지 않아요. VS Code Live Server 같은 로컬 서버로 열어주세요. 이미지 파일을 푸터에 끌어다 놓으면 바로 미리 볼 수도 있어요.";
      notice.hidden = false;
    }
  });

  // 보간용 상태 (물리 60fps ↔ 화면 주사율 차이를 부드럽게)
  const snapshot = () => ({
    p: new THREE.Vector3(),
    q: new THREE.Quaternion(),
  });
  const prev = bodies.map(snapshot);
  const curr = bodies.map(snapshot);
  const view = bodies.map(snapshot);
  const read = (i, into) => {
    const t = bodies[i].translation();
    const r = bodies[i].rotation();
    into.p.set(t.x, t.y, t.z);
    into.q.set(r.x, r.y, r.z, r.w);
  };

  // 끈 곡선 (마디 4개 → 33개 점)
  const curve = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ],
    false,
    "chordal",
    0.5,
  );
  const points = new Float32Array(33 * 3);
  const tmp = new THREE.Vector3();
  const lerpJ1 = new THREE.Vector3();
  const lerpJ2 = new THREE.Vector3();
  let lerpReady = false;

  // 드래그
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(9, 9);
  const vec = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let dragOffset = null;
  let hovered = false;
  let needHover = false;

  const toPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
  };
  // 스크린 좌표 → z=0 월드 좌표 (슬롯 정렬용)
  const screenToWorld = (clientX, clientY, out = vec) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return out.set(0, 0, 0);
    const ndcX = ((clientX - r.left) / r.width) * 2 - 1;
    const ndcY = -((clientY - r.top) / r.height) * 2 + 1;
    out.set(ndcX, ndcY, 0.5).unproject(camera);
    dir.copy(out).sub(camera.position).normalize();
    const dist = -camera.position.z / dir.z;
    return out.copy(camera.position).addScaledVector(dir, dist);
  };
  const hitCard = () => {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(visual, true)[0] || null;
  };
  const setCursor = () => {
    const cur = dragOffset ? "grabbing" : hovered ? "grab" : "";
    foot.style.cursor = cur;
    document.body.style.cursor = cur || "";
  };
  const release = () => {
    if (!dragOffset) return;
    dragOffset = null;
    card.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    setCursor();
  };

  // foot_body가 캔버스 위에 있어도 카드 히트면 드래그 (캡처 단계)
  const onPointerDown = (e) => {
    if (disposed || !active || e.button !== 0) return;
    toPointer(e);
    const hit = hitCard();
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    const t = card.translation();
    dragOffset = new THREE.Vector3()
      .copy(hit.point)
      .sub(vec.set(t.x, t.y, t.z));
    card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    hovered = true;
    setCursor();
  };
  const onPointerMove = (e) => {
    if (disposed || !active) return;
    toPointer(e);
    needHover = true;
    if (dragOffset) e.preventDefault();
  };
  const onPointerUp = () => {
    if (disposed) return;
    release();
    needHover = true;
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", onPointerUp, true);

  // 물리 한 칸 진행 전 처리
  const beforeStep = () => {
    if (dragOffset) {
      // 마우스 위치를 3D 좌표로 변환
      vec.set(pointer.x, pointer.y, 0.5).unproject(camera);
      dir.copy(vec).sub(camera.position).normalize();
      vec.add(dir.multiplyScalar(camera.position.length()));
      bodies.forEach((b) => b.wakeUp());
      card.setNextKinematicTranslation({
        x: vec.x - dragOffset.x,
        y: vec.y - dragOffset.y,
        z: vec.z - dragOffset.z,
      });
    }
    // 돌아간 만큼 반대로 회전시켜 정면으로 복귀
    const ang = card.angvel();
    const rot = card.rotation();
    card.setAngvel({ x: ang.x, y: ang.y - rot.y * P.spinBack, z: ang.z }, true);
  };

  // 슬롯에 맞춰 늘어뜨린 자세로 시작
  let anchorX = null;
  let bandTopY = 4;
  let acc = 0;
  const reset = () => {
    release();
    const x = anchorX;
    const top = P.top;
    const r = P.rope;
    const ys = [top, top - r, top - 2 * r, top - 3 * r, top - 3 * r - P.anchor];
    bodies.forEach((b, i) => {
      const ox = i === 4 ? 0.2 : 0;
      b.setTranslation({ x: x + ox, y: ys[i], z: 0 }, true);
      b.setRotation(
        i === 4
          ? { x: 0, y: 0, z: 0.12, w: 0.9928 }
          : { x: 0, y: 0, z: 0, w: 1 },
        true,
      );
      b.setLinvel(ZERO, true);
      b.setAngvel(ZERO, true);
    });
    bodies.forEach((b, i) => {
      read(i, curr[i]);
      prev[i].p.copy(curr[i].p);
      prev[i].q.copy(curr[i].q);
    });
    lerpReady = false;
    acc = 0;
  };

  // 슬롯(또는 card_row) 기준으로 카드 크기·위치 맞춤
  const row = foot.querySelector(".foot_card_row");
  let fitS = M.group.scale;
  let resetTimer = 0;
  const resize = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    bandMat.resolution.set(w, h);

    const cr = canvas.getBoundingClientRect();
    if (cr.width < 2 || cr.height < 2) return;
    const viewH = 2 * Math.tan((P.fov * Math.PI) / 360) * P.cameraZ;
    const viewW = viewH * (w / h);
    // z=0 평면 — NDC 선형 매핑 (슬롯 정렬용)
    const toWorld = (clientX, clientY) => {
      const ndcX = ((clientX - cr.left) / cr.width) * 2 - 1;
      const ndcY = -((clientY - cr.top) / cr.height) * 2 + 1;
      return { x: ndcX * viewW * 0.5, y: ndcY * viewH * 0.5 };
    };

    // 슬롯 우선, 없으면 card_row 왼쪽(패딩+237)으로 추정
    let slotLeft = 0;
    let slotTop = 0;
    let slotW = 237;
    let slotH = 331;
    const sr =
      slot && slot.offsetWidth > 0 ? slot.getBoundingClientRect() : null;
    if (sr && sr.width > 2 && sr.height > 2) {
      slotLeft = sr.left;
      slotTop = sr.top;
      slotW = sr.width;
      slotH = sr.height;
    } else if (row) {
      const rr = row.getBoundingClientRect();
      const padL = parseFloat(getComputedStyle(row).paddingLeft) || 0;
      slotLeft = rr.left + padL;
      slotTop = rr.top;
      slotW = Math.min(237, Math.max(1, rr.width - padL));
      slotH = rr.height > 2 ? rr.height : 331;
    } else {
      return;
    }

    const liftPx = Number.isFinite(P.hangExtra) ? P.hangExtra : 0;
    const cx = slotLeft + slotW / 2;
    const clip = toWorld(cx, slotTop - liftPx);
    // MeshLine 끝 캡(대각선)은 마지막 점 바깥에 그려짐 → 캔버스 위로 넘겨 잘라냄
    const topBand = toWorld(cx, cr.top - BAND_TIP_PAD);
    bandTopY = topBand.y;
    // 보이는 구간에서 끝색(#F5…)이 오도록 — 연장분 비율만큼 그라데이션 압축
    const visibleH = Math.max(1, slotTop - cr.top);
    refreshBandTex(BAND_TIP_PAD / (visibleH + BAND_TIP_PAD));

    // 메시 크기 = 슬롯 높이
    const nextS = clamp((slotH / cr.height) * viewH, 1.2, 3.2);
    if (Math.abs(nextS - fitS) >= 0.02) {
      fitS = nextS;
      visual.scale.setScalar(fitS);
      visual.position.set(0, P.anchor - M.clip.y * fitS, M.group.z);
    }

    // 물리 고정점: 클립(슬롯 상단) 바로 위 — 카드가 슬롯에 들어가게
    const nextX = clip.x;
    const nextTop = clip.y + 3 * P.rope;
    const first = anchorX === null;
    const moved =
      first ||
      Math.abs(nextX - anchorX) > 0.015 ||
      Math.abs(nextTop - P.top) > 0.015;
    anchorX = nextX;
    P.top = nextTop;
    if (!moved) return;
    if (first) {
      reset();
    } else {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(reset, 100);
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  if (slot) ro.observe(slot);
  if (row) ro.observe(row);
  resize();

  // 매 프레임
  let raf = 0;
  let last = 0;
  let active = false;
  let frames = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = last ? clamp((now - last) / 1000, 0, 0.5) : 0;
    last = now;

    // 고정 간격(1/60초)으로 물리 진행
    acc += dt;
    while (acc >= P.step) {
      for (let i = 0; i < bodies.length; i++) {
        prev[i].p.copy(curr[i].p);
        prev[i].q.copy(curr[i].q);
      }
      beforeStep();
      world.step();
      for (let i = 0; i < bodies.length; i++) read(i, curr[i]);
      acc -= P.step;
    }
    const alpha = acc / P.step;
    for (let i = 0; i < bodies.length; i++) {
      view[i].p.lerpVectors(prev[i].p, curr[i].p, alpha);
      view[i].q.slerpQuaternions(prev[i].q, curr[i].q, alpha);
    }

    cardRoot.position.copy(view[4].p);
    cardRoot.quaternion.copy(view[4].q);

    // 끈 - 중간 마디는 한 번 더 부드럽게 따라가게 (떨림 방지)
    if (!lerpReady) {
      lerpJ1.copy(view[1].p);
      lerpJ2.copy(view[2].p);
      lerpReady = true;
    }
    const d1 = clamp(lerpJ1.distanceTo(view[1].p), 0.1, 1);
    const d2 = clamp(lerpJ2.distanceTo(view[2].p), 0.1, 1);
    lerpJ1.lerp(
      view[1].p,
      Math.min(1, dt * (P.minSpeed + d1 * (P.maxSpeed - P.minSpeed))),
    );
    lerpJ2.lerp(
      view[2].p,
      Math.min(1, dt * (P.minSpeed + d2 * (P.maxSpeed - P.minSpeed))),
    );
    // 끈: 물리 마디 흔들림 + 상단은 캔버스 끝까지 시각 연장
    const j3p = view[3].p;
    const sway = (lerpJ1.x + lerpJ2.x) * 0.5 - anchorX;
    curve.points[0].set(j3p.x, j3p.y, 0);
    curve.points[1].set(
      anchorX + sway * 0.65,
      j3p.y + (bandTopY - j3p.y) * 0.35,
      0,
    );
    curve.points[2].set(
      anchorX + sway * 0.25,
      j3p.y + (bandTopY - j3p.y) * 0.7,
      0,
    );
    curve.points[3].set(anchorX, bandTopY, 0);
    for (let i = 0; i <= 32; i++) {
      curve.getPoint(i / 32, tmp);
      points[i * 3] = tmp.x;
      points[i * 3 + 1] = tmp.y;
      points[i * 3 + 2] = tmp.z;
    }
    band.geometry.setPoints(points);

    renderer.render(scene, camera);

    // 커서 (마우스가 움직였을 때만 검사)
    if (needHover && !dragOffset) {
      needHover = false;
      const over = !!hitCard();
      if (over !== hovered) {
        hovered = over;
        setCursor();
      }
    }
    frames++;
  };

  // 보일 때만 돌리고, 안 보이면 물리·렌더링 모두 멈춤
  const setActive = (on) => {
    if (disposed || on === active) return;
    active = on;
    if (on) {
      // 위에서 로드 후 스크롤인 경우 — 위치·크기 다시 잡고 시작
      resize();
      if (anchorX !== null) reset();
      last = 0;
      acc = 0;
      raf = requestAnimationFrame(frame);
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      release();
    }
  };
  // 탭을 다녀와도 한꺼번에 몰아서 계산하지 않게
  const onVisibility = () => {
    last = 0;
  };
  document.addEventListener("visibilitychange", onVisibility);

  // 모바일 너비로 바뀌면 전부 정리 (GPU·메모리 반환)
  const destroy = () => {
    setActive(false);
    disposed = true;
    ro.disconnect();
    clearTimeout(resetTimer);
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerUp, true);
    document.removeEventListener("pointercancel", onPointerUp, true);
    foot.style.cursor = "";
    document.body.style.cursor = "";
    scene.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    [metal, base, front.material, back.material, bandMat].forEach((m) =>
      m.dispose(),
    );
    Object.values(faceTex).forEach((t) => t && t.dispose());
    bandTex.dispose();
    envRT.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    world.free();
    el.classList.remove("is_on");
    el.lanyard = null;
  };

  // 상태 확인용
  const state = () => {
    const r = canvas.getBoundingClientRect();
    const t = card.translation();
    front.getWorldPosition(tmp).project(camera);
    return {
      active,
      frames,
      dragging: !!dragOffset,
      card: [t.x, t.y, t.z],
      screen: [
        r.left + ((tmp.x + 1) / 2) * r.width,
        r.top + ((1 - tmp.y) / 2) * r.height,
      ],
    };
  };

  // 외부 제어용: document.querySelector('[data-lanyard]').lanyard.setImages('앞.jpg', '뒤.jpg')
  const api = { setImages, setActive, reset, destroy, state };
  el.lanyard = api;
  return api;
}

// 이미지 불러오기 (실패하면 null)
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (!isFile && !/^(blob|data):/.test(src)) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// 카드 텍스처 - 이미지를 카드 비율에 맞춰 가운데 기준으로 채움
function makeCardTexture(THREE, img, aniso) {
  const w = P.texWidth;
  const h = Math.round(P.texWidth / P.ratio);
  let canvas = null;
  if (img) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.max(w / iw, h / ih);
    g.drawImage(img, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s);
    // file:// 로 열면 보안상 이미지 픽셀을 쓸 수 없음
    try {
      g.getImageData(0, 0, 1, 1);
      canvas = c;
    } catch (err) {
      canvas = null;
    }
  }
  const ok = !!canvas;
  if (!canvas) canvas = placeholderCanvas(w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = aniso;
  return { texture, ok };
}

function placeholderCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#2b2e3b");
  grd.addColorStop(1, "#0b0c11");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.textAlign = "center";
  g.fillStyle = "rgba(255, 255, 255, .9)";
  g.font = '600 72px "Inter Tight", sans-serif';
  g.fillText("CARD IMAGE", w / 2, h / 2 - 16);
  g.fillStyle = "rgba(255, 255, 255, .55)";
  g.font = '400 36px "Malgun Gothic", sans-serif';
  g.fillText(
    isFile ? "로컬 서버로 열어주세요" : "이미지를 찾을 수 없어요",
    w / 2,
    h / 2 + 52,
  );
  return c;
}

// 끈 텍스처 - 이미지 / 그라데이션 / 기본 검정 + 가장자리 박음질 선
// overFrac: 화면 밖 연장 비율 — 그 직전에서 stops[1]에 도달 (보이는 상단 = 끝색)
function makeBandTexture(THREE, img, gradient, overFrac) {
  let canvas = null;
  if (img) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth || 900;
    c.height = img.naturalHeight || 500;
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0, c.width, c.height);
    try {
      g.getImageData(0, 0, 1, 1);
      canvas = c;
    } catch (err) {
      canvas = null;
    }
  }
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;
    const g = canvas.getContext("2d");
    const stops = String(gradient || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (stops.length >= 2) {
      const over = Math.max(0.04, Math.min(0.35, Number(overFrac) || 0.1));
      const tipAt = 1 - over; // 화면 상단 ≈ 끝색
      // X0=카드쪽(stops[0]) → tipAt=보이는 상단(stops[1]) → 연장분은 끝색 유지
      const grd = g.createLinearGradient(0, 0, 900, 0);
      grd.addColorStop(0, stops[0]);
      grd.addColorStop(tipAt, stops[1]);
      grd.addColorStop(1, stops[1]);
      g.fillStyle = grd;
      g.fillRect(0, 0, 900, 500);
      // 연장분 끝(캡)만 투명
      g.globalCompositeOperation = "destination-out";
      const fadeFrom = 900 * (tipAt + over * 0.35);
      const tip = g.createLinearGradient(fadeFrom, 0, 900, 0);
      tip.addColorStop(0, "rgba(0,0,0,0)");
      tip.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = tip;
      g.fillRect(fadeFrom, 0, 900 - fadeFrom, 500);
      g.globalCompositeOperation = "source-over";
    } else {
      g.fillStyle = "#050506";
      g.fillRect(0, 0, 900, 500);
      g.fillStyle = "rgba(255, 255, 255, .07)";
      g.fillRect(0, 46, 900, 10);
      g.fillRect(0, 444, 900, 10);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// 반사 환경 - 흰 조명판 4개 (레퍼런스 Lightformer 값 그대로) → 카드 광택
function makeEnvironment(THREE, renderer) {
  const env = new THREE.Scene();
  const plane = new THREE.PlaneGeometry(1, 1);
  const mats = [];
  [
    [2, [0, -1, 5], [0, 0, Math.PI / 3], [100, 0.1, 1]],
    [3, [-1, -1, 1], [0, 0, Math.PI / 3], [100, 0.1, 1]],
    [3, [1, 1, 1], [0, 0, Math.PI / 3], [100, 0.1, 1]],
    [10, [-10, 0, 14], [0, Math.PI / 2, Math.PI / 3], [100, 10, 1]],
  ].forEach(([intensity, pos, rot, scale]) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("white").multiplyScalar(intensity),
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(plane, mat);
    mesh.position.fromArray(pos);
    mesh.rotation.fromArray(rot);
    mesh.scale.fromArray(scale);
    env.add(mesh);
    mats.push(mat);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(env, 0, 1, 1000);
  pmrem.dispose();
  plane.dispose();
  mats.forEach((m) => m.dispose());
  return rt;
}

// 모서리가 둥근 사각형
function roundedRect(THREE, w, h, r) {
  const x = w / 2;
  const y = h / 2;
  const rr = Math.min(r, x, y);
  const s = new THREE.Shape();
  s.moveTo(-x + rr, -y);
  s.lineTo(x - rr, -y);
  s.quadraticCurveTo(x, -y, x, -y + rr);
  s.lineTo(x, y - rr);
  s.quadraticCurveTo(x, y, x - rr, y);
  s.lineTo(-x + rr, y);
  s.quadraticCurveTo(-x, y, -x, y - rr);
  s.lineTo(-x, -y + rr);
  s.quadraticCurveTo(-x, -y, -x + rr, -y);
  return s;
}

// 카드 앞뒷면 (이미지가 카드 전체에 맞게 UV 계산, 뒷면은 좌우 반전)
function faceGeometry(THREE, w, h, r, mirror) {
  const g = new THREE.ShapeGeometry(roundedRect(THREE, w, h, r), 24);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const u = THREE.MathUtils.clamp((pos.getX(i) + w / 2) / w, 0, 1);
    const v = THREE.MathUtils.clamp((pos.getY(i) + h / 2) / h, 0, 1);
    uv[i * 2] = mirror ? 1 - u : u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// 카드 구멍에 걸리는 고리
function hookGeometry(THREE) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    pts.push(new THREE.Vector3(0, Math.cos(t) * 0.88, Math.sin(t) * 0.37));
  }
  const g = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(pts, true),
    96,
    0.1,
    12,
    true,
  );
  g.scale(2.2, 1, 1);
  return g;
}

// 끈 끝 고정쇠 + 회전 고리 목
function clipGeometries(THREE) {
  const top = new THREE.ExtrudeGeometry(roundedRect(THREE, 1.76, 0.66, 0.2), {
    depth: 0.66,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 4,
    curveSegments: 10,
  });
  top.center();
  top.translate(0, 0.36, 0);
  const neck = new THREE.CylinderGeometry(0.22, 0.22, 0.72, 20);
  neck.translate(0, -0.45, 0);
  return [top, neck];
}
