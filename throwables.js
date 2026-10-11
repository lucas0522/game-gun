const THROWABLES = {
  default: { id: 'default', name: '制式手榴彈', icon: '💣', dmg: 150, radius: 120, cooldown: 10, color: '#fb923c' },
  cluster_grenade: { id: 'cluster_grenade', name: '集束手榴彈', icon: '🧨', dmg: 120, radius: 170, cooldown: 9, color: '#f87171' },
  molotov: { id: 'molotov', name: '燃燒瓶', icon: '🍾', dmg: 90, radius: 100, cooldown: 8, color: '#f97316', burn: true },
  frost_grenade: { id: 'frost_grenade', name: '寒冰手雷', icon: '🧊', dmg: 80, radius: 140, cooldown: 9, color: '#38bdf8', slow: true },
  emp_grenade: { id: 'emp_grenade', name: '電磁脈衝彈', icon: '⚡', dmg: 70, radius: 150, cooldown: 11, color: '#a855f7', stunBonus: 60 },
  heavy_grenade: { id: 'heavy_grenade', name: '破壞者炸彈', icon: '💥', dmg: 240, radius: 100, cooldown: 14, color: '#dc2626' },
  smoke_grenade: { id: 'smoke_grenade', name: '煙霧彈', icon: '🌫️', dmg: 20, radius: 170, cooldown: 9, color: '#94a3b8', smoke: true },
  flashbang: { id: 'flashbang', name: '震盲閃光彈', icon: '✨', dmg: 5, radius: 200, cooldown: 7, color: '#fde68a', stunBonus: 140 }
};
