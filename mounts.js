const MOUNTS = {
  horse: { id: 'horse', name: '棕馬', icon: '🐴', bodyColor: '#92400e', legColor: '#78350f', snoutColor: '#451a03' },
  wolf: { id: 'wolf', name: '灰狼', icon: '🐺', bodyColor: '#475569', legColor: '#334155', snoutColor: '#1e293b' },
  boar: { id: 'boar', name: '野豬', icon: '🐗', bodyColor: '#57534e', legColor: '#44403c', snoutColor: '#1c1917' },
  raptor: { id: 'raptor', name: '迅猛龍', icon: '🦖', bodyColor: '#15803d', legColor: '#14532d', snoutColor: '#052e16' },
  // ✨ 進階外觀：需要花金幣購買解鎖，奔跑時會拖出對應顏色的元素粒子尾跡(見 game.js 的 trailColor 用法)
  inferno: { id: 'inferno', name: '烈焰魔馬', icon: '🔥', bodyColor: '#ea580c', legColor: '#9a3412', snoutColor: '#450a0a', trailColor: '#fb923c', premium: true },
  frost: { id: 'frost', name: '寒冰狼魂', icon: '❄️', bodyColor: '#38bdf8', legColor: '#0369a1', snoutColor: '#0c4a6e', trailColor: '#bae6fd', premium: true },
  thunder: { id: 'thunder', name: '雷霆飛龍', icon: '⚡', bodyColor: '#a855f7', legColor: '#6b21a8', snoutColor: '#3b0764', trailColor: '#e9d5ff', premium: true }
};
