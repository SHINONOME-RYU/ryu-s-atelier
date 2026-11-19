/*
  写真データ
  ───────────────────────────────────────────
  ■ 写真を追加する手順
    1. 元の写真を images/about/写真/ に入れて、update-images.bat をダブルクリック
       (縮小・位置情報の削除・撮影日の記録が自動で行われ、写真がギャラリーに並びます)
    2. 題や詩をつけたい写真は、下のリストに { ... }, を1つ追加する(file は images/photos/ にできたファイル名)
       ※ 並びは撮影日の新しい順(自動)。ここに書く順番は関係ありません。

  ■ 項目
    file    : 画像のパス(必須)
    caption : 一言の詩(任意)
    title   : 作品名(任意)
    place   : 撮影地(任意。書くと写真の下に表示されます)
    date    : 撮影日 YYYY-MM-DD(任意。自動で入るが、カメラの日時設定が違っていた場合はここで上書きできます)
    hero    : true にするとトップページの背景候補になります(任意)

  ※ 題と詩は仮の案です。自由に書き換えてください。撮影地は未記入です。
*/
window.PHOTOS = [
  {
    file: "images/photos/DSC_1487-2-Edit.jpg",
    title: "夜空の花束"
  },
  {
    file: "images/photos/DSC_13022-1.jpg",
    title: "最初で最後"
  },
  {
    file: "images/photos/DSC_1151.jpg",
    title: "梅越しの月"
  },
  {
    file: "images/photos/DSC_2574.jpg",
    title: "軌跡"
  },
  {
    file: "images/photos/DSC_0671.jpg",
    title: "合わない街"
  },
  {
    file: "images/photos/DSC_0470-2.jpg",
    title: "海から見る天ノ川"
  },
  {
    file: "images/photos/DSC_0859-1.jpg",
    title: "幼馴染"
  },
  {
    file: "images/photos/DSC_9962.jpg",
    title: "諦め"
  },
  {
    file: "images/photos/DSC_0390.jpg",
    title: "白華"
  },
  {
    file: "images/photos/DSC_0397.jpg",
    title: "青の記憶"
  },
  {
    file: "images/photos/DSC_9944.jpg",
    title: "眠らない場所"
  },
  {
    file: "images/photos/DSC_0836.jpg",
    title: "紅"
  }
];
