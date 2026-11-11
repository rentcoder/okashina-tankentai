import { sceneImage, treasureImage, hostImage, equipmentImage } from "./art.js";
import { setupPwa, installApp, isInstalled } from "./pwa.js";
import QRCode from "qrcode";
import jsQR from "jsqr";
let catalog,
  state,
  tab = "home",
  journalMember,
  journalMonth,
  stream,
  scanTimer,
  poll,
  busy = false;
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const ruby = (s) =>
  esc(s).replace(/([一-龯々]+)《([^》]+)》/g, "<ruby>$1<rt>$2</rt></ruby>");
const r = ruby,
  p = (id) => catalog.places.find((x) => x.id === id),
  me = () => state.members.find((m) => m.id === state.active);
const title = r("おかしな探検隊《たんけんたい》");
async function api(path, data) {
  const response = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.error || "つながりませんでした。"), {
      status: response.status,
    });
  return result;
}
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 4000);
}
function close() {
  stopCamera();
  $("#modal").close();
  $("#modal").innerHTML = "";
}
function modal(html) {
  stopCamera();
  $("#modal").innerHTML =
    `<button class="close" data-action="close" aria-label="とじる">×</button>${html}`;
  if (!$("#modal").open) $("#modal").showModal();
}
function avatars() {
  return `<label>キャラクター<select name="avatar">${catalog.avatars.map((a) => `<option>${a}</option>`).join("")}</select></label>`;
}
function plain(s) {
  return s.replace(/《[^》]+》/g, "");
}
function treasureArt(id) {
  return `<img class="treasure-image" src="${treasureImage(id)}" alt="${esc(plain(p(id).treasure))}" width="384" height="256" loading="lazy" decoding="async">`;
}
function equipmentArt(id) {
  return `<img class="equipment-image" src="${equipmentImage(id)}" alt="" width="256" height="256" decoding="async">`;
}
function scene(id, phase = "before", item = null) {
  const place = p(id),
    chosen = catalog.items.find((i) => i.id === item);
  const caption =
    phase === "before"
      ? "これからはじまるぼうけん"
      : chosen
        ? `${plain(chosen.name)}がかつやくしたばめん`
        : "みんなでたからものをみつけたばめん";
  return `<figure class="story-scene ${phase === "after" && chosen ? "personal-scene" : ""}"><img src="${sceneImage(id, phase, item)}" alt="${esc(plain(place.name) + "：" + caption)}" width="${phase === "after" && chosen ? 512 : 768}" height="512" decoding="async"><figcaption>${esc(caption)}</figcaption></figure>`;
}
function navIcon(id) {
  const paths = {
    home: "M3 11 12 3l9 8v10H3z M9 21v-8h6v8",
    adventure: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M16 8l-3 5-5 3 3-5z",
    journal:
      "M12 6C8 3 4 3 2 4v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7 0-10 2v15",
    collection: "M3 8l4-5h10l4 5-9 13z M3 8h18 M7 3l5 18 5-18",
  };
  return `<svg class="nav-art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]}"></path></svg>`;
}
function shell(content) {
  return `<div class="shell"><header><a class="brand" href="/">🧭 <span>${title}<small>ちいさな ぼうけん、おおきな おもいで。</small></span></a>${state ? `<button class="profile" data-action="profiles">${me()?.avatar || "🏡"} <span>${esc(me()?.name)}</span>⌄</button>` : ""}</header>${content}<footer>いっしょにいなくても、いっしょのぼうけん。${!isInstalled() ? '<button class="text" data-action="install">📲 ホームがめんにおく</button>' : ""}<button class="text" data-action="about">このゲームについて</button></footer>${
    state
      ? `<nav aria-label="メニュー">${[
          ["home", "🏡", "おうち"],
          ["adventure", "🧭", "ぼうけん"],
          ["journal", "📖", "えにっき"],
          ["collection", "💎", "ずかん"],
        ]
          .map(
            ([id, icon, label]) =>
              `<button data-action="tab" data-id="${id}" class="${tab === id ? "active" : ""}" ${tab === id ? 'aria-current="page"' : ""}><span>${navIcon(id)}</span>${label}</button>`,
          )
          .join("")}</nav>`
      : ""
  }</div>`;
}
function landing() {
  state = null;
  $("#app").innerHTML = shell(
    `<main class="welcome"><span class="eyebrow">１にち５ふんの、かぞくのじかん</span><h1>きょうは、どんな<br>ぼうけんだった？</h1><p>みんなのもちものが、おはなしになる。<br>たからものと、おもいでをもちかえろう。</p><picture class="storybook-hero"><source type="image/webp" srcset="/art/family-adventure-768.webp 768w, /art/family-adventure-1536.webp 1536w" sizes="(max-width: 600px) calc(100vw - 40px), 700px"><img src="/art/family-adventure-1536.webp" alt="かわのほとりで、カエルとたからものをみつけた４にんのかぞく" width="1536" height="1024" fetchpriority="high" decoding="async"></picture><div class="welcome-actions"><button class="primary" data-action="create">🏡 おうちをつくる</button><button class="secondary" data-action="join">📷 しょうたいをよみこむ</button></div><button class="text" data-action="sample">📖 えにっきのサンプルをよむ</button><p class="fine">むりょう・こうこくなし・おとなといっしょにはじめてね</p></main>`,
  );
}
async function refresh() {
  state = await api("state");
  render();
}
function render() {
  if (!state) return landing();
  const views = {
    home: home,
    adventure: adventure,
    journal: journal,
    collection: collection,
  };
  $("#app").innerHTML = shell(`<main>${views[tab]()}</main>`);
}
function home() {
  const today = state.adventures.find((a) => a.day === state.day);
  return `<section class="intro"><div><span class="eyebrow">OUR LITTLE HOME</span><h1>おかえり、${esc(me().name)}。</h1><p>きょうも、みんなとちょっとだけ。</p></div><button class="icon-button" data-action="settings" aria-label="おとなのせってい">⚙</button></section><section class="house-card"><div class="house-heading"><span>🏡 ${esc(state.family.name)}</span><span class="pill">${state.members.length}にんの なかま</span></div><div class="room"><div class="window"><span>☁️</span>☀️</div><div class="wall-note">HOME<br><span>sweet home</span></div><div class="shelves">${Array.from(
    { length: 8 },
    (_, slot) => {
      const d = state.decorations.find((d) => d.slot === slot),
        owner = d && state.members.find((m) => m.id === d.member_id);
      return `<button class="shelf-slot ${d ? "filled" : ""}" data-action="slot" data-slot="${slot}" aria-label="${d ? "かざってあるたからもの" : "たからものをかざる"}">${d ? `${treasureArt(d.treasure)}<small>${esc(owner?.name)}</small>` : "<span>＋</span>"}</button>`;
    },
  ).join(
    "",
  )}</div><div class="family-line">${state.members.map((m) => `<div><span>${m.avatar}</span><small>${esc(m.name)}</small></div>`).join("")}</div><div class="rug"></div></div><p class="card-caption">おきにいりを８こまで。おもいでは、ずっと。</p></section><button type="button" class="daily-card" data-action="${today ? "read-today" : "prepare"}" aria-label="${today ? "きょうのえにっきをよむ" : "ぼうけんのじゅんびをする"}"><img class="daily-icon host-art" src="${hostImage(state.place)}" alt="" width="64" height="64"><span class="daily-copy"><span class="eyebrow">${today ? "きょうのおたより" : "きょうのぼうけん"}</span><span class="daily-title">${r(p(state.place).name)}</span><span class="daily-description">${today ? "えにっきと、たからものがとどいたよ。" : `${state.family.revealHour}じに、みんなのおはなしがとどくよ。`}</span></span><span class="round" aria-hidden="true">↗</span></button><div class="status-row">${state.members.map((m) => `<span>${m.avatar} ${esc(m.name)}<small>${state.choices.some((c) => c.member_id === m.id) ? "🎒 じゅんびできた" : "🌱 のんびりしてる"}</small></span>`).join("")}</div>`;
}
function adventure() {
  const place = p(state.place),
    done = state.adventures.some((a) => a.day === state.day),
    selected = state.choices.find((c) => c.member_id === state.active)?.item;
  return `<section class="intro"><div><span class="eyebrow">A LITTLE ADVENTURE</span><h1>${r("今日《きょう》のぼうけん")}</h1><p>じゅんびは１ぷん。あとは、のんびり。</p></div><span class="date-chip">${state.day.slice(5).replace("-", " / ")}</span></section><article class="adventure-card">${scene(place.id)}<div class="adventure-copy"><span class="pill">きょうのいきさき</span><h2>${r(place.name)}</h2><p>${r(place.preview)}</p></div></article><section class="section-head"><h2>${done ? "きょうのぼうけん、おつかれさま！" : "なにをもっていく？"}</h2><p>${done ? "えにっきをひらいてみよう。" : "ひとつえらんでね。１８じまではかえられるよ。"}</p></section>${done ? '<button class="primary wide" data-action="read-today">📖 えにっきをよむ</button>' : `<div class="items">${catalog.items.map((i) => `<button class="item ${selected === i.id ? "selected" : ""}" data-action="choose" data-id="${i.id}" aria-pressed="${selected === i.id}">${equipmentArt(i.id)}<strong>${r(i.name)}</strong><small>${selected === i.id ? "✓ これにした！" : "もっていく"}</small></button>`).join("")}</div><p class="note">🌿 あそべないひも、みんなといっしょにぼうけんするよ。</p>`}`;
}
function journal() {
  journalMember = state.members.some((m) => m.id === journalMember)
    ? journalMember
    : state.active;
  const entries = state.adventures.filter((a) =>
      a.participants.some((m) => m.id === journalMember),
    ),
    months = [...new Set(entries.map((a) => a.day.slice(0, 7)))];
  if (!months.includes(journalMonth)) journalMonth = months[0];
  return `<section class="intro"><div><span class="eyebrow">OUR ADVENTURE BOOKS</span><h1>${r("絵日記帳《えにっきちょう》")}</h1><p>あのひのぼうけんを、もういちど。</p></div><span class="large-icon">📖</span></section><div class="book-tabs">${state.members.map((m) => `<button data-action="book" data-id="${m.id}" class="${m.id === journalMember ? "selected" : ""}">${m.avatar} ${esc(m.name)}</button>`).join("")}</div>${
    entries.length
      ? `<label class="month-label">${r("日付《ひづけ》でえらぶ")}<select id="month">${months.map((m) => `<option ${m === journalMonth ? "selected" : ""}>${m}</option>`).join("")}</select></label><div class="entries">${entries
          .filter((a) => a.day.startsWith(journalMonth))
          .map(
            (a) =>
              `<button class="entry" data-action="entry" data-day="${a.day}"><img class="entry-art" src="${sceneImage(a.place, "after", a.participants.find((m) => m.id === journalMember)?.item)}" alt="" width="85" height="85" loading="lazy"><div><small>${a.day.replaceAll("-", " / ")}</small><h2>${r(p(a.place).name)}</h2><p>たからものをみつけたよ</p></div><span>↗</span></button>`,
          )
          .join("")}</div>`
      : `<div class="empty"><span>📔</span><h2>まだ、まっしろな１ページ。</h2><p>１８じになると、はじめての<br>えにっきがとどくよ。</p><button class="secondary" data-action="sample">サンプルをよむ</button></div>`
  }`;
}
function found() {
  return catalog.places.filter((pl) =>
    state.adventures.some(
      (a) =>
        a.treasure === pl.id &&
        a.participants.some((m) => m.id === state.active),
    ),
  );
}
function collection() {
  const owned = found();
  return `<section class="intro"><div><span class="eyebrow">LITTLE WONDERS</span><h1>${r("宝物図鑑《たからものずかん》")}</h1><p>${esc(me().name)}がみつけた、ちいさなふしぎ。</p></div><span class="count">${owned.length}<small> / ${catalog.places.length}</small></span></section><p class="note">✨ おうちからかたづけても、ここにのこるよ。</p><div class="collection">${catalog.places
    .map((pl) => {
      const has = owned.includes(pl);
      return `<button class="treasure ${has ? "" : "unknown"}" data-action="treasure" data-id="${pl.id}" ${has ? "" : "disabled"}>${has ? treasureArt(pl.id) : "<span>?</span>"}<h2>${has ? r(pl.treasure) : "？？？"}</h2><small>${has ? "くわしくみる ↗" : "まだみつけていない"}</small></button>`;
    })
    .join("")}</div>`;
}
function diary(a, mid, sample = false) {
  const place = p(a.place),
    own = a.participants.find((m) => m.id === mid) || a.participants[0],
    ordered = [own, ...a.participants.filter((m) => m.id !== own.id)];
  modal(
    `<article class="diary"><span class="eyebrow">${sample ? "サンプルのおはなし" : a.day.replaceAll("-", " / ")}</span><h1>${own.avatar} ${esc(own.name)}のえにっき</h1>${scene(place.id, "after", own.item)}<h2>${r(place.name)}</h2><p>${r(a.intro)}</p>${ordered.map((m) => `<p class="diary-action">${m.item ? equipmentArt(m.item) : ""}<strong>${m.avatar} ${esc(m.name)}</strong>は、${m.item ? r(catalog.items.find((i) => i.id === m.item).action) : "みんなをおうえんしました。"}</p>`).join("")}<p>${r(a.ending)}</p><div class="souvenir">${treasureArt(place.id)}<div><small>みつけたたからもの</small><h2>${r(place.treasure)}</h2></div></div><p class="fine">きょうのぼうけん、だれかにはなしてみよう。</p></article>`,
  );
}
function sample() {
  const pl = catalog.places[0];
  diary(
    {
      day: "サンプル",
      place: pl.id,
      intro: pl.intro,
      ending: pl.ending,
      participants: [
        { id: "a", name: "きみ", avatar: "🦊", item: "pudding" },
        { id: "b", name: "なかま", avatar: "🐰", item: "umbrella" },
      ],
    },
    "a",
    true,
  );
}
function settings() {
  if (!state.parent)
    return modal(
      `<h1>おとなのせってい</h1><p>あんしょうばんごうをいれてね。</p><form data-form="unlock"><label>あんしょうばんごう<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6,12}" required autocomplete="off"></label><button class="primary">ひらく</button></form>`,
    );
  modal(
    `<h1>おとなのせってい</h1><p class="fine">１０ぷんで、じどうでロックされます。</p><div class="settings-list"><button class="secondary" data-action="add-member">＋ なかまをつくる</button><button class="secondary" data-action="invite">▦ QRでしょうたいする</button><button class="secondary" data-action="toggle-shared">${state.shared ? "✓ みんなでつかうスマホ" : "ひとりでつかうスマホ"}<small>タップできりかえ</small></button></div><h2>しょうたいのかくにん</h2><div id="requests">${requestsHtml()}</div><hr><button class="text" data-action="revoke-invites">しょうたいをすべてとりけす</button><button class="text danger" data-action="revoke-devices">ほかのスマホとのせつぞくをきる</button><button class="primary wide" data-action="lock">🔒 ロックしてとじる</button>`,
  );
}
function requestsHtml() {
  return state.requests.length
    ? state.requests
        .map(
          (q) =>
            `<div class="request"><p>${q.avatar} ${esc(q.member_id ? state.members.find((m) => m.id === q.member_id)?.name : q.name)} がはいりたいよ</p><div><button class="secondary" data-action="reject" data-id="${q.id}">やめる</button><button class="primary" data-action="approve" data-id="${q.id}">かぞくです</button></div></div>`,
        )
        .join("")
    : '<p class="fine">いまは、まっているひとはいません。</p>';
}
function joinForm(token = "") {
  modal(
    `<h1>おうちにいこう</h1><p>おとなのスマホのQRをよみこんでね。</p>${token ? "" : '<button class="secondary wide" data-action="scan">📷 カメラでよみこむ</button><video id="camera" playsinline muted hidden></video>'}<form data-form="join"><label>しょうたいリンク<input name="token" value="${esc(token)}" required autocomplete="off" placeholder="リンクをはりつける"></label><label>なまえ<input name="name" maxlength="16" required placeholder="ニックネームでいいよ"></label>${avatars()}<button class="primary wide">おうちにはいる</button></form><p class="fine">すでにいるなかまのしょうたいなら、<br>もとのなまえとキャラクターをつかいます。</p>`,
  );
}
function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  clearTimeout(scanTimer);
}
async function scan() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    const video = $("#camera");
    video.hidden = false;
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement("canvas"),
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    function step() {
      if (!stream || !video.isConnected) return stopCamera();
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height),
          qr = jsQR(data.data, data.width, data.height);
        if (qr) {
          try {
            const url = new URL(qr.data);
            if (
              url.origin !== location.origin ||
              !url.hash.startsWith("#invite=")
            )
              throw Error();
            joinForm(decodeURIComponent(url.hash.slice(8)));
            toast("よみこめたよ！");
            return;
          } catch {}
        }
      }
      scanTimer = setTimeout(step, 180);
    }
    step();
  } catch {
    toast("カメラをつかえません。しょうたいリンクをはりつけてね。");
    stopCamera();
  }
}
const actions = {
  install: () => installApp(modal),
  close,
  create: () =>
    modal(
      `<h1>おうちをつくろう</h1><p>まず、おとなのなまえをおしえてね。</p><form data-form="create"><label>なまえ<input name="name" maxlength="16" required autocomplete="nickname"></label>${avatars()}<label>おとなのあんしょうばんごう<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6,12}" minlength="6" maxlength="12" required autocomplete="new-password"></label><p class="fine">６〜１２けた。わすれないようにひかえてね。<br>このばんごうで、しょうたいをかくにんします。</p><button class="primary wide">おうちをつくる</button></form>`,
    ),
  join: () => joinForm(),
  scan,
  sample,
  settings,
  tab: (el) => {
    tab = el.dataset.id;
    render();
    window.scrollTo(0, 0);
  },
  prepare: () => {
    tab = "adventure";
    render();
  },
  profiles: () =>
    modal(
      `<h1>だれがあそぶ？</h1><div class="profiles">${state.members.map((m) => `<button class="secondary" data-action="switch" data-id="${m.id}" ${!state.shared && m.id !== state.active ? "disabled" : ""}><span>${m.avatar}</span>${esc(m.name)} ${m.id === state.active ? "✓" : ""}</button>`).join("")}</div>${!state.shared ? '<p class="fine">おとなのせっていで、みんなでつかうスマホにできます。</p>' : ""}<button class="text" data-action="settings">⚙ おとなのせってい</button>`,
    ),
  switch: async (el) => {
    await api("switch", { member: el.dataset.id });
    close();
    await refresh();
  },
  choose: async (el) => {
    await api("choice", { item: el.dataset.id });
    await refresh();
    toast("じゅんびできた！ あとは、のんびり。");
  },
  "read-today": () => {
    const a = state.adventures.find((a) => a.day === state.day);
    if (a) diary(a, state.active);
  },
  book: (el) => {
    journalMember = el.dataset.id;
    render();
  },
  entry: (el) =>
    diary(
      state.adventures.find((a) => a.day === el.dataset.day),
      journalMember,
    ),
  slot: (el) => {
    const slot = Number(el.dataset.slot),
      d = state.decorations.find((d) => d.slot === slot);
    if (d) {
      const owner = state.members.find((m) => m.id === d.member_id);
      modal(
        `<h1>${treasureArt(d.treasure)} ${r(p(d.treasure).treasure)}</h1><p>${esc(owner?.name)}がかざったよ。</p>${d.member_id === state.active ? `<p>かたづけても、ずかんとえにっきにのこるよ。</p><button class="secondary" data-action="remove" data-slot="${slot}">かざるのをやめる</button>` : "<p>かたづけるときは、かざったなかまにたのんでね。</p>"}`,
      );
    } else {
      modal(
        `<h1>なにをかざる？</h1>${
          found().length
            ? `<div class="items">${found()
                .map(
                  (pl) =>
                    `<button class="item" data-action="decorate" data-slot="${slot}" data-id="${pl.id}">${treasureArt(pl.id)}${r(pl.treasure)}</button>`,
                )
                .join("")}</div>`
            : "<p>ぼうけんからもどると、たからものがふえるよ。</p>"
        }`,
      );
    }
  },
  decorate: async (el) => {
    await api("decorate", {
      slot: Number(el.dataset.slot),
      treasure: el.dataset.id,
    });
    close();
    await refresh();
    toast("おうちにかざったよ！");
  },
  remove: async (el) => {
    await api("decorate", { slot: Number(el.dataset.slot), treasure: null });
    close();
    await refresh();
    toast("かたづけたよ。おもいでは、ずっとのこるよ。");
  },
  treasure: (el) => {
    const pl = p(el.dataset.id),
      entries = state.adventures.filter(
        (a) =>
          a.treasure === pl.id &&
          a.participants.some((m) => m.id === state.active),
      );
    modal(
      `<div class="treasure-detail">${treasureArt(pl.id)}<h1>${r(pl.treasure)}</h1><p>${r(pl.name)}でみつけたよ。</p><h2>おもいでのページ</h2>${entries.map((a) => `<button class="secondary" data-action="treasure-entry" data-day="${a.day}">${a.day} 📖</button>`).join("")}<p class="fine">おうちの「＋」から、いつでもかざれるよ。</p></div>`,
    );
  },
  "treasure-entry": (el) =>
    diary(
      state.adventures.find((a) => a.day === el.dataset.day),
      state.active,
    ),
  "add-member": () =>
    modal(
      `<h1>なかまをつくろう</h1><form data-form="member"><label>なまえ<input name="name" maxlength="16" required></label>${avatars()}<button class="primary">なかまをつくる</button></form>`,
    ),
  invite: () =>
    modal(
      `<h1>QRでしょうたい</h1><form data-form="invite"><label>だれのスマホ？<select name="member"><option value="">あたらしいなかま</option>${state.members.map((m) => `<option value="${m.id}">${esc(m.name)}のつづきから</option>`).join("")}</select></label><button class="primary">QRをつくる</button></form><p class="fine">１０ぷん・１かいだけつかえます。<br>よみこんだあと、おとながかくにんします。</p>`,
    ),
  "toggle-shared": async () => {
    await api("shared", { shared: !state.shared });
    await refresh();
    settings();
  },
  approve: async (el) => {
    await api("approve", { id: el.dataset.id, approve: true });
    await refresh();
    settings();
  },
  reject: async (el) => {
    await api("approve", { id: el.dataset.id, approve: false });
    await refresh();
    settings();
  },
  "revoke-invites": async () => {
    await api("revoke-invites", {});
    await refresh();
    settings();
    toast("しょうたいをとりけしました。");
  },
  "revoke-devices": () =>
    modal(
      '<h1>ほかのスマホをはずす？</h1><p>このスマホだけがのこります。<br>ほかのスマホは、QRでしょうたいしなおせます。<br>えにっきやたからものはきえません。</p><button class="primary" data-action="confirm-revoke">せつぞくをきる</button>',
    ),
  "confirm-revoke": async () => {
    await api("revoke-devices", {});
    await refresh();
    settings();
    toast("ほかのスマホをはずしました。");
  },
  lock: async () => {
    await api("lock", {});
    close();
    await refresh();
  },
  copy: async () => {
    await navigator.clipboard.writeText($("#invite-link").value);
    toast("リンクをコピーしたよ。");
  },
  about: () =>
    modal(
      `<h1>このゲームについて</h1><p>１にち５ふん。かぞくでぼうけんする、ちいさなゲームです。</p><h2>おとなのかたへ</h2><p>なまえはニックネームでどうぞ。ほんみょう・たんじょうび・メールアドレスはひつようありません。</p><p>かぞくのデータはCloudflareにほぞんします。ほかのかぞくにはみせません。こうこくやアクセスかいせきはつかっていません。</p><p>カメラのえいぞうは、QRをよむためだけにつかいます。サーバーにはおくりません。</p><p>１８じは日本《にほん》のじかんです。さいしょのばんには７つのぼうけんがはいっています。</p><p>ベータばんです。すべてのスマホのせつぞくをなくすと、ふっきゅうできません。おとなのスマホをのこしてね。</p>`.replace(
        "日本《にほん》",
        r("日本《にほん》"),
      ),
    ),
};
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled || busy) return;
  try {
    busy = true;
    document.body.setAttribute("aria-busy", "true");
    el.disabled = true;
    await actions[el.dataset.action]?.(el);
  } catch (err) {
    toast(err.message);
  } finally {
    busy = false;
    document.body.setAttribute("aria-busy", "false");
    if (el.isConnected) el.disabled = false;
  }
});
document.addEventListener("submit", async (e) => {
  const form = e.target;
  if (!form.dataset.form) return;
  e.preventDefault();
  if (busy) return;
  busy = true;
  document.body.setAttribute("aria-busy", "true");
  const button = form.querySelector(
    'button[type="submit"],button:last-of-type',
  );
  if (button) button.disabled = true;
  const data = Object.fromEntries(new FormData(form)),
    kind = form.dataset.form;
  try {
    if (kind === "create") {
      await api("create", data);
      close();
      await refresh();
      toast("おうちができたよ！ なかまをつくろう。");
      settings();
    }
    if (kind === "unlock") {
      await api("unlock", data);
      await refresh();
      settings();
    }
    if (kind === "member") {
      await api("member", data);
      await refresh();
      settings();
    }
    if (kind === "invite") {
      const result = await api("invite", data),
        url = location.origin + "/#invite=" + encodeURIComponent(result.token),
        qr = await QRCode.toDataURL(url, {
          width: 280,
          margin: 2,
          color: { dark: "#304f40", light: "#fffdf7" },
        });
      modal(
        `<h1>かぞくをしょうたい</h1><img class="qr" src="${qr}" alt="しょうたいのQRコード"><p>１０ぷんだけ・１かいだけのしょうたいです。<br>カメラでよみこむか、リンクをわたしてね。</p><input id="invite-link" readonly value="${esc(url)}" aria-label="しょうたいリンク"><button class="secondary" data-action="copy">リンクをコピー</button><button class="primary" data-action="settings">よみこめたら、かくにんする</button>`,
      );
    }
    if (kind === "join") {
      let token = data.token;
      try {
        const url = new URL(token);
        if (url.origin !== location.origin) throw Error();
        token = decodeURIComponent(url.hash.slice(8));
      } catch {}
      const { receipt } = await api("join", { ...data, token });
      sessionStorage.setItem("joinReceipt", receipt);
      waitForParent();
    }
  } catch (err) {
    toast(err.message);
  } finally {
    busy = false;
    document.body.setAttribute("aria-busy", "false");
    if (button?.isConnected) button.disabled = false;
  }
});
function waitForParent() {
  modal(
    '<div class="empty"><span>💌</span><h1>おとなのかくにんをまっているよ</h1><p>おとなのスマホで、<br>「おとなのせってい」をひらいてね。</p></div>',
  );
  clearInterval(poll);
  poll = setInterval(async () => {
    try {
      const receipt = sessionStorage.getItem("joinReceipt");
      if (!receipt) return clearInterval(poll);
      const result = await api("claim", { receipt });
      if (result.status === "claimed") {
        clearInterval(poll);
        sessionStorage.removeItem("joinReceipt");
        close();
        await refresh();
        toast("おうちにつながったよ！");
      }
    } catch (e) {
      clearInterval(poll);
      sessionStorage.removeItem("joinReceipt");
      toast(e.message);
      close();
    }
  }, 2500);
}
document.addEventListener("change", (e) => {
  if (e.target.id === "month") {
    journalMonth = e.target.value;
    render();
  }
});
$("#modal").addEventListener("close", stopCamera);
async function boot() {
  try {
    catalog = await api("catalog");
    const token = location.hash.startsWith("#invite=")
      ? decodeURIComponent(location.hash.slice(8))
      : null;
    if (token) history.replaceState(null, "", "/");
    try {
      await refresh();
    } catch (e) {
      if (e.status === 401) landing();
      else throw e;
    }
    if (token) joinForm(token);
    else if (sessionStorage.getItem("joinReceipt")) waitForParent();
    setInterval(async () => {
      if (document.hidden || busy || !state) return;
      try {
        const next = await api("state");
        state = next;
        if (!$("#modal").open) render();
        else if ($("#requests")) $("#requests").innerHTML = requestsHtml();
      } catch {}
    }, 15000);
  } catch (e) {
    $("#app").innerHTML =
      '<main class="empty"><h1>つながりませんでした</h1><p>インターネットにつながってから、<br>がめんをよみこみなおしてね。</p><a class="primary" href="/">もういちどひらく</a></main>';
    toast(e.message);
  }
}
setupPwa();
boot();
