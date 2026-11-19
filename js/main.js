/* りゅーのあとりえ — main.js */
(() => {
  /* ---------- 写真データ ----------
     手書き(data/photos.js:タイトル・詩・撮影地)と、自動(data/photos-auto.js:縮小スクリプトが作る一覧)を
     file が同じものどうしで合体する。自動のほうにだけある写真は、詩なしで並ぶ。 */
  const handList = Array.isArray(window.PHOTOS) ? window.PHOTOS : [];
  const autoList = Array.isArray(window.PHOTOS_AUTO) ? window.PHOTOS_AUTO : [];
  const merged = new Map();
  autoList.forEach((a) => merged.set(a.file, { ...a }));
  handList.forEach((h) => merged.set(h.file, { ...(merged.get(h.file) || {}), ...h }));
  // 新しい順(日付なしは最後)
  let photos = [...merged.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  // 画像ファイルが実在する写真だけを使う(消した写真が壊れて表示されないように)
  const photosReady = (async () => {
    if (!window.RyuImages) return;
    const ok = await Promise.all(photos.map((p) => window.RyuImages.exists(p.file)));
    photos = photos.filter((_, i) => ok[i]);
  })();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = (s = "") =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 表示するのは撮影地だけ(撮影日は並び順にだけ使い、画面には出さない)
  const metaText = (p) => [p.place].filter(Boolean).join("  ／  ");
  const sizeAttr = (p) => (p.w && p.h ? ` width="${p.w}" height="${p.h}"` : "");

  /* ---------- 文字を1文字ずつ <span> に分ける(<br>などは保持) ---------- */
  const splitChars = (el) => {
    if (!el || el.classList.contains("split")) return;
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of n.textContent.replace(/\s*\n\s*/g, "")) {
            const s = document.createElement("span");
            s.className = "char";
            s.style.setProperty("--i", i++);
            s.setAttribute("aria-hidden", "true");
            s.textContent = ch;
            frag.appendChild(s);
          }
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    const plain = el.textContent.replace(/\s+/g, "");
    walk(el);
    const sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = plain;
    el.appendChild(sr);
    el.classList.add("split");
  };
  window.RyuFX = { splitChars };

  /* ---------- 下層ページの見出しアニメーション ---------- */
  const pageHead = document.querySelector(".page-head");
  if (pageHead) {
    const h1 = pageHead.querySelector("h1");
    if (!reduceMotion) splitChars(h1);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pageHead.classList.add("is-in");
      h1 && h1.classList.add("is-in");
    }));
  }

  /* ---------- Header ---------- */
  const header = document.querySelector(".site-header");
  if (header && !header.classList.contains("is-solid")) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
      nav.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
    document.addEventListener("keydown", (e) => e.key === "Escape" && nav.classList.contains("is-open") && setOpen(false));
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------- Hero slideshow (top) ---------- */
  const slidesEl = document.querySelector(".hero__slides");
  if (slidesEl && !slidesEl.hasAttribute("data-video")) photosReady.then(() => {
    let heroes = photos.filter((p) => p.hero);
    if (!heroes.length) heroes = photos.slice(0, 3);
    if (heroes.length) {
      slidesEl.innerHTML = heroes
        .map((p, i) =>
          `<img class="hero__slide${i === 0 ? " is-active" : ""}" src="${esc(p.file)}" alt=""${sizeAttr(p)} ${
            i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'
          } decoding="async">`
        )
        .join("");
      const slides = slidesEl.querySelectorAll(".hero__slide");
      if (slides.length > 1 && !reduceMotion) {
        let i = 0;
        setInterval(() => {
          slides[i].classList.remove("is-active");
          i = (i + 1) % slides.length;
          slides[i].classList.add("is-active");
        }, 7000);
      }
    }
  });

  /* ---------- トップの入口カードの写真をランダムに1枚 ----------
     data-random-set="bike | activities | photos"。「いまある」写真だけから選ぶ(削除された写真は選ばれない)。
     写真が1枚も無い/読み込めないときは、カードに最初から書いてある仮の画像(src)のまま。 */
  document.querySelectorAll("[data-random-set]").forEach((img) => {
    const fallbackSrc = img.getAttribute("src");
    const sizes = "(max-width: 860px) 100vw, 34vw";
    const apply = (sm, src) => {
      img.addEventListener("error", () => {
        if (img.hasAttribute("srcset")) {            // 大きい版が読めない → 小さい版へ
          img.removeAttribute("srcset");
          img.src = sm;
        } else if (fallbackSrc && img.getAttribute("src") !== fallbackSrc) {
          img.src = fallbackSrc;                     // それでもダメなら仮の画像へ
        }
      });
      if (sm !== src) {
        img.sizes = sizes;
        img.srcset = `${sm} 1000w, ${src} 2000w`;
      }
      img.src = sm;
    };
    const set = img.dataset.randomSet;
    if (set === "photos") {
      photosReady.then(() => {
        if (!photos.length) return;
        const p = photos[Math.floor(Math.random() * photos.length)];
        apply(p.file, p.file);
      });
    } else if (window.RyuImages) {
      window.RyuImages.load(set).then((found) => {
        if (!found.length) return;
        const b = found[Math.floor(Math.random() * found.length)];
        apply(b.sm, b.src);
      });
    }
  });

  /* ---------- 画面に入るたびにせり上がる(後から作る要素も登録できるようにしておく) ---------- */
  let revealObserver = null;
  const observeReveal = (els) => els.forEach((el) => (revealObserver ? revealObserver.observe(el) : el.classList.add("is-visible")));
  // ハッシュ(#photo-n)で来た場合、その写真へ
  const scrollToHash = () => {
    if (!location.hash.startsWith("#photo-")) return;
    const t = document.querySelector(location.hash);
    if (t) {
      t.classList.add("is-visible");
      requestAnimationFrame(() => t.scrollIntoView({ block: "center" }));
    }
  };

  /* ---------- Latest photos strip (top) / Gallery (photos page) ---------- */
  const latestEl = document.querySelector("[data-latest]");
  const gallery = document.querySelector("[data-gallery]");
  if (latestEl || gallery) photosReady.then(() => {
    if (latestEl) {
      latestEl.innerHTML = photos
        .slice(0, 3)
        .map(
          (p, i) =>
            `<a href="photos.html#photo-${i}" aria-label="${esc(p.title || "写真")}を見る"><img src="${esc(p.file)}" alt="${esc(
              p.title || ""
            )}"${sizeAttr(p)} loading="lazy" decoding="async"></a>`
        )
        .join("");
      latestEl.querySelectorAll("img").forEach((im) => im.addEventListener("error", () => im.closest("a")?.remove()));
    }

    if (gallery) {
      if (!photos.length) {
        gallery.outerHTML = '<p class="gallery-empty">写真は準備中です。</p>';
      } else {
        gallery.innerHTML = photos
          .map((p, i) => {
            const alt = [p.title, (p.caption || "").replace(/\n/g, "")].filter(Boolean).join("。") || "りゅーの写真";
            return `
        <figure class="photo reveal" id="photo-${i}">
          <button type="button" data-index="${i}" aria-label="${esc(p.title || "写真")}を拡大表示">
            <img src="${esc(p.file)}" alt="${esc(alt)}"${sizeAttr(p)} ${i < 3 ? "" : 'loading="lazy"'} decoding="async">
          </button>
          <figcaption>
            ${p.title ? `<div class="photo__title">${esc(p.title)}</div>` : ""}
            ${metaText(p) ? `<div class="photo__meta">${esc(metaText(p))}</div>` : ""}
            ${p.caption ? `<div class="photo__poem">${esc(p.caption)}</div>` : ""}
          </figcaption>
        </figure>`;
          })
          .join("");
        // 読み込めない写真は枠ごと隠す
        gallery.querySelectorAll("img").forEach((im) => im.addEventListener("error", () => { im.closest(".photo").hidden = true; }));
        [...gallery.querySelectorAll(".reveal")].forEach((c, i) => c.style.setProperty("--rd", `${(i % 3) * 150}ms`));
        setupLightbox();
        observeReveal([...gallery.querySelectorAll(".reveal")]);
        scrollToHash();
      }
    }
  });

  function setupLightbox() {
    const dlg = document.querySelector(".lightbox");
    if (!dlg || typeof dlg.showModal !== "function") return;
    const img = dlg.querySelector(".lightbox__stage img");
    const poem = dlg.querySelector(".lightbox__poem");
    const meta = dlg.querySelector(".lightbox__meta");
    const count = dlg.querySelector(".lightbox__count");
    let current = 0;
    let opener = null;

    const show = (i) => {
      current = (i + photos.length) % photos.length;
      const p = photos[current];
      img.src = p.file;
      img.alt = p.title || "";
      poem.textContent = p.caption || "";
      meta.textContent = [p.title, metaText(p)].filter(Boolean).join("  ／  ");
      count.textContent = `${String(current + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
      // 隣の画像を先読み
      [current + 1, current - 1].forEach((j) => {
        const n = photos[(j + photos.length) % photos.length];
        if (n) new Image().src = n.file;
      });
    };

    gallery.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-index]");
      if (!btn) return;
      opener = btn;
      show(Number(btn.dataset.index));
      dlg.showModal();
      document.body.style.overflow = "hidden";
    });

    dlg.querySelector(".lightbox__prev").addEventListener("click", () => show(current - 1));
    dlg.querySelector(".lightbox__next").addEventListener("click", () => show(current + 1));
    dlg.querySelector(".lightbox__close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg || e.target.classList.contains("lightbox__stage")) dlg.close();
    });
    dlg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") show(current + 1);
      if (e.key === "ArrowLeft") show(current - 1);
    });
    dlg.addEventListener("close", () => {
      document.body.style.overflow = "";
      opener && opener.focus();
    });

    // スワイプ
    let x0 = null;
    dlg.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    dlg.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Reveal on scroll ---------- */
  // ブロック内の要素を1つずつ順番にせり上げる(見出し・あいさつ文・最近の一枚)
  document.querySelectorAll(".section-head.reveal, .statement .reveal, .latest.reveal").forEach((el) => {
    el.setAttribute("data-stagger", "");
    [...el.children].forEach((c, i) => c.style.setProperty("--si", i));
  });
  // 横に並ぶカードは左から順に(3つごとに遅延をリセット)
  document.querySelectorAll(".entrances, .gallery, .sns").forEach((grid) => {
    [...grid.querySelectorAll(":scope > .reveal")].forEach((c, i) => c.style.setProperty("--rd", `${(i % 3) * 150}ms`));
  });
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    // 画面に入るたびにせり上がる(画面から完全に出たらリセット)
    revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) en.target.classList.add("is-visible");
          else if (en.boundingClientRect.top > 0 || en.boundingClientRect.bottom < 0) en.target.classList.remove("is-visible");
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // 写真ページ以外で #photo-n が付いて来た場合など
  if (!gallery) scrollToHash();
})();
