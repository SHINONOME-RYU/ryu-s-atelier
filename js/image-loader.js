/* りゅーのあとりえ — image-loader.js
   写真セット(愛車・事業活動)について、「いま実際にあるファイル」だけを調べて返す。
   data/*.js の一覧を信用せず、1枚ごとに存在を確認するので、
   images/bike/ や images/activities/ の写真を削除・追加しても、その枚数のカルーセルになる。

   - 一覧にある写真は、小さい版(-sm)→大きい版 の順に存在を確認(どちらか一方だけ残っていてもOK)
   - 一覧の外にも、<prefix>-NN.jpg / <prefix>-NN-sm.jpg という名前で置いた写真を少し先まで探す
   - 欠番があってもOK(bike-02 を消しても 01・03・04 が表示される)
   使い方: RyuImages.load("bike") / RyuImages.load("activities") → Promise<[{ sm, src }]> */
(() => {
  const SETS = {
    bike: { dir: "images/bike/", prefix: "bike", list: () => window.BIKES },
    activities: { dir: "images/activities/", prefix: "act", list: () => window.ACTIVITIES },
  };
  const EXTRA = 8;        // 一覧のあと、何番先まで探すか(手で足した写真用)
  const EXTRA_EMPTY = 4;  // 一覧が空(未使用のセット)のとき。無駄なリクエストを増やさない
  const NO_LIST = 16;     // 一覧ファイルそのものが無いとき
  const pad = (n) => String(n).padStart(2, "0");

  const imageProbe = (url) =>
    new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(true);
      im.onerror = () => resolve(false);
      im.src = url;
    });

  // http(s) では HEAD で軽く確認(画像本体は読まない)。file:// など不可の場合は画像で確認
  const http = /^https?:$/.test(location.protocol);
  const exists = (url) => {
    if (!http) return imageProbe(url);
    return fetch(url, { method: "HEAD", cache: "no-cache" })
      .then((r) => (r.status === 405 || r.status === 501 ? imageProbe(url) : r.ok))
      .catch(() => imageProbe(url));
  };

  const resolveOne = async (c) => {
    if (await exists(c.sm)) return { sm: c.sm, src: c.src };       // 小さい版がある(大きい版は無くても可)
    if (await exists(c.src)) return { sm: c.src, src: c.src };     // 大きい版だけ残っている
    return null;                                                   // どちらも無い=削除された
  };

  const cache = {};
  const load = (name) => {
    if (cache[name]) return cache[name];
    const set = SETS[name];
    if (!set) return (cache[name] = Promise.resolve([]));
    const raw = set.list();
    const listed = Array.isArray(raw) ? raw : [];
    const candidates = listed.map((b) => ({ sm: b.sm, src: b.src }));
    const known = new Set(candidates.map((c) => c.src));
    const to = Array.isArray(raw) ? (listed.length ? listed.length + EXTRA : EXTRA_EMPTY) : NO_LIST;
    for (let n = listed.length + 1; n <= to; n++) {
      const base = `${set.dir}${set.prefix}-${pad(n)}`;
      if (!known.has(`${base}.jpg`)) candidates.push({ sm: `${base}-sm.jpg`, src: `${base}.jpg` });
    }
    return (cache[name] = Promise.all(candidates.map(resolveOne)).then((r) => r.filter(Boolean)));
  };

  // exists(url): そのファイルが実在するか(写真ページの一覧から、消した写真を除くのにも使う)
  window.RyuImages = { load, exists };
})();
