// Author-controlled ruby notation: 漢字《よみ》. No family data is sent to an AI service.
export const items = [
  {
    id: "pudding",
    icon: "🍮",
    name: "プリン",
    action: "プリンをおすそわけしました。みんな、にっこり！",
  },
  {
    id: "umbrella",
    icon: "☂️",
    name: "かさ",
    action: "かさをひろげると、ふわりとからだがうきました。",
  },
  {
    id: "rope",
    icon: "🪢",
    name: "ロープ",
    action: "ロープをむすんで、みんなのとおりみちをつくりました。",
  },
  {
    id: "flute",
    icon: "🪈",
    name: "ふえ",
    action: "ふえをふくと、どうぶつたちがおどりはじめました。",
  },
  {
    id: "pillow",
    icon: "🛌",
    name: "まくら",
    action: "まくらでひとやすみ。ねごとがあいことばになりました。",
  },
  {
    id: "banana",
    icon: "🍌",
    name: "バナナ",
    action: "バナナをわけっこ。かわはちいさなボートになりました。",
  },
];
export const places = [
  {
    id: "river",
    name: "カエル船長《せんちょう》の川《かわ》",
    icon: "🐸",
    scene: "river",
    intro:
      "おおきなはっぱのふねで、川《かわ》をわたりました。カエル船長《せんちょう》は、おやつのじかんをまもるのがとくい。",
    treasure: "カエル船長《せんちょう》のはた",
    treasureIcon: "🚩",
    ending: "おれいに、ふねのはたをもらいました。「またあそびにきてケロ！」",
  },
  {
    id: "cloud",
    name: "くものパン屋《や》さん",
    icon: "☁️",
    scene: "cloud",
    intro:
      "ふわふわのくもに、パン屋《や》さんをみつけました。パンがみんな、そらへにげてしまってたいへん！",
    treasure: "ふわふわのパン",
    treasureIcon: "🥐",
    ending: "パンをあつめたおれいに、ずっとふわふわのパンをもらいました。",
  },
  {
    id: "forest",
    name: "ねぼすけの森《もり》",
    icon: "🦉",
    scene: "forest",
    intro:
      "森《もり》じゅうから、いびきがきこえます。フクロウさんまでねむっていて、だれもみちをしりません。",
    treasure: "ねむるどんぐり",
    treasureIcon: "🌰",
    ending: "どんぐりが、こっそりかえりみちをおしえてくれました。",
  },
  {
    id: "moon",
    name: "月《つき》のピクニック",
    icon: "🌙",
    scene: "moon",
    intro:
      "月《つき》にすむウサギが、おべんとうをひっくりかえしました。おにぎりが、ほしのあいだをぷかぷか。",
    treasure: "ちいさな月《つき》のいし",
    treasureIcon: "🌕",
    ending:
      "おべんとうをたすけたおれいは、ほんのりひかる月《つき》のいしでした。",
  },
  {
    id: "sea",
    name: "タコの音楽会《おんがくかい》",
    icon: "🐙",
    scene: "river",
    intro:
      "うみのそこでは、タコさんがひとりで８つのがっきをれんしゅうしていました。てがこんがらがっています。",
    treasure: "うたうかいがら",
    treasureIcon: "🐚",
    ending: "みんなでえんそうしたら、かいがらまでうたいだしました。",
  },
  {
    id: "snow",
    name: "雪《ゆき》だるまの温泉《おんせん》",
    icon: "⛄",
    scene: "cloud",
    intro:
      "雪《ゆき》だるまが、あったかいおふろにあこがれています。とけずにはいるほうほうを、みんなでかんがえました。",
    treasure: "とけない雪《ゆき》のはな",
    treasureIcon: "❄️",
    ending:
      "けっきょく、つめたいおふろでぽかぽかごっこ。雪《ゆき》のはなをもらいました。",
  },
  {
    id: "garden",
    name: "おばけの花畑《はなばたけ》",
    icon: "👻",
    scene: "forest",
    intro:
      "おばけが、おはなに「ばあ！」とこえをかけています。びっくりするとさくおはななのです。",
    treasure: "わらうおはな",
    treasureIcon: "🌼",
    ending: "みんなでわらったら、いちばんおおきなおはながさきました。",
  },
];
export function dayInfo(now = Date.now()) {
  const d = new Date(now + 9 * 3600000);
  return { day: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
}
export function placeFor(day) {
  return places[
    Math.floor(Date.parse(day + "T00:00:00Z") / 86400000) % places.length
  ];
}
export function makeAdventure(day, members, choices) {
  const place = placeFor(day);
  return {
    day,
    place: place.id,
    intro: place.intro,
    ending: place.ending,
    treasure: place.id,
    participants: members.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      item: choices.find((c) => c.member_id === m.id)?.item || null,
    })),
  };
}
