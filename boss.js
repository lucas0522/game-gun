// ✨ 高頻登場的 Boss 召喚邏輯
const BOSS_TYPES = ['titan', 'void', 'iron', 'thunder', 'toxic', 'frost', 'wraith', 'laser'];
// 隨機輪替池：劇毒巨蟲權重較高，出現機率約為其他 Boss 的 3 倍
const BOSS_SPAWN_POOL = ['titan', 'void', 'iron', 'thunder', 'toxic', 'toxic', 'toxic', 'frost', 'wraith', 'laser'];
function spawnBoss(bossType) {
  let ex = canvas.width / 2, ey = -60;
  let hpBonus = bossWaveCount * 45; // 每多一波 Boss 血量稍微加成

  if (bossType === 'titan') {
    bosses.push({ id: 'titan_boss', name: '🔴 泰坦巨獸 (TITAN DREADNOUGHT)', x: ex, y: ey, hp: 650 + hpBonus, maxHp: 650 + hpBonus, speed: 1.1, radius: 42, color: '#dc2626', stunned: 0, slowed: false, skillTimer: 240, enrageTimer: 0 });
  } else if (bossType === 'void') {
    bosses.push({ id: 'void_boss', name: '🟣 虛空領主 (VOID STALKER)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 500 + hpBonus, maxHp: 500 + hpBonus, speed: 2.2, radius: 32, color: '#9333ea', stunned: 0, slowed: false, skillTimer: 170 });
  } else if (bossType === 'iron') {
    bosses.push({ id: 'iron_boss', name: '🟠 鋼鐵獵手 (IRON HUNTER)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 580 + hpBonus, maxHp: 580 + hpBonus, speed: 1.6, radius: 36, color: '#f97316', stunned: 0, slowed: false, skillTimer: 130 });
  } else if (bossType === 'thunder') {
    bosses.push({ id: 'thunder_boss', name: '⚡ 雷霆哨兵 (THUNDER SENTINEL)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 540 + hpBonus, maxHp: 540 + hpBonus, speed: 1.9, radius: 34, color: '#0ea5e9', stunned: 0, slowed: false, skillTimer: 120 });
  } else if (bossType === 'toxic') {
    bosses.push({ id: 'toxic_boss', name: '☠️ 劇毒巨蟲 (TOXIC BEHEMOTH)', x: ex, y: ey, hp: 610 + hpBonus, maxHp: 610 + hpBonus, speed: 1.3, radius: 40, color: '#65a30d', stunned: 0, slowed: false, skillTimer: 150 });
  } else if (bossType === 'frost') {
    bosses.push({ id: 'frost_boss', name: '🧊 冰霜巨像 (FROST COLOSSUS)', x: ex, y: ey, hp: 590 + hpBonus, maxHp: 590 + hpBonus, speed: 1.4, radius: 38, color: '#7dd3fc', stunned: 0, slowed: false, skillTimer: 140 });
  } else if (bossType === 'wraith') {
    bosses.push({ id: 'wraith_boss', name: '👻 怨靈君王 (WRAITH SOVEREIGN)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 520 + hpBonus, maxHp: 520 + hpBonus, speed: 2.3, radius: 30, color: '#c4b5fd', stunned: 0, slowed: false, skillTimer: 160 });
  } else if (bossType === 'laser') {
    bosses.push({ id: 'laser_boss', name: '🔴 鐳射審判者 (LASER JUDGE)', x: canvas.width / 2 + (Math.random() * 200 - 100), y: -60, hp: 600 + hpBonus, maxHp: 600 + hpBonus, speed: 1.7, radius: 36, color: '#f43f5e', stunned: 0, slowed: false, skillTimer: 200 });
  }
  addFloatingText(canvas.width / 2, canvas.height / 3, '⚠️ WARNING: BOSS WARNING ⚠️', '#ef4444');
}
