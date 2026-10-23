const SUPPORT_WEAPONS = {
  default: { id: 'default', name: '急救包', icon: '🩹', cooldown: 20, color: '#4ade80', heal: 0.25 },
  shield_pack: { id: 'shield_pack', name: '護盾發生器', icon: '🛡️', cooldown: 26, color: '#38bdf8', shieldFrames: 150 },
  jetpack: { id: 'jetpack', name: '疾速噴射背包', icon: '🚀', cooldown: 18, color: '#facc15', speedBoostFrames: 360, speedBoostMult: 1.8 },
  emp_device: { id: 'emp_device', name: '電磁脈衝裝置', icon: '⚡', cooldown: 24, color: '#a855f7', empRadius: 260, empStunFrames: 150 },
  resupply_kit: { id: 'resupply_kit', name: '彈藥補給箱', icon: '🧰', cooldown: 16, color: '#fbbf24', ammoResupply: true },
  overclock_module: { id: 'overclock_module', name: '超頻裝置', icon: '🔄', cooldown: 22, color: '#f97316', cdReset: true }
};
