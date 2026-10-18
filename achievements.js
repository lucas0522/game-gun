// ✨ 成就系統：累積數據達標時自動解鎖，獲得金幣/寶石獎勵
const ACHIEVEMENT_STORAGE_KEY = 'gameGunAchievementData';

const ACHIEVEMENTS = {
  first_blood: { id: 'first_blood', name: '初次見血', icon: '🔫', desc: '累積擊殺 1 隻敵人', reward: { gold: 20 }, check: s => s.totalKills >= 1 },
  kills_100: { id: 'kills_100', name: '獵殺新手', icon: '🎯', desc: '累積擊殺 100 隻敵人', reward: { gold: 50 }, check: s => s.totalKills >= 100 },
  kills_500: { id: 'kills_500', name: '殺戮機器', icon: '💀', desc: '累積擊殺 500 隻敵人', reward: { gold: 100 }, check: s => s.totalKills >= 500 },
  kills_2000: { id: 'kills_2000', name: '滅世屠夫', icon: '☠️', desc: '累積擊殺 2000 隻敵人', reward: { gold: 200, gems: 1 }, check: s => s.totalKills >= 2000 },
  boss_1: { id: 'boss_1', name: '首殺王座', icon: '🏆', desc: '擊敗第一隻 Boss', reward: { gold: 30 }, check: s => s.totalBossKills >= 1 },
  boss_10: { id: 'boss_10', name: '王座收割者', icon: '👑', desc: '累積擊敗 10 隻 Boss', reward: { gold: 100, gems: 1 }, check: s => s.totalBossKills >= 10 },
  boss_50: { id: 'boss_50', name: '屠神者', icon: '🔥', desc: '累積擊敗 50 隻 Boss', reward: { gold: 250, gems: 3 }, check: s => s.totalBossKills >= 50 },
  level_1: { id: 'level_1', name: '新兵畢業', icon: '🌱', desc: '通關第一關', reward: { gold: 30 }, check: s => s.highestLevelCleared >= 1 },
  level_5: { id: 'level_5', name: '血色黎明', icon: '🩸', desc: '通關第五關', reward: { gold: 80 }, check: s => s.highestLevelCleared >= 5 },
  level_14: { id: 'level_14', name: '終末之門', icon: '🌈', desc: '通關最終第十四關', reward: { gold: 300, gems: 5 }, check: s => s.highestLevelCleared >= 14 },
  hard_clear: { id: 'hard_clear', name: '困難挑戰者', icon: '🔥', desc: '以困難難度通關任意一關', reward: { gold: 100 }, check: s => s.hardCleared },
  nightmare_clear: { id: 'nightmare_clear', name: '惡夢征服者', icon: '💀', desc: '以惡夢難度通關任意一關', reward: { gold: 200, gems: 2 }, check: s => s.nightmareCleared },
  elemental_100: { id: 'elemental_100', name: '元素使者', icon: '🌀', desc: '累積觸發 100 次元素效果', reward: { gold: 80, gems: 1 }, check: s => s.elementalProcs >= 100 },
  mount_rider: { id: 'mount_rider', name: '馭獸騎士', icon: '🐴', desc: '累積騎乘坐騎 60 秒', reward: { gold: 50 }, check: s => s.mountRideSeconds >= 60 },
  rich_1: { id: 'rich_1', name: '小富翁', icon: '💰', desc: '單次持有金幣達 500', reward: { gems: 1 }, check: (s, shop) => shop.gold >= 500 },
  rich_2: { id: 'rich_2', name: '金幣大亨', icon: '💎', desc: '單次持有金幣達 2000', reward: { gems: 3 }, check: (s, shop) => shop.gold >= 2000 },
  weapon_collector: { id: 'weapon_collector', name: '軍火收藏家', icon: '🧰', desc: '擁有 10 種不同武器', reward: { gems: 2 }, check: (s, shop) => shop.ownedWeapons.length >= 10 },
  games_10: { id: 'games_10', name: '屢敗屢戰', icon: '🎮', desc: '累積出擊 10 場戰鬥', reward: { gold: 60 }, check: s => s.gamesPlayed >= 10 },
  deaths_1: { id: 'deaths_1', name: '初次挫敗', icon: '💔', desc: '首次任務失敗 / 戰損撤退', reward: { gold: 10 }, check: s => s.totalDeaths >= 1 },
  deaths_20: { id: 'deaths_20', name: '愈戰愈勇', icon: '😵', desc: '累積任務失敗 20 次', reward: { gold: 50 }, check: s => s.totalDeaths >= 20 },
  ult_master: { id: 'ult_master', name: '究極殲滅者', icon: '🚀', desc: '累積使用大招 50 次', reward: { gold: 60 }, check: s => s.ultUses >= 50 },
  dash_master: { id: 'dash_master', name: '瞬影疾行', icon: '🌀', desc: '累積使用閃現 100 次', reward: { gold: 60 }, check: s => s.dashUses >= 100 },
  mount_skills_50: { id: 'mount_skills_50', name: '馭獸戰術家', icon: '🐾', desc: '累積使用坐騎技能 50 次', reward: { gold: 70 }, check: s => s.mountSkillUses >= 50 },
  mount_rider_300: { id: 'mount_rider_300', name: '馳騁疆場', icon: '🏇', desc: '累積騎乘坐騎 300 秒', reward: { gold: 100 }, check: s => s.mountRideSeconds >= 300 },
  gold_earned_5000: { id: 'gold_earned_5000', name: '金庫鉅子', icon: '🏦', desc: '累積賺取金幣達 5000', reward: { gems: 2 }, check: s => s.totalGoldEarned >= 5000 },
  elemental_500: { id: 'elemental_500', name: '元素宗師', icon: '⚡', desc: '累積觸發 500 次元素效果', reward: { gems: 2 }, check: s => s.elementalProcs >= 500 },
  all_mounts: { id: 'all_mounts', name: '萬獸之友', icon: '🦄', desc: '收集所有坐騎外觀', reward: { gems: 3 }, check: (s, shop) => shop.ownedMounts.length >= Object.keys(MOUNTS).length },
  synthesis_master: { id: 'synthesis_master', name: '合成大師', icon: '🔧', desc: '擁有任一合成專屬武器', reward: { gems: 2 }, check: (s, shop) => shop.ownedWeapons.includes(SYNTHESIS_WEAPON) },
  apex_master: { id: 'apex_master', name: '終焉主宰', icon: '👑', desc: '集齊五大頂峰裝備，解鎖終焉主宰技能', reward: { gold: 500, gems: 10 }, check: () => typeof canSynthesizeApexSkill === 'function' && canSynthesizeApexSkill() },
  hard_level10: { id: 'hard_level10', name: '困難深淵', icon: '🔥', desc: '以困難難度通關第十關以上', reward: { gold: 150 }, check: s => s.hardHighestLevel >= 10 },
  nightmare_level5: { id: 'nightmare_level5', name: '惡夢征途', icon: '💀', desc: '以惡夢難度通關第五關以上', reward: { gold: 200, gems: 2 }, check: s => s.nightmareHighestLevel >= 5 },
  all_melee: { id: 'all_melee', name: '兵器大師', icon: '🗡️', desc: '收集所有近戰武器', reward: { gems: 2 }, check: (s, shop) => shop.ownedMelees.length >= Object.keys(MELEE_WEAPONS).length },
  all_armor: { id: 'all_armor', name: '全副武裝', icon: '🛡️', desc: '收集所有盔甲', reward: { gems: 2 }, check: (s, shop) => shop.ownedArmors.length >= Object.keys(ARMORS).length },
  all_throwables: { id: 'all_throwables', name: '爆破專家', icon: '💣', desc: '收集所有投擲物', reward: { gems: 2 }, check: (s, shop) => shop.ownedThrowables.length >= Object.keys(THROWABLES).length },
  all_hooks: { id: 'all_hooks', name: '鉤索獵人', icon: '🪝', desc: '收集所有鉤爪', reward: { gems: 2 }, check: (s, shop) => shop.ownedHooks.length >= Object.keys(HOOKS).length },
  boss_variety: { id: 'boss_variety', name: '群雄逐鹿', icon: '🐲', desc: '擊敗所有種類的 Boss 至少一次', reward: { gold: 150, gems: 2 }, check: s => s.bossTypesKilled.length >= BOSS_TYPES.length },
  damage_10k: { id: 'damage_10k', name: '火力展示', icon: '💥', desc: '子彈累積造成傷害達 10000', reward: { gold: 80 }, check: s => s.totalDamageDealt >= 10000 },
  damage_100k: { id: 'damage_100k', name: '傷害狂潮', icon: '🌊', desc: '子彈累積造成傷害達 100000', reward: { gems: 3 }, check: s => s.totalDamageDealt >= 100000 },
  first_upgrade: { id: 'first_upgrade', name: '自我投資', icon: '📈', desc: '首次購買永久強化', reward: { gold: 20 }, check: (s, shop) => Object.values(shop.upgrades).some(v => v > 0) },
  gem_trader: { id: 'gem_trader', name: '寶石商人', icon: '💱', desc: '累積兌換 10 顆寶石為金幣', reward: { gold: 50 }, check: s => s.gemsExchanged >= 10 },
  frenzy_10: { id: 'frenzy_10', name: '狂暴成癮', icon: '🌪️', desc: '累積觸發狂暴模式 10 次', reward: { gold: 60 }, check: s => s.frenzyTriggers >= 10 },
  playtime_30min: { id: 'playtime_30min', name: '沙場老兵', icon: '⏱️', desc: '累積遊玩時間達 30 分鐘', reward: { gold: 100 }, check: s => s.totalPlaySeconds >= 1800 },
  omega_owner: { id: 'omega_owner', name: '終焉主炮', icon: '☄️', desc: '合成出全遊戲傷害最高的終焉主炮', reward: { gold: 300, gems: 5 }, check: (s, shop) => shop.ownedWeapons.includes(SYNTHESIS_WEAPON_TIER3) }
};

const DEFAULT_ACHIEVEMENT_STATS = {
  totalKills: 0, totalBossKills: 0, gamesPlayed: 0, highestLevelCleared: 0,
  hardCleared: false, nightmareCleared: false, elementalProcs: 0, mountRideSeconds: 0,
  totalDeaths: 0, ultUses: 0, dashUses: 0, mountSkillUses: 0, totalGoldEarned: 0,
  hardHighestLevel: 0, nightmareHighestLevel: 0, bossTypesKilled: [], totalDamageDealt: 0,
  gemsExchanged: 0, frenzyTriggers: 0, totalPlaySeconds: 0
};

let achievementData = { unlocked: [], stats: { ...DEFAULT_ACHIEVEMENT_STATS } };

function loadAchievementData() {
  try {
    let raw = localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (raw) {
      let parsed = JSON.parse(raw);
      achievementData.unlocked = parsed.unlocked || [];
      achievementData.stats = Object.assign({ ...DEFAULT_ACHIEVEMENT_STATS }, parsed.stats);
    }
  } catch (e) {}
}
function saveAchievementData() {
  try { localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(achievementData)); } catch (e) {}
}

// ✨ 掃描所有成就條件，新達標者發放獎勵、彈出提示並記錄解鎖狀態
function checkAchievements() {
  let newlyUnlocked = [];
  for (let key in ACHIEVEMENTS) {
    if (achievementData.unlocked.includes(key)) continue;
    let ach = ACHIEVEMENTS[key];
    if (ach.check(achievementData.stats, shopData)) {
      achievementData.unlocked.push(key);
      if (ach.reward.gold) shopData.gold += ach.reward.gold;
      if (ach.reward.gems) shopData.gems += ach.reward.gems;
      newlyUnlocked.push(ach);
    }
  }
  if (newlyUnlocked.length > 0) {
    saveAchievementData();
    saveShopData();
    updateGoldDisplays();
    updateAchievementBadge();
    newlyUnlocked.forEach(ach => {
      let rewardText = [ach.reward.gold ? `💰${ach.reward.gold}` : '', ach.reward.gems ? `💠${ach.reward.gems}` : ''].filter(Boolean).join(' ');
      if (typeof addFloatingText === 'function' && typeof player !== 'undefined' && gameState === 'PLAYING') {
        addFloatingText(player.x, player.y - 60, `🏆 成就解鎖：${ach.name}！ ${rewardText}`, '#facc15');
      }
    });
  }
  return newlyUnlocked;
}

function updateAchievementBadge() {
  let badge = document.getElementById('achievementBadgeTop');
  let total = document.getElementById('achievementTotalTop');
  if (badge) badge.innerText = achievementData.unlocked.length;
  if (total) total.innerText = Object.keys(ACHIEVEMENTS).length;
}

function openAchievementModal() {
  document.getElementById('achievementModal').classList.remove('hidden');
  renderAchievements();
}
function closeAchievementModal() {
  document.getElementById('achievementModal').classList.add('hidden');
}

function renderAchievements() {
  let unlockedCount = achievementData.unlocked.length;
  let totalCount = Object.keys(ACHIEVEMENTS).length;
  document.getElementById('achievementProgress').innerText = `${unlockedCount} / ${totalCount}`;
  document.getElementById('achievementList').innerHTML = Object.keys(ACHIEVEMENTS).map(key => {
    let ach = ACHIEVEMENTS[key];
    let unlocked = achievementData.unlocked.includes(key);
    let rewardText = [ach.reward.gold ? `💰${ach.reward.gold}` : '', ach.reward.gems ? `💠${ach.reward.gems}` : ''].filter(Boolean).join(' ');
    return `
      <div class="bg-slate-800/80 border-2 ${unlocked ? 'border-amber-400' : 'border-slate-700'} rounded-xl p-3 flex items-center gap-3 ${unlocked ? '' : 'opacity-50'}">
        <div class="text-3xl">${unlocked ? ach.icon : '🔒'}</div>
        <div class="text-left flex-1">
          <h3 class="text-sm font-bold ${unlocked ? 'text-amber-300' : 'text-slate-400'}">${ach.name}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">${ach.desc}</p>
          <p class="text-[10px] text-emerald-400 mt-0.5">獎勵：${rewardText}</p>
        </div>
      </div>`;
  }).join('');
}

loadAchievementData();
updateAchievementBadge();
