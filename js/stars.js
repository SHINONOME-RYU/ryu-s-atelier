/* りゅーのあとりえ — stars.js
   サイト全体にときどき流れ星が流れる。何もないところをクリックすると、そこから流れ星が出る。 */
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "sky";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1, stars = [], running = false, next = 0;

  const resize = () => {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };

  // 流れ星を1つ生む(x, y 省略時は画面上部のどこか)
  const spawn = (x, y, big = false) => {
    const angle = (Math.PI / 180) * (20 + Math.random() * 25); // 右下へ 20〜45°
    const dir = Math.random() > 0.5 ? 1 : -1;
    const speed = (big ? 14 : 9) + Math.random() * 7;
    stars.push({
      x: x ?? Math.random() * W,
      y: y ?? Math.random() * H * 0.45,
      vx: Math.cos(angle) * speed * dir,
      vy: Math.sin(angle) * speed,
      len: (big ? 260 : 140) + Math.random() * 160,
      life: 0,
      max: 50 + Math.random() * 30,
      w: big ? 2.2 : 1.2 + Math.random() * 0.8,
      warm: Math.random() > 0.5,
    });
    start();
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, W, H);

    if (t > next && !document.hidden) {
      spawn();
      if (Math.random() < 0.18) setTimeout(() => spawn(), 220); // たまに2連続
      next = t + 3500 + Math.random() * 5500;
    }

    ctx.globalCompositeOperation = "lighter";
    stars = stars.filter((s) => s.life < s.max);
    for (const s of stars) {
      s.life++;
      s.x += s.vx;
      s.y += s.vy;
      const fade = Math.sin((s.life / s.max) * Math.PI); // ふわっと出て、ふわっと消える
      const sp = Math.hypot(s.vx, s.vy);
      const tx = s.x - (s.vx / sp) * s.len, ty = s.y - (s.vy / sp) * s.len;
      const c = s.warm ? "246,227,180" : "220,232,255";
      const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
      g.addColorStop(0, `rgba(${c},0)`);
      g.addColorStop(1, `rgba(${c},${0.9 * fade})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = s.w;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      // 先頭の光
      const r = 10 * s.w;
      const hg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      hg.addColorStop(0, `rgba(255,248,230,${0.95 * fade})`);
      hg.addColorStop(1, "rgba(255,248,230,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(draw);
  };

  function start() {
    if (running) return;
    running = true;
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  next = performance.now() + 1500;
  start();

  // 何もないところをクリックすると流れ星
  document.addEventListener("click", (e) => {
    if (e.target.closest("a, button, input, textarea, select, label, dialog, .photo")) return;
    spawn(e.clientX, e.clientY, true);
  });
})();
