let installPrompt;
export const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;

export function setupPwa() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    document
      .querySelectorAll('[data-action="install"]')
      .forEach((button) => (button.hidden = true));
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {
        // Installing remains optional; a registration failure must not block play.
      });
  }
}

export async function installApp(showModal) {
  if (isInstalled()) {
    showModal(
      "<h1>インストールできているよ</h1><p>ホームがめんのアイコンから、いつでもあそべるよ。</p>",
    );
    return;
  }
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    await prompt.prompt();
    await prompt.userChoice;
    return;
  }
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  showModal(
    `<h1>ホームがめんにおこう</h1><p>アプリのアイコンから、すぐあそべるようになるよ。</p>${
      ios
        ? '<ol class="install-steps"><li>Safariでこのゲームをひらく。</li><li>メニューの「<ruby>共有<rt>きょうゆう</rt></ruby>」をタップ。</li><li>「ホーム<ruby>画面<rt>がめん</rt></ruby>に<ruby>追加<rt>ついか</rt></ruby>」をえらぶ。</li><li>「Webアプリとして<ruby>開<rt>ひら</rt></ruby>く」があればオンにして、<ruby>追加<rt>ついか</rt></ruby>する。</li></ol>'
        : '<ol class="install-steps"><li>AndroidならChromeでこのゲームをひらく。</li><li>ブラウザのメニュー「⋮」をタップ。</li><li>「アプリをインストール」または「ホーム<ruby>画面<rt>がめん</rt></ruby>に<ruby>追加<rt>ついか</rt></ruby>」をえらぶ。</li></ol><p class="fine">パソコンはChrome・Edgeのアドレスバーにあるインストールボタンから。ブラウザによって、ひょうじがかわります。</p>'
    }<p class="note">はじめてなら、インストールしてからおうちをつくろう。<br>インストールしたアプリにおうちがでないときは、ほかのかぞくのスマホから「つづきから」のQRでしょうたいしてもらってね。</p><p class="fine">ぼうけんのほぞんには、インターネットがひつようです。</p>`,
  );
}
