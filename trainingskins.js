// ✨ 訓練場皮膚：假人外觀 + 靶場環境配色，純外觀無屬性差異，在商店花金幣購買解鎖後於訓練場自動套用
const TRAINING_DUMMY_SKINS = {
  standard: { id: 'standard', name: '標準灰靶', icon: '🎯', color: '#64748b', resetColor: '#94a3b8' },
  scarecrow: { id: 'scarecrow', name: '稻草人', icon: '🌾', color: '#a16207', resetColor: '#fde68a', cost: 120 },
  golden: { id: 'golden', name: '黃金靶', icon: '🏆', color: '#eab308', resetColor: '#fde047', cost: 150 },
  zombie: { id: 'zombie', name: '殭屍靶', icon: '🧟', color: '#4d7c0f', resetColor: '#a3e635', cost: 160 },
  robot: { id: 'robot', name: '機甲假人', icon: '🤖', color: '#0891b2', resetColor: '#67e8f9', cost: 180 },
  ghost: { id: 'ghost', name: '幽靈靶', icon: '👻', color: '#a78bfa', resetColor: '#ddd6fe', cost: 200 }
};

const TRAINING_ARENA_SKINS = {
  standard: { id: 'standard', name: '標準靶場', icon: '🏟️', bgColor: '#1e293b', tileDark: '#273548', tileLight: '#2e3d54', obstacleColor: '#475569' },
  desert: { id: 'desert', name: '沙漠靶場', icon: '🏜️', bgColor: '#451a03', tileDark: '#78350f', tileLight: '#92400e', obstacleColor: '#c2884a', cost: 150, weatherType: 'sandstorm' },
  night: { id: 'night', name: '夜戰靶場', icon: '🌃', bgColor: '#0f0a1e', tileDark: '#1e1033', tileLight: '#2d1b4d', obstacleColor: '#6d28d9', cost: 180, weatherType: 'fireflies' },
  neon: { id: 'neon', name: '霓虹靶場', icon: '💡', bgColor: '#1e1b4b', tileDark: '#312e81', tileLight: '#3730a3', obstacleColor: '#d946ef', cost: 200, weatherType: 'rain' },
  volcanic: { id: 'volcanic', name: '熔岩靶場', icon: '🌋', bgColor: '#450a0a', tileDark: '#7f1d1d', tileLight: '#991b1b', obstacleColor: '#ea580c', cost: 200, weatherType: 'embers' }
};
