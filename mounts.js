const MOUNTS = {
  horse: { id: 'horse', name: '棕馬', icon: '🐴', bodyColor: '#92400e', legColor: '#78350f', snoutColor: '#451a03' },
  wolf: { id: 'wolf', name: '灰狼', icon: '🐺', bodyColor: '#475569', legColor: '#334155', snoutColor: '#1e293b' },
  boar: { id: 'boar', name: '野豬', icon: '🐗', bodyColor: '#57534e', legColor: '#44403c', snoutColor: '#1c1917' },
  raptor: { id: 'raptor', name: '迅猛龍', icon: '🦖', bodyColor: '#15803d', legColor: '#14532d', snoutColor: '#052e16' },
  bear: { id: 'bear', name: '黑熊', icon: '🐻', bodyColor: '#1c1917', legColor: '#0c0a09', snoutColor: '#292524' },
  deer: { id: 'deer', name: '白鹿', icon: '🦌', bodyColor: '#d4d4d8', legColor: '#a1a1aa', snoutColor: '#71717a' },
  // ✨ 進階外觀：需要花金幣購買解鎖，奔跑時會拖出對應顏色的元素粒子尾跡(見 game.js 的 trailColor 用法)
  inferno: { id: 'inferno', name: '烈焰魔馬', icon: '🔥', bodyColor: '#ea580c', legColor: '#9a3412', snoutColor: '#450a0a', trailColor: '#fb923c', premium: true },
  frost: { id: 'frost', name: '寒冰狼魂', icon: '❄️', bodyColor: '#38bdf8', legColor: '#0369a1', snoutColor: '#0c4a6e', trailColor: '#bae6fd', premium: true },
  thunder: { id: 'thunder', name: '雷霆飛龍', icon: '⚡', bodyColor: '#a855f7', legColor: '#6b21a8', snoutColor: '#3b0764', trailColor: '#e9d5ff', premium: true },
  toxic: { id: 'toxic', name: '劇毒巨獸', icon: '☠️', bodyColor: '#65a30d', legColor: '#3f6212', snoutColor: '#1a2e05', trailColor: '#a3e635', premium: true },
  void: { id: 'void', name: '虛空幻靈', icon: '🌌', bodyColor: '#581c87', legColor: '#2e1065', snoutColor: '#1e1b4b', trailColor: '#c084fc', premium: true },
  cyber: { id: 'cyber', name: '機甲獸', icon: '🤖', bodyColor: '#0891b2', legColor: '#164e63', snoutColor: '#083344', trailColor: '#22d3ee', premium: true }
};
