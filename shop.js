// ✨ 商店：永久強化與出擊裝備
const SHOP_STORAGE_KEY = 'gameGunShopData';
const UPGRADE_DEFS = {
  maxHp: { label: '生命上限', icon: '❤️', step: 20, baseCost: 50, costStep: 30, unit: '+20 HP' },
  dmg: { label: '傷害加成', icon: '⚔️', step: 0.1, baseCost: 80, costStep: 50, unit: '+10%' },
  speed: { label: '移動速度', icon: '💨', step: 0.3, baseCost: 60, costStep: 40, unit: '+0.3' },
  dashCd: { label: '閃現冷卻', icon: '🌀', step: 0.15, baseCost: 70, costStep: 45, unit: '-0.15s CD' },
  pickup: { label: '拾取磁力範圍', icon: '🧲', step: 20, baseCost: 40, costStep: 25, unit: '+20 距離' },
  wheel: { label: '起始轉盤次數', icon: '🎡', step: 1, baseCost: 150, costStep: 120, unit: '+1 次' },
  ultReq: { label: '大招門檻降低', icon: '🚀', step: 1, baseCost: 100, costStep: 70, unit: '-1 殺' },
  hpRegen: { label: '生命回復', icon: '💚', step: 0.5, baseCost: 90, costStep: 55, unit: '+0.5 HP/s' },
  meleeCd: { label: '近戰攻速', icon: '🔪', step: 15, baseCost: 65, costStep: 40, unit: '-15ms CD' },
  expBonus: { label: '經驗加成', icon: '💎', step: 0.15, baseCost: 85, costStep: 55, unit: '+15%' },
  dodge: { label: '閃避機率', icon: '🍃', step: 0.03, baseCost: 110, costStep: 75, unit: '+3%（上限40%）' },
  healBonus: { label: '醫療效率', icon: '✨', step: 0.15, baseCost: 75, costStep: 50, unit: '+15%' }
};
const WEAPON_SHOP_COST = { rpg: 200, flamethrower: 180, minigun: 190, smg: 170, laser_rifle: 210, revolver: 160, crossbow: 175, arc_caster: 195, auto_cannon: 215, needle_gun: 200, pulse_repeater: 185, shock_cannon: 220, ion_rifle: 195, orbital_rifle: 230 };
const MELEE_SHOP_COST = { axe: 150, katana: 160, spear: 180, whip: 175, twin_daggers: 165, war_pick: 210, greataxe: 195, inferno_hammer: 210 };
const ARMOR_SHOP_COST = { light: 120, stealth: 170, alloy_armor: 140 };
const THROWABLE_SHOP_COST = { cluster_grenade: 130, molotov: 110, frost_grenade: 120, emp_grenade: 150, heavy_grenade: 170, smoke_grenade: 135, flashbang: 145, concussion_grenade: 140 };
const HOOK_SHOP_COST = { reinforced_hook: 160, razor_hook: 170, chain_hook: 155 };
// 💠 寶石限定：只能靠擊敗 Boss 掉落的寶石購買的頂級裝備
const WEAPON_GEM_COST = { nuke_gun: 5, sniper: 4, grenade_launcher: 5, railgun: 4, plasma_smg: 5 };
const MELEE_GEM_COST = { hammer: 4, scythe: 4, chainsaw: 4 };
const ARMOR_GEM_COST = { heavy: 6, nano: 4, combat: 3 };
const GEM_TO_GOLD_RATE = 50; // 寶石只能單向兌換成金幣，無法反向購買寶石

// 🔧 裝備合成：集齊該類別所有一般裝備後，額外支付合成費用即可解鎖專屬頂級裝備
const SYNTHESIS_WEAPON = 'fusion_rifle';
const SYNTHESIS_MELEE = 'void_blade';
const SYNTHESIS_ARMOR = 'phoenix_aegis';
const SYNTHESIS_THROWABLE = 'singularity_charge';
const SYNTHESIS_HOOK = 'void_harpoon';
const SYNTHESIS_COST = {
  weapon: { gold: 400, gems: 3 },
  melee: { gold: 350, gems: 3 },
  armor: { gold: 300, gems: 3 },
  throwable: { gold: 380, gems: 4 },
  hook: { gold: 350, gems: 3 }
};

// 🌠 二階合成：集齊三件一階合成裝備(熔核聚變步槍+虛空戰刃+鳳凰聖甲)後，可再合成終極武器
const SYNTHESIS_WEAPON_TIER2 = 'genesis_cannon';
// 🔮 寶石限定武器合成：集齊5把寶石限定槍械後，可合成這把高爆發狙擊槍(與一階合成是平行的另一條解鎖路線)
const SYNTHESIS_WEAPON_GEM = 'quantum_sniper';
const SYNTHESIS_GEM_COST = { gold: 500, gems: 10 };
function canSynthesizeGemWeapon() {
  return Object.keys(WEAPON_GEM_COST).every(k => shopData.ownedWeapons.includes(k));
}
// 💫 三階合成：集齊二階合成(創世粒子加農炮)與寶石合成(量子貫穿狙擊槍)兩把巔峰武器後，
// 可再融合出全遊戲傷害最高的終焉主炮(與二階/寶石合成互為平行路線的最終匯流點)
const SYNTHESIS_WEAPON_TIER3 = 'omega_cannon';
const SYNTHESIS_TIER3_COST = { gold: 900, gems: 15 };
function canSynthesizeTier3() {
  return shopData.ownedWeapons.includes(SYNTHESIS_WEAPON_TIER2) && shopData.ownedWeapons.includes(SYNTHESIS_WEAPON_GEM);
}
// 🌑 寶石限定近戰合成：集齊3把寶石限定近戰武器後，可合成這把高爆發收割鐮刀(與武器寶石合成平行的另一條近戰路線)
const SYNTHESIS_MELEE_GEM = 'void_reaper';
const SYNTHESIS_MELEE_GEM_COST = { gold: 400, gems: 8 };
function canSynthesizeGemMelee() {
  return Object.keys(MELEE_GEM_COST).every(k => shopData.ownedMelees.includes(k));
}
// 🧿 寶石限定防具合成：集齊3件寶石限定防具後，可合成這件減傷最高的終極庇護甲(與武器/近戰寶石合成平行的防具路線)
const SYNTHESIS_ARMOR_GEM = 'void_aegis';
const SYNTHESIS_ARMOR_GEM_COST = { gold: 420, gems: 9 };
function canSynthesizeGemArmor() {
  return Object.keys(ARMOR_GEM_COST).every(k => shopData.ownedArmors.includes(k));
}
// 🌌 合成技能：集齊四大類別的一階合成裝備(熔核聚變步槍+虛空戰刃+鳳凰聖甲+奇點核彈)後，
// 解鎖「虛空湮滅」技能，無需另外花費，純粹是製造大師身分的獎勵
function canSynthesizeSkill() {
  return shopData.ownedWeapons.includes(SYNTHESIS_WEAPON) &&
    shopData.ownedMelees.includes(SYNTHESIS_MELEE) &&
    shopData.ownedArmors.includes(SYNTHESIS_ARMOR) &&
    shopData.ownedThrowables.includes(SYNTHESIS_THROWABLE);
}
// 一階合成的「集齊其他裝備」判定要排除所有合成裝備本身，避免跟二階/寶石合成互相卡循環依賴
const ALL_SYNTHESIS_KEYS = [SYNTHESIS_WEAPON, SYNTHESIS_MELEE, SYNTHESIS_ARMOR, SYNTHESIS_THROWABLE, SYNTHESIS_HOOK, SYNTHESIS_WEAPON_TIER2, SYNTHESIS_WEAPON_TIER3, SYNTHESIS_WEAPON_GEM, SYNTHESIS_MELEE_GEM, SYNTHESIS_ARMOR_GEM];

function canSynthesize(allKeys, ownedKeys, synthesisKey) {
  return allKeys.filter(k => k !== 'default' && k !== 'knife' && k !== 'none' && !ALL_SYNTHESIS_KEYS.includes(k))
    .every(k => ownedKeys.includes(k));
}
const SYNTHESIS_TIER2_COST = { gold: 700, gems: 8 };
function canSynthesizeTier2() {
  return shopData.ownedWeapons.includes(SYNTHESIS_WEAPON) &&
    shopData.ownedMelees.includes(SYNTHESIS_MELEE) &&
    shopData.ownedArmors.includes(SYNTHESIS_ARMOR);
}

const DEFAULT_UPGRADES = { maxHp: 0, dmg: 0, speed: 0, dashCd: 0, pickup: 0, wheel: 0, ultReq: 0, hpRegen: 0, meleeCd: 0, expBonus: 0, dodge: 0, healBonus: 0 };

let shopData = {
  gold: 0,
  gems: 0,
  upgrades: { ...DEFAULT_UPGRADES },
  ownedWeapons: ['default'],
  starterWeapon: 'default',
  ownedMelees: ['knife'],
  starterMelee: 'knife',
  ownedArmors: ['none'],
  starterArmor: 'none',
  ownedThrowables: ['default'],
  starterThrowable: 'default',
  ownedHooks: ['default'],
  starterHook: 'default'
};

function loadShopData() {
  try {
    let raw = localStorage.getItem(SHOP_STORAGE_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      Object.assign(shopData, parsed);
      shopData.upgrades = Object.assign({ ...DEFAULT_UPGRADES }, parsed.upgrades);
    }
  } catch (e) {}
}
function saveShopData() {
  try { localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(shopData)); } catch (e) {}
}

function updateGoldDisplays() {
  document.getElementById('shopGoldBadgeTop').innerText = shopData.gold;
  document.getElementById('shopGemBadgeTop').innerText = shopData.gems;
  let goldDisplay = document.getElementById('shopGoldDisplay');
  if (goldDisplay) goldDisplay.innerText = shopData.gold;
  let gemDisplay = document.getElementById('shopGemDisplay');
  if (gemDisplay) gemDisplay.innerText = shopData.gems;
}

function openShopModal() {
  document.getElementById('shopModal').classList.remove('hidden');
  renderShop();
}

function closeShopModal() {
  document.getElementById('shopModal').classList.add('hidden');
}

function exchangeGems(count) {
  count = Math.min(count, shopData.gems);
  if (count <= 0) return;
  shopData.gems -= count;
  shopData.gold += count * GEM_TO_GOLD_RATE;
  saveShopData();
  renderShop();
}

function exchangeAllGems() {
  exchangeGems(shopData.gems);
}

function buyUpgrade(key) {
  let def = UPGRADE_DEFS[key];
  let count = shopData.upgrades[key];
  let cost = def.baseCost + count * def.costStep;
  if (shopData.gold < cost) return;
  shopData.gold -= cost;
  shopData.upgrades[key] = count + 1;
  saveShopData();
  renderShop();
}

function buyOrEquipWeapon(key) {
  if (!shopData.ownedWeapons.includes(key)) {
    if (key === SYNTHESIS_WEAPON_TIER3) {
      if (!canSynthesizeTier3()) return;
      let cost = SYNTHESIS_TIER3_COST;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key === SYNTHESIS_WEAPON_TIER2) {
      if (!canSynthesizeTier2()) return;
      let cost = SYNTHESIS_TIER2_COST;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key === SYNTHESIS_WEAPON_GEM) {
      if (!canSynthesizeGemWeapon()) return;
      let cost = SYNTHESIS_GEM_COST;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key === SYNTHESIS_WEAPON) {
      if (!canSynthesize(Object.keys(WAR_WEAPONS), shopData.ownedWeapons, key)) return;
      let cost = SYNTHESIS_COST.weapon;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key in WEAPON_GEM_COST) {
      let cost = WEAPON_GEM_COST[key];
      if (shopData.gems < cost) return;
      shopData.gems -= cost;
    } else {
      let cost = WEAPON_SHOP_COST[key];
      if (shopData.gold < cost) return;
      shopData.gold -= cost;
    }
    shopData.ownedWeapons.push(key);
  }
  shopData.starterWeapon = key;
  saveShopData();
  renderShop();
}

function buyOrEquipMelee(key) {
  if (!shopData.ownedMelees.includes(key)) {
    if (key === SYNTHESIS_MELEE_GEM) {
      if (!canSynthesizeGemMelee()) return;
      let cost = SYNTHESIS_MELEE_GEM_COST;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key === SYNTHESIS_MELEE) {
      if (!canSynthesize(Object.keys(MELEE_WEAPONS), shopData.ownedMelees, key)) return;
      let cost = SYNTHESIS_COST.melee;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key in MELEE_GEM_COST) {
      let cost = MELEE_GEM_COST[key];
      if (shopData.gems < cost) return;
      shopData.gems -= cost;
    } else {
      let cost = MELEE_SHOP_COST[key];
      if (shopData.gold < cost) return;
      shopData.gold -= cost;
    }
    shopData.ownedMelees.push(key);
  }
  shopData.starterMelee = key;
  saveShopData();
  renderShop();
}

function buyOrEquipArmor(key) {
  if (!shopData.ownedArmors.includes(key)) {
    if (key === SYNTHESIS_ARMOR_GEM) {
      if (!canSynthesizeGemArmor()) return;
      let cost = SYNTHESIS_ARMOR_GEM_COST;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key === SYNTHESIS_ARMOR) {
      if (!canSynthesize(Object.keys(ARMORS), shopData.ownedArmors, key)) return;
      let cost = SYNTHESIS_COST.armor;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else if (key in ARMOR_GEM_COST) {
      let cost = ARMOR_GEM_COST[key];
      if (shopData.gems < cost) return;
      shopData.gems -= cost;
    } else {
      let cost = ARMOR_SHOP_COST[key];
      if (shopData.gold < cost) return;
      shopData.gold -= cost;
    }
    shopData.ownedArmors.push(key);
  }
  shopData.starterArmor = key;
  saveShopData();
  renderShop();
}

function buyOrEquipThrowable(key) {
  if (!shopData.ownedThrowables.includes(key)) {
    if (key === SYNTHESIS_THROWABLE) {
      if (!canSynthesize(Object.keys(THROWABLES), shopData.ownedThrowables, key)) return;
      let cost = SYNTHESIS_COST.throwable;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else {
      let cost = THROWABLE_SHOP_COST[key] || 0;
      if (shopData.gold < cost) return;
      shopData.gold -= cost;
    }
    shopData.ownedThrowables.push(key);
  }
  shopData.starterThrowable = key;
  saveShopData();
  renderShop();
}

function buyOrEquipHook(key) {
  if (!shopData.ownedHooks.includes(key)) {
    if (key === SYNTHESIS_HOOK) {
      if (!canSynthesize(Object.keys(HOOKS), shopData.ownedHooks, key)) return;
      let cost = SYNTHESIS_COST.hook;
      if (shopData.gold < cost.gold || shopData.gems < cost.gems) return;
      shopData.gold -= cost.gold; shopData.gems -= cost.gems;
    } else {
      let cost = HOOK_SHOP_COST[key] || 0;
      if (shopData.gold < cost) return;
      shopData.gold -= cost;
    }
    shopData.ownedHooks.push(key);
  }
  shopData.starterHook = key;
  saveShopData();
  renderShop();
}

function renderShop() {
  updateGoldDisplays();

  let upgradesHtml = Object.keys(UPGRADE_DEFS).map(key => {
    let def = UPGRADE_DEFS[key];
    let count = shopData.upgrades[key];
    let cost = def.baseCost + count * def.costStep;
    let affordable = shopData.gold >= cost;
    return `
      <div class="bg-slate-800/80 border border-slate-700 rounded-xl p-3 flex flex-col items-center text-center">
        <div class="text-2xl mb-1">${def.icon}</div>
        <div class="text-xs font-bold text-slate-200">${def.label}</div>
        <div class="text-[10px] text-slate-400 mb-2">已強化 ${count} 次 (${def.unit}/次)</div>
        <button onclick="buyUpgrade('${key}')" ${affordable ? '' : 'disabled'} class="w-full text-xs font-black py-1.5 rounded-lg transition ${affordable ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}">
          💰 ${cost}
        </button>
      </div>`;
  }).join('');
  document.getElementById('shopUpgradesList').innerHTML = upgradesHtml;

  let weaponsHtml = Object.keys(WAR_WEAPONS).map(key => {
    let w = WAR_WEAPONS[key];
    let owned = shopData.ownedWeapons.includes(key);
    let equipped = shopData.starterWeapon === key;
    let isSynth = key === SYNTHESIS_WEAPON;
    let isTier2 = key === SYNTHESIS_WEAPON_TIER2;
    let isTier3 = key === SYNTHESIS_WEAPON_TIER3;
    let isGemSynth = key === SYNTHESIS_WEAPON_GEM;
    let isGem = key in WEAPON_GEM_COST;
    let synthReady = isSynth && canSynthesize(Object.keys(WAR_WEAPONS), shopData.ownedWeapons, key);
    let tier2Ready = isTier2 && canSynthesizeTier2();
    let tier3Ready = isTier3 && canSynthesizeTier3();
    let gemSynthReady = isGemSynth && canSynthesizeGemWeapon();
    let cost = isTier3 ? SYNTHESIS_TIER3_COST : (isTier2 ? SYNTHESIS_TIER2_COST : (isGemSynth ? SYNTHESIS_GEM_COST : (isSynth ? SYNTHESIS_COST.weapon : (isGem ? WEAPON_GEM_COST[key] : (WEAPON_SHOP_COST[key] || 0)))));
    let affordable = owned || (isTier3 ? (tier3Ready && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isTier2 ? (tier2Ready && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isGemSynth ? (gemSynthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isSynth ? (synthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isGem ? shopData.gems >= cost : shopData.gold >= cost)))));
    return `
      <div class="bg-slate-800/80 border-2 ${equipped ? 'border-amber-400' : (isTier3 ? 'border-pink-300/80' : (isTier2 ? 'border-yellow-300/80' : (isGemSynth ? 'border-cyan-300/80' : (isSynth ? 'border-fuchsia-500/70' : (isGem ? 'border-cyan-500/60' : 'border-slate-700')))))} rounded-xl p-2 flex flex-col items-center text-center">
        <div class="text-xl mb-1">${w.icon}</div>
        <div class="text-[11px] font-bold text-slate-200 leading-tight mb-1">${w.name}</div>
        ${isTier3 ? `<div class="text-[9px] text-pink-300 mb-1">💫 終焉合成${owned ? '' : (tier3Ready ? '' : '（需先擁有二階+寶石合成武器）')}</div>` : ''}
        ${isTier2 ? `<div class="text-[9px] text-yellow-300 mb-1">🌠 終極合成${owned ? '' : (tier2Ready ? '' : '（需先合成3件一階裝備）')}</div>` : ''}
        ${isGemSynth ? `<div class="text-[9px] text-cyan-300 mb-1">🔮 寶石合成${owned ? '' : (gemSynthReady ? '' : '（需集齊5把寶石槍械）')}</div>` : ''}
        ${isSynth ? `<div class="text-[9px] text-fuchsia-400 mb-1">🔧 合成專屬${owned ? '' : (synthReady ? '' : '（需集齊其他槍械）')}</div>` : ''}
        <button onclick="buyOrEquipWeapon('${key}')" ${affordable ? '' : 'disabled'} class="w-full text-[10px] font-black py-1.5 rounded-lg transition ${equipped ? 'bg-amber-500 text-slate-950' : (owned ? 'bg-slate-600 hover:bg-slate-500 text-white' : (affordable ? (isTier3 ? 'bg-pink-500 hover:bg-pink-400 text-slate-950' : (isTier2 ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-950' : (isGemSynth ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : (isSynth ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : (isGem ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'))))) : 'bg-slate-700 text-slate-500 cursor-not-allowed'))}">
          ${equipped ? '✓ 已裝備' : (owned ? '裝備' : ((isTier3 || isTier2 || isSynth || isGemSynth) ? `${isTier3 ? '💫' : (isTier2 ? '🌠' : (isGemSynth ? '🔮' : '🔧'))} 合成 💰${cost.gold} 💠${cost.gems}` : (cost > 0 ? `${isGem ? '💠' : '💰'} ${cost}` : '免費')))}
        </button>
      </div>`;
  }).join('');
  document.getElementById('shopWeaponsList').innerHTML = weaponsHtml;

  let meleeHtml = Object.keys(MELEE_WEAPONS).map(key => {
    let m = MELEE_WEAPONS[key];
    let owned = shopData.ownedMelees.includes(key);
    let equipped = shopData.starterMelee === key;
    let isSynth = key === SYNTHESIS_MELEE;
    let isGemSynth = key === SYNTHESIS_MELEE_GEM;
    let isGem = key in MELEE_GEM_COST;
    let synthReady = isSynth && canSynthesize(Object.keys(MELEE_WEAPONS), shopData.ownedMelees, key);
    let gemSynthReady = isGemSynth && canSynthesizeGemMelee();
    let cost = isGemSynth ? SYNTHESIS_MELEE_GEM_COST : (isSynth ? SYNTHESIS_COST.melee : (isGem ? MELEE_GEM_COST[key] : (MELEE_SHOP_COST[key] || 0)));
    let affordable = owned || (isGemSynth ? (gemSynthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isSynth ? (synthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isGem ? shopData.gems >= cost : shopData.gold >= cost)));
    return `
      <div class="bg-slate-800/80 border-2 ${equipped ? 'border-amber-400' : (isGemSynth ? 'border-cyan-300/80' : (isSynth ? 'border-fuchsia-500/70' : (isGem ? 'border-cyan-500/60' : 'border-slate-700')))} rounded-xl p-2 flex flex-col items-center text-center">
        <div class="text-xl mb-1">${m.icon}</div>
        <div class="text-[11px] font-bold text-slate-200 leading-tight mb-1">${m.name}</div>
        ${isGemSynth ? `<div class="text-[9px] text-cyan-300 mb-1">🔮 寶石合成${owned ? '' : (gemSynthReady ? '' : '（需集齊3把寶石近戰武器）')}</div>` : ''}
        ${isSynth ? `<div class="text-[9px] text-fuchsia-400 mb-1">🔧 合成專屬${owned ? '' : (synthReady ? '' : '（需集齊其他近戰武器）')}</div>` : ''}
        <button onclick="buyOrEquipMelee('${key}')" ${affordable ? '' : 'disabled'} class="w-full text-[10px] font-black py-1.5 rounded-lg transition ${equipped ? 'bg-amber-500 text-slate-950' : (owned ? 'bg-slate-600 hover:bg-slate-500 text-white' : (affordable ? (isGemSynth ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : (isSynth ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : (isGem ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'))) : 'bg-slate-700 text-slate-500 cursor-not-allowed'))}">
          ${equipped ? '✓ 已裝備' : (owned ? '裝備' : ((isSynth || isGemSynth) ? `${isGemSynth ? '🔮' : '🔧'} 合成 💰${cost.gold} 💠${cost.gems}` : (cost > 0 ? `${isGem ? '💠' : '💰'} ${cost}` : '免費')))}
        </button>
      </div>`;
  }).join('');
  document.getElementById('shopMeleeList').innerHTML = meleeHtml;

  let armorHtml = Object.keys(ARMORS).map(key => {
    let a = ARMORS[key];
    let owned = shopData.ownedArmors.includes(key);
    let equipped = shopData.starterArmor === key;
    let isSynth = key === SYNTHESIS_ARMOR;
    let isGemSynth = key === SYNTHESIS_ARMOR_GEM;
    let isGem = key in ARMOR_GEM_COST;
    let synthReady = isSynth && canSynthesize(Object.keys(ARMORS), shopData.ownedArmors, key);
    let gemSynthReady = isGemSynth && canSynthesizeGemArmor();
    let cost = isGemSynth ? SYNTHESIS_ARMOR_GEM_COST : (isSynth ? SYNTHESIS_COST.armor : (isGem ? ARMOR_GEM_COST[key] : (ARMOR_SHOP_COST[key] || 0)));
    let affordable = owned || (isGemSynth ? (gemSynthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isSynth ? (synthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : (isGem ? shopData.gems >= cost : shopData.gold >= cost)));
    return `
      <div class="bg-slate-800/80 border-2 ${equipped ? 'border-amber-400' : (isGemSynth ? 'border-cyan-300/80' : (isSynth ? 'border-fuchsia-500/70' : (isGem ? 'border-cyan-500/60' : 'border-slate-700')))} rounded-xl p-2 flex flex-col items-center text-center">
        <div class="text-xl mb-1">${a.icon}</div>
        <div class="text-[11px] font-bold text-slate-200 leading-tight">${a.name}</div>
        <div class="text-[10px] text-slate-400 mb-1">減傷 ${Math.round(a.reduction * 100)}%</div>
        ${isGemSynth ? `<div class="text-[9px] text-cyan-300 mb-1">🔮 寶石合成${owned ? '' : (gemSynthReady ? '' : '（需集齊3件寶石防具）')}</div>` : ''}
        ${isSynth ? `<div class="text-[9px] text-fuchsia-400 mb-1">🔧 合成專屬${owned ? '' : (synthReady ? '' : '（需集齊其他盔甲）')}</div>` : ''}
        <button onclick="buyOrEquipArmor('${key}')" ${affordable ? '' : 'disabled'} class="w-full text-[10px] font-black py-1.5 rounded-lg transition ${equipped ? 'bg-amber-500 text-slate-950' : (owned ? 'bg-slate-600 hover:bg-slate-500 text-white' : (affordable ? (isGemSynth ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : (isSynth ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : (isGem ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'))) : 'bg-slate-700 text-slate-500 cursor-not-allowed'))}">
          ${equipped ? '✓ 已裝備' : (owned ? '裝備' : ((isSynth || isGemSynth) ? `${isGemSynth ? '🔮' : '🔧'} 合成 💰${cost.gold} 💠${cost.gems}` : (cost > 0 ? `${isGem ? '💠' : '💰'} ${cost}` : '免費')))}
        </button>
      </div>`;
  }).join('');
  document.getElementById('shopArmorList').innerHTML = armorHtml;

  let throwableHtml = Object.keys(THROWABLES).map(key => {
    let t = THROWABLES[key];
    let owned = shopData.ownedThrowables.includes(key);
    let equipped = shopData.starterThrowable === key;
    let isSynth = key === SYNTHESIS_THROWABLE;
    let synthReady = isSynth && canSynthesize(Object.keys(THROWABLES), shopData.ownedThrowables, key);
    let cost = isSynth ? SYNTHESIS_COST.throwable : (THROWABLE_SHOP_COST[key] || 0);
    let affordable = owned || (isSynth ? (synthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : shopData.gold >= cost);
    return `
      <div class="bg-slate-800/80 border-2 ${equipped ? 'border-amber-400' : (isSynth ? 'border-fuchsia-500/70' : 'border-slate-700')} rounded-xl p-2 flex flex-col items-center text-center">
        <div class="text-xl mb-1">${t.icon}</div>
        <div class="text-[11px] font-bold text-slate-200 leading-tight">${t.name}</div>
        <div class="text-[10px] text-slate-400 mb-1">傷害${t.dmg} / 範圍${t.radius}</div>
        ${isSynth ? `<div class="text-[9px] text-fuchsia-400 mb-1">🔧 合成專屬${owned ? '' : (synthReady ? '' : '（需集齊其他投擲物）')}</div>` : ''}
        <button onclick="buyOrEquipThrowable('${key}')" ${affordable ? '' : 'disabled'} class="w-full text-[10px] font-black py-1.5 rounded-lg transition ${equipped ? 'bg-amber-500 text-slate-950' : (owned ? 'bg-slate-600 hover:bg-slate-500 text-white' : (affordable ? (isSynth ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white') : 'bg-slate-700 text-slate-500 cursor-not-allowed'))}">
          ${equipped ? '✓ 已裝備' : (owned ? '裝備' : (isSynth ? `🔧 合成 💰${cost.gold} 💠${cost.gems}` : (cost > 0 ? `💰 ${cost}` : '免費')))}
        </button>
      </div>`;
  }).join('');
  document.getElementById('shopThrowableList').innerHTML = throwableHtml;

  let hookHtml = Object.keys(HOOKS).map(key => {
    let h = HOOKS[key];
    let owned = shopData.ownedHooks.includes(key);
    let equipped = shopData.starterHook === key;
    let isSynth = key === SYNTHESIS_HOOK;
    let synthReady = isSynth && canSynthesize(Object.keys(HOOKS), shopData.ownedHooks, key);
    let cost = isSynth ? SYNTHESIS_COST.hook : (HOOK_SHOP_COST[key] || 0);
    let affordable = owned || (isSynth ? (synthReady && shopData.gold >= cost.gold && shopData.gems >= cost.gems) : shopData.gold >= cost);
    return `
      <div class="bg-slate-800/80 border-2 ${equipped ? 'border-amber-400' : (isSynth ? 'border-fuchsia-500/70' : 'border-slate-700')} rounded-xl p-2 flex flex-col items-center text-center">
        <div class="text-xl mb-1">${h.icon}</div>
        <div class="text-[11px] font-bold text-slate-200 leading-tight">${h.name}</div>
        <div class="text-[10px] text-slate-400 mb-1">傷害${h.dmg} / 範圍${h.range}</div>
        ${isSynth ? `<div class="text-[9px] text-fuchsia-400 mb-1">🔧 合成專屬${owned ? '' : (synthReady ? '' : '（需集齊其他鉤爪）')}</div>` : ''}
        <button onclick="buyOrEquipHook('${key}')" ${affordable ? '' : 'disabled'} class="w-full text-[10px] font-black py-1.5 rounded-lg transition ${equipped ? 'bg-amber-500 text-slate-950' : (owned ? 'bg-slate-600 hover:bg-slate-500 text-white' : (affordable ? (isSynth ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white') : 'bg-slate-700 text-slate-500 cursor-not-allowed'))}">
          ${equipped ? '✓ 已裝備' : (owned ? '裝備' : (isSynth ? `🔧 合成 💰${cost.gold} 💠${cost.gems}` : (cost > 0 ? `💰 ${cost}` : '免費')))}
        </button>
      </div>`;
  }).join('');
  document.getElementById('shopHookList').innerHTML = hookHtml;
}

loadShopData();
updateGoldDisplays();
