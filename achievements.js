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
  games_10: { id: 'games_10', name: '屢敗屢戰', icon: '🎮', desc: '累積出擊 10 場戰鬥', reward: { gold: 60 }, check: s => s.gamesPlayed >= 10 }
};

const DEFAULT_ACHIEVEMENT_STATS = {
  totalKills: 0, totalBossKills: 0, gamesPlayed: 0, highestLevelCleared: 0,
  hardCleared: false, nightmareCleared: false, elementalProcs: 0, mountRideSeconds: 0
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
