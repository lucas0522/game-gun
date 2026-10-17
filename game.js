const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const BOTTOM_SAFE_MARGIN = 95;
const GAME_SPEED = 0.55; // 全域移動/彈道速度倍率，調低讓整體節奏變慢

// ============================================================
// 🧊 3D 場景(Three.js)：遊戲邏輯(座標/碰撞/數值)完全保持2D頂視角不變，
// 僅將「畫面呈現」從2D canvas繪製改為一個固定俯角的3D場景。
// 座標映射：遊戲世界 x → 3D世界 X，遊戲世界 y → 3D世界 Z，角色/特效高度 → 3D世界 Y。
// 場景採固定(不跟隨玩家位移)的正交攝影機，涵蓋整個可視戰場範圍，與原本2D版本
// 「整個戰場一直都在畫面內」的設計一致，不需要鏡頭追蹤玩家。
// ============================================================
let threeScene, threeCamera, threeRenderer, threeDynamicGroup, threeStaticGroup;
const three2dOverlay = document.getElementById('three2dOverlay');
const CHAR_TILT_X = -1.0; // 弧度，約57度，HP血條等「面向攝影機」的平面統一用這個旋轉角度對齊固定視角

function resizeCanvas() {
  canvas.width = window.innerWidth || document.documentElement.clientWidth || 800;
  canvas.height = window.innerHeight || document.documentElement.clientHeight || 600;
  if (threeRenderer) updateThreeCameraAndRenderer();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const threeGeo = {}; // 共用幾何體(各實體只建立Mesh並用scale調整大小，避免每幀重建Geometry)
const threeMatCache = {}; // 依色碼快取material，降低每幀建立新material的成本

function getThreeMat(colorHex, opacity) {
  let key = colorHex + '_' + (opacity === undefined ? 1 : opacity);
  if (!threeMatCache[key]) {
    threeMatCache[key] = new THREE.MeshLambertMaterial({
      color: colorHex, transparent: opacity !== undefined && opacity < 1, opacity: opacity === undefined ? 1 : opacity
    });
  }
  return threeMatCache[key];
}

function initThreeScene() {
  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(55, 1, 1, 6000);
  threeRenderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas3D'), antialias: true });
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  threeScene.add(new THREE.AmbientLight(0xffffff, 0.65));
  let sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(-300, 600, -200);
  threeScene.add(sun);

  threeGeo.sphere = new THREE.SphereGeometry(1, 12, 10);
  threeGeo.box = new THREE.BoxGeometry(1, 1, 1);
  threeGeo.cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  threeGeo.disc = new THREE.CircleGeometry(1, 24);
  threeGeo.ring = new THREE.RingGeometry(0.8, 1, 24);
  threeGeo.plane = new THREE.PlaneGeometry(1, 1);

  threeStaticGroup = new THREE.Group();
  threeScene.add(threeStaticGroup);
  threeDynamicGroup = new THREE.Group();
  threeScene.add(threeDynamicGroup);

  updateThreeCameraAndRenderer();
  rebuildGroundAndObstacles();
}

function updateThreeCameraAndRenderer() {
  if (!threeRenderer) return;
  threeRenderer.setSize(canvas.width, canvas.height, false);
  let w = canvas.width, h = Math.max(1, canvas.height - BOTTOM_SAFE_MARGIN);
  threeCamera.aspect = w / h;
  threeCamera.near = 1;
  threeCamera.far = 6000;
  threeCamera.updateProjectionMatrix();
}

// 第三人稱跟隨攝影機：固定在玩家身後方偏低的角度跟拍，每幀依玩家位置更新(不跟著瞄準方向旋轉，避免暈眩)
const CAM_HEIGHT = 230, CAM_BACK = 370, CAM_LOOK_AHEAD = -90, CAM_LOOK_HEIGHT = 35;
function updateThreeCameraFollow() {
  if (!threeCamera) return;
  threeCamera.position.set(player.x, CAM_HEIGHT, player.y + CAM_BACK);
  threeCamera.lookAt(player.x, CAM_LOOK_HEIGHT, player.y + CAM_LOOK_AHEAD);
}

// 地板與障礙物屬於「靜態」場景內容，只在地圖/關卡初始化或障礙物重新生成時才需要重建
function rebuildGroundAndObstacles() {
  if (!threeStaticGroup) return;
  while (threeStaticGroup.children.length) {
    let m = threeStaticGroup.children.pop();
    if (m.geometry && m.geometry !== threeGeo.plane && m.geometry !== threeGeo.box) m.geometry.dispose();
  }
  let w = canvas.width, h = Math.max(1, canvas.height - BOTTOM_SAFE_MARGIN);
  let ground = new THREE.Mesh(threeGeo.plane, getThreeMat(currentMap.tileDark));
  ground.scale.set(w, h, 1);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(w / 2, 0, h / 2);
  threeStaticGroup.add(ground);

  obstacles.forEach(o => {
    let box = new THREE.Mesh(threeGeo.box, getThreeMat(currentMap.obstacleColor));
    box.scale.set(o.w, 60, o.h);
    box.position.set(o.x + o.w / 2, 30, o.y + o.h / 2);
    threeStaticGroup.add(box);
  });

  if (threeRenderer) threeRenderer.setClearColor(new THREE.Color(currentMap.bgColor), 1);
}

function worldToScreenPx(wx, wy, wz) {
  let v = new THREE.Vector3(wx, wy, wz);
  v.project(threeCamera);
  return { x: (v.x * 0.5 + 0.5) * canvas.width, y: (-v.y * 0.5 + 0.5) * canvas.height };
}

// ✨ 3D場景中「螢幕像素」不再等於「遊戲世界座標」(因為有透視攝影機)，
// 滑鼠瞄準必須透過光線投射(raycast)與地面高度的水平面相交，換算回遊戲世界x/y，
// 否則player.angle等瞄準計算會對不上畫面上準心實際指向的位置
let threeMouseRaycaster, threeGroundPlaneHelper;
function updateMouseWorldFromScreen() {
  if (!threeCamera || isTouchAiming) return;
  if (!threeMouseRaycaster) threeMouseRaycaster = new THREE.Raycaster();
  if (!threeGroundPlaneHelper) threeGroundPlaneHelper = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let ndcX = (mouseScreen.x / canvas.width) * 2 - 1;
  let ndcY = -(mouseScreen.y / canvas.height) * 2 + 1;
  threeMouseRaycaster.setFromCamera({ x: ndcX, y: ndcY }, threeCamera);
  let hit = new THREE.Vector3();
  if (threeMouseRaycaster.ray.intersectPlane(threeGroundPlaneHelper, hit)) {
    mouse.x = hit.x;
    mouse.y = hit.z;
  }
}

// 加一個朝向固定攝影機傾角的面板Mesh(血條、地面AOE圈等都共用這個建構方式)
function addFlatPanel(group, x, y, z, w, h, colorHex, opacity, rotateFlat) {
  let mesh = new THREE.Mesh(threeGeo.plane, getThreeMat(colorHex, opacity));
  mesh.scale.set(w, h, 1);
  mesh.position.set(x, y, z);
  if (rotateFlat) mesh.rotation.x = -Math.PI / 2;
  else mesh.rotation.x = CHAR_TILT_X;
  group.add(mesh);
  return mesh;
}

function addGroundDisc(group, x, z, radius, colorHex, opacity) {
  let mesh = new THREE.Mesh(threeGeo.disc, getThreeMat(colorHex, opacity));
  mesh.scale.set(radius, radius, 1);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.6, z);
  group.add(mesh);
  return mesh;
}

function addBeam(group, x1, z1, x2, z2, colorHex, thickness, opacity, yHeight) {
  let dx = x2 - x1, dz = z2 - z1;
  let len = Math.hypot(dx, dz) || 0.001;
  let mesh = new THREE.Mesh(threeGeo.box, getThreeMat(colorHex, opacity));
  mesh.scale.set(len, thickness, thickness);
  mesh.position.set((x1 + x2) / 2, yHeight || 20, (z1 + z2) / 2);
  mesh.rotation.y = -Math.atan2(dz, dx);
  group.add(mesh);
  return mesh;
}

// 低多邊形(low-poly)簡易角色模型：圓柱軀幹 + 球形頭部，取代原本2D剪影人型
function addCharacterMesh(group, x, z, radius, colorHex, facingAngle2D) {
  let charGroup = new THREE.Group();
  let bodyH = radius * 1.5;
  let body = new THREE.Mesh(threeGeo.cylinder, getThreeMat(colorHex));
  body.scale.set(radius * 0.75, bodyH, radius * 0.75);
  body.position.set(0, bodyH / 2, 0);
  charGroup.add(body);

  let head = new THREE.Mesh(threeGeo.sphere, getThreeMat(colorHex));
  head.scale.set(radius * 0.55, radius * 0.55, radius * 0.55);
  head.position.set(0, bodyH + radius * 0.5, 0);
  charGroup.add(head);

  // 槍管：固定在身體中段(避免被頭部球體遮住)，明確朝 facingAngle2D(滑鼠方向)延伸，
  // 讓玩家能清楚看到槍口指向準心(與瞄準/射擊方向完全一致)
  let gunLen = radius * 1.3;
  let gun = new THREE.Mesh(threeGeo.box, getThreeMat('#94a3b8'));
  gun.scale.set(gunLen, radius * 0.16, radius * 0.16);
  gun.position.set(radius * 0.35 + gunLen / 2, bodyH * 0.62, 0);
  charGroup.add(gun);
  let muzzle = new THREE.Mesh(threeGeo.box, getThreeMat('#1e293b'));
  muzzle.scale.set(radius * 0.22, radius * 0.22, radius * 0.22);
  muzzle.position.set(radius * 0.35 + gunLen, bodyH * 0.62, 0);
  charGroup.add(muzzle);

  charGroup.position.set(x, 0, z);
  charGroup.rotation.y = -facingAngle2D;
  group.add(charGroup);
  return charGroup;
}

function addHpBar(group, x, yTop, z, widthPx, hpPct) {
  addFlatPanel(group, x, yTop, z, widthPx, 5, '#1e293b', 1);
  let fillColor = hpPct > 0.5 ? '#22c55e' : (hpPct > 0.25 ? '#eab308' : '#ef4444');
  if (hpPct > 0) {
    let fillW = widthPx * hpPct;
    addFlatPanel(group, x - (widthPx - fillW) / 2, yTop + 0.8, z + 0.6, fillW, 4, fillColor, 1);
  }
}

let selectedHero = HEROES.swift;
let currentWeapon = { ...WAR_WEAPONS.default };
let currentMelee = { ...MELEE_WEAPONS.knife };
let currentArmor = { ...ARMORS.none };
let currentThrowable = { ...THROWABLES.default };
let currentHook = { ...HOOKS.default };
let currentMap = MAPS.grid;
let pendingLevelIndex = 0;

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
let firstBossDefeated = false;

// ✨ 關卡進度
let currentLevelIndex = 0;
let pendingHeroKey = null;

let keys = {};
let mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false }; // 遊戲世界座標(與player.x/y同一空間)
let mouseScreen = { x: canvas.width / 2, y: canvas.height / 2 }; // 滑鼠在螢幕上的原始像素位置

let touchMoveId = null, touchAimId = null;
let touchMoveStart = { x: 0, y: 0 }, touchMoveCurrent = { x: 0, y: 0 };
let touchAimStart = { x: 0, y: 0 }, touchAimCurrent = { x: 0, y: 0 };
let isTouchAiming = false;

let player = {
  x: canvas.width / 2,
  y: (canvas.height - BOTTOM_SAFE_MARGIN) / 2,
  vx: 0, vy: 0, angle: 0, hp: 300, maxHp: 300, speed: 5, radius: 20, dmgMultBonus: 1.0
};
// ✨ 雙人連線：player2 僅在房主端(netRole==='host')且訪客已連線時才會建立，代表訪客控制的隊友
let player2 = null;

let cd = { dash: 0, shotgun: 0, stun: 0, laser: 0, tar: 0, shield: 0, heal: 0, knockback: 0, grenade: 0, hook: 0, voidnova: 0, apex: 0 };
const MAX_CD = { dash: 3, shotgun: 4, stun: 6, laser: 8, tar: 7, shield: 12, heal: 15, knockback: 9, grenade: 10, hook: 8, voidnova: 20, apex: 30 };
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
function getWeaponPower(w) {
  return (w.dmg / w.fireInterval) * (w.ammo === Infinity ? 1.2 : 1.0);
}
function getMeleePower(m) {
  return (m.dmg / m.cooldown) * (m.ammo === Infinity ? 1.2 : 1.0);
}
// ✨ 雙人連線：讓小怪/Boss 追逐離自己較近的那位玩家(隊友或房主)
function getNearestPlayerTarget(x, y) {
  if (!player2 || player2.hp <= 0) return player;
  let d1 = Math.hypot(player.x - x, player.y - y);
  let d2 = Math.hypot(player2.x - x, player2.y - y);
  return d2 < d1 ? player2 : player;
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
let bossLaserBeams = [];
let gravityWells = [];
let grenades = [];
let hookLines = [];
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
  pendingLevelIndex = levelIndex;
  document.getElementById('levelSelectModal').classList.add('hidden');
  renderMapSelect();
  document.getElementById('mapSelectModal').classList.remove('hidden');
}

function renderMapSelect() {
  const colors = ['emerald', 'cyan', 'amber', 'rose'];
  document.getElementById('mapSelectList').innerHTML = Object.keys(MAPS).map((key, idx) => {
    let m = MAPS[key];
    let c = colors[idx % colors.length];
    return `
      <div onclick="selectMap('${key}')" class="bg-slate-800/80 border-2 border-slate-700 hover:border-${c}-400 rounded-xl p-3 cursor-pointer transition-all hover:-translate-y-1 flex items-center gap-3">
        <div class="text-3xl">${m.icon}</div>
        <div class="text-left flex-1">
          <h3 class="text-sm font-bold text-${c}-300">${m.name}</h3>
          <p class="text-[11px] text-slate-400 mt-0.5">障礙物密度：${m.obstacleCount}</p>
          ${m.themeEnemy ? `<p class="text-[11px] text-rose-300 mt-0.5">⚠️ 特有威脅：${ENEMY_TYPES[m.themeEnemy].name}</p>` : ''}
        </div>
      </div>`;
  }).join('');
}

function selectMap(mapKey) {
  currentMap = MAPS[mapKey];
  document.getElementById('mapSelectModal').classList.add('hidden');
  document.getElementById('hudHeroAvatar').innerText = selectedHero.avatar;
  document.getElementById('hudHeroName').innerText = selectedHero.name;
  document.getElementById('hudHeroRole').innerText = selectedHero.role;
  initGame(pendingLevelIndex);
}

function backToLevelSelect() {
  document.getElementById('mapSelectModal').classList.add('hidden');
  renderLevelSelect();
  document.getElementById('levelSelectModal').classList.remove('hidden');
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

function exitToMenu() {
  if (gameState === 'PLAYING') {
    if (!confirm('確定要退出本局挑戰嗎？目前進度將會遺失。')) return;
    if (typeof netRole !== 'undefined' && netRole === 'host' && netConn && netConnected) {
      netConn.send({ t: 'ended', win: false, score: score });
    }
  }
  openCharSelect();
}

function initGame(levelIndex) {
  currentLevelIndex = levelIndex !== undefined ? levelIndex : 0;
  gameState = 'PLAYING';
  score = levelStartScore(currentLevelIndex); level = 1; exp = 0; maxExp = 10; frenzyTimer = 0;
  wheelSpins = shopData.upgrades.wheel * UPGRADE_DEFS.wheel.step;

  bossWaveCount = LEVELS[currentLevelIndex].startBossWaveCount;
  lastBossScoreTrigger = score;
  firstBossDefeated = bossWaveCount >= 1;

  currentWeapon = { ...WAR_WEAPONS[shopData.starterWeapon] };
  currentMelee = { ...MELEE_WEAPONS[shopData.starterMelee] };
  currentArmor = { ...ARMORS[shopData.starterArmor] };
  currentThrowable = { ...THROWABLES[shopData.starterThrowable || 'default'] };
  currentHook = { ...HOOKS[shopData.starterHook || 'default'] };

  player.maxHp = selectedHero.maxHp + shopData.upgrades.maxHp * UPGRADE_DEFS.maxHp.step;
  player.hp = player.maxHp;
  player.speed = selectedHero.speed + shopData.upgrades.speed * UPGRADE_DEFS.speed.step;
  player.dmgMultBonus = 1.0 + shopData.upgrades.dmg * UPGRADE_DEFS.dmg.step;
  player.x = canvas.width / 2;
  player.y = (canvas.height - BOTTOM_SAFE_MARGIN) / 2;

  MAX_CD.dash = Math.max(0.3, selectedHero.dashCd - shopData.upgrades.dashCd * UPGRADE_DEFS.dashCd.step);
  pickupRange = 120 + shopData.upgrades.pickup * UPGRADE_DEFS.pickup.step;
  for (let k in cd) cd[k] = 0;

  bullets = []; enemies = []; bosses = []; particles = []; tarPuddles = []; lasers = []; slashes = []; drops = []; floatingTexts = []; poisonClouds = []; shockwaves = []; bossProjectiles = []; bossLaserBeams = []; gravityWells = []; grenades = []; hookLines = [];
  playerFrozenTimer = 0;
  playerShieldTimer = 0;
  generateObstacles();
  if (!threeScene) initThreeScene(); else rebuildGroundAndObstacles();

  player2 = null;
  if (typeof netRole !== 'undefined' && netRole === 'host' && netConnected && netGuestHeroKey) {
    let h2 = HEROES[netGuestHeroKey];
    player2 = {
      x: canvas.width / 2 + 60, y: (canvas.height - BOTTOM_SAFE_MARGIN) / 2,
      angle: 0, hp: h2.maxHp, maxHp: h2.maxHp, speed: h2.speed, radius: 20,
      dmgMult: h2.dmgMult, color: h2.color, heroName: h2.name, lastShootTime: 0
    };
    netConn.send({ t: 'started', hostHero: selectedHero.id, levelIndex: currentLevelIndex });
  }

  document.getElementById('gameOverModal').classList.add('hidden');
  document.getElementById('bossHud').classList.add('hidden');
  updateUI();
}

function restartGame() { initGame(currentLevelIndex); }

// ✨ 障礙物：靜態岩塊，會阻擋玩家/小怪/Boss 移動與子彈飛行
function generateObstacles() {
  obstacles = [];
  let usableHeight = canvas.height - BOTTOM_SAFE_MARGIN;
  let count = currentMap.obstacleCount;
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

function endGame(isVictory) {
  gameState = 'GAMEOVER';
  document.getElementById('gameOverTitle').innerText = isVictory ? `🏆 ${LEVELS[currentLevelIndex].name} 挑戰成功！` : '任務失敗 / 戰損撤退';
  document.getElementById('gameOverTitle').className = `text-3xl sm:text-4xl font-black mb-2 ${isVictory ? 'text-emerald-400' : 'text-red-500'}`;
  document.getElementById('finalScore').innerText = score;
  document.getElementById('finalLevel').innerText = `Lv.${level}`;
  document.getElementById('gameOverModal').classList.remove('hidden');
  if (typeof netRole !== 'undefined' && netRole === 'host' && netConn && netConnected) {
    netConn.send({ t: 'ended', win: isVictory, score: score });
  }
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
  if (code === 'KeyZ') triggerSkill('knockback');
  if (code === 'KeyC') triggerSkill('grenade');
  if (code === 'KeyX') triggerSkill('hook');
  if (code === 'KeyV') triggerSkill('voidnova');
  if (code === 'KeyB') triggerSkill('apex');
  if (code === 'KeyR') triggerSkill('ult');
});

window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => { if (!isTouchAiming && gameState === 'PLAYING') { mouseScreen.x = e.clientX; mouseScreen.y = e.clientY; } });
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
  } else if (skillType === 'knockback' && cd.knockback <= 0) {
    cd.knockback = MAX_CD.knockback;
    enemies.concat(bosses).forEach(e => {
      let dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < 300 && dist > 0) {
        let pushAngle = Math.atan2(e.y - player.y, e.x - player.x);
        let resolved = resolveCircleObstacles(e.x + Math.cos(pushAngle) * 160, e.y + Math.sin(pushAngle) * 160, e.radius);
        e.x = resolved.x; e.y = resolved.y;
        e.hp -= 15 * currentDmgMult;
        e.stunned = Math.max(e.stunned, 30);
        spawnParticles(e.x, e.y, '#fbbf24', 6);
      }
    });
    spawnParticles(player.x, player.y, '#fbbf24', 30);
    addFloatingText(player.x, player.y - 30, '💥 衝擊波!', '#fbbf24');
  } else if (skillType === 'grenade' && cd.grenade <= 0) {
    cd.grenade = MAX_CD.grenade;
    let dx = mouse.x - player.x, dy = mouse.y - player.y;
    let dist = Math.hypot(dx, dy) || 1;
    let travelTime = Math.min(50, Math.max(14, Math.round(dist / 9)));
    grenades.push({
      x: player.x, y: player.y, startX: player.x, startY: player.y,
      targetX: mouse.x, targetY: mouse.y, timer: travelTime, maxTimer: travelTime,
      exploded: false, explodeTimer: 0, dmg: currentThrowable.dmg * currentDmgMult,
      radius: currentThrowable.radius, color: currentThrowable.color, icon: currentThrowable.icon,
      burn: !!currentThrowable.burn, slow: !!currentThrowable.slow, stunBonus: currentThrowable.stunBonus || 0,
      smoke: !!currentThrowable.smoke, knockback: !!currentThrowable.knockback
    });
  } else if (skillType === 'hook' && cd.hook <= 0) {
    cd.hook = MAX_CD.hook;
    let hookRange = currentHook.range;
    let hookColor = currentHook.color;
    let hookAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    let bestTarget = null, bestDiff = 0.35;
    enemies.concat(bosses).forEach(e => {
      let d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d > hookRange) return;
      let angTo = Math.atan2(e.y - player.y, e.x - player.x);
      let diff = Math.abs(Math.atan2(Math.sin(angTo - hookAngle), Math.cos(angTo - hookAngle)));
      if (diff < bestDiff) { bestDiff = diff; bestTarget = e; }
    });
    if (bestTarget) {
      hookLines.push({ x1: player.x, y1: player.y, x2: bestTarget.x, y2: bestTarget.y, timer: 12, maxTimer: 12, color: hookColor });
      let pullAngle = Math.atan2(player.y - bestTarget.y, player.x - bestTarget.x);
      let pullDist = Math.max(0, Math.hypot(bestTarget.x - player.x, bestTarget.y - player.y) - (player.radius + bestTarget.radius + 20));
      let resolved = resolveCircleObstacles(bestTarget.x + Math.cos(pullAngle) * pullDist, bestTarget.y + Math.sin(pullAngle) * pullDist, bestTarget.radius);
      bestTarget.x = resolved.x; bestTarget.y = resolved.y;
      bestTarget.hp -= currentHook.dmg * currentDmgMult;
      bestTarget.stunned = Math.max(bestTarget.stunned, currentHook.stunFrames);
      spawnParticles(bestTarget.x, bestTarget.y, hookColor, 14);
      addFloatingText(bestTarget.x, bestTarget.y - 20, `${currentHook.icon} 鉤拉!`, hookColor);
    } else {
      let targetX = player.x + Math.cos(hookAngle) * hookRange;
      let targetY = player.y + Math.sin(hookAngle) * hookRange;
      hookLines.push({ x1: player.x, y1: player.y, x2: targetX, y2: targetY, timer: 12, maxTimer: 12, color: hookColor });
      let resolved = resolveCircleObstacles(targetX, targetY, player.radius);
      player.x = resolved.x; player.y = resolved.y;
      spawnParticles(player.x, player.y, hookColor, 18);
      addFloatingText(player.x, player.y - 30, `${currentHook.icon} 鉤爪疾行!`, hookColor);
    }
  } else if (skillType === 'voidnova' && cd.voidnova <= 0 && canSynthesizeSkill()) {
    cd.voidnova = MAX_CD.voidnova;
    let novaRadius = 260;
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < novaRadius) {
        e.hp -= 220 * currentDmgMult;
        e.stunned = Math.max(e.stunned, 90);
        spawnParticles(e.x, e.y, '#4c1d95', 10);
      }
    });
    spawnParticles(player.x, player.y, '#4c1d95', 60);
    addFloatingText(player.x, player.y - 40, '🌌 虛空湮滅!', '#c4b5fd');
  } else if (skillType === 'apex' && cd.apex <= 0 && canSynthesizeApexSkill()) {
    cd.apex = MAX_CD.apex;
    let apexRadius = 400;
    enemies.concat(bosses).forEach(e => {
      let dist = Math.hypot(e.x - player.x, e.y - player.y);
      if (dist < apexRadius) {
        e.hp -= 350 * currentDmgMult;
        e.stunned = Math.max(e.stunned, 150);
        if (dist > 0) {
          let pushAngle = Math.atan2(e.y - player.y, e.x - player.x);
          let resolved = resolveCircleObstacles(e.x + Math.cos(pushAngle) * 180, e.y + Math.sin(pushAngle) * 180, e.radius);
          e.x = resolved.x; e.y = resolved.y;
        }
        spawnParticles(e.x, e.y, '#fde047', 12);
      }
    });
    playerShieldTimer = 180;
    spawnParticles(player.x, player.y, '#fde047', 80);
    addFloatingText(player.x, player.y - 40, '👑 終焉主宰!', '#fde047');
  } else if (skillType === 'ult' && score >= getUltReq()) {
    score -= getUltReq();
    let ultBulletCount = 48;
    for (let i = 0; i < ultBulletCount; i++) {
      let a = (Math.PI * 2 / ultBulletCount) * i;
      bullets.push({ x: player.x, y: player.y, vx: Math.cos(a) * 11 * GAME_SPEED, vy: Math.sin(a) * 11 * GAME_SPEED, dmg: 65 * currentDmgMult, life: 90, color: '#ef4444', radius: 7, type: 'bullet' });
    }
    enemies.concat(bosses).forEach(e => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < 180) {
        e.stunned = 120; e.hp -= 90 * currentDmgMult; spawnParticles(e.x, e.y, '#ef4444', 10);
      }
    });
    spawnParticles(player.x, player.y, '#ef4444', 50);
    addFloatingText(player.x, player.y - 40, '💥 究極殲滅!', '#ef4444');
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

  if (currentMelee.ammo !== Infinity && !(selectedHero.id === 'armorer' && Math.random() < 0.33)) {
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

  if (rand < 0.30 && firstBossDefeated) { dropType = 'crate'; icon = '📦'; color = '#f97316'; }
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
  if (typeof netRole !== 'undefined' && netRole === 'guest') {
    updateMouseWorldFromScreen();
    netGuestTick();
    requestAnimationFrame(gameLoop);
    return;
  }
  if (gameState === 'PLAYING') { updateMouseWorldFromScreen(); update(); }
  render();
  if (typeof netRole !== 'undefined' && netRole === 'host' && netConnected && gameState === 'PLAYING') {
    netHostBroadcast();
  }
  requestAnimationFrame(gameLoop);
}

function update() {
  // ✨ 挑戰的關卡打完即結束本次任務(不會自動接關)
  if (score >= LEVELS[currentLevelIndex].killTarget) { endGame(true); return; }

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

    if (currentWeapon.ammo !== Infinity && !(selectedHero.id === 'armorer' && Math.random() < 0.33)) {
      currentWeapon.ammo--;
      if (currentWeapon.ammo <= 0) {
        addFloatingText(player.x, player.y - 20, '彈藥耗盡，切換回標準步槍!', '#f87171');
        currentWeapon = { ...WAR_WEAPONS.default };
      }
    }
  }

  for (let k in cd) { if (cd[k] > 0) cd[k] = Math.max(0, cd[k] - 1 / 60); }

  // ✨ 雙人連線：房主端根據訪客傳來的輸入模擬隊友(player2)的移動與射擊
  if (player2 && player2.hp > 0) {
    let in2 = netRemoteInput || {};
    let moveX2 = 0, moveY2 = 0;
    if (in2.up) moveY2 -= 1;
    if (in2.down) moveY2 += 1;
    if (in2.left) moveX2 -= 1;
    if (in2.right) moveX2 += 1;
    let len2 = Math.hypot(moveX2, moveY2);
    if (len2 > 0) {
      player2.x += (moveX2 / (len2 > 1 ? len2 : 1)) * player2.speed * GAME_SPEED;
      player2.y += (moveY2 / (len2 > 1 ? len2 : 1)) * player2.speed * GAME_SPEED;
    }
    player2.x = Math.max(player2.radius, Math.min(canvas.width - player2.radius, player2.x));
    player2.y = Math.max(player2.radius, Math.min(canvas.height - player2.radius - BOTTOM_SAFE_MARGIN, player2.y));
    let resolvedP2 = resolveCircleObstacles(player2.x, player2.y, player2.radius);
    player2.x = resolvedP2.x; player2.y = resolvedP2.y;
    player2.angle = in2.aimAngle || 0;

    if (in2.mouseDown && Date.now() - player2.lastShootTime > 150) {
      player2.lastShootTime = Date.now();
      let bSpeed2 = 11 * GAME_SPEED;
      bullets.push({
        x: player2.x, y: player2.y,
        vx: Math.cos(player2.angle) * bSpeed2, vy: Math.sin(player2.angle) * bSpeed2,
        dmg: 18 * player2.dmgMult, life: 60, color: '#a3e635', radius: 3, type: 'bullet'
      });
    }
  }

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

        if (b.type !== 'railgun' && selectedHero.id !== 'piercer') b.life = 0;
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
        if (p.isSmoke) e.confused = true;
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

  grenades.forEach((g, index) => {
    if (!g.exploded) {
      g.timer--;
      let pct = 1 - Math.max(0, g.timer) / g.maxTimer;
      g.x = g.startX + (g.targetX - g.startX) * pct;
      g.y = g.startY + (g.targetY - g.startY) * pct;
      if (g.timer <= 0) {
        g.exploded = true; g.explodeTimer = 14;
        let stunFrames = 40 + (g.stunBonus || 0);
        enemies.concat(bosses).forEach(e => {
          let dist = Math.hypot(e.x - g.x, e.y - g.y);
          if (dist < g.radius) {
            e.hp -= g.dmg; e.stunned = Math.max(e.stunned, stunFrames);
            if (g.knockback && dist > 0) {
              let pushAngle = Math.atan2(e.y - g.y, e.x - g.x);
              let resolved = resolveCircleObstacles(e.x + Math.cos(pushAngle) * 140, e.y + Math.sin(pushAngle) * 140, e.radius);
              e.x = resolved.x; e.y = resolved.y;
            }
            spawnParticles(e.x, e.y, g.color || '#fb923c', 6);
          }
        });
        if (g.burn) tarPuddles.push({ x: g.x, y: g.y, radius: g.radius * 0.8, timer: 180, isPyro: true });
        if (g.slow) tarPuddles.push({ x: g.x, y: g.y, radius: g.radius * 0.9, timer: 150, isPyro: false });
        if (g.smoke) tarPuddles.push({ x: g.x, y: g.y, radius: g.radius, timer: 200, isPyro: false, isSmoke: true });
        spawnParticles(g.x, g.y, g.color || '#fb923c', 35);
        addFloatingText(g.x, g.y - 20, `${g.icon || '💣'} 爆炸!`, g.color || '#fb923c');
      }
    } else {
      g.explodeTimer--;
      if (g.explodeTimer <= 0) grenades.splice(index, 1);
    }
  });

  hookLines.forEach((h, index) => {
    h.timer--;
    if (h.timer <= 0) hookLines.splice(index, 1);
  });

  drops.forEach((d, index) => {
    d.life--; d.floatOffset += 0.05;
    let dist = Math.hypot(player.x - d.x, player.y - d.y);
    if (dist < pickupRange) { d.x += (player.x - d.x) * 0.12; d.y += (player.y - d.y) * 0.12; }

    if (dist < player.radius + 15) {
      if (d.type === 'hp') {
        player.hp = Math.min(player.maxHp, player.hp + 50 * getHealMult()); addFloatingText(player.x, player.y - 20, '+50 HP', '#4ade80');
      } else if (d.type === 'coin') {
        let goldGain = selectedHero.id === 'merchant' ? 15 : 10;
        shopData.gold += goldGain; saveShopData(); updateGoldDisplays();
        addFloatingText(player.x, player.y - 20, `🪙 +${goldGain} 金幣!`, '#f59e0b');
      } else if (d.type === 'crate') {
        if (Math.random() < 0.6) {
          const keys = ['rpg', 'railgun', 'flamethrower', 'minigun', 'nuke_gun', 'sniper', 'smg', 'laser_rifle', 'revolver', 'crossbow', 'plasma_smg', 'grenade_launcher', 'arc_caster', 'auto_cannon', 'needle_gun'];
          let wKey = keys[Math.floor(Math.random() * keys.length)];
          let candidate = WAR_WEAPONS[wKey];
          if (getWeaponPower(candidate) > getWeaponPower(currentWeapon)) {
            currentWeapon = { ...candidate };
            addFloatingText(player.x, player.y - 20, `💣 獲得戰爭武器: ${currentWeapon.name}!`, '#f59e0b');
          } else {
            addFloatingText(player.x, player.y - 20, `📦 武器箱 (裝備已是更強武器，未替換)`, '#94a3b8');
          }
        } else {
          const mKeys = ['axe', 'katana', 'hammer', 'spear', 'chainsaw', 'whip', 'twin_daggers', 'scythe', 'war_pick'];
          let mKey = mKeys[Math.floor(Math.random() * mKeys.length)];
          let candidate = MELEE_WEAPONS[mKey];
          if (getMeleePower(candidate) > getMeleePower(currentMelee)) {
            currentMelee = { ...candidate };
            addFloatingText(player.x, player.y - 20, `⚔️ 獲得近戰兵器: ${currentMelee.name}!`, '#fb7185');
          } else {
            addFloatingText(player.x, player.y - 20, `📦 武器箱 (裝備已是更強近戰武器，未替換)`, '#94a3b8');
          }
        }
      } else if (d.type === 'exp') {
        let expGain = getExpGain(4);
        exp += expGain; addFloatingText(player.x, player.y - 20, `+${expGain.toFixed(1)} EXP`, '#38bdf8');
        if (exp >= maxExp) {
          level++; exp -= maxExp; maxExp = Math.floor(maxExp * 1.4);
          player.maxHp += 20; player.hp += 20; player.dmgMultBonus += 0.15;
          wheelSpins++;
          addFloatingText(player.x, player.y - 40, `LEVEL UP! Lv.${level}`, '#facc15');
          if (level % 2 === 0) {
            shopData.gold += 30; saveShopData(); updateGoldDisplays();
            addFloatingText(player.x, player.y - 60, '💰 升級獎勵 +30 金幣!', '#f59e0b');
          }
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

  let maxEnemies = 10 + Math.floor(score / 3.5);
  if (bosses.length === 0 && enemies.length < maxEnemies && Math.random() < 0.018) {
    let spawnEdge = Math.floor(Math.random() * 4);
    let ex = 0, ey = 0, usableHeight = canvas.height - BOTTOM_SAFE_MARGIN;
    if (spawnEdge === 0) { ex = Math.random() * canvas.width; ey = -20; }
    else if (spawnEdge === 1) { ex = canvas.width + 20; ey = Math.random() * usableHeight; }
    else if (spawnEdge === 2) { ex = Math.random() * canvas.width; ey = usableHeight + 20; }
    else { ex = -20; ey = Math.random() * usableHeight; }

    let baseHp = 46 + score * 1.5;
    let et = ENEMY_TYPES[pickEnemyType(score, currentMap.id)];
    let hp = baseHp * et.hpMult;
    enemies.push({
      x: ex, y: ey,
      hp: hp, maxHp: hp,
      speed: (1.4 + Math.random() * 1.1) * et.speedMult, radius: 16 * et.radiusMult,
      stunned: 0, slowed: false,
      flankOffset: (Math.random() - 0.5) * 0.8,
      type: et.id, color: et.color, contactDmg: et.contactDmg,
      isRanged: !!et.isRanged, rangedCd: et.isRanged ? (60 + Math.random() * 60) : undefined,
      rangedDmg: et.rangedDmg, rangedColor: et.rangedColor,
      isSplitter: !!et.isSplitter
    });
  }

  enemies.forEach((e, index) => {
    if (e.stunned > 0) {
      e.stunned--;
    } else {
      let spd = (e.slowed ? e.speed * 0.4 : e.speed) * GAME_SPEED;
      let eTarget = getNearestPlayerTarget(e.x, e.y);
      let baseAngle;
      if (e.confused) {
        if (e._confuseAngle === undefined || Math.random() < 0.02) e._confuseAngle = Math.random() * Math.PI * 2;
        baseAngle = e._confuseAngle;
      } else {
        baseAngle = Math.atan2(eTarget.y - e.y, eTarget.x - e.x) + (e.flankOffset || 0);
      }
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
      e.confused = false;

      // ✨ 蜂群小怪(蜂巢女王召喚)與毒刺潰兵(一般波次)具備遠程螫刺能力，在一定距離內會對最近的玩家發射毒針
      if (e.isSwarmling || e.isRanged) {
        e.rangedCd--;
        if (e.rangedCd <= 0) {
          let stingDist = Math.hypot(eTarget.x - e.x, eTarget.y - e.y);
          if (stingDist < 480) {
            e.rangedCd = 90 + Math.random() * 50;
            let stingAngle = Math.atan2(eTarget.y - e.y, eTarget.x - e.x);
            let stingSpeed = 6.5 * GAME_SPEED;
            bossProjectiles.push({ x: e.x, y: e.y, vx: Math.cos(stingAngle) * stingSpeed, vy: Math.sin(stingAngle) * stingSpeed, radius: 5, life: 130, dmg: e.rangedDmg || 11, color: e.rangedColor || '#facc15' });
          } else {
            e.rangedCd = 30;
          }
        }
      }

      if (Math.hypot(player.x - e.x, player.y - e.y) < player.radius + e.radius) {
        if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
          player.hp -= applyArmor(e.contactDmg || 0.8);
          if (player.hp <= 0) endGame(false);
        }
      }
      if (player2 && player2.hp > 0 && Math.hypot(player2.x - e.x, player2.y - e.y) < player2.radius + e.radius) {
        player2.hp -= (e.contactDmg || 0.8);
      }
    }

    if (e.hp <= 0) {
      score++;
      if (selectedHero.id === 'reaper') player.hp = Math.min(player.maxHp, player.hp + 5);
      trySpawnDrop(e.x, e.y);
      spawnParticles(e.x, e.y, '#ef4444', 12);
      if (e.isSplitter) {
        let childHp = e.maxHp * 0.35;
        for (let i = 0; i < 2; i++) {
          let a = Math.random() * Math.PI * 2;
          enemies.push({
            x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20,
            hp: childHp, maxHp: childHp, speed: e.speed * 1.4, radius: e.radius * 0.6,
            stunned: 0, slowed: false, flankOffset: (Math.random() - 0.5) * 0.8,
            type: 'splitter_shard', color: '#22d3ee', contactDmg: 0.4, isSplitter: false
          });
        }
      }
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
              player.hp -= applyArmor(20);
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
              player.hp -= applyArmor(11);
              if (player.hp <= 0) endGame(false);
            }
            playerFrozenTimer = 90;
            addFloatingText(player.x, player.y - 30, '🧊 凍結!', '#7dd3fc');
          }
          spawnParticles(b.x, b.y, '#7dd3fc', 20);
          addFloatingText(b.x, b.y - 20, '❄️ 冰凍新星!', '#7dd3fc');
        }
      } else if (b.id === 'wraith_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 160;
          if (Math.hypot(player.x - b.x, player.y - b.y) < 140) {
            if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
              let siphonDmg = applyArmor(16);
              player.hp -= siphonDmg;
              b.hp = Math.min(b.maxHp, b.hp + siphonDmg * 1.5);
              if (player.hp <= 0) endGame(false);
            }
          }
          spawnParticles(b.x, b.y, '#c4b5fd', 22);
          addFloatingText(b.x, b.y - 20, '👻 靈魂虹吸!', '#c4b5fd');
        }
      } else if (b.id === 'void_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 170;
          let warpAngle = Math.random() * Math.PI * 2;
          let warpDist = 90 + Math.random() * 40;
          b.x = player.x + Math.cos(warpAngle) * warpDist;
          b.y = player.y + Math.sin(warpAngle) * warpDist;
          let resolvedWarpPos = resolveCircleObstacles(b.x, b.y, b.radius);
          b.x = resolvedWarpPos.x; b.y = resolvedWarpPos.y;
          if (Math.hypot(player.x - b.x, player.y - b.y) < 130) {
            if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
              player.hp -= applyArmor(18);
              if (player.hp <= 0) endGame(false);
            }
          }
          spawnParticles(b.x, b.y, '#9333ea', 26);
          addFloatingText(b.x, b.y - 20, '🌀 虛空躍遷!', '#9333ea');
        }
      } else if (b.id === 'laser_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 240;
          let beamAngle = Math.atan2(player.y - b.y, player.x - b.x);
          bossLaserBeams.push({ ownerBoss: b, x: b.x, y: b.y, angle: beamAngle, turnRate: 0.05, length: 280, life: 150 });
          spawnParticles(b.x, b.y, '#f43f5e', 20);
          addFloatingText(b.x, b.y - 20, '🔴 鐳射掃描啟動!', '#f43f5e');
        }
      } else if (b.id === 'swarm_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 220;
          let minionHp = (46 + score * 1.5) * 0.55;
          for (let i = 0; i < 3; i++) {
            let spawnAngle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
            enemies.push({
              x: b.x + Math.cos(spawnAngle) * 50, y: b.y + Math.sin(spawnAngle) * 50,
              hp: minionHp, maxHp: minionHp,
              speed: 1.8 + Math.random() * 0.8, radius: 12,
              stunned: 0, slowed: false,
              flankOffset: (Math.random() - 0.5) * 0.8,
              isSwarmling: true, rangedCd: 60 + Math.random() * 60
            });
          }
          spawnParticles(b.x, b.y, '#facc15', 24);
          addFloatingText(b.x, b.y - 20, '🐝 蜂群甦醒!', '#facc15');
        }
      } else if (b.id === 'gravity_boss') {
        b.skillTimer--;
        if (b.skillTimer <= 0) {
          b.skillTimer = 230;
          gravityWells.push({ x: b.x, y: b.y, radius: 220, timer: 110, pullStrength: 1.8 });
          spawnParticles(b.x, b.y, '#4338ca', 30);
          addFloatingText(b.x, b.y - 20, '🌀 奇點牽引!', '#818cf8');
        }
      }

      if (Math.hypot(player.x - b.x, player.y - b.y) < player.radius + b.radius) {
        if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
          player.hp -= applyArmor(2.4);
          if (player.hp <= 0) endGame(false);
        }
      }
      if (player2 && player2.hp > 0 && Math.hypot(player2.x - b.x, player2.y - b.y) < player2.radius + b.radius) {
        player2.hp -= 2.4;
      }
    }

    if (b.hp <= 0) {
      score += 10; wheelSpins += 2;
      lastBossScoreTrigger = score; // Boss 自身的加分不計入下一波觸發門檻，避免小怪完全沒有生成空檔
      firstBossDefeated = true;
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
        player.hp -= applyArmor(1.3);
        if (player.hp <= 0) endGame(false);
      }
    }
    if (player2 && player2.hp > 0 && Math.hypot(player2.x - c.x, player2.y - c.y) < c.radius) player2.hp -= 1.3;
    if (c.timer <= 0) poisonClouds.splice(index, 1);
  });

  shockwaves.forEach((s, index) => {
    s.timer--; if (s.radius < s.maxRadius) s.radius += (s.maxRadius / 40);
    if (Math.hypot(player.x - s.x, player.y - s.y) < s.radius) {
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(1.6);
        if (player.hp <= 0) endGame(false);
      }
    }
    if (player2 && player2.hp > 0 && Math.hypot(player2.x - s.x, player2.y - s.y) < s.radius) player2.hp -= 1.6;
    if (s.timer <= 0) shockwaves.splice(index, 1);
  });

  bossProjectiles.forEach((p, index) => {
    p.x += p.vx; p.y += p.vy; p.life--;
    let pDmg = p.dmg || 26, pColor = p.color || '#f97316';
    if (Math.hypot(player.x - p.x, player.y - p.y) < player.radius + p.radius) {
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(pDmg);
        if (player.hp <= 0) endGame(false);
      }
      p.life = 0;
      spawnParticles(p.x, p.y, pColor, 10);
    }
    if (player2 && player2.hp > 0 && p.life > 0 && Math.hypot(player2.x - p.x, player2.y - p.y) < player2.radius + p.radius) {
      player2.hp -= pDmg;
      p.life = 0;
      spawnParticles(p.x, p.y, pColor, 10);
    }
    if (p.life > 0 && circleHitsObstacle(p.x, p.y, p.radius)) {
      spawnParticles(p.x, p.y, pColor, 6);
      p.life = 0;
    }
    if (p.life <= 0) bossProjectiles.splice(index, 1);
  });

  bossLaserBeams.forEach((l, index) => {
    l.life--;
    if (l.ownerBoss && bosses.includes(l.ownerBoss)) { l.x = l.ownerBoss.x; l.y = l.ownerBoss.y; }
    let targetAngle = Math.atan2(player.y - l.y, player.x - l.x);
    let angleDiff = targetAngle - l.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    l.angle += Math.max(-l.turnRate, Math.min(l.turnRate, angleDiff));
    let dirX = Math.cos(l.angle), dirY = Math.sin(l.angle);
    let toPlayerX = player.x - l.x, toPlayerY = player.y - l.y;
    let along = toPlayerX * dirX + toPlayerY * dirY;
    let perp = Math.abs(toPlayerX * dirY - toPlayerY * dirX);
    if (along > 0 && along < l.length && perp < 16 + player.radius) {
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(1.2);
        if (player.hp <= 0) endGame(false);
      }
    }
    if (l.life <= 0) bossLaserBeams.splice(index, 1);
  });

  gravityWells.forEach((w, index) => {
    w.timer--;
    let pdist = Math.hypot(player.x - w.x, player.y - w.y);
    if (pdist < w.radius && pdist > 1) {
      let pullAngle = Math.atan2(w.y - player.y, w.x - player.x);
      player.x += Math.cos(pullAngle) * w.pullStrength * GAME_SPEED;
      player.y += Math.sin(pullAngle) * w.pullStrength * GAME_SPEED;
      if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
        player.hp -= applyArmor(0.6);
        if (player.hp <= 0) endGame(false);
      }
    }
    if (player2 && player2.hp > 0) {
      let p2dist = Math.hypot(player2.x - w.x, player2.y - w.y);
      if (p2dist < w.radius && p2dist > 1) {
        let pullAngle2 = Math.atan2(w.y - player2.y, w.x - player2.x);
        player2.x += Math.cos(pullAngle2) * w.pullStrength * GAME_SPEED;
        player2.y += Math.sin(pullAngle2) * w.pullStrength * GAME_SPEED;
        player2.hp -= 0.6;
      }
    }
    if (w.timer <= 0) gravityWells.splice(index, 1);
  });

  if (playerFrozenTimer > 0) {
    if (frenzyTimer <= 0 && playerShieldTimer <= 0) {
      player.hp -= applyArmor(0.45);
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

  document.getElementById('throwableIcon').innerText = currentThrowable.icon;
  document.getElementById('throwableName').innerText = currentThrowable.name;
  document.getElementById('grenadeBox').firstChild.textContent = currentThrowable.icon;

  document.getElementById('hookIcon').innerText = currentHook.icon;
  document.getElementById('hookName').innerText = currentHook.name;
  document.getElementById('hookBox').firstChild.textContent = currentHook.icon;

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
  updateCdUI('laser', cd.laser); updateCdUI('tar', cd.tar); updateCdUI('shield', cd.shield); updateCdUI('heal', cd.heal); updateCdUI('knockback', cd.knockback); updateCdUI('grenade', cd.grenade); updateCdUI('hook', cd.hook);

  let voidnovaOverlay = document.getElementById('voidnovaCdOverlay');
  if (!canSynthesizeSkill()) { voidnovaOverlay.style.opacity = '1'; voidnovaOverlay.innerText = '🔒 未合成'; }
  else updateCdUI('voidnova', cd.voidnova);

  let apexOverlay = document.getElementById('apexCdOverlay');
  if (!canSynthesizeApexSkill()) { apexOverlay.style.opacity = '1'; apexOverlay.innerText = '🔒 未合成'; }
  else updateCdUI('apex', cd.apex);

  let ultOverlay = document.getElementById('ultCdOverlay');
  if (score >= getUltReq()) ultOverlay.style.opacity = '0';
  else { ultOverlay.style.opacity = '1'; ultOverlay.innerText = `需要${getUltReq()}殺`; }
}

// 選單畫面底色(遊戲進行中改由3D場景渲染，這裡只負責MENU狀態下modal背後的底色)
function drawFloor() {
  ctx.fillStyle = currentMap.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let overlayPool = [];
let overlayUsed = 0;
function showOverlayText(text, wx, wy, wz, color, opacity, fontPx) {
  let p = worldToScreenPx(wx, wy, wz);
  let el = overlayPool[overlayUsed];
  if (!el) {
    el = document.createElement('div');
    el.style.position = 'absolute';
    el.style.transform = 'translate(-50%, -50%)';
    el.style.whiteSpace = 'nowrap';
    el.style.fontWeight = 'bold';
    el.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
    three2dOverlay.appendChild(el);
    overlayPool[overlayUsed] = el;
  }
  el.style.display = 'block';
  el.style.left = p.x + 'px';
  el.style.top = p.y + 'px';
  el.style.color = color;
  el.style.opacity = opacity === undefined ? 1 : opacity;
  el.style.fontSize = (fontPx || 14) + 'px';
  el.textContent = text;
  overlayUsed++;
}

function render() {
  if (gameState === 'MENU') { drawFloor(); return; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!threeScene) initThreeScene();
  while (threeDynamicGroup.children.length) threeDynamicGroup.remove(threeDynamicGroup.children[0]);
  overlayUsed = 0;
  let G = threeDynamicGroup;

  tarPuddles.forEach(p => addGroundDisc(G, p.x, p.y, p.radius, p.isPyro ? '#f97316' : '#ea580c', p.isPyro ? 0.45 : 0.3));
  poisonClouds.forEach(c => addGroundDisc(G, c.x, c.y, c.radius, '#65a30d', 0.35));
  shockwaves.forEach(s => {
    let ring = new THREE.Mesh(threeGeo.ring, getThreeMat('#0ea5e9', 0.7));
    ring.scale.set(s.radius, s.radius, 1);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, 0.6, s.y);
    G.add(ring);
  });
  bossLaserBeams.forEach(l => {
    let ex = l.x + Math.cos(l.angle) * l.length, ey = l.y + Math.sin(l.angle) * l.length;
    addBeam(G, l.x, l.y, ex, ey, '#f43f5e', 16, 0.6, 22);
    addBeam(G, l.x, l.y, ex, ey, '#ffe2e2', 5, 0.9, 22);
  });
  gravityWells.forEach(w => {
    let pct = Math.max(0, w.timer / 110);
    addGroundDisc(G, w.x, w.y, w.radius * (0.5 + 0.5 * (1 - pct)), '#4338ca', 0.4);
    let ring = new THREE.Mesh(threeGeo.ring, getThreeMat('#818cf8', 0.7));
    ring.scale.set(w.radius * 0.6, w.radius * 0.6, 1);
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Date.now() * 0.003;
    ring.position.set(w.x, 0.7, w.y);
    G.add(ring);
  });
  bossProjectiles.forEach(p => {
    let mesh = new THREE.Mesh(threeGeo.sphere, getThreeMat(p.color || '#f97316'));
    mesh.scale.set(p.radius, p.radius, p.radius);
    mesh.position.set(p.x, 20, p.y);
    G.add(mesh);
  });
  lasers.forEach(l => addGroundDisc(G, l.x, l.y, l.radius, '#c084fc', 0.25));
  grenades.forEach(g => {
    if (!g.exploded) {
      let mesh = new THREE.Mesh(threeGeo.sphere, getThreeMat(g.color || '#fb923c'));
      mesh.scale.set(8, 8, 8);
      mesh.position.set(g.x, 24, g.y);
      G.add(mesh);
      showOverlayText(g.icon || '💣', g.x, 24, g.y, '#fff', 1, 18);
    } else {
      let pct = Math.max(0, g.explodeTimer / 14);
      addGroundDisc(G, g.x, g.y, g.radius * (1 - pct * 0.3), g.color || '#fb923c', 0.5 * pct);
    }
  });
  hookLines.forEach(h => {
    let pct = Math.max(0, h.timer / h.maxTimer);
    addBeam(G, h.x1, h.y1, h.x2, h.y2, h.color || '#2dd4bf', 2.5, pct, 20);
  });
  slashes.forEach(s => {
    let ring = new THREE.Mesh(threeGeo.ring, getThreeMat(s.color, 0.85));
    ring.scale.set(s.radius, s.radius, 1);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, 20, s.y);
    G.add(ring);
  });
  drops.forEach(d => {
    let yOffset = 18 + Math.sin(d.floatOffset) * 4;
    let mesh = new THREE.Mesh(threeGeo.sphere, getThreeMat('#fbbf24', 0.85));
    mesh.scale.set(5, 5, 5);
    mesh.position.set(d.x, yOffset, d.y);
    G.add(mesh);
    showOverlayText(d.icon, d.x, yOffset + 14, d.y, '#fff', 1, 16);
  });

  enemies.forEach(e => {
    let color = e.stunned > 0 ? '#facc15' : (e.color || '#ef4444');
    let angle = Math.atan2(player.y - e.y, player.x - e.x);
    let ch = addCharacterMesh(G, e.x, e.y, e.radius, color, angle);
    let hpPct = Math.max(0, e.hp / e.maxHp);
    addHpBar(G, e.x, e.radius * 1.5 + e.radius * 0.5 + 14, e.y, 32, hpPct);
  });

  bosses.forEach(b => {
    let color = b.stunned > 0 ? '#facc15' : b.color;
    let angle = Math.atan2(player.y - b.y, player.x - b.x);
    addCharacterMesh(G, b.x, b.y, b.radius, color, angle);
    let ring = new THREE.Mesh(threeGeo.ring, getThreeMat(b.enrageTimer > 0 ? '#facc15' : '#ef4444', 0.9));
    let ringR = b.radius + 6 + Math.sin(Date.now() * 0.01) * 4;
    ring.scale.set(ringR, ringR, 1);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(b.x, 1, b.y);
    G.add(ring);
    let hpPct = Math.max(0, b.hp / b.maxHp);
    addHpBar(G, b.x, b.radius * 1.5 + b.radius * 0.5 + 16, b.y, 50, hpPct);
  });

  bullets.forEach(b => {
    let mesh = new THREE.Mesh(threeGeo.sphere, getThreeMat(b.color));
    mesh.scale.set(b.radius, b.radius, b.radius);
    mesh.position.set(b.x, 20, b.y);
    G.add(mesh);
  });

  particles.forEach(p => {
    let mesh = new THREE.Mesh(threeGeo.box, getThreeMat(p.color, Math.max(0, p.life / p.maxLife)));
    mesh.scale.set(4, 4, 4);
    mesh.position.set(p.x, 16, p.y);
    G.add(mesh);
  });

  addCharacterMesh(G, player.x, player.y, player.radius, selectedHero.color, player.angle);
  if (playerFrozenTimer > 0) {
    let ring = new THREE.Mesh(threeGeo.ring, getThreeMat('#7dd3fc', 0.8));
    ring.scale.set(player.radius + 6, player.radius + 6, 1);
    ring.rotation.x = -Math.PI / 2; ring.position.set(player.x, 1, player.y);
    G.add(ring);
  }
  if (playerShieldTimer > 0) {
    let ring = new THREE.Mesh(threeGeo.ring, getThreeMat('#38bdf8', 0.85));
    ring.scale.set(player.radius + 10, player.radius + 10, 1);
    ring.rotation.x = -Math.PI / 2; ring.position.set(player.x, 1.1, player.y);
    G.add(ring);
  }

  // ✨ 雙人連線時，讓兩位玩家都能在畫面上看到彼此的血條(單人模式不顯示，避免多餘的畫面雜訊)
  if (player2) {
    let barY1 = player.radius * 1.5 + player.radius * 0.5 + 18;
    let hpPct1 = Math.max(0, player.hp / player.maxHp);
    addHpBar(G, player.x, barY1, player.y, 36, hpPct1);
    showOverlayText(player.heroName || selectedHero.name || '房主', player.x, barY1 + 10, player.y, '#e2e8f0', 1, 12);
  }

  if (player2 && player2.hp > 0) {
    addCharacterMesh(G, player2.x, player2.y, player2.radius, player2.color || '#a3e635', player2.angle);
    let barY2 = player2.radius * 1.5 + player2.radius * 0.5 + 18;
    let hpPct2 = Math.max(0, player2.hp / player2.maxHp);
    addHpBar(G, player2.x, barY2, player2.y, 36, hpPct2);
    showOverlayText(player2.heroName || '隊友', player2.x, barY2 + 10, player2.y, '#e2e8f0', 1, 12);
  }

  // ✨ 雙人連線：房主與訪客各自螢幕大小不同，隊友座標可能超出自己畫面範圍，
  // 這種情況在畫面邊緣標示箭頭指出隊友方向，避免完全看不到對方在哪
  if (player2) {
    let other = (typeof netRole !== 'undefined' && netRole === 'guest') ? player : player2;
    if (other && other.hp > 0) {
      let usableH2 = canvas.height - BOTTOM_SAFE_MARGIN;
      let onScreen = other.x >= 0 && other.x <= canvas.width && other.y >= 0 && other.y <= usableH2;
      if (!onScreen) {
        let cx = canvas.width / 2, cy = usableH2 / 2;
        let dx = other.x - cx, dy = other.y - cy;
        let angle = Math.atan2(dy, dx);
        let margin = 46;
        let halfW = canvas.width / 2 - margin, halfH = usableH2 / 2 - margin;
        let dirX = Math.cos(angle), dirY = Math.sin(angle);
        let scale = Math.min(Math.abs(dirX) > 0.0001 ? halfW / Math.abs(dirX) : Infinity, Math.abs(dirY) > 0.0001 ? halfH / Math.abs(dirY) : Infinity);
        let ex = cx + dirX * scale, ey = cy + dirY * scale;
        let dist = Math.round(Math.hypot(dx, dy) / 10);
        showOverlayText(`➤ ${other.heroName || (other === player2 ? '隊友' : '房主')} ${dist}m`, ex, 20, ey, other === player2 ? (other.color || '#a3e635') : (selectedHero.color || '#22d3ee'), 1, 12);
      }
    }
  }

  floatingTexts.forEach(ft => showOverlayText(ft.text, ft.x, 30, ft.y, ft.color, ft.opacity, 14));

  for (let i = overlayUsed; i < overlayPool.length; i++) overlayPool[i].style.display = 'none';

  updateThreeCameraFollow();
  threeRenderer.render(threeScene, threeCamera);
  drawMinimap();
}

// ✨ 小地圖：左上角HUD下方顯示整個戰場縮圖，方便掌握小怪/Boss/隊友的相對位置
function drawMinimap() {
  let mapW = 210, mapH = 145;
  let mapX = 16, mapY = 150;
  let usableH = canvas.height - BOTTOM_SAFE_MARGIN;
  if (usableH <= 0 || canvas.width <= 0) return;
  let sx = mapW / canvas.width, sy = mapH / usableH;

  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(mapX, mapY, mapW, mapH);

  ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();

  obstacles.forEach(o => {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.fillRect(mapX + o.x * sx, mapY + o.y * sy, Math.max(2, o.w * sx), Math.max(2, o.h * sy));
  });

  enemies.forEach(e => {
    ctx.fillStyle = e.color || '#ef4444';
    ctx.beginPath(); ctx.arc(mapX + e.x * sx, mapY + e.y * sy, 2.6, 0, Math.PI * 2); ctx.fill();
  });

  bosses.forEach(b => {
    ctx.fillStyle = b.color || '#dc2626';
    ctx.beginPath(); ctx.arc(mapX + b.x * sx, mapY + b.y * sy, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
  });

  if (player2 && player2.hp > 0) {
    ctx.fillStyle = player2.color || '#a3e635';
    ctx.beginPath(); ctx.arc(mapX + player2.x * sx, mapY + player2.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
  }

  ctx.fillStyle = (selectedHero && selectedHero.color) || '#22d3ee';
  ctx.beginPath(); ctx.arc(mapX + player.x * sx, mapY + player.y * sy, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.restore();
}

requestAnimationFrame(gameLoop);
