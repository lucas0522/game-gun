const WAR_WEAPONS = {
  default: { id: 'default', name: '標準制式步槍', icon: '🔫', ammo: Infinity, fireInterval: 150, dmg: 18, bulletSpeed: 11, radius: 3, color: '#60a5fa', type: 'bullet' },
  rpg: { id: 'rpg', name: 'RPG 巡弋火箭', icon: '🚀', ammo: 12, fireInterval: 550, dmg: 140, bulletSpeed: 8, radius: 8, color: '#f97316', type: 'rpg' },
  railgun: { id: 'railgun', name: '電磁電漿貫穿砲', icon: '⚡', ammo: 15, fireInterval: 420, dmg: 100, bulletSpeed: 17, radius: 10, color: '#38bdf8', type: 'railgun' },
  flamethrower: { id: 'flamethrower', name: '火風暴噴火槍', icon: '🔥', ammo: 90, fireInterval: 40, dmg: 14, bulletSpeed: 7, radius: 7, color: '#ef4444', type: 'flame' },
  minigun: { id: 'minigun', name: '加特林火神重機槍', icon: '🔫', ammo: 150, fireInterval: 45, dmg: 16, bulletSpeed: 13, radius: 3, color: '#f59e0b', type: 'bullet' },
  nuke_gun: { id: 'nuke_gun', name: '戰術核彈發射器', icon: '☢️', ammo: 3, fireInterval: 800, dmg: 300, bulletSpeed: 6, radius: 12, color: '#a855f7', type: 'nuke_bullet' },
  sniper: { id: 'sniper', name: '重型狙擊步槍', icon: '🎯', ammo: 20, fireInterval: 700, dmg: 220, bulletSpeed: 20, radius: 4, color: '#22c55e', type: 'bullet' },
  smg: { id: 'smg', name: '緊湊型衝鋒槍', icon: '💥', ammo: 200, fireInterval: 55, dmg: 11, bulletSpeed: 12, radius: 3, color: '#ec4899', type: 'bullet' }
};

const MELEE_WEAPONS = {
  knife: { id: 'knife', name: '戰術獵刀', icon: '🗡️', ammo: Infinity, cooldown: 180, range: 60, dmg: 35, color: '#38bdf8', arc: 1.2 },
  axe: { id: 'axe', name: '狂暴熱能斧', icon: '🪓', ammo: 25, cooldown: 450, range: 90, dmg: 120, color: '#ef4444', arc: 1.8 },
  katana: { id: 'katana', name: '光子武士刀', icon: '🗡️', ammo: 30, cooldown: 140, range: 85, dmg: 65, color: '#a855f7', arc: 2.2 },
  hammer: { id: 'hammer', name: '雷霆重錘', icon: '🔨', ammo: 15, cooldown: 650, range: 110, dmg: 150, color: '#facc15', arc: 3.14 },
  spear: { id: 'spear', name: '能量長矛', icon: '🔱', ammo: 20, cooldown: 300, range: 130, dmg: 90, color: '#22d3ee', arc: 0.9 }
};
