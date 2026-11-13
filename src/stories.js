import { adventureEquipment } from "./equipment.js";
import calendar from "./story-calendar.json" with { type: "json" };
// Author-controlled ruby notation: 漢字《よみ》. No family data is sent to an AI service.
export const items = [
  {
    id: "pudding",
    name: "プリン",
    action: "プリンをおすそわけしました。みんな、にっこり！",
  },
  {
    id: "umbrella",
    name: "かさ",
    action: "かさをひろげると、ふわりとからだがうきました。",
  },
  {
    id: "rope",
    name: "ロープ",
    action: "ロープをむすんで、みんなのとおりみちをつくりました。",
  },
  {
    id: "flute",
    name: "ふえ",
    action: "ふえをふくと、どうぶつたちがおどりはじめました。",
  },
  {
    id: "pillow",
    name: "まくら",
    action: "まくらでひとやすみ。ねごとがあいことばになりました。",
  },
  {
    id: "banana",
    name: "バナナ",
    action: "バナナをわけっこ。かわはちいさなボートになりました。",
  },
];
export const allItems = [...items, ...Object.values(adventureEquipment).flat()];
export const places = [
  {
    id: "river",
    preview:
      "川《かわ》のむこうへ、はっぱのふねでいってみよう。カエル船長《せんちょう》がまっているよ。",
    name: "カエル船長《せんちょう》の川《かわ》",
    intro:
      "おおきなはっぱのふねで、川《かわ》をわたりました。カエル船長《せんちょう》は、おやつのじかんをまもるのがとくい。",
    treasure: "カエル船長《せんちょう》のはた",
    ending: "おれいに、ふねのはたをもらいました。「またあそびにきてケロ！」",
  },
  {
    id: "cloud",
    preview:
      "くものパン屋《や》さんで、パンがそらへにげちゃった！ みんなでたすけにいこう。",
    name: "くものパン屋《や》さん",
    intro:
      "ふわふわのくもに、パン屋《や》さんをみつけました。パンがみんな、そらへにげてしまってたいへん！",
    treasure: "ふわふわのパン",
    ending: "パンをあつめたおれいに、ずっとふわふわのパンをもらいました。",
  },
  {
    id: "forest",
    preview: "森《もり》じゅうがぐっすり。だれか、かえりみちをしっているかな？",
    name: "ねぼすけの森《もり》",
    intro:
      "森《もり》じゅうから、いびきがきこえます。フクロウさんまでねむっていて、だれもみちをしりません。",
    treasure: "ねむるどんぐり",
    ending: "どんぐりが、こっそりかえりみちをおしえてくれました。",
  },
  {
    id: "moon",
    preview:
      "月《つき》のウサギのおにぎりが、そらへぷかぷか！ いっしょにあつめよう。",
    name: "月《つき》のピクニック",
    intro:
      "月《つき》にすむウサギが、おべんとうをひっくりかえしました。おにぎりが、ほしのあいだをぷかぷか。",
    treasure: "ちいさな月《つき》のいし",
    ending:
      "おべんとうをたすけたおれいは、ほんのりひかる月《つき》のいしでした。",
  },
  {
    id: "sea",
    preview:
      "タコさんの８ぽんのてが、こんがらがっちゃった。音楽会《おんがくかい》をてつだおう。",
    name: "タコの音楽会《おんがくかい》",
    intro:
      "うみのそこでは、タコさんがひとりで８つのがっきをれんしゅうしていました。てがこんがらがっています。",
    treasure: "うたうかいがら",
    ending: "みんなでえんそうしたら、かいがらまでうたいだしました。",
  },
  {
    id: "snow",
    preview:
      "雪《ゆき》だるまがおふろにはいりたいんだって。とけずにはいるほうほうをかんがえよう。",
    name: "雪《ゆき》だるまの温泉《おんせん》",
    intro:
      "雪《ゆき》だるまが、あったかいおふろにあこがれています。とけずにはいるほうほうを、みんなでかんがえました。",
    treasure: "とけない雪《ゆき》のはな",
    ending:
      "けっきょく、つめたいおふろでぽかぽかごっこ。雪《ゆき》のはなをもらいました。",
  },
  {
    id: "garden",
    preview:
      "おばけがおはなに「ばあ！」。びっくりするとさくおはなを、みにいこう。",
    name: "おばけの花畑《はなばたけ》",
    intro:
      "おばけが、おはなに「ばあ！」とこえをかけています。びっくりするとさくおはななのです。",
    treasure: "わらうおはな",
    ending: "みんなでわらったら、いちばんおおきなおはながさきました。",
  },
  {
    id: "post",
    name: "ハリネズミのくつした郵便《ゆうびん》",
    preview:
      "くつしたのおうちに、てがみをとどけよう。かぜにとばされて、ハリネズミさんがあたふた！",
    intro:
      "くつした村《むら》のてがみが、かぜにのってひらひら。ハリネズミの郵便屋《ゆうびんや》さんは、くつしたのつまさきにまでてがみをさがしています。",
    treasure: "てがみをくわえたポスト",
    ending:
      "さいごのてがみがとどくと、くつしたのおうちがぱたぱたおじぎ。おれいのちいさなポストは、てがみをくわえてにっこり。こんどはだれに、てがみをかこうかな？",
    itemActions: {
      pudding:
        "プリンをおすそわけ。げんきになったハリネズミさんと、てがみをわけました。",
      umbrella: "かさをひらいて、ひらひらとぶてがみをぽすんとうけとめました。",
      rope: "ロープをくつしたのおうちにつなぎ、てがみをするするとすべらせました。",
      flute:
        "ふえをふくと、ことりがてがみをくわえて、おうちまでとどけてくれました。",
      pillow:
        "まくらでてがみをうけとめ、ひとやすみ。ハリネズミさんと、ふわふわのうえでてがみをわけました。",
      banana:
        "バナナのかわをふねにして、みずたまりのむこうへてがみをはこびました。",
    },
  },
  {
    id: "stage",
    name: "カメのかげっこ劇場《げきじょう》",
    preview:
      "カメさんがおじぎをしたら、かげだけダンス！ かげえのぶたいを、いっしょにつくろう。",
    intro:
      "秋《あき》のゆうがた、ちいさな劇場《げきじょう》へ。カメさんはぺこり。でも、かげはさかさまにおどっています。「おじぎって、どっちだっけ？」",
    treasure: "おじぎするかげのぶたい",
    ending:
      "みんなでぺこりとおじぎをすると、かげもやっとぺこり。はくしゅにびっくりして、もういちどぺこり！ カメさんは、かげがおじぎするちいさなぶたいをくれました。おうちでは、だれのかげがいちばんおもしろいかな？",
  },
];
export function dayInfo(now = Date.now()) {
  const d = new Date(now + 9 * 3600000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}
// Append future calendar versions; never change an already effective version.
// This preserves both prepared-but-unsettled days and historical results.
export function placeFor(day, versions = calendar) {
  const version = versions.findLast((v) => v.from <= day);
  if (!version) throw new Error("No adventure calendar for date");
  const offset = Math.floor(
    (Date.parse(day + "T00:00:00Z") - Date.parse(version.from + "T00:00:00Z")) /
      86400000,
  );
  const id = version.places[offset % version.places.length];
  const place = places.find((p) => p.id === id);
  if (!place) throw new Error("Unknown scheduled adventure");
  return place;
}
export function makeAdventure(day, members, choices) {
  const place = placeFor(day);
  return {
    day,
    place: place.id,
    intro: place.intro,
    ending: place.ending,
    treasure: place.id,
    participants: members.map((m) => {
      const item = choices.find((c) => c.member_id === m.id)?.item || null;
      const action =
        adventureEquipment[place.id]?.find((i) => i.id === item)?.action ||
        place.itemActions?.[item];
      return {
        id: m.id,
        name: m.name,
        avatar: m.avatar,
        item,
        ...(action ? { action } : place.itemActions ? { action: null } : {}),
      };
    }),
  };
}
