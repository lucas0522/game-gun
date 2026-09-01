const HEROES = {
  swift: { id: 'swift', name: '疾風', role: '刺客', avatar: '⚡', color: '#22d3ee', maxHp: 300, speed: 6.0, dmgMult: 1.0, dashCd: 1.0, ultReq: 20, fireInterval: 150, bulletSpeedMult: 1.0, hpRegen: 0, shotgunPellets: 7 },
  titan: { id: 'titan', name: '泰坦', role: '重裝', avatar: '🛡️', color: '#fbbf24', maxHp: 1000, speed: 3.8, dmgMult: 4.0, dashCd: 3.0, ultReq: 20, fireInterval: 180, bulletSpeedMult: 0.9, hpRegen: 0, shotgunPellets: 7 },
  tech: { id: 'tech', name: '先鋒', role: '科技', avatar: '🎯', color: '#c084fc', maxHp: 320, speed: 4.5, dmgMult: 1.1, dashCd: 3.0, ultReq: 14, fireInterval: 150, bulletSpeedMult: 1.0, hpRegen: 0, shotgunPellets: 7 },
  reaper: { id: 'reaper', name: '死神', role: '狂暴', avatar: '⚔️', color: '#fb7185', maxHp: 350, speed: 5.0, dmgMult: 1.2, dashCd: 2.5, ultReq: 20, fireInterval: 150, bulletSpeedMult: 1.0, hpRegen: 0, shotgunPellets: 7 },
  ghost: { id: 'ghost', name: '幽靈', role: '狙擊', avatar: '👁️', color: '#34d399', maxHp: 280, speed: 5.2, dmgMult: 2.5, dashCd: 2.5, ultReq: 18, fireInterval: 320, bulletSpeedMult: 1.6, hpRegen: 0, shotgunPellets: 7 },
  medic: { id: 'medic', name: '天使', role: '醫療', avatar: '🚑', color: '#f472b6', maxHp: 380, speed: 4.2, dmgMult: 1.0, dashCd: 3.0, ultReq: 20, fireInterval: 150, bulletSpeedMult: 1.0, hpRegen: 2.5, shotgunPellets: 7 },
  pyro: { id: 'pyro', name: '火煞', role: '爆炎', avatar: '🔥', color: '#f97316', maxHp: 340, speed: 4.5, dmgMult: 1.2, dashCd: 3.0, ultReq: 20, fireInterval: 160, bulletSpeedMult: 1.0, hpRegen: 0, shotgunPellets: 11 },
  shadow: { id: 'shadow', name: '影子', role: '雙槍', avatar: '🔫', color: '#60a5fa', maxHp: 310, speed: 5.2, dmgMult: 0.85, dashCd: 2.0, ultReq: 20, fireInterval: 75, bulletSpeedMult: 1.1, hpRegen: 0, shotgunPellets: 7 },
  volt: { id: 'volt', name: '電魂', role: '控場', avatar: '🔌', color: '#0ea5e9', maxHp: 260, speed: 4.8, dmgMult: 1.0, dashCd: 2.5, ultReq: 20, fireInterval: 150, bulletSpeedMult: 1.0, hpRegen: 0, shotgunPellets: 7 },
  guardian: { id: 'guardian', name: '守衛', role: '守護', avatar: '🔰', color: '#14b8a6', maxHp: 1000, speed: 4.0, dmgMult: 0.9, dashCd: 3.0, ultReq: 20, fireInterval: 150, bulletSpeedMult: 1.0, hpRegen: 1.0, shotgunPellets: 7 }
};
