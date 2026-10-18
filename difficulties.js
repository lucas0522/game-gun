// ✨ 難度選擇：影響小怪/Boss 的血量、攻擊力、移動速度，在地圖選擇之後、正式開局之前挑選
const DIFFICULTIES = {
  easy: { id: 'easy', name: '簡單', icon: '🙂', desc: '敵人血量與傷害降低，適合新手熟悉操作', enemyHpMult: 0.75, enemyDmgMult: 0.7, enemySpeedMult: 0.9, bossHpMult: 0.8 },
  normal: { id: 'normal', name: '普通', icon: '⚔️', desc: '標準遊戲體驗，原汁原味的平衡難度', enemyHpMult: 1.0, enemyDmgMult: 1.0, enemySpeedMult: 1.0, bossHpMult: 1.0 },
  hard: { id: 'hard', name: '困難', icon: '🔥', desc: '敵人更強更快，考驗反應與走位', enemyHpMult: 1.4, enemyDmgMult: 1.3, enemySpeedMult: 1.15, bossHpMult: 1.3 },
  nightmare: { id: 'nightmare', name: '惡夢', icon: '💀', desc: '極限挑戰，敵人血量傷害速度全面提升', enemyHpMult: 1.9, enemyDmgMult: 1.6, enemySpeedMult: 1.3, bossHpMult: 1.7 }
};
