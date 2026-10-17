const ENEMY_TYPES = {
  grunt: { id: 'grunt', name: '潰爛步兵', color: '#ef4444', hpMult: 1.0, speedMult: 1.0, radiusMult: 1.0, contactDmg: 0.8 },
  sprinter: { id: 'sprinter', name: '疾奔劈獸', color: '#facc15', hpMult: 0.5, speedMult: 1.9, radiusMult: 0.75, contactDmg: 0.6 },
  brute: { id: 'brute', name: '裝甲壯漢', color: '#f97316', hpMult: 2.6, speedMult: 0.55, radiusMult: 1.5, contactDmg: 1.6 },
  ranged: { id: 'ranged', name: '毒刺潰兵', color: '#a855f7', hpMult: 0.8, speedMult: 0.85, radiusMult: 0.9, contactDmg: 0.5, isRanged: true, rangedDmg: 9, rangedColor: '#c084fc' },
  swarm_rat: { id: 'swarm_rat', name: '鼠群爬蟲', color: '#84cc16', hpMult: 0.22, speedMult: 2.3, radiusMult: 0.55, contactDmg: 0.35 },
  splitter: { id: 'splitter', name: '分裂寄生獸', color: '#06b6d4', hpMult: 1.3, speedMult: 0.9, radiusMult: 1.1, contactDmg: 0.9, isSplitter: true }
};

function pickEnemyType(score) {
  let pool = ['grunt', 'grunt', 'grunt', 'sprinter', 'sprinter'];
  if (score >= 4) pool.push('swarm_rat', 'swarm_rat');
  if (score >= 8) pool.push('ranged', 'ranged');
  if (score >= 12) pool.push('splitter', 'splitter');
  if (score >= 15) pool.push('brute', 'brute');
  return pool[Math.floor(Math.random() * pool.length)];
}
