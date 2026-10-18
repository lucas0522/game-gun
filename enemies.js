const ENEMY_TYPES = {
  grunt: { id: 'grunt', name: '潰爛步兵', color: '#ef4444', hpMult: 1.0, speedMult: 1.0, radiusMult: 1.0, contactDmg: 0.8 },
  sprinter: { id: 'sprinter', name: '疾奔劈獸', color: '#facc15', hpMult: 0.5, speedMult: 1.9, radiusMult: 0.75, contactDmg: 0.6 },
  brute: { id: 'brute', name: '裝甲壯漢', color: '#f97316', hpMult: 2.6, speedMult: 0.55, radiusMult: 1.5, contactDmg: 1.6 },
  ranged: { id: 'ranged', name: '毒刺潰兵', color: '#a855f7', hpMult: 0.8, speedMult: 0.85, radiusMult: 0.9, contactDmg: 0.5, isRanged: true, rangedDmg: 9, rangedColor: '#c084fc' },
  swarm_rat: { id: 'swarm_rat', name: '鼠群爬蟲', color: '#84cc16', hpMult: 0.22, speedMult: 2.3, radiusMult: 0.55, contactDmg: 0.35 },
  splitter: { id: 'splitter', name: '分裂寄生獸', color: '#06b6d4', hpMult: 1.3, speedMult: 0.9, radiusMult: 1.1, contactDmg: 0.9, isSplitter: true },
  // 🗺️ 地圖專屬小怪：每張地圖(除標準格柵外)都有自己的特色威脅，出擊該地圖時機率混入一般刷怪池
  sand_scorpion: { id: 'sand_scorpion', name: '沙蠍獵手', color: '#eab308', hpMult: 0.9, speedMult: 1.5, radiusMult: 0.95, contactDmg: 0.9 },
  frost_stalker: { id: 'frost_stalker', name: '冰爪掠食者', color: '#7dd3fc', hpMult: 1.8, speedMult: 0.7, radiusMult: 1.2, contactDmg: 1.1, element: 'frost' },
  toxic_crawler: { id: 'toxic_crawler', name: '劇毒爬蟲', color: '#65a30d', hpMult: 0.75, speedMult: 0.9, radiusMult: 0.85, contactDmg: 0.6, isRanged: true, rangedDmg: 10, rangedColor: '#84cc16', element: 'poison' },
  lava_fiend: { id: 'lava_fiend', name: '熔岩惡鬼', color: '#ea580c', hpMult: 1.1, speedMult: 1.1, radiusMult: 1.0, contactDmg: 1.3, element: 'fire' },
  deep_lurker: { id: 'deep_lurker', name: '深淵潛行者', color: '#2dd4bf', hpMult: 1.4, speedMult: 0.8, radiusMult: 1.15, contactDmg: 0.85 },
  cyber_hunter: { id: 'cyber_hunter', name: '電子獵殺者', color: '#d946ef', hpMult: 0.7, speedMult: 1.3, radiusMult: 0.8, contactDmg: 0.55, isRanged: true, rangedDmg: 8, rangedColor: '#f0abfc', element: 'lightning' }
};

function pickEnemyType(score, mapKey) {
  let pool = ['grunt', 'grunt', 'grunt', 'sprinter', 'sprinter'];
  if (score >= 4) pool.push('swarm_rat', 'swarm_rat');
  if (score >= 8) pool.push('ranged', 'ranged');
  if (score >= 12) pool.push('splitter', 'splitter');
  if (score >= 15) pool.push('brute', 'brute');
  let map = mapKey && MAPS[mapKey];
  if (map && map.themeEnemy && score >= 5) {
    pool.push(map.themeEnemy, map.themeEnemy, map.themeEnemy);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
