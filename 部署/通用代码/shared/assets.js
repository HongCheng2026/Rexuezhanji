(function registerAssets(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='18' x2='110' y1='14' y2='116' gradientUnits='userSpaceOnUse'%3E%3Cstop stop-color='%2343c8ff'/%3E%3Cstop offset='1' stop-color='%23ffd166'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='128' height='128' fill='%23071422'/%3E%3Ccircle cx='64' cy='64' r='48' fill='url(%23a)' opacity='.16'/%3E%3Cpath fill='%23d9f5ff' d='M17 67 57 47l54 17-41 10-12 24-8-21-33-10z'/%3E%3Cpath fill='%2343c8ff' d='M57 47 70 74l-12 24-8-21-33-10z' opacity='.72'/%3E%3Ccircle cx='72' cy='64' r='5' fill='%23ffd166'/%3E%3C/svg%3E";
  const DEFAULT_PILOT_ID = "pilot-s-lingyan";
  const DEFAULT_SHIP_ID = "ship-a-06";
  const DEFAULT_BACKGROUND_ID = "bg-hangar-01";

  const RANK_DAMAGE = {
    pilot: { SS: 60, S: 55, A: 50, B: 45 },
    ship: { SSS: 120, SS: 112, S: 106, A: 100, B: 90 }
  };

  const PILOT_ASSETS = [
    { id: "pilot-a-luofeiyin", rank: "A", name: "洛绯音", src: "pilot-01.png" },
    { id: "pilot-a-shenyao", rank: "A", name: "沈曜", src: "pilot-02.png" },
    { id: "pilot-a-yelan", rank: "A", name: "夜岚", src: "pilot-03.png" },
    { id: "pilot-b-bailing", rank: "B", name: "白凌", src: "pilot-04.png" },
    { id: "pilot-b-linzhihan", rank: "B", name: "林知寒", src: "pilot-05.png" },
    { id: "pilot-b-shenqingyao", rank: "B", name: "沈清曜", src: "pilot-06.png" },
    { id: "pilot-b-sumianxing", rank: "B", name: "苏绵星", src: "pilot-07.png" },
    { id: "pilot-b-xingtao", rank: "B", name: "星桃", src: "pilot-08.png" },
    { id: DEFAULT_PILOT_ID, rank: "S", name: "凌焰", src: "pilot-09.png" },
    { id: "pilot-s-luoqi", rank: "S", name: "洛绮", src: "pilot-10.png" }
  ].map((item) => ({ ...item, damage: RANK_DAMAGE.pilot[item.rank] }));

  const SHIP_ASSETS = [
    { id: DEFAULT_SHIP_ID, rank: "A", name: "06", src: "ship-01.png" },
    { id: "ship-b-01", rank: "B", name: "01", src: "ship-02.png" },
    { id: "ship-b-02", rank: "B", name: "02", src: "ship-03.png" },
    { id: "ship-b-03", rank: "B", name: "03", src: "ship-04.png" },
    { id: "ship-b-04", rank: "B", name: "04", src: "ship-05.png" },
    { id: "ship-b-05", rank: "B", name: "05", src: "ship-06.png" }
  ].map((item) => ({ ...item, damage: RANK_DAMAGE.ship[item.rank] }));

  const BACKGROUND_ASSETS = [
    { id: DEFAULT_BACKGROUND_ID, rank: "BASE", name: "星港大厅", src: "lobby-bg-01.png" }
  ];

  const ASSET_PATHS = {
    player: "player.png",
    boss: "boss.png",
    smallEnemies: ["enemy-small-01.png", "enemy-small-02.png", "enemy-small-03.png"],
    eliteEnemies: ["enemy-elite-01.png", "enemy-elite-02.png"]
  };

  const api = {
    DEFAULT_AVATAR,
    DEFAULT_PILOT_ID,
    DEFAULT_SHIP_ID,
    DEFAULT_BACKGROUND_ID,
    RANK_DAMAGE,
    PILOT_ASSETS,
    SHIP_ASSETS,
    BACKGROUND_ASSETS,
    ASSET_PATHS
  };

  scope.assets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
