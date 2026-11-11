# 冒険の結果動画

## 共通仕様

- １冒険につき１本。７本。持ち物・参加メンバーによる分岐はしない。
- ５秒、縦9:16、配信用720×1280、24fps、無音、H.264 MP4。
- 既存の冒険共通の結末 `public/art/adventures/v1/<id>/after.webp` と宝物画像を参照し、場面と宝物の見た目を維持する。特定作家の画風を模倣しない。
- 手描き絵本の表情と質感。実際に人物・生き物・宝物が動く。静止画のズームだけの動画で代用しない。
- タップ再生、インライン再生、再生コントロール付き。自動再生・自動ループなし。データ消費を抑えるため `preload=none`。
- 絵日記の結末の文章の直後に配置。既存の持ち物別挿絵は維持。
- 本物の動画がまだない冒険では動画欄を表示しない。空のプレーヤーやリンク切れは作らない。

## ７本の演出

| ID | 0〜2秒 | 2〜4秒 | 4〜5秒 |
|---|---|---|---|
| river | はっぱの船が岸に着き、カエル船長が振り返る | 船長がカエル模様の赤い旗を差し出し、子供が受け取る | 旗がはためき、みんなで笑顔 |
| cloud | 集めたパンの籠を囲む子供とクマのパン屋 | クマがふわふわのパンを差し出す | パンが雲に乗って少し浮かび、みんな喜ぶ |
| forest | 眠そうなどんぐりがあくびをする | どんぐりが光の差す帰り道を指さす | 子供がお礼をして手を振る。木漏れ日が揺れる |
| moon | ウサギが戻ってきたおにぎりを籠にしまう | 光る月の石を子供に渡す | 石が柔らかく輝き、ウサギの耳がぴょこんと動く |
| sea | タコと子供が音楽会の最後の一音を奏でる | ピンクの貝殻が口を開けて楽しそうに歌い、泡が上がる | タコがお辞儀し、子供が拍手 |
| snow | 冷たい湯船の雪だるまがうれしそうに肩を揺らす | とけない雪の花を持ち上げて子供に渡す | 雪の花がきらめき、みんなで笑う |
| garden | おばけと子供が笑い出す | 黄色い花の顔が大きく口を開けて笑い、葉っぱを振る | 花が楽しそうに揺れ、笑顔で終わる |

## 生成用の共通指示

Create a five-second vertical 9:16 animated children's picture-book scene using the reference artwork. Preserve the original illustration medium, palette, character designs and exact treasure appearance. Show continuous natural character motion described in the shot brief. One continuous shot, no cuts, no captions, no logos, no dialogue, no audio, no equipment-specific props added. Gentle stable camera, legible expressions, no camera-only animation. Keep all important characters and the treasure inside the central portrait safe area. Do not imitate any named artist. Finish on a happy readable result frame.

横長の参考絵をそのまま切って人物が欠ける場合は、生成サービスの縦長構図対応に合わせて参照の扱いを調整する。利用できるモデル、５秒対応、クレジットは接続後に確認する。

## 取り込み

Runwayなどで生成した動画をローカルに取得してから:

```sh
node scripts/import-adventure-video.mjs garden /absolute/path/to/generated-video.mp4
npm run build
```

元動画の縦横比と長さを検証し、５秒・720×1280・無音MP4に正規化する。内容ハッシュ付きファイル名で古い動画キャッシュを避ける。manifestを更新すると対応する冒険だけ動画欄が有効になる。全７本を目視検品し、読み込み・再生・終了・再生し直し・通信失敗時を検証してから公開する。

現時点: 動画生成サービスの接続待ち。動画は未生成・未公開。
