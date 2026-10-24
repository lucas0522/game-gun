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
  cyber: { id: 'cyber', name: '機甲獸', icon: '🤖', bodyColor: '#0891b2', legColor: '#164e63', snoutColor: '#083344', trailColor: '#22d3ee', premium: true },
  tank: { id: 'tank', name: '鋼鐵戰車', icon: '🛡️', bodyColor: '#3f3f46', legColor: '#27272a', snoutColor: '#18181b', trailColor: '#a1a1aa', premium: true },
  drone: { id: 'drone', name: '偵查無人機', icon: '🛸', bodyColor: '#1e293b', legColor: '#475569', snoutColor: '#0ea5e9', trailColor: '#38bdf8', premium: true }
};

// ✨ 無人機飛彈：[N]鍵發射時依序輪替使用，傷害與效果各不相同；集束炸彈重用RPG的範圍爆炸判定(type:'rpg')，
// 燃燒彈/電磁脈衝彈重用英雄子彈既有的元素附加效果(命中後有機率觸發燃燒/眩暈)，精準打擊彈則單純高額直傷
const DRONE_MISSILES = [
  { id: 'precision', name: '精準打擊彈', icon: '🎯', dmg: 200, color: '#e2e8f0' },
  { id: 'cluster', name: '集束炸彈', icon: '💣', dmg: 140, type: 'rpg', color: '#fb923c' },
  { id: 'incendiary', name: '燃燒彈', icon: '🔥', dmg: 130, element: 'fire', color: '#ef4444' },
  { id: 'emp', name: '電磁脈衝彈', icon: '⚡', dmg: 110, element: 'lightning', color: '#a855f7' }
];

// ✨ 飛彈塗裝：純外觀，覆蓋所有飛彈類型的顯示顏色(彈體+粒子特效)，不影響傷害/效果(仍由DRONE_MISSILES決定)
// 標準塗裝color為null，代表不覆蓋，沿用各飛彈原本的顏色
const DRONE_MISSILE_SKINS = {
  standard: { id: 'standard', name: '制式塗裝', icon: '⚪', color: null },
  azure: { id: 'azure', name: '天藍塗裝', icon: '🔵', color: '#38bdf8', cost: 150 },
  magma: { id: 'magma', name: '熔岩塗裝', icon: '🟠', color: '#f97316', cost: 170 },
  stealth: { id: 'stealth', name: '暗夜塗裝', icon: '⚫', color: '#1e293b', cost: 160 },
  toxic: { id: 'toxic', name: '劇毒塗裝', icon: '🟢', color: '#84cc16', cost: 180 }
};

// ✨ 戰車炮彈：[N]鍵開炮時依序輪替使用，傷害與效果各不相同；高爆彈重用RPG的範圍爆炸判定(type:'rpg')，
// 燃燒彈/電磁彈重用英雄子彈既有的元素附加效果(element命中後有機率觸發燃燒/眩暈)，穿甲彈則單純高額直傷
const TANK_SHELLS = [
  { id: 'ap', name: '穿甲彈', icon: '🔩', dmg: 220, color: '#a1a1aa' },
  { id: 'he', name: '高爆彈', icon: '💥', dmg: 150, type: 'rpg', color: '#f97316' },
  { id: 'incendiary', name: '燃燒彈', icon: '🔥', dmg: 140, element: 'fire', color: '#ef4444' },
  { id: 'emp', name: '電磁彈', icon: '⚡', dmg: 100, element: 'lightning', color: '#a855f7' }
];

// ✨ 炮彈塗裝：純外觀，覆蓋所有炮彈類型的顯示顏色(彈體+粒子特效)，不影響傷害/效果(仍由TANK_SHELLS決定)
// 標準塗裝color為null，代表不覆蓋，沿用各炮彈原本的顏色
const TANK_SHELL_SKINS = {
  standard: { id: 'standard', name: '制式塗裝', icon: '⚪', color: null },
  golden: { id: 'golden', name: '黃金塗裝', icon: '🟡', color: '#fbbf24', cost: 150 },
  neon: { id: 'neon', name: '霓虹塗裝', icon: '🟣', color: '#d946ef', cost: 180 },
  stealth: { id: 'stealth', name: '暗影塗裝', icon: '⚫', color: '#18181b', cost: 160 },
  crimson: { id: 'crimson', name: '血色塗裝', icon: '🔴', color: '#dc2626', cost: 170 }
};
