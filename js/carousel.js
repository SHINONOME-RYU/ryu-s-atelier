/* りゅーのあとりえ — carousel.js
   写真カルーセル。<div class="carousel" data-carousel="bike|activities"> を見つけて組み立てる。
   表示順は読み込むたびにランダム。
   写真は js/image-loader.js が「いま実際にあるファイル」だけを返すので、
   画像フォルダの写真が増減しても、その枚数に合わせて自動で組み立てる。
   写真が1枚も無いとき:
     - 中に仮の画像(.carousel__slide)があれば、それを表示したままにする
     - 無ければ(愛車)、写真エリアごと隠す
   data-alt   : 画像の説明文(「…の写真」+連番が付く)
   data-sizes : 画像の表示幅のヒント(省略可) */
(() => {
  if (!window.RyuImages) return;
  document.querySelectorAll("[data-carousel]").forEach(setup);

  function setup(root) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const INTERVAL = 5500;
    const name = root.dataset.carousel || "bike";
    const altBase = root.dataset.alt || "愛車 Honda Rebel 250 の写真";
    const sizes = root.dataset.sizes || "(max-width: 860px) 100vw, 58vw";
    const frame = root.closest(".bike__photo") || root;

    // viewport と操作バーが無ければ作る(HTML側は枠だけ書けばよい)
    let viewport = root.querySelector("[data-carousel-viewport]");
    if (!viewport) {
      viewport = document.createElement("div");
      viewport.className = "carousel__viewport";
      viewport.setAttribute("data-carousel-viewport", "");
      root.prepend(viewport);
    }
    if (!root.querySelector("[data-carousel-prev]")) {
      root.insertAdjacentHTML(
        "beforeend",
        `<div class="carousel__bar">
          <button class="carousel__btn" type="button" data-carousel-prev aria-label="前の写真"><span aria-hidden="true">‹</span></button>
          <div class="carousel__dots" data-carousel-dots></div>
          <button class="carousel__btn" type="button" data-carousel-toggle aria-label="自動再生を止める" aria-pressed="false"><span class="carousel__pp" aria-hidden="true"></span></button>
          <button class="carousel__btn" type="button" data-carousel-next aria-label="次の写真"><span aria-hidden="true">›</span></button>
        </div>
        <p class="carousel__count" data-carousel-count aria-hidden="true"></p>`
      );
    }
    const hasFallback = viewport.children.length > 0;

    root.setAttribute("aria-busy", "true");
    window.RyuImages.load(name).then((found) => init(found)).catch(() => init([]));

    function init(found) {
      root.removeAttribute("aria-busy");
      if (!found.length) {
        if (hasFallback) root.classList.add("is-single");   // 仮の画像をそのまま見せる(操作UIは出さない)
        else frame.hidden = true;                            // 空の枠は出さない
        return;
      }

      // Fisher–Yates で毎回シャッフル
      const list = found.slice();
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }

      const dotsEl = root.querySelector("[data-carousel-dots]");
      const countEl = root.querySelector("[data-carousel-count]");
      const prevBtn = root.querySelector("[data-carousel-prev]");
      const nextBtn = root.querySelector("[data-carousel-next]");
      const toggleBtn = root.querySelector("[data-carousel-toggle]");
      const total = list.length;

      // スライドとドットを作る(大きい版が無い写真は、小さい版だけで表示)
      viewport.innerHTML = list
        .map((p, i) => {
          const set = p.sm !== p.src ? `srcset="${p.sm} 1000w, ${p.src} 2000w" sizes="${sizes}"` : "";
          return `
    <figure class="carousel__slide" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${total}" ${i ? 'aria-hidden="true"' : ""}>
      <img src="${p.sm}" ${set} data-sm="${p.sm}"
        alt="${altBase}(${i + 1} / ${total})"
        ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false">
    </figure>`;
        })
        .join("");
      const slides = [...viewport.querySelectorAll(".carousel__slide")];

      // 大きい版が読み込めなかったときは、小さい版に切り替える(画像が壊れて見えないように)
      slides.forEach((s) => {
        const im = s.querySelector("img");
        im.addEventListener("error", () => {
          if (im.hasAttribute("srcset")) {
            im.removeAttribute("srcset");
            im.src = im.dataset.sm;
          }
        });
      });

      dotsEl.innerHTML = list
        .map((_, i) => `<button type="button" class="carousel__dot" aria-label="${i + 1}枚目を表示" data-i="${i}"></button>`)
        .join("");
      const dots = [...dotsEl.querySelectorAll(".carousel__dot")];

      // 1枚だけなら操作UIは不要
      root.classList.toggle("is-single", total < 2);

      let current = 0;
      let timer = null;
      let userPaused = false;     // 再生/停止ボタンで止めた
      let hovering = false;       // マウスが乗っている/フォーカス中
      let inView = true;          // 画面内にある

      const show = (i) => {
        current = (i + total) % total;
        slides.forEach((s, k) => {
          const on = k === current;
          s.classList.toggle("is-active", on);
          s.setAttribute("aria-hidden", on ? "false" : "true");
        });
        dots.forEach((d, k) => {
          d.classList.toggle("is-active", k === current);
          d.setAttribute("aria-current", k === current ? "true" : "false");
        });
        if (countEl) countEl.textContent = `${String(current + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
        // 次の写真を先読み
        const nxt = slides[(current + 1) % total]?.querySelector("img");
        if (nxt) nxt.loading = "eager";
      };

      const canAutoplay = () => !reduce && total > 1 && !userPaused && !hovering && inView && !document.hidden;
      const schedule = () => {
        clearTimeout(timer);
        root.classList.toggle("is-playing", canAutoplay());
        viewport.setAttribute("aria-live", canAutoplay() ? "off" : "polite");
        if (canAutoplay()) timer = setTimeout(() => { show(current + 1); schedule(); }, INTERVAL);
      };
      const go = (i) => { show(i); schedule(); };

      prevBtn.addEventListener("click", () => go(current - 1));
      nextBtn.addEventListener("click", () => go(current + 1));
      dotsEl.addEventListener("click", (e) => {
        const b = e.target.closest("[data-i]");
        if (b) go(Number(b.dataset.i));
      });

      // 再生/停止(自動で動き続けるものには停止手段が必要:WCAG 2.2.2)
      if (reduce || total < 2) {
        toggleBtn.hidden = true;
      } else {
        toggleBtn.addEventListener("click", () => {
          userPaused = !userPaused;
          toggleBtn.setAttribute("aria-pressed", String(userPaused));
          toggleBtn.setAttribute("aria-label", userPaused ? "自動再生を始める" : "自動再生を止める");
          schedule();
        });
      }

      // マウス/フォーカスが乗っている間は止める
      root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; schedule(); } });
      root.addEventListener("pointerleave", () => { hovering = false; schedule(); });
      root.addEventListener("focusin", () => { hovering = true; schedule(); });
      root.addEventListener("focusout", () => { hovering = false; schedule(); });

      // 画面外・タブ非表示では止める
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; schedule(); }, { threshold: 0.25 }).observe(root);
      document.addEventListener("visibilitychange", schedule);

      // キーボード(←→)
      root.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
      });

      // スワイプ(縦スクロールは邪魔しない)
      let x0 = null, y0 = null;
      viewport.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      viewport.addEventListener("touchend", (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
        x0 = y0 = null;
      });

      show(0);
      schedule();
    }
  }
})();
