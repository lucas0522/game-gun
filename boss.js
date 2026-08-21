// ✨ 高頻登場的 Boss 召喚邏輯
const BOSS_TYPES = ['titan', 'void', 'iron', 'thunder', 'toxic', 'frost'];
// 隨機輪替池：劇毒巨蟲權重較高，出現機率約為其他 Boss 的 3 倍
const BOSS_SPAWN_POOL = ['titan', 'void', 'iron', 'thunder', 'toxic', 'toxic', 'toxic', 'frost'];
function spawnBoss(bossType) {
  let ex = canvas.width / 2, ey = -60;
  let hpBonus = bossWaveCount * 30; // 每多一波 Boss 血量稍微加成

  if (bossType === 'titan') {
    bosses.push({ id: 'titan_boss', name: '🔴 泰坦巨獸 (TITAN DREADNOUGHT)', x: ex, y: ey, hp: 500 + hpBonus, maxHp: 500 + hpBonus, speed: 1.1, radius: 42, color: '#dc2626', stunned: 0, slowed: false, skillTimer: 160, enrageTimer: 0 });
  } else if (bossType === 'void') {
    bosses.push({ id: 'void_boss', name: '🟣 虛空領主 (VOID STALKER)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 380 + hpBonus, maxHp: 380 + hpBonus, speed: 2.2, radius: 32, color: '#9333ea', stunned: 0, slowed: false });
  } else if (bossType === 'iron') {
    bosses.push({ id: 'iron_boss', name: '🟠 鋼鐵獵手 (IRON HUNTER)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 440 + hpBonus, maxHp: 440 + hpBonus, speed: 1.6, radius: 36, color: '#f97316', stunned: 0, slowed: false, skillTimer: 130 });
  } else if (bossType === 'thunder') {
    bosses.push({ id: 'thunder_boss', name: '⚡ 雷霆哨兵 (THUNDER SENTINEL)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 410 + hpBonus, maxHp: 410 + hpBonus, speed: 1.9, radius: 34, color: '#0ea5e9', stunned: 0, slowed: false, skillTimer: 120 });
  } else if (bossType === 'toxic') {
    bosses.push({ id: 'toxic_boss', name: '☠️ 劇毒巨蟲 (TOXIC BEHEMOTH)', x: ex, y: ey, hp: 470 + hpBonus, maxHp: 470 + hpBonus, speed: 1.3, radius: 40, color: '#65a30d', stunned: 0, slowed: false, skillTimer: 150 });
  } else if (bossType === 'frost') {
    bosses.push({ id: 'frost_boss', name: '🧊 冰霜巨像 (FROST COLOSSUS)', x: ex, y: ey, hp: 450 + hpBonus, maxHp: 450 + hpBonus, speed: 1.4, radius: 38, color: '#7dd3fc', stunned: 0, slowed: false, skillTimer: 140 });
  }
  addFloatingText(canvas.width / 2, canvas.height / 3, '⚠️ WARNING: BOSS WARNING ⚠️', '#ef4444');
}
