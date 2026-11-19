/* 童心会LP — doshinkai.js
   ① 申込フォームのURLを1か所で管理(CONFIG.FORM_URL)
   ② CTAクリックの計測の土台(data-cta=設置場所)。流入元(utm_*)を申込リンクに引き継ぐ
   ③ ヘッダー/スマホ固定CTAの出し入れ */
(() => {
  /* ===== ここだけ書き換えればOK =====
     Googleフォームの「送信用リンク」を貼る(例: https://forms.gle/xxxxxxxx)。
     空のあいだは、ボタンが Instagram のDM に飛ぶ(ボタンが空振りしないための保険)。 */
  const CONFIG = {
    FORM_URL: "",
    FALLBACK_URL: "https://www.instagram.com/rebel_d750/",
  };

  const params = new URLSearchParams(location.search);
  const target = CONFIG.FORM_URL || CONFIG.FALLBACK_URL;

  // 申込リンクを設定。流入元(utm_*)があれば引き継ぐ(フォーム側の集計・見直し用)
  let href = target;
  try {
    const u = new URL(target);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => params.get(k) && u.searchParams.set(k, params.get(k)));
    href = u.toString();
  } catch (_) {}

  // どのCTAからも1クリックで申込フォームへ(JSが動かない環境では #apply へスクロール)
  document.querySelectorAll("[data-apply]").forEach((a) => {
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
  });

  // 計測:Googleアナリティクス等を入れたら、dataLayer / gtag に自動でイベントが流れる
  const track = (name, detail) => {
    try {
      if (window.dataLayer) window.dataLayer.push({ event: name, ...detail });
      if (typeof window.gtag === "function") window.gtag("event", name, detail);
    } catch (_) {}
  };
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-cta]");
    if (!a) return;
    track("cta_click", { cta_position: a.dataset.cta, cta_url: a.getAttribute("href") });
  });

  // ヘッダー背景
  const header = document.querySelector("[data-lp-header]");
  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // スマホ固定CTA:ファーストビューを過ぎたら表示、最終CTAが見えたら隠す
  const sticky = document.querySelector("[data-sticky]");
  const hero = document.querySelector(".lp-hero");
  const final = document.querySelector("#apply");
  if (sticky && hero && final && "IntersectionObserver" in window) {
    let heroOut = false;
    let finalIn = false;
    const update = () => {
      const show = heroOut && !finalIn;
      sticky.classList.toggle("is-show", show);
      sticky.setAttribute("aria-hidden", String(!show));
      sticky.querySelector("a").tabIndex = show ? 0 : -1;
    };
    new IntersectionObserver(([en]) => { heroOut = !en.isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
    new IntersectionObserver(([en]) => { finalIn = en.isIntersecting; update(); }, { threshold: 0.1 }).observe(final);
  }
})();
