const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const BOTTOM_SAFE_MARGIN = 95;
const GAME_SPEED = 0.55; // 全域移動/彈道速度倍率，調低讓整體節奏變慢

function resizeCanvas() {
  canvas.width = window.innerWidth || document.documentElement.clientWidth || 800;
  canvas.height = window.innerHeight || document.documentElement.clientHeight || 600;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let selectedHero = HEROES.swift;
let currentWeapon = { ...WAR_WEAPONS.default };
let currentMelee = { ...MELEE_WEAPONS.knife };
let currentArmor = { ...ARMORS.none };

function getArmorReduction() {
  return currentArmor.reduction;
}
function getDodgeChance() {
  return Math.min(0.4, shopData.upgrades.dodge * UPGRADE_DEFS.dodge.step);
}
function getHealMult() {
  return 1 + shopData.upgrades.healBonus * UPGRADE_DEFS.healBonus.step;
}
function applyArmor(rawDmg) {
  if (Math.random() < getDodgeChance()) return 0;
  return rawDmg * (1 - getArmorReduction());
}

let gameState = 'MENU';
let score = 0, level = 1, exp = 0, maxExp = 10, frenzyTimer = 0, wheelSpins = 0;

// ✨ Boss 登場波次計數器 (支援無限高頻登場)
let bossWaveCount = 0;
let lastBossScoreTrigger = 0;

// ✨ 關卡進度
let currentLevelIndex = 0;
let pendingHeroKey = null;

let keys = {};
let mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

let touchMoveId = null, touchAimId = null;
let touchMoveStart = { x: 0, y: 0 }, touchMoveCurrent = { x: 0, y: 0 };
let touchAimStart = { x: 0, y: 0 }, touchAimCurrent = { x: 0, y: 0 };
let isTouchAiming = false;

let player = {
  x: canvas.width / 2,
  y: (canvas.height - BOTTOM_SAFE_MARGIN) / 2,
  vx: 0, vy: 0, angle: 0, hp: 300, maxHp: 300, speed: 5, radius: 20, dmgMultBonus: 1.0
};

let cd = { dash: 0, shotgun: 0, stun: 0, laser: 0, tar: 0, shield: 0, heal: 0 };
const MAX_CD = { dash: 3, shotgun: 4, stun: 6, laser: 8, tar: 7, shield: 12, heal: 15 };
let pickupRange = 120;

function getUltReq() {
  return Math.max(5, selectedHero.ultReq - shopData.upgrades.ultReq * UPGRADE_DEFS.ultReq.step);
}
function getHpRegen() {
  return selectedHero.hpRegen + shopData.upgrades.hpRegen * UPGRADE_DEFS.hpRegen.step;
}
function getMeleeCooldown() {
  return Math.max(40, currentMelee.cooldown - shopData.upgrades.meleeCd * UPGRADE_DEFS.meleeCd.step);
}
function getExpGain(base) {
  return base * (1 + shopData.upgrades.expBonus * UPGRADE_DEFS.expBonus.step);
}

let bullets = [];
let enemies = [];
let bosses = [];
let particles = [];
let tarPuddles = [];
let lasers = [];
let slashes = [];
let drops = [];
let floatingTexts = [];
let poisonClouds = [];
let shockwaves = [];
let obstacles = [];
let bossProjectiles = [];
let playerFrozenTimer = 0;
let playerShieldTimer = 0;

const WHEEL_ITEMS = [
  { text: '火力+20%', icon: '⚡', color: '#ef4444', type: 'dmg' },
  { text: '戰術核爆', icon: '💣', color: '#f59e0b', type: 'nuke' },
  { text: '大補血', icon: '💚', color: '#10b981', type: 'heal' },
  { text: '超級狂暴', icon: '🔥', color: '#8b5cf6', type: 'frenzy' },
  { text: '移速+15%', icon: '💨', color: '#06b6d4', type: 'speed' },
  { text: '生命上限+50', icon: '🛡️', color: '#3b82f6', type: 'maxhp' },
  { text: '大招能量滿', icon: '🚀', color: '#ec4899', type: 'ult' },
  { text: '巨額經驗', icon: '💎', color: '#14b8a6', type: 'exp' }
];

let wheelAngle = 0, isSpinning = false;

function drawWheel() {
  const wCanvas = document.getElementById('wheelCanvas');
  if (!wCanvas) return;
  const wCtx = wCanvas.getContext('2d');
  const centerX = wCanvas.width / 2, centerY = wCanvas.height / 2, radius = centerX - 10;
  const sliceAngle = (Math.PI * 2) / WHEEL_ITEMS.length;

  wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
  for (let i = 0; i < WHEEL_ITEMS.length; i++) {
    let angle = wheelAngle + i * sliceAngle;
    wCtx.beginPath(); wCtx.moveTo(centerX, centerY);
    wCtx.arc(centerX, centerY, radius, angle, angle + sliceAngle); wCtx.closePath();
    wCtx.fillStyle = WHEEL_ITEMS[i].color; wCtx.fill();
    wCtx.strokeStyle = '#0f172a'; wCtx.lineWidth = 3; wCtx.stroke();

    wCtx.save(); wCtx.translate(centerX, centerY); wCtx.rotate(angle + sliceAngle / 2);
    wCtx.textAlign = 'right'; wCtx.fillStyle = '#ffffff'; wCtx.font = 'bold 12px sans-serif';
    wCtx.fillText(`${WHEEL_ITEMS[i].icon} ${WHEEL_ITEMS[i].text}`, radius - 20, 4);
    wCtx.restore();
  }

  wCtx.beginPath(); wCtx.arc(centerX, centerY, 22, 0, Math.PI * 2);
  wCtx.fillStyle = '#0f172a'; wCtx.fill(); wCtx.strokeStyle = '#f59e0b'; wCtx.lineWidth = 4; wCtx.stroke();
}

function openWheelModal() {
  if (gameState === 'PLAYING') gameState = 'PAUSED_WHEEL';
  document.getElementById('wheelModal').classList.remove('hidden');
  document.getElementById('prizeAnnouncement').innerText = '';
  drawWheel();
}

function closeWheelModal() {
  if (isSpinning) return;
  document.getElementById('wheelModal').classList.add('hidden');
  if (gameState === 'PAUSED_WHEEL') gameState = 'PLAYING';
}

function spinWheel() {
  if (isSpinning || wheelSpins <= 0) return;
  wheelSpins--; isSpinning = true;
  document.getElementById('spinBtn').disabled = true;
  document.getElementById('prizeAnnouncement').innerText = '轉盤旋轉中... 🎲';

  let targetRounds = 5 + Math.random() * 3;
  let targetAngle = wheelAngle + targetRounds * Math.PI * 2 + Math.random() * Math.PI * 2;
  let startAngle = wheelAngle, startTime = null, duration = 4000;

  function animateSpin(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = (timestamp - startTime) / duration;
    if (progress < 1) {
      let easeOut = 1 - Math.pow(1 - progress, 3);
      wheelAngle = startAngle + (targetAngle - startAngle) * easeOut;
      drawWheel(); requestAnimationFrame(animateSpin);
    } else {
      wheelAngle = targetAngle % (Math.PI * 2); drawWheel();
      isSpinning = false; document.getElementById('spinBtn').disabled = false;
      let normalizedAngle = (Math.PI * 1.5 - wheelAngle) % (Math.PI * 2);
      if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
      let winIndex = Math.floor(normalizedAngle / ((Math.PI * 2) / WHEEL_ITEMS.length)) % WHEEL_ITEMS.length;
      applyWheelPrize(WHEEL_ITEMS[winIndex]);
    }
  }
  requestAnimationFrame(animateSpin);
  updateUI();
}

function applyWheelPrize(prize) {
  document.getElementById('prizeAnnouncement').innerText = `🎉 恭喜抽中：${prize.icon} ${prize.text}！`;
  if (prize.type === 'dmg') { player.dmgMultBonus += 0.2; addFloatingText(player.x, player.y - 30, 'DMG +20%!', '#ef4444'); }
  else if (prize.type === 'nuke') {
    enemies.forEach(e => { e.hp = 0; spawnParticles(e.x, e.y, '#ef4444', 8); });
    bosses.forEach(b => { b.hp -= 180; spawnParticles(b.x, b.y, '#ef4444', 15); });
    addFloatingText(player.x, player.y - 30, '💥 TACTICAL NUKE!', '#ef4444');
  } else if (prize.type === 'heal') { player.hp = Math.min(player.maxHp, player.hp + 80 * getHealMult()); addFloatingText(player.x, player.y - 30, '+80 HP!', '#10b981'); }
  else if (prize.type === 'frenzy') { frenzyTimer = 7.0; addFloatingText(player.x, player.y - 30, 'SUPER FRENZY!', '#8b5cf6'); }
  else if (prize.type === 'speed') { player.speed += 0.8; addFloatingText(player.x, player.y - 30, 'SPEED +15%!', '#06b6d4'); }
  else if (prize.type === 'maxhp') { player.maxHp += 50; player.hp += 50; addFloatingText(player.x, player.y - 30, 'MAX HP +50!', '#3b82f6'); }
  else if (prize.type === 'ult') { score += getUltReq(); addFloatingText(player.x, player.y - 30, 'ULT READY!', '#ec4899'); }
  else if (prize.type === 'exp') { exp += 20; addFloatingText(player.x, player.y - 30, '+20 EXP!', '#14b8a6'); }
}

function selectHero(heroKey) {
  pendingHeroKey = heroKey;
  document.getElementById('charSelectModal').classList.add('hidden');
  renderLevelSelect();
  document.getElementById('levelSelectModal').classList.remove('hidden');
}

function renderLevelSelect() {
  const colors = ['emerald', 'cyan', 'amber', 'rose'];
  document.getElementById('levelSelectList').innerHTML = LEVELS.map((lv, idx) => {
    let c = colors[idx % colors.length];
    return `
      <div onclick="selectLevel(${idx})" class="bg-slate-800/80 border-2 border-slate-700 hover:border-${c}-400 rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-1 flex items-center gap-3">
        <div class="text-3xl">${lv.icon}</div>
        <div class="text-left flex-1">
          <h3 class="text-sm font-bold text-${c}-300">${lv.name}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">${lv.desc}</p>
          <p class="text-[10px] text-slate-500 mt-0.5">過關門檻：${lv.killTarget} 殺</p>
        </div>
      </div>`;
  }).join('');
}

function selectLevel(levelIndex) {
  selectedHero = HEROES[pendingHeroKey];
  document.getElementById('levelSelectModal').classList.add('hidden');
  document.getElementById('hudHeroAvatar').innerText = selectedHero.avatar;
  document.getElementById('hudHeroName').innerText = selectedHero.name;
  document.getElementById('hudHeroRole').innerText = selectedHero.role;
  initGame(levelIndex);
}

function backToCharSelect() {
  document.getElementById('levelSelectModal').classList.add('hidden');
  document.getElementById('charSelectModal').classList.remove('hidden');
}

function openCharSelect() {
  document.getElementById('gameOverModal').classList.add('hidden');
  document.getElementById('charSelectModal').classList.remove('hidden');
  gameState = 'MENU';
}

function initGame(levelIndex) {
  currentLevelIndex = levelIndex !== undefined ? levelIndex : 0;
  gameState = 'PLAYING';
  score = levelStartScore(currentLevelIndex); level = 1; exp = 0; maxExp = 10; frenzyTimer = 0;
  wheelSpins = 1 + shopData.upgrades.wheel * UPGRADE_DEFS.wheel.step;

  bossWaveCount = LEVELS[currentLevelIndex].startBossWaveCount;
  lastBossScoreTrigger = score;

  currentWeapon = { ...WAR_WEAPONS[shopData.starterWeapon] };
  currentMelee = { ...MELEE_WEAPONS[shopData.starterMelee] };
  currentArmor = { ...ARMORS[shopData.starterArmor] };

  player.maxHp = selectedHero.maxHp + shopData.upgrades.maxHp * UPGRADE_DEFS.maxHp.step;
  player.hp = player.maxHp;
  player.speed = selectedHero.speed + shopData.upgrades.speed * UPGRADE_DEFS.speed.step;
  player.dmgMultBonus = 1.0 + shopData.upgrades.dmg * UPGRADE_DEFS.dmg.step;
  player.x = canvas.width / 2;
  player.y = (canvas.height - BOTTOM_SAFE_MARGIN) / 2;

  MAX_CD.dash = Math.max(0.3, selectedHero.dashCd - shopData.upgrades.dashCd * UPGRADE_DEFS.dashCd.step);
  pickupRange = 120 + shopData.upgrades.pickup * UPGRADE_DEFS.pickup.step;
  for (let k in cd) cd[k] = 0;

  bullets = []; enemies = []; bosses = []; particles = []; tarPuddles = []; lasers = []; slashes = []; drops = []; floatingTexts = []; poisonClouds = []; shockwaves = []; bossProjectiles = [];
  playerFrozenTimer = 0;
  playerShieldTimer = 0;
  generateObstacles();

  drops.push({ x: player.x + 40, y: player.y, type: 'crate', icon: '📦', color: '#f97316', floatOffset: 0, life: 1200 });

  document.getElementById('gameOverModal').classList.add('hidden');
  document.getElementById('bossHud').classList.add('hidden');
  updateUI();
}

function restartGame() { initGame(currentLevelIndex); }

// ✨ 障礙物：靜態岩塊，會阻擋玩家/小怪/Boss 移動與子彈飛行
function generateObstacles() {
  obstacles = [];
  let usableHeight = canvas.height - BOTTOM_SAFE_MARGIN;
  let count = 5;
  let attempts = 0;
  while (obstacles.length < count && attempts < 60) {
    attempts++;
    let w = 60 + Math.random() * 60;
    let h = 60 + Math.random() * 60;
    let x = 40 + Math.random() * (canvas.width - w - 80);
    let y = 40 + Math.random() * (usableHeight - h - 80);
    let rect = { x, y, w, h };
    // 避開玩家出生點附近，避免一開場就卡住
    let cx = x + w / 2, cy = y + h / 2;
    if (Math.hypot(cx - player.x, cy - player.y) < 150) continue;
    let overlaps = obstacles.some(o => x < o.x + o.w + 30 && x + w + 30 > o.x && y < o.y + o.h + 30 && y + h + 30 > o.y);
    if (overlaps) continue;
    obstacles.push(rect);
  }
}

function closestPointOnRect(rect, px, py) {
  return {
    x: Math.max(rect.x, Math.min(px, rect.x + rect.w)),
    y: Math.max(rect.y, Math.min(py, rect.y + rect.h))
  };
}

function resolveCircleObstacles(x, y, radius) {
  for (let i = 0; i < obstacles.length; i++) {
    let o = obstacles[i];
    let closest = closestPointOnRect(o, x, y);
    let dx = x - closest.x, dy = y - closest.y;
    let dist = Math.hypot(dx, dy);
    if (dist < radius) {
      if (dist === 0) { dx = 1; dy = 0; dist = 1; }
      let push = radius - dist;
      x += (dx / dist) * push;
      y += (dy / dist) * push;
    }
  }
  return { x, y };
}

function circleHitsObstacle(x, y, radius) {
  return obstacles.some(o => {
    let closest = closestPointOnRect(o, x, y);
    return Math.hypot(x - closest.x, y - closest.y) < radius;
  });
}

const VICTORY_SCORE = LEVELS[LEVELS.length - 1].killTarget;
function endGame(isVictory) {
  gameState = 'GAMEOVER';
  document.getElementById('gameOverTitle').innerText = isVictory ? '🏆 任務完成 / 凱旋歸來' : '任務失敗 / 戰損撤退';
  document.getElementById('gameOverTitle').className = `text-3xl sm:text-4xl font-black mb-2 ${isVictory ? 'text-emerald-400' : 'text-red-500'}`;
  document.getElementById('finalScore').innerText = score;
  document.getElementById('finalLevel').innerText = `Lv.${level}`;
  document.getElementById('gameOverModal').classList.remove('hidden');
}

window.addEventListener('keydown', (e) => {
  const code = e.code;
  keys[code] = true;
  if (gameState !== 'PLAYING') return;
  if (code === 'Space') { e.preventDefault(); triggerSkill('dash'); }
  if (code === 'KeyQ') triggerSkill('shotgun');
  if (code === 'KeyE') triggerSkill('stun');
  if (code === 'KeyF') triggerSkill('laser');
  if (code === 'KeyG') triggerSkill('tar');
  if (code === 'KeyH') triggerSkill('shield');
  if (code === 'KeyI') triggerSkill('heal');
  if (code === 'KeyR') triggerSkill('ult');
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => { if (!isTouchAiming && gameState === 'PLAYING') { mouse.x = e.clientX; mouse.y = e.clientY; } });
window.addEventListener('mousedown', (e) => { if (e.button === 0 && gameState === 'PLAYING') { mouse.down = true; spawnSlash(); } });
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });

const moveBaseDOM = document.getElementById('moveJoystickBase'), moveStickDOM = document.getElementById('moveJoystickStick');
const aimBaseDOM = document.getElementById('aimJoystickBase'), aimStickDOM = document.getElementById('aimJoystickStick');

window.addEventListener('touchstart', (e) => {
  if (gameState !== 'PLAYING') return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    let touch = e.changedTouches[i];
    if (touch.target.closest('.skill-btn') || touch.target.closest('#wheelModal')) continue;
    if (touch.clientX < window.innerWidth / 2 && touchMoveId === null) {
      touchMoveId = touch.identifier;
      touchMoveStart = { x: touch.clientX, y: touch.clientY }; touchMoveCurrent = { x: touch.clientX, y: touch.clientY };
      moveBaseDOM.style.left = touch.clientX + 'px'; moveBaseDOM.style.top = touch.clientY + 'px';
      moveStickDOM.style.left = '50%'; moveStickDOM.style.top = '50%'; moveBaseDOM.style.display = 'block';
    } else if (touch.clientX >= window.innerWidth / 2 && touchAimId === null) {
      touchAimId = touch.identifier;
      touchAimStart = { x: touch.clientX, y: touch.clientY }; touchAimCurrent = { x: touch.clientX, y: touch.clientY };
      isTouchAiming = true; mouse.down = true;
      aimBaseDOM.style.left = touch.clientX + 'px'; aimBaseDOM.style.top = touch.clientY + 'px';
      aimStickDOM.style.left = '50%'; aimStickDOM.style.top = '50%'; aimBaseDOM.style.display = 'block';
      spawnSlash();
    }
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (gameState !== 'PLAYING') return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    let touch = e.changedTouches[i];
    if (touch.identifier === touchMoveId) {
      touchMoveCurrent = { x: touch.clientX, y: touch.clientY };
      updateJoystickVisual(moveBaseDOM, moveStickDOM, touchMoveStart, touchMoveCurrent);
    } else if (touch.identifier === touchAimId) {
      touchAimCurrent = { x: touch.clientX, y: touch.clientY };
      updateJoystickVisual(aimBaseDOM, aimStickDOM, touchAimStart, touchAimCurrent);
      let dx = touchAimCurrent.x - touchAimStart.x, dy = touchAimCurrent.y - touchAimStart.y;
      if (Math.hypot(dx, dy) > 10) {
        let aimAngle = Math.atan2(dy, dx);
        mouse.x = player.x + Math.cos(aimAngle) * 200;
        mouse.y = player.y + Math.sin(aimAngle) * 200;
      }
    }
  }
}, { passive: false });

function handleTouchEnd(e) {
  for (let i = 0; i < e.changedTouches.length; i++) {
    let touch = e.changedTouches[i];
    if (touch.identifier === touchMoveId) { touchMoveId = null; moveBaseDOM.style.display = 'none'; }
    else if (touch.identifier === touchAimId) { touchAimId = null; isTouchAiming = false; mouse.down = false; aimBaseDOM.style.display = 'none'; }
  }
}
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);

function updateJoystickVisual(base, stick, start, current) {
  let dx = current.x - start.x, dy = current.y - start.y, dist = Math.hypot(dx, dy), maxRadius = 50;
  if (dist > maxRadius) { dx = (dx / dist) * maxRadius; dy = (dy / dist) * maxRadius; }
  stick.style.left = `calc(50% + ${dx}px)`; stick.style.top = `calc(50% + ${dy}px)`;
}

function triggerSkill(skillType) {
  if (gameState !== 'PLAYING') return;
  let currentDmgMult = selectedHero.dmgMult * player.dmgMultBonus * (frenzyTimer > 0 ? 2.0 : 1.0);

  if (skillType === 'dash' && cd.dash <= 0) {
    cd.dash = MAX_CD.dash;
    player.x += Math.cos(player.angle) * 130;
    player.y += Math.sin(player.angle) * 130;
    spawnParticles(player.x, player.y, selectedHero.color, 15);
  } else if (skillType === 'shotgun' && cd.shotgun <= 0) {
    cd.shotgun = MAX_CD.shotgun;
    let count = selectedHero.shotgunPellets || 7, startAngle = -Math.floor(count / 2);
    for (let i = startAngle; i <= Math.floor(count / 2); i++) {
      let spreadAngle = player.angle + (i * 0.1);
      bullets.push({
        x: player.x, y: player.y,
        vx: Math.cos(spreadAngle) * 12 * selectedHero.bulletSpeedMult * GAME_SPEED,
        vy: Math.sin(spreadAngle) * 12 * selectedHero.bulletSpeedMult * GAME_SPEED,
        dmg: 28 * currentDmgMult, life: 30, color: '#f59e0b', radius: 4, type: 'bullet'
      });
    }
  } else if (skillType === 'stun' && cd.stun <= 0) {
    cd.stun = MAX_CD.stun;
    let stunRadius = (selectedHero.id === 'volt') ? 500 : 250;
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < stunRadius) { e.stunned = 180; e.hp -= 20 * currentDmgMult; spawnParticles(e.x, e.y, '#facc15', 8); }
    });
  } else if (skillType === 'laser' && cd.laser <= 0) {
    cd.laser = (selectedHero.id === 'tech') ? 5.5 : MAX_CD.laser;
    lasers.push({ x: mouse.x, y: mouse.y, radius: 0, maxRadius: 100, timer: 120, dmg: 1.8 * currentDmgMult });
  } else if (skillType === 'tar' && cd.tar <= 0) {
    cd.tar = MAX_CD.tar;
    tarPuddles.push({ x: player.x, y: player.y, radius: 90, timer: 360, isPyro: (selectedHero.id === 'pyro') });
  } else if (skillType === 'shield' && cd.shield <= 0) {
    let isGuardian = (selectedHero.id === 'guardian');
    cd.shield = isGuardian ? MAX_CD.shield / 2 : MAX_CD.shield;
    playerShieldTimer = isGuardian ? 240 : 120;
    spawnParticles(player.x, player.y, '#38bdf8', 20);
    addFloatingText(player.x, player.y - 30, '🛡️ 護盾啟動!', '#38bdf8');
  } else if (skillType === 'heal' && cd.heal <= 0) {
    cd.heal = MAX_CD.heal;
    let healAmount = player.maxHp * 0.25 * getHealMult();
    player.hp = Math.min(player.maxHp, player.hp + healAmount);
    spawnParticles(player.x, player.y, '#4ade80', 20);
    addFloatingText(player.x, player.y - 30, `✚ +${Math.round(healAmount)} HP!`, '#4ade80');
  } else if (skillType === 'ult' && score >= getUltReq()) {
    score -= getUltReq();
    for (let i = 0; i < 36; i++) {
      let a = (Math.PI * 2 / 36) * i;
      bullets.push({ x: player.x, y: player.y, vx: Math.cos(a) * 10 * GAME_SPEED, vy: Math.sin(a) * 10 * GAME_SPEED, dmg: 45 * currentDmgMult, life: 80, color: '#ef4444', radius: 6, type: 'bullet' });
    }
  }
}

let lastSlashTime = 0;
function spawnSlash() {
  let now = Date.now();
  if (now - lastSlashTime < getMeleeCooldown()) return;
  lastSlashTime = now;

  let range = currentMelee.range * (selectedHero.id === 'reaper' ? 1.8 : 1.0);
  slashes.push({
    x: player.x, y: player.y, angle: player.angle, radius: range,
    timer: 12, dmg: currentMelee.dmg, color: currentMelee.color, arc: currentMelee.arc, id: currentMelee.id
  });

  if (currentMelee.ammo !== Infinity) {
    currentMelee.ammo--;
    if (currentMelee.ammo <= 0) {
      addFloatingText(player.x, player.y - 20, '近戰武器損壞，切換為戰術獵刀!', '#f87171');
      currentMelee = { ...MELEE_WEAPONS.knife };
    }
  }
}

function trySpawnDrop(x, y) {
  let rand = Math.random();
  let dropType = null, icon = '', color = '';

  if (rand < 0.30) { dropType = 'crate'; icon = '📦'; color = '#f97316'; }
  else if (rand < 0.55) { dropType = 'exp'; icon = '💎'; color = '#38bdf8'; }
  else if (rand < 0.70) { dropType = 'coin'; icon = '🪙'; color = '#f59e0b'; }
  else if (rand < 0.82) { dropType = 'hp'; icon = '💚'; color = '#4ade80'; }
  else if (rand < 0.90) { dropType = 'frenzy'; icon = '🔥'; color = '#f59e0b'; }
  else if (rand < 0.96) { dropType = 'magnet'; icon = '🧲'; color = '#c084fc'; }
  else { dropType = 'bomb'; icon = '💣'; color = '#ef4444'; }

  drops.push({ x: x, y: y, type: dropType, icon: icon, color: color, floatOffset: Math.random() * Math.PI * 2, life: 800 });
}

function addFloatingText(x, y, text, color) {
  floatingTexts.push({ x: x, y: y, text: text, color: color, opacity: 1.0, vy: -1.2, life: 40 });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    let a = Math.random() * Math.PI * 2, spd = Math.random() * 4 + 1;
    particles.push({ x: x, y: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, color: color, life: 20, maxLife: 20 });
  }
}

let lastShootTime = 0;

function gameLoop() {
  if (gameState === 'PLAYING') update();
  render();
  requestAnimationFrame(gameLoop);
}

function update() {
  if (score >= VICTORY_SCORE) { endGame(true); return; }

  // ✨ 關卡過關檢測
  if (currentLevelIndex < LEVELS.length - 1 && score >= LEVELS[currentLevelIndex].killTarget) {
    currentLevelIndex++;
    wheelSpins++;
    player.hp = Math.min(player.maxHp, player.hp + 60);
    addFloatingText(player.x, player.y - 40, `🎉 過關！進入${LEVELS[currentLevelIndex].name}`, '#22d3ee');
    document.getElementById('stageLabel').innerText = LEVELS[currentLevelIndex].name;
  }

  // ✨ 頻繁登場之 Boss 觸發檢測 (8殺、18殺、30殺，之後每 10 殺召喚一波；場上同時最多 1 隻)
  if (bosses.length === 0) {
    if (bossWaveCount === 0 && score - lastBossScoreTrigger >= 8) {
      bossWaveCount = 1;
      lastBossScoreTrigger = score;
      spawnBoss('titan');
    } else if (bossWaveCount === 1 && score - lastBossScoreTrigger >= 10) {
      bossWaveCount = 2;
      lastBossScoreTrigger = score;
      spawnBoss('void');
    } else if (bossWaveCount === 2 && score - lastBossScoreTrigger >= 12) {
      bossWaveCount = 3;
      lastBossScoreTrigger = score;
      spawnBoss('iron');
    } else if (bossWaveCount >= 3 && score - lastBossScoreTrigger >= 10) {
      // ✨ 每再累積 10 殺，持續刷出新一波 Boss
      bossWaveCount++;
      lastBossScoreTrigger = score;
      spawnBoss(BOSS_SPAWN_POOL[Math.floor(Math.random() * BOSS_SPAWN_POOL.length)]);
    }
  }

  if (frenzyTimer > 0) {
    frenzyTimer -= 1 / 60;
    document.getElementById('frenzyIndicator').classList.remove('hidden');
  } else {
    document.getElementById('frenzyIndicator').classList.add('hidden');
  }

  if (getHpRegen() > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + getHpRegen() / 60);
  }

  if (playerFrozenTimer > 0) playerFrozenTimer--;
  if (playerShieldTimer > 0) playerShieldTimer--;
  let frozenSpeedMult = playerFrozenTimer > 0 ? 0.4 : 1.0;

  let moveX = 0, moveY = 0;
  if (keys['KeyW'] || keys['ArrowUp']) moveY -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

  if (touchMoveId !== null) {
    let dx = touchMoveCurrent.x - touchMoveStart.x, dy = touchMoveCurrent.y - touchMoveStart.y, dist = Math.hypot(dx, dy);
    if (dist > 5) { moveX = dx / dist; moveY = dy / dist; }
  }

  let len = Math.hypot(moveX, moveY);
  if (len > 0) {
    player.x += (moveX / (len > 1 ? len : 1)) * player.speed * frozenSpeedMult * GAME_SPEED;
    player.y += (moveY / (len > 1 ? len : 1)) * player.speed * frozenSpeedMult * GAME_SPEED;
  }

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius - BOTTOM_SAFE_MARGIN, player.y));
  let resolvedPlayerPos = resolveCircleObstacles(player.x, player.y, player.radius);
  player.x = resolvedPlayerPos.x; player.y = resolvedPlayerPos.y;
  player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

  let fireRate = (currentWeapon.fireInterval || 150) / (frenzyTimer > 0 ? 2 : 1);
  let currentDmgMult = selectedHero.dmgMult * player.dmgMultBonus * (frenzyTimer > 0 ? 2.0 : 1.0);

  if (mouse.down && Date.now() - lastShootTime > fireRate) {
    lastShootTime = Date.now();
    let bSpeed = currentWeapon.bulletSpeed * selectedHero.bulletSpeedMult * GAME_SPEED;

    bullets.push({
      x: player.x, y: player.y,
      vx: Math.cos(player.angle) * bSpeed, vy: Math.sin(player.angle) * bSpeed,
      dmg: currentWeapon.dmg * currentDmgMult, life: 60,
      color: frenzyTimer > 0 ? '#facc15' : currentWeapon.color,
      radius: currentWeapon.radius, type: currentWeapon.type
    });

    if (currentWeapon.ammo !== Infinity) {
      currentWeapon.ammo--;
      if (currentWeapon.ammo <= 0) {
        addFloatingText(player.x, player.y - 20, '彈藥耗盡，切換回標準步槍!', '#f87171');
        currentWeapon = { ...WAR_WEAPONS.default };
      }
    }
  }

  for (let k in cd) { if (cd[k] > 0) cd[k] = Math.max(0, cd[k] - 1 / 60); }

  bullets.forEach((b, index) => {
    b.x += b.vx; b.y += b.vy; b.life--;
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
        e.hp -= b.dmg;

        if (b.type === 'rpg') {
          enemies.concat(bosses).forEach(nearE => {
            if (Math.hypot(nearE.x - b.x, nearE.y - b.y) < 110) nearE.hp -= 70 * currentDmgMult;
          });
          spawnParticles(b.x, b.y, '#f97316', 25);
        } else if (b.type === 'nuke_bullet') {
          enemies.concat(bosses).forEach(nearE => {
            if (Math.hypot(nearE.x - b.x, nearE.y - b.y) < 220) nearE.hp -= 180 * currentDmgMult;
          });
          spawnParticles(b.x, b.y, '#a855f7', 40);
        } else {
          spawnParticles(b.x, b.y, b.color, 3);
        }

        if (b.type !== 'railgun') b.life = 0;
      }
    });
    if (b.life > 0 && circleHitsObstacle(b.x, b.y, b.radius)) {
      spawnParticles(b.x, b.y, b.color, 4);
      b.life = 0;
    }
    if (b.life <= 0) bullets.splice(index, 1);
  });

  slashes.forEach((s, index) => {
    s.timer--;
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - s.x, e.y - s.y) < s.radius + e.radius) {
        e.hp -= s.dmg * currentDmgMult / 8;
        if (s.id === 'hammer') e.stunned = 120;
        spawnParticles(e.x, e.y, s.color, 3);
      }
    });
    if (s.timer <= 0) slashes.splice(index, 1);
  });

  tarPuddles.forEach((p, index) => {
    p.timer--;
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) {
        e.slowed = true; if (p.isPyro) { e.hp -= 0.4; spawnParticles(e.x, e.y, '#f97316', 1); }
      }
    });
    if (p.timer <= 0) tarPuddles.splice(index, 1);
  });

  lasers.forEach((l, index) => {
    l.timer--; if (l.radius < l.maxRadius) l.radius += 2;
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - l.x, e.y - l.y) < l.radius) { e.hp -= l.dmg; spawnParticles(e.x, e.y, '#c084fc', 1); }
    });
    if (l.timer <= 0) lasers.splice(index, 1);
  });

  drops.forEach((d, index) => {
    d.life--; d.floatOffset += 0.05;
    let dist = Math.hypot(player.x - d.x, player.y - d.y);
    if (dist < pickupRange) { d.x += (player.x - d.x) * 0.12; d.y += (player.y - d.y) * 0.12; }

    if (dist < player.radius + 15) {
      if (d.type === 'hp') {
        player.hp = Math.min(player.maxHp, player.hp + 50 * getHealMult()); addFloatingText(player.x, player.y - 20, '+50 HP', '#4ade80');
      } else if (d.type === 'coin') {
        shopData.gold += 10; saveShopData(); updateGoldDisplays();
        addFloatingText(player.x, player.y - 20, '🪙 +10 金幣!', '#f59e0b');
      } else if (d.type === 'crate') {
        if (Math.random() < 0.6) {
          const keys = ['rpg', 'railgun', 'flamethrower', 'minigun', 'nuke_gun', 'sniper', 'smg', 'laser_rifle', 'revolver', 'crossbow', 'plasma_smg', 'grenade_launcher', 'arc_caster', 'auto_cannon', 'needle_gun'];
          let wKey = keys[Math.floor(Math.random() * keys.length)];
          currentWeapon = { ...WAR_WEAPONS[wKey] };
          addFloatingText(player.x, player.y - 20, `💣 獲得戰爭武器: ${currentWeapon.name}!`, '#f59e0b');
        } else {
          const mKeys = ['axe', 'katana', 'hammer', 'spear', 'chainsaw', 'whip', 'twin_daggers', 'scythe', 'war_pick'];
          let mKey = mKeys[Math.floor(Math.random() * mKeys.length)];
          currentMelee = { ...MELEE_WEAPONS[mKey] };
          addFloatingText(player.x, player.y - 20, `⚔️ 獲得近戰兵器: ${currentMelee.name}!`, '#fb7185');
        }
      } else if (d.type === 'exp') {
        let expGain = getExpGain(4);
        exp += expGain; addFloatingText(player.x, player.y - 20, `+${expGain.toFixed(1)} EXP`, '#38bdf8');
        if (exp >= maxExp) {
          level++; exp -= maxExp; maxExp = Math.floor(maxExp * 1.4);
          player.maxHp += 20; player.hp += 20; player.dmgMultBonus += 0.15;
          wheelSpins++;
          addFloatingText(player.x, player.y - 40, `LEVEL UP! Lv.${level}`, '#facc15');
        }
      } else if (d.type === 'frenzy') {
        frenzyTimer = 5.0; addFloatingText(player.x, player.y - 20, 'FRENZY MODE!', '#f59e0b');
      } else if (d.type === 'magnet') {
        drops.forEach(item => { item.x = player.x; item.y = player.y; });
        addFloatingText(player.x, player.y - 20, 'MAGNET!', '#c084fc');
      } else if (d.type === 'bomb') {
        enemies.forEach(e => { e.hp = 0; spawnParticles(e.x, e.y, '#ef4444', 10); });
        bosses.forEach(b => { b.hp -= 150; spawnParticles(b.x, b.y, '#ef4444', 15); });
        addFloatingText(player.x, player.y - 20, '💥 TACTICAL NUKE!', '#ef4444');
      }

      spawnParticles(d.x, d.y, d.color, 8); drops.splice(index, 1);
    } else if (d.life <= 0) drops.splice(index, 1);
  });

  floatingTexts.forEach((ft, index) => {
    ft.y += ft.vy; ft.life--; ft.opacity = ft.life / 40;
    if (ft.life <= 0) floatingTexts.splice(index, 1);
  });

  let maxEnemies = 8 + Math.floor(score / 4);
  if (bosses.length === 0 && enemies.length < maxEnemies && Math.random() < 0.015) {
    let spawnEdge = Math.floor(Math.random() * 4);
    let ex = 0, ey = 0, usableHeight = canvas.height - BOTTOM_SAFE_MARGIN;
    if (spawnEdge === 0) { ex = Math.random() * canvas.width; ey = -20; }
    else if (spawnEdge === 1) { ex = canvas.width + 20; ey = Math.random() * usableHeight; }
    else if (spawnEdge === 2) { ex = Math.random() * canvas.width; ey = usableHeight + 20; }
    else { ex = -20; ey = Math.random() * usableHeight; }

    let baseHp = 35 + score * 1.2;
    enemies.push({
      x: ex, y: ey,
      hp: baseHp, maxHp: baseHp,
      speed: 1.2 + Math.random() * 1.0, radius: 16,
      stunned: 0, slowed: false,
      flankOffset: (Math.random() - 0.5) * 0.8
    });
  }

  enemies.forEach((e, index) => {
    if (e.stunned > 0) {
      e.stunned--;
    } else {
      let spd = (e.slowed ? e.speed * 0.4 : e.speed) * GAME_SPEED;
      let baseAngle = Math.atan2(player.y - e.y, player.x - e.x) + (e.flankOffset || 0);
      let moveVx = Math.cos(baseAngle) * spd;
      let moveVy = Math.sin(baseAngle) * spd;

      enemies.forEach((other, otherIdx) => {
        if (index !== otherIdx) {
          let dx = e.x - other.x;
          let dy = e.y - other.y;
          let dist = Math.hypot(dx, dy);
          let minDist = e.radius + other.radius + 6;

          if (dist < minDist && dist > 0) {
            let pushForce = (minDist - dist) * 0.08;
            moveVx += (dx / dist) * pushForce;
            moveVy += (dy / dist) * pushForce;
          }
        }
      });

      bosses.forEach(b => {
        let dx = e.x - b.x;
        let dy = e.y - b.y;
        let dist = Math.hypot(dx, dy);
        let minDist = e.radius + b.radius + 10;

        if (dist < minDist && dist > 0) {
          moveVx += (dx / dist) * 3.5;
          moveVy += (dy / dist) * 3.5;
        }
      });

      e.x += moveVx;
      e.y += moveVy;
      let resolvedEnemyPos = resolveCircleObstacles(e.x, e.y, e.radius);
      e.x = resolvedEnemyPos.x; e.y = resolvedEnemyPos.y;
      e.slowed = false;

      if (Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius) {
        if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
          player.hp -= applyArmor(0.6);
          if (player.hp <= 0) endGame(false);
        }
      }
    }

    if (e.hp <= 0) {
      score++;
      if (selectedHero.id === 'reaper') player.hp = Math.min(player.maxHp, player.hp + 5);
      trySpawnDrop(e.x, e.y);
      spawnParticles(e.x, e.y, '#ef4444', 12);
      enemies.splice(index, 1);
    }
  });

  bosses.forEach((b, index) => {
    if (b.stunned > 0) { b.stunned--; }
    else {
      if (b.enrageTimer > 0) b.enrageTimer--;
      let enrageMult = b.enrageTimer > 0 ? 1.6 : 1.0;
      let spd = (b.slowed ? b.speed * 0.4 : b.speed) * enrageMult * GAME_SPEED;
      let angle = Math.atan2(player.y - b.y, player.x - b.x);
      b.x += Math.cos(angle) * spd; b.y += Math.sin(angle) * spd; b.slowed = false;
      let resolvedBossPos = resolveCircleObstacles(b.x, b.y, b.radius);
      b.x = resolvedBossPos.x; b.y = resolvedBossPos.y;

      if (b.id === 'titan_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 240;
          if (Math.hypot(player.x - b.x, player.y - b.y) < 120) {
            if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
              player.hp -= applyArmor(15);
              if (player.hp <= 0) endGame(false);
            }
          }
          b.enrageTimer = 180;
          spawnParticles(b.x, b.y, '#dc2626', 25);
          addFloatingText(b.x, b.y - 20, '🔥 怒吼衝鋒!', '#dc2626');
        }
      } else if (b.id === 'toxic_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 150;
          poisonClouds.push({ x: b.x, y: b.y, radius: 80, timer: 300 });
          addFloatingText(b.x, b.y - 20, '☠️ 劇毒噴發!', '#65a30d');
        }
      } else if (b.id === 'thunder_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 120;
          shockwaves.push({ x: b.x, y: b.y, radius: 0, maxRadius: 130, timer: 60 });
          addFloatingText(b.x, b.y - 20, '⚡ 電擊脈衝!', '#0ea5e9');
        }
      } else if (b.id === 'iron_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 130;
          let pAngle = Math.atan2(player.y - b.y, player.x - b.x);
          bossProjectiles.push({ x: b.x, y: b.y, vx: Math.cos(pAngle) * 6 * GAME_SPEED, vy: Math.sin(pAngle) * 6 * GAME_SPEED, radius: 10, life: 150 });
          addFloatingText(b.x, b.y - 20, '🎯 追獵彈道!', '#f97316');
        }
      } else if (b.id === 'frost_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 140;
          if (Math.hypot(player.x - b.x, player.y - b.y) < 150) {
            if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
              player.hp -= applyArmor(8);
              if (player.hp <= 0) endGame(false);
            }
            playerFrozenTimer = 90;
            addFloatingText(player.x, player.y - 30, '🧊 凍結!', '#7dd3fc');
          }
          spawnParticles(b.x, b.y, '#7dd3fc', 20);
          addFloatingText(b.x, b.y - 20, '❄️ 冰凍新星!', '#7dd3fc');
        }
      }

      if (Math.hypot(player.x - b.x, player.y - b.y) < player.radius + b.radius) {
        if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
          player.hp -= applyArmor(1.8);
          if (player.hp <= 0) endGame(false);
        }
      }
    }

    if (b.hp <= 0) {
      score += 10; wheelSpins += 2;
      lastBossScoreTrigger = score; // Boss 自身的加分不計入下一波觸發門檻，避免小怪完全沒有生成空檔
      shopData.gems += 1; saveShopData(); updateGoldDisplays();
      drops.push({ x: b.x - 25, y: b.y, type: 'crate', icon: '📦', color: '#f97316', floatOffset: 0, life: 800 });
      drops.push({ x: b.x + 25, y: b.y, type: 'crate', icon: '📦', color: '#f97316', floatOffset: 0, life: 800 });
      drops.push({ x: b.x, y: b.y - 25, type: 'coin', icon: '🪙', color: '#f59e0b', floatOffset: 0, life: 800 });
      addFloatingText(b.x, b.y - 40, '🏆 BOSS DEFEATED! +💠1 寶石 (+2寶箱)', '#22d3ee');
      spawnParticles(b.x, b.y, '#f59e0b', 40);
      bosses.splice(index, 1);
    }
  });

  particles.forEach((p, index) => {
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(index, 1);
  });

  poisonClouds.forEach((c, index) => {
    c.timer--;
    if (Math.hypot(player.x - c.x, player.y - c.y) < c.radius) {
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(1.0);
        if (player.hp <= 0) endGame(false);
      }
    }
    if (c.timer <= 0) poisonClouds.splice(index, 1);
  });

  shockwaves.forEach((s, index) => {
    s.timer--; if (s.radius < s.maxRadius) s.radius += (s.maxRadius / 40);
    if (Math.hypot(player.x - s.x, player.y - s.y) < s.radius) {
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(1.2);
        if (player.hp <= 0) endGame(false);
      }
    }
    if (s.timer <= 0) shockwaves.splice(index, 1);
  });

  bossProjectiles.forEach((p, index) => {
    p.x += p.vx; p.y += p.vy; p.life--;
    if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(20);
        if (player.hp <= 0) endGame(false);
      }
      p.life = 0;
      spawnParticles(p.x, p.y, '#f97316', 10);
    }
    if (p.life > 0 && circleHitsObstacle(p.x, p.y, p.radius)) {
      spawnParticles(p.x, p.y, '#f97316', 6);
      p.life = 0;
    }
    if (p.life <= 0) bossProjectiles.splice(index, 1);
  });

  if (playerFrozenTimer > 0) {
    if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
      player.hp -= applyArmor(0.35);
      if (player.hp <= 0) endGame(false);
    }
  }

  updateUI();
}

function updateUI() {
  document.getElementById('hpBar').style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
  document.getElementById('expBar').style.width = Math.max(0, (exp / maxExp) * 100) + '%';
  document.getElementById('levelBadge').innerText = `Lv.${level}`;
  document.getElementById('stageLabel').innerText = LEVELS[currentLevelIndex].name;
  document.getElementById('scoreText').innerText = `${score} / ${getUltReq()}`;
  document.getElementById('wheelBadge').innerText = wheelSpins;
  document.getElementById('modalWheelCount').innerText = wheelSpins;

  document.getElementById('weaponIcon').innerText = currentWeapon.icon;
  document.getElementById('weaponName').innerText = currentWeapon.name;
  document.getElementById('weaponAmmo').innerText = currentWeapon.ammo === Infinity ? '無限彈藥' : `剩餘彈藥: ${currentWeapon.ammo}`;

  document.getElementById('meleeIcon').innerText = currentMelee.icon;
  document.getElementById('meleeName').innerText = currentMelee.name;
  document.getElementById('meleeAmmo').innerText = currentMelee.ammo === Infinity ? '無限揮砍' : `耐久: ${currentMelee.ammo} 次`;

  document.getElementById('armorIcon').innerText = currentArmor.icon;
  document.getElementById('armorName').innerText = currentArmor.name;
  document.getElementById('armorReduction').innerText = `減傷 ${Math.round(getArmorReduction() * 100)}%`;

  let bossHud = document.getElementById('bossHud');
  if (bosses.length > 0) {
    bossHud.classList.remove('hidden');
    let mainBoss = bosses[0];
    document.getElementById('bossName').innerText = mainBoss.name;
    document.getElementById('bossHpText').innerText = `${Math.max(0, Math.ceil(mainBoss.hp))} / ${mainBoss.maxHp}`;
    document.getElementById('bossHpBar').style.width = Math.max(0, (mainBoss.hp / mainBoss.maxHp) * 100) + '%';
  } else {
    bossHud.classList.add('hidden');
  }

  const updateCdUI = (id, currentCd) => {
    let el = document.getElementById(id + 'CdOverlay');
    if (currentCd > 0) { el.innerText = currentCd.toFixed(1) + 's'; el.style.opacity = '1'; }
    else el.style.opacity = '0';
  };

  updateCdUI('dash', cd.dash); updateCdUI('shotgun', cd.shotgun); updateCdUI('stun', cd.stun);
  updateCdUI('laser', cd.laser); updateCdUI('tar', cd.tar); updateCdUI('shield', cd.shield); updateCdUI('heal', cd.heal);

  let ultOverlay = document.getElementById('ultCdOverlay');
  if (score >= getUltReq()) ultOverlay.style.opacity = '0';
  else { ultOverlay.style.opacity = '1'; ultOverlay.innerText = `需要${getUltReq()}殺`; }
}

function drawFloor(usableHeight) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tileSize = 50;
  for (let y = 0; y < usableHeight; y += tileSize) {
    for (let x = 0; x < canvas.width; x += tileSize) {
      let isDark = ((x / tileSize) + (y / tileSize)) % 2 === 0;
      ctx.fillStyle = isDark ? '#15213a' : '#1a2a47';
      ctx.fillRect(x, y, tileSize, tileSize);

      // 浮雕邊框：左上亮、右下暗，模擬光源從左上照射的立體磚塊感
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y + tileSize); ctx.lineTo(x, y); ctx.lineTo(x + tileSize, y); ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + tileSize, y); ctx.lineTo(x + tileSize, y + tileSize); ctx.lineTo(x, y + tileSize); ctx.stroke();
    }
  }

  // 中心到邊緣的暈影漸層，加強景深立體感
  let grad = ctx.createRadialGradient(
    canvas.width / 2, usableHeight / 2, usableHeight * 0.15,
    canvas.width / 2, usableHeight / 2, Math.max(canvas.width, usableHeight) * 0.72
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, usableHeight);

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, usableHeight); ctx.lineTo(canvas.width, usableHeight); ctx.stroke();
}

function drawGroundShadow(x, y, radius) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.92, radius * 1.05, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function shadeColor(hex, percent) {
  let num = parseInt(hex.replace('#', ''), 16);
  let r = Math.max(0, Math.min(255, (num >> 16) + Math.round(2.55 * percent)));
  let g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  let b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(2.55 * percent)));
  return `rgb(${r}, ${g}, ${b})`;
}

function sphereGradient(cx, cy, radius, colorHex) {
  let grad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.05, cx, cy, radius);
  grad.addColorStop(0, shadeColor(colorHex, 45));
  grad.addColorStop(0.55, colorHex);
  grad.addColorStop(1, shadeColor(colorHex, -35));
  return grad;
}

// 假設畫布已 translate 到角色中心、並 rotate 到面朝 +x 方向；畫出頂視角人型剪影（軀幹＋頭部兩顆立體漸層球體）
function drawHumanoidBody(radius, colorHex) {
  let bodyX = -radius * 0.12;
  ctx.fillStyle = sphereGradient(bodyX, 0, radius * 0.98, colorHex);
  ctx.beginPath();
  ctx.ellipse(bodyX, 0, radius * 0.7, radius * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1.5; ctx.stroke();

  let headR = radius * 0.52;
  let headX = radius * 0.62;
  ctx.fillStyle = sphereGradient(headX, 0, headR, colorHex);
  ctx.beginPath();
  ctx.arc(headX, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function render() {
  let usableHeight = canvas.height - BOTTOM_SAFE_MARGIN;
  drawFloor(usableHeight);

  if (gameState === 'MENU') return;

  obstacles.forEach(o => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + o.h + 6, o.w * 0.55, 12, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#57534e';
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x, o.y); ctx.lineTo(o.x + o.w, o.y); ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(o.x + o.w, o.y); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.lineTo(o.x, o.y + o.h); ctx.stroke();
  });

  tarPuddles.forEach(p => {
    ctx.fillStyle = p.isPyro ? 'rgba(249, 115, 22, 0.45)' : 'rgba(234, 88, 12, 0.3)';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
  });

  poisonClouds.forEach(c => {
    ctx.fillStyle = 'rgba(101, 163, 13, 0.35)';
    ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.fill();
  });

  shockwaves.forEach(s => {
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.7)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.stroke();
  });

  bossProjectiles.forEach(p => {
    ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 2; ctx.stroke();
  });

  lasers.forEach(l => {
    ctx.fillStyle = 'rgba(192, 132, 252, 0.25)'; ctx.beginPath(); ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2); ctx.fill();
  });

  slashes.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, s.angle - s.arc / 2, s.angle + s.arc / 2); ctx.stroke();
  });

  drops.forEach(d => {
    let yOffset = Math.sin(d.floatOffset) * 4;
    ctx.font = '18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(d.icon, d.x, d.y + yOffset);
  });

  enemies.forEach(e => {
    drawGroundShadow(e.x, e.y, e.radius);
    ctx.save(); ctx.translate(e.x, e.y);

    ctx.save();
    ctx.rotate(Math.atan2(player.y - e.y, player.x - e.x));
    drawHumanoidBody(e.radius, e.stunned > 0 ? '#facc15' : '#ef4444');
    ctx.restore();

    let barWidth = 32;
    let barHeight = 4.5;
    let barY = -e.radius - 10;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

    let hpPct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : (hpPct > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpPct, barHeight);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);

    ctx.restore();
  });

  bosses.forEach(b => {
    drawGroundShadow(b.x, b.y, b.radius);
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.strokeStyle = b.enrageTimer > 0 ? '#facc15' : '#ef4444'; ctx.lineWidth = b.enrageTimer > 0 ? 5 : 3;
    ctx.beginPath(); ctx.arc(0, 0, b.radius + 6 + Math.sin(Date.now() * 0.01) * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.rotate(Math.atan2(player.y - b.y, player.x - b.x));
    drawHumanoidBody(b.radius, b.stunned > 0 ? '#facc15' : b.color);
    ctx.restore();
    ctx.restore();
  });

  bullets.forEach(b => {
    ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  });

  particles.forEach(p => {
    ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.maxLife; ctx.fillRect(p.x, p.y, 3, 3); ctx.globalAlpha = 1.0;
  });

  drawGroundShadow(player.x, player.y, player.radius);
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
  ctx.fillStyle = '#94a3b8'; ctx.fillRect(0, -4, player.radius + 10, 8);
  drawHumanoidBody(player.radius, selectedHero.color);
  if (playerFrozenTimer > 0) {
    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, player.radius + 6, 0, Math.PI * 2); ctx.stroke();
  }
  if (playerShieldTimer > 0) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, player.radius + 10, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  floatingTexts.forEach(ft => {
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ft.color;
    ctx.globalAlpha = ft.opacity; ctx.fillText(ft.text, ft.x, ft.y); ctx.globalAlpha = 1.0;
  });
}

requestAnimationFrame(gameLoop);
