// ✨ 節日活動：到了特定節日期間，自動將該節日限定坐騎加入清單並免費解鎖、顯示活動橫幅與背景特效
const HOLIDAYS = {
  halloween: {
    id: 'halloween', name: '萬聖節', icon: '🎃', themeColor: '#f97316', bgParticle: '🎃',
    start: { month: 10, day: 25 }, end: { month: 10, day: 31 },
    mountSkin: { id: 'pumpkin_ghost', name: '幽靈南瓜獸', icon: '🎃', bodyColor: '#f97316', legColor: '#7c2d12', snoutColor: '#1c1917', trailColor: '#a78bfa' }
  },
  christmas: {
    id: 'christmas', name: '聖誕節', icon: '🎄', themeColor: '#22c55e', bgParticle: '❄️',
    start: { month: 12, day: 20 }, end: { month: 12, day: 31 },
    mountSkin: { id: 'frost_reindeer', name: '聖誕麋鹿', icon: '🦌', bodyColor: '#dc2626', legColor: '#7f1d1d', snoutColor: '#450a0a', trailColor: '#fde68a' }
  },
  newyear: {
    id: 'newyear', name: '新年', icon: '🎆', themeColor: '#facc15', bgParticle: '🎉',
    start: { month: 1, day: 1 }, end: { month: 1, day: 3 },
    mountSkin: { id: 'golden_dragon', name: '黃金祥龍', icon: '🐉', bodyColor: '#facc15', legColor: '#b45309', snoutColor: '#78350f', trailColor: '#fef08a' }
  },
  valentine: {
    id: 'valentine', name: '情人節', icon: '💘', themeColor: '#ec4899', bgParticle: '💖',
    start: { month: 2, day: 10 }, end: { month: 2, day: 14 },
    mountSkin: { id: 'love_unicorn', name: '愛心獨角獸', icon: '🦄', bodyColor: '#f9a8d4', legColor: '#db2777', snoutColor: '#831843', trailColor: '#fbcfe8' }
  }
};

let activeHolidayKey = null;

// ✨ 依月/日判斷目前是否落在某個節日的活動區間內(所有節日起訖都在同一個月內，不跨月份)
function getActiveHoliday(date) {
  date = date || new Date();
  let month = date.getMonth() + 1, day = date.getDate();
  for (let key in HOLIDAYS) {
    let h = HOLIDAYS[key];
    if (month === h.start.month && day >= h.start.day && day <= h.end.day) return key;
  }
  return null;
}

// ✨ 節日到來時自動執行：把限定坐騎加入 MOUNTS 清單、免費解鎖進玩家的 shopData、更新橫幅與背景特效
// 節日結束後清單仍保留(已解鎖的玩家不會被收回)，但尚未解鎖的玩家就無法再免費取得，需等下一次該節日到來
function applyHolidayContent(date) {
  activeHolidayKey = getActiveHoliday(date);
  let banner = document.getElementById('holidayBanner');
  let particles = document.getElementById('holidayParticles');

  if (!activeHolidayKey) {
    if (banner) banner.classList.add('hidden');
    if (particles) particles.innerHTML = '';
    return;
  }

  let h = HOLIDAYS[activeHolidayKey];
  if (!MOUNTS[h.mountSkin.id]) {
    MOUNTS[h.mountSkin.id] = { ...h.mountSkin, holiday: true, holidayKey: h.id };
  }
  if (typeof shopData !== 'undefined' && !shopData.ownedMounts.includes(h.mountSkin.id)) {
    shopData.ownedMounts.push(h.mountSkin.id);
    saveShopData();
  }

  if (banner) {
    banner.classList.remove('hidden');
    banner.style.borderColor = h.themeColor;
    banner.style.color = h.themeColor;
    banner.innerText = `${h.icon} ${h.name}活動進行中！限定坐騎「${h.mountSkin.icon} ${h.mountSkin.name}」已自動解鎖`;
  }
  if (particles) spawnHolidayParticles(h);
}

function spawnHolidayParticles(holiday) {
  let container = document.getElementById('holidayParticles');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 18; i++) {
    let el = document.createElement('div');
    el.textContent = holiday.bgParticle;
    el.style.position = 'absolute';
    el.style.left = (Math.random() * 100) + '%';
    el.style.top = '-40px';
    el.style.fontSize = (14 + Math.random() * 14) + 'px';
    el.style.opacity = '0.7';
    el.style.animation = `holidayFall ${6 + Math.random() * 6}s linear ${Math.random() * 6}s infinite`;
    container.appendChild(el);
  }
}

applyHolidayContent();
