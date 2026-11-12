export const characters = [
  { id: "boy-green", name: "みどりのベスト" },
  { id: "boy-blue", name: "あおいオーバーオール" },
  { id: "boy-red", name: "あかいしましま" },
  { id: "girl-yellow", name: "きいろのワンピース" },
  { id: "girl-pink", name: "ピンクのワンピース" },
  { id: "girl-mint", name: "ミントのオーバーオール" },
];
export const legacyAvatars = ["🦊", "🐰", "🐻", "🐱", "🐼", "🐸", "🐨", "🐯"];
export function characterFor(value) {
  return (
    characters.find((c) => c.id === value) ||
    characters[Math.max(0, legacyAvatars.indexOf(value)) % characters.length]
  );
}
export function characterImage(value, frame = 1) {
  return `/art/characters/v1/${characterFor(value).id}/${frame}.webp`;
}
