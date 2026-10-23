const MAPS = {
  grid: { id: 'grid', name: '標準戰術格柵', icon: '🏙️', bgColor: '#0f172a', tileDark: '#15213a', tileLight: '#1a2a47', obstacleColor: '#57534e', obstacleCount: 5 },
  desert: { id: 'desert', name: '赭紅沙漠', icon: '🏜️', bgColor: '#451a03', tileDark: '#78350f', tileLight: '#92400e', obstacleColor: '#c2884a', obstacleCount: 4, themeEnemy: 'sand_scorpion', weatherType: 'sandstorm' },
  frost: { id: 'frost', name: '冰封凍土', icon: '❄️', bgColor: '#0c4a6e', tileDark: '#155e75', tileLight: '#1e6f8c', obstacleColor: '#a5d8e8', obstacleCount: 6, themeEnemy: 'frost_stalker', weatherType: 'snow' },
  toxic: { id: 'toxic', name: '毒霧廢土', icon: '☣️', bgColor: '#1a2e05', tileDark: '#365314', tileLight: '#3f6212', obstacleColor: '#65a30d', obstacleCount: 7, themeEnemy: 'toxic_crawler', weatherType: 'spores' },
  volcanic: { id: 'volcanic', name: '熔岩深淵', icon: '🌋', bgColor: '#450a0a', tileDark: '#7f1d1d', tileLight: '#991b1b', obstacleColor: '#ea580c', obstacleCount: 5, themeEnemy: 'lava_fiend', weatherType: 'embers' },
  abyss: { id: 'abyss', name: '深海遺跡', icon: '🌊', bgColor: '#042f2e', tileDark: '#134e4a', tileLight: '#115e59', obstacleColor: '#2dd4bf', obstacleCount: 5, themeEnemy: 'deep_lurker', weatherType: 'bubbles' },
  neon_city: { id: 'neon_city', name: '霓虹都市', icon: '🌃', bgColor: '#1e1b4b', tileDark: '#312e81', tileLight: '#3730a3', obstacleColor: '#d946ef', obstacleCount: 6, themeEnemy: 'cyber_hunter', weatherType: 'rain' }
};

// ✨ 天氣粒子系統設定：每種天氣的粒子數量/顏色/大小/透明度/運動模式(fall降落、rise上升、drift飄移)與基礎速度
// 標準格柵(grid)沒有weatherType，維持無天氣效果
const WEATHER_TYPES = {
  sandstorm: { count: 80, color: '#c2884a', size: 5, opacity: 0.55, mode: 'drift', speed: 2.2 },
  snow: { count: 100, color: '#f0f9ff', size: 3.5, opacity: 0.85, mode: 'fall', speed: 1.3 },
  spores: { count: 70, color: '#84cc16', size: 4, opacity: 0.5, mode: 'rise', speed: 0.6 },
  embers: { count: 60, color: '#fb923c', size: 3.5, opacity: 0.8, mode: 'rise', speed: 1.5 },
  bubbles: { count: 70, color: '#5eead4', size: 3, opacity: 0.5, mode: 'rise', speed: 0.9 },
  rain: { count: 120, color: '#bae6fd', size: 2.5, opacity: 0.7, mode: 'fall', speed: 5.5 }
};
