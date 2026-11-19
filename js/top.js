/* りゅーのあとりえ — top.js(トップページ専用の演出) */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const { splitChars } = window.RyuFX || {};
  const hero = document.querySelector(".hero");
  if (!hero) return;

  /* ---------- 1. オープニング → ヒーロー登場 ---------- */
  const title = hero.querySelector(".hero__title");
  if (splitChars && title) splitChars(title);

  const startHero = () => {
    hero.classList.add("is-ready");
    title && title.classList.add("is-in");
  };

  const opening = document.querySelector(".opening");
  if (root.classList.contains("is-opening") && opening && !reduce) {
    const ot = opening.querySelector(".opening__title");
    splitChars && splitChars(ot);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      opening.classList.add("is-fading");
      setTimeout(() => opening.classList.add("is-leaving"), 350);
      setTimeout(startHero, 650);
      setTimeout(() => {
        root.classList.remove("is-opening");
        opening.remove();
      }, 1600);
      try { sessionStorage.setItem("ryu-opened", "1"); } catch (e) {}
    };
    requestAnimationFrame(() => requestAnimationFrame(() => opening.classList.add("is-in")));
    setTimeout(finish, 2700);
    opening.addEventListener("click", finish);
  } else {
    root.classList.remove("is-opening");
    opening && opening.remove();
    setTimeout(startHero, 120);
  }

  if (reduce) return; // 以下は動きの演出のみ(動きを減らす設定ならポスター画像のまま)

  /* ---------- 背景動画:画面幅で 720p / 1080p、WebM 優先 ---------- */
  const video = hero.querySelector(".hero__video");
  const toggle = hero.querySelector(".hero__toggle");
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  let userPaused = false;
  if (video && !saveData) {
    const base = window.matchMedia("(max-width: 820px)").matches ? video.dataset.srcSm : video.dataset.srcLg;
    const webm = video.canPlayType('video/webm; codecs="vp9"');
    video.src = base + (webm ? ".webm" : ".mp4");
    // 念のため:loop属性が効かない環境でも、終わったら頭から再生し直す(止まらない保険)
    video.addEventListener("ended", () => {
      video.currentTime = 0;
      if (!userPaused) video.play().catch(() => {});
    });
    video.play().catch(() => {});
    if (toggle) toggle.hidden = false;
  }
  const hasVideo = !!(video && video.src);

  /* ---------- 2. 光の粒+光跡(Canvas) ---------- */
  const canvas = document.createElement("canvas");
  canvas.className = "hero__fx";
  canvas.setAttribute("aria-hidden", "true");
  hero.insertBefore(canvas, hero.querySelector(".hero__inner"));
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, particles = [], trails = [], running = true, nextTrail = 0;
  const mouse = { x: -9999, y: -9999, nx: 0, ny: 0 };

  // 光の粒のスプライト(1回だけ描いて使い回す)
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  {
    const s = sprite.getContext("2d");
    const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,236,190,1)");
    g.addColorStop(0.25, "rgba(232,184,110,0.55)");
    g.addColorStop(1, "rgba(212,173,104,0)");
    s.fillStyle = g;
    s.fillRect(0, 0, 64, 64);
  }

  const resize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(Math.min(90, (W * H) / 16000));
    particles = Array.from({ length: n }, () => makeParticle(true));
  };
  const makeParticle = (anywhere) => {
    const z = 0.25 + Math.random() * 0.75;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 20,
      z,
      r: 2 + z * 9,
      vy: -(0.08 + z * 0.35),
      vx: (Math.random() - 0.5) * 0.15,
      ph: Math.random() * Math.PI * 2,
      ox: 0, oy: 0,
    };
  };
  const spawnTrail = () => {
    const ltr = Math.random() > 0.5;
    const warm = Math.random() > 0.45;
    trails.push({
      x: ltr ? -400 : W + 400,
      y: H * (0.62 + Math.random() * 0.3),
      v: (ltr ? 1 : -1) * (9 + Math.random() * 9),
      len: 220 + Math.random() * 380,
      w: 1 + Math.random() * 1.6,
      c: warm ? "255,120,70" : "255,226,170",
    });
  };

  const draw = (t) => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // 光の粒
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      p.x += p.vx + Math.sin(t / 2400 + p.ph) * 0.15;
      p.y += p.vy;
      if (p.y < -30) Object.assign(p, makeParticle(false));
      // マウスから少し逃げる
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 22000) {
        const f = (1 - d2 / 22000) * 2.2;
        p.ox += (dx / Math.sqrt(d2 + 1)) * f;
        p.oy += (dy / Math.sqrt(d2 + 1)) * f;
      }
      p.ox *= 0.94;
      p.oy *= 0.94;
      const px = p.x + p.ox - mouse.nx * 30 * p.z;
      const py = p.y + p.oy - mouse.ny * 20 * p.z;
      const tw = 0.45 + 0.55 * Math.sin(t / 900 + p.ph * 3);
      ctx.globalAlpha = (0.15 + p.z * 0.55) * tw;
      ctx.drawImage(sprite, px - p.r, py - p.r, p.r * 2, p.r * 2);
    }

    // 光跡(長時間露光のヘッドライト/テールランプ)
    if (!hasVideo && t > nextTrail) {
      spawnTrail();
      if (Math.random() > 0.6) spawnTrail();
      nextTrail = t + 2200 + Math.random() * 3800;
    }
    trails = trails.filter((tr) => tr.x > -tr.len - 500 && tr.x < W + tr.len + 500);
    for (const tr of trails) {
      tr.x += tr.v;
      const tail = tr.x - Math.sign(tr.v) * tr.len;
      const g = ctx.createLinearGradient(tail, 0, tr.x, 0);
      g.addColorStop(0, `rgba(${tr.c},0)`);
      g.addColorStop(1, `rgba(${tr.c},0.85)`);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = g;
      ctx.lineWidth = tr.w;
      ctx.beginPath();
      ctx.moveTo(tail, tr.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(sprite, tr.x - 10, tr.y - 10, 20, 20);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);

  // 画面外・タブ非表示のときは止める
  let heroVisible = true;
  const setRunning = (v) => {
    v = v && !userPaused;
    if (v && !running) {
      running = true;
      requestAnimationFrame(draw);
    } else running = v;
    if (hasVideo) v ? video.play().catch(() => {}) : video.pause();
  };
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    setRunning(heroVisible && !document.hidden);
  }).observe(hero);
  document.addEventListener("visibilitychange", () => setRunning(heroVisible && !document.hidden));

  // 一時停止ボタン:動画と光の粒をまとめて止める
  if (toggle && hasVideo) {
    toggle.addEventListener("click", () => {
      userPaused = !userPaused;
      toggle.setAttribute("aria-pressed", String(userPaused));
      toggle.setAttribute("aria-label", userPaused ? "背景の動きを再生する" : "背景の動きを止める");
      setRunning(heroVisible && !document.hidden);
    });
  }

  /* ---------- 3. マウスで背景がわずかに動く ---------- */
  const slides = hero.querySelector(".hero__slides");
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.nx = (mouse.x / r.width - 0.5) * 2;
    mouse.ny = (mouse.y / r.height - 0.5) * 2;
    slides.style.setProperty("--mx", `${-mouse.nx * 14}px`);
    slides.style.setProperty("--my", `${-mouse.ny * 10}px`);
  });
  hero.addEventListener("pointerleave", () => {
    mouse.x = mouse.y = -9999;
  });

  /* ---------- 4. スクロール連動 ---------- */
  const inner = hero.querySelector(".hero__inner");
  const progress = document.createElement("div");
  progress.className = "progress";
  document.body.appendChild(progress);
  const latestLinks = [...document.querySelectorAll(".latest a")];
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    const k = Math.min(y / vh, 1);
    inner.style.transform = `translateY(${y * 0.35}px)`;
    inner.style.opacity = String(1 - k * 1.3);
    slides.style.setProperty("--hs", String(1.04 + k * 0.12));
    const max = document.documentElement.scrollHeight - vh;
    progress.style.setProperty("--p", max > 0 ? String(y / max) : "0");
    for (const a of latestLinks) {
      const r = a.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const c = (r.top + r.height / 2 - vh / 2) / vh; // -1〜1
      a.querySelector("img")?.style.setProperty("--py", `${c * -28}px`);
    }
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  // 「最近の一枚」は後から描画されるので少し待って取り直す
  setTimeout(() => {
    latestLinks.splice(0, latestLinks.length, ...document.querySelectorAll(".latest a"));
    onScroll();
  }, 50);

  if (!finePointer) return; // 以下はマウス環境のみ

  /* ---------- 6. 入口カードの3Dチルト ---------- */
  document.querySelectorAll(".entrance").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.classList.add("is-tilting");
      card.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
      card.style.setProperty("--rx", `${(0.5 - py) * 8}deg`);
      card.style.setProperty("--sx", `${px * 100}%`);
      card.style.setProperty("--sy", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });

  /* ---------- 7. マグネットボタン ---------- */
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--bx", `${(e.clientX - r.left - r.width / 2) * 0.25}px`);
      btn.style.setProperty("--by", `${(e.clientY - r.top - r.height / 2) * 0.35}px`);
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.setProperty("--bx", "0px");
      btn.style.setProperty("--by", "0px");
    });
  });

  /* ---------- 8. 追従するリングカーソル ---------- */
  const cursor = document.createElement("div");
  cursor.className = "cursor is-hidden";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = '<div class="cursor__ring"></div>';
  document.body.appendChild(cursor);
  let cx = 0, cy = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
    cursor.classList.remove("is-hidden");
    cursor.classList.toggle("is-hover", !!e.target.closest("a, button"));
  });
  document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
  const follow = () => {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
})();
