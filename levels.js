const LEVELS = [
  { id: 1, name: '第一關：新兵試煉', icon: '🌱', desc: '小怪清剿，首波泰坦巨獸登場', killTarget: 40, startBossWaveCount: 0 },
  { id: 2, name: '第二關：暗影滲透', icon: '🌆', desc: '虛空領主加入戰場', killTarget: 90, startBossWaveCount: 1 },
  { id: 3, name: '第三關：異變爆發', icon: '☣️', desc: '鋼鐵獵手、劇毒巨蟲相繼攻擊', killTarget: 150, startBossWaveCount: 2 },
  { id: 4, name: '第四關：終焉戰場', icon: '🔥', desc: '五種 Boss 全數登場，累積至 200 殺即獲勝', killTarget: 200, startBossWaveCount: 3 }
];

function levelStartScore(levelIndex) {
  return levelIndex === 0 ? 0 : LEVELS[levelIndex - 1].killTarget;
}
