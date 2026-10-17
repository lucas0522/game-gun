const MAPS = {
  grid: { id: 'grid', name: '標準戰術格柵', icon: '🏙️', bgColor: '#0f172a', tileDark: '#15213a', tileLight: '#1a2a47', obstacleColor: '#57534e', obstacleCount: 5 },
  desert: { id: 'desert', name: '赭紅沙漠', icon: '🏜️', bgColor: '#451a03', tileDark: '#78350f', tileLight: '#92400e', obstacleColor: '#c2884a', obstacleCount: 4, themeEnemy: 'sand_scorpion' },
  frost: { id: 'frost', name: '冰封凍土', icon: '❄️', bgColor: '#0c4a6e', tileDark: '#155e75', tileLight: '#1e6f8c', obstacleColor: '#a5d8e8', obstacleCount: 6, themeEnemy: 'frost_stalker' },
  toxic: { id: 'toxic', name: '毒霧廢土', icon: '☣️', bgColor: '#1a2e05', tileDark: '#365314', tileLight: '#3f6212', obstacleColor: '#65a30d', obstacleCount: 7, themeEnemy: 'toxic_crawler' },
  volcanic: { id: 'volcanic', name: '熔岩深淵', icon: '🌋', bgColor: '#450a0a', tileDark: '#7f1d1d', tileLight: '#991b1b', obstacleColor: '#ea580c', obstacleCount: 5, themeEnemy: 'lava_fiend' },
  abyss: { id: 'abyss', name: '深海遺跡', icon: '🌊', bgColor: '#042f2e', tileDark: '#134e4a', tileLight: '#115e59', obstacleColor: '#2dd4bf', obstacleCount: 5, themeEnemy: 'deep_lurker' },
  neon_city: { id: 'neon_city', name: '霓虹都市', icon: '🌃', bgColor: '#1e1b4b', tileDark: '#312e81', tileLight: '#3730a3', obstacleColor: '#d946ef', obstacleCount: 6, themeEnemy: 'cyber_hunter' }
};
