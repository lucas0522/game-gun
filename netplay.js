// ✨ 雙人連線(WebRTC P2P，透過 PeerJS 免費訊號伺服器)
// 房主(host)持續運算完整遊戲邏輯並廣播畫面快照；訪客(guest)只送出操作輸入、並依快照畫面渲染。
let netRole = null; // 'host' | 'guest' | null
let netPeer = null;
let netConn = null;
let netConnected = false;
let netGuestHeroKey = null;
let netHostHeroKey = null;
let netRemoteInput = { up: false, down: false, left: false, right: false, aimAngle: 0, mouseDown: false };
let netSnapshot = null;
let netBroadcastCounter = 0;

function openNetplayModal() {
  document.getElementById('charSelectModal').classList.add('hidden');
  document.getElementById('netplayModal').classList.remove('hidden');
  setNetStatus('');
  document.getElementById('netRoomCodeBox').classList.add('hidden');
  document.getElementById('netGuestHeroSelect').classList.add('hidden');
  document.getElementById('netStartBtn').classList.add('hidden');
}

function closeNetplayModal() {
  document.getElementById('netplayModal').classList.add('hidden');
  document.getElementById('charSelectModal').classList.remove('hidden');
}

function setNetStatus(text) {
  let el = document.getElementById('netplayStatus');
  if (el) el.innerText = text;
}

function netHostCreate() {
  netRole = 'host';
  setNetStatus('正在建立房間，請稍候...');
  netPeer = new Peer();
  netPeer.on('open', id => {
    document.getElementById('netRoomCode').innerText = id;
    document.getElementById('netRoomCodeBox').classList.remove('hidden');
    setNetStatus('房間已建立！把上面的代碼分享給同學輸入。');
  });
  netPeer.on('connection', conn => {
    netConn = conn;
    netConn.on('open', () => {
      netConnected = true;
      setNetStatus('✅ 訪客已連線！等待訪客選擇角色...');
    });
    netConn.on('data', handleNetMessage);
    netConn.on('close', () => { netConnected = false; setNetStatus('⚠️ 訪客已離線'); player2 = null; });
  });
  netPeer.on('error', err => setNetStatus('連線錯誤：' + err.type));
}

function netJoinGame(code) {
  if (!code) return;
  netRole = 'guest';
  setNetStatus('正在連線到房主...');
  netPeer = new Peer();
  netPeer.on('open', () => {
    netConn = netPeer.connect(code.trim());
    netConn.on('open', () => {
      netConnected = true;
      setNetStatus('✅ 已連線！請選擇你的角色');
      document.getElementById('netGuestHeroSelect').classList.remove('hidden');
    });
    netConn.on('data', handleNetMessage);
    netConn.on('close', () => { netConnected = false; setNetStatus('⚠️ 已與房主斷線'); });
  });
  netPeer.on('error', err => setNetStatus('連線錯誤：' + err.type));
}

function netGuestPickHero(heroKey) {
  netGuestHeroKey = heroKey;
  netConn.send({ t: 'hero', hero: heroKey });
  setNetStatus('✅ 已選擇 ' + HEROES[heroKey].name + '，等待房主開始遊戲...');
}

function handleNetMessage(msg) {
  if (netRole === 'host') {
    if (msg.t === 'hero') {
      netGuestHeroKey = msg.hero;
      setNetStatus('✅ 訪客已選擇角色：' + HEROES[msg.hero].name + '，可以開始遊戲了！');
      document.getElementById('netStartBtn').classList.remove('hidden');
    } else if (msg.t === 'input') {
      netRemoteInput = msg;
    }
  } else if (netRole === 'guest') {
    if (msg.t === 'started') {
      document.getElementById('netplayModal').classList.add('hidden');
      netHostHeroKey = msg.hostHero;
      gameState = 'PLAYING';
      document.getElementById('hudHeroAvatar').innerText = HEROES[netGuestHeroKey].avatar;
      document.getElementById('hudHeroName').innerText = HEROES[netGuestHeroKey].name + '（隊友視角）';
      document.getElementById('hudHeroRole').innerText = '雙人連線';
    } else if (msg.t === 'snapshot') {
      netSnapshot = msg.data;
    } else if (msg.t === 'ended') {
      netSnapshot = null;
      gameState = 'GAMEOVER';
      setNetStatus(msg.win ? '🏆 房主任務完成！' : '任務失敗');
      document.getElementById('gameOverTitle').innerText = msg.win ? '🏆 任務完成！' : '任務失敗 / 戰損撤退';
      document.getElementById('gameOverTitle').className = `text-3xl sm:text-4xl font-black mb-2 ${msg.win ? 'text-emerald-400' : 'text-red-500'}`;
      document.getElementById('finalScore').innerText = msg.score || 0;
      document.getElementById('finalLevel').innerText = '雙人連線';
      document.getElementById('gameOverModal').classList.remove('hidden');
    }
  }
}

// 房主端：組出精簡的畫面快照並送給訪客(略過房主自己的商店/彈藥等本地資料，只送渲染需要的內容)
function netHostBroadcast() {
  netBroadcastCounter++;
  if (netBroadcastCounter % 2 !== 0) return; // 約 30fps 廣播頻率，降低頻寬負擔
  if (!netConn || !netConnected) return;
  let data = {
    player: { x: player.x, y: player.y, angle: player.angle, hp: player.hp, maxHp: player.maxHp, radius: player.radius, color: selectedHero.color },
    player2: player2 ? { x: player2.x, y: player2.y, angle: player2.angle, hp: player2.hp, maxHp: player2.maxHp, radius: player2.radius, color: player2.color, heroName: player2.heroName } : null,
    enemies: enemies.map(e => ({ x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, radius: e.radius, stunned: e.stunned })),
    bosses: bosses.map(b => ({ x: b.x, y: b.y, hp: b.hp, maxHp: b.maxHp, radius: b.radius, color: b.color, stunned: b.stunned, enrageTimer: b.enrageTimer || 0 })),
    bullets: bullets.map(b => ({ x: b.x, y: b.y, radius: b.radius, color: b.color })),
    obstacles: obstacles,
    drops: drops.map(d => ({ x: d.x, y: d.y, icon: d.icon, floatOffset: d.floatOffset })),
    floatingTexts: floatingTexts.map(f => ({ x: f.x, y: f.y, text: f.text, color: f.color, opacity: f.opacity })),
    particles: particles.map(p => ({ x: p.x, y: p.y, color: p.color, life: p.life, maxLife: p.maxLife })),
    tarPuddles: tarPuddles,
    poisonClouds: poisonClouds,
    shockwaves: shockwaves,
    bossProjectiles: bossProjectiles.map(p => ({ x: p.x, y: p.y, radius: p.radius })),
    bossLaserBeams: bossLaserBeams.map(l => ({ x: l.x, y: l.y, angle: l.angle, length: l.length })),
    lasers: lasers.map(l => ({ x: l.x, y: l.y, radius: l.radius })),
    slashes: slashes,
    score: score,
    stageLabel: LEVELS[currentLevelIndex] ? LEVELS[currentLevelIndex].name : '',
    playerFrozenTimer: playerFrozenTimer,
    playerShieldTimer: playerShieldTimer
  };
  netConn.send({ t: 'snapshot', data: data });
}

// 訪客端：套用最新快照後直接呼叫既有的 render()，並持續回傳自己的操作輸入
function netGuestTick() {
  if (netSnapshot) {
    let d = netSnapshot;
    player = d.player;
    player2 = d.player2;
    enemies = d.enemies;
    bosses = d.bosses;
    bullets = d.bullets;
    obstacles = d.obstacles;
    drops = d.drops;
    floatingTexts = d.floatingTexts;
    particles = d.particles;
    tarPuddles = d.tarPuddles;
    poisonClouds = d.poisonClouds;
    shockwaves = d.shockwaves;
    bossProjectiles = d.bossProjectiles;
    bossLaserBeams = d.bossLaserBeams;
    lasers = d.lasers;
    slashes = d.slashes;
    score = d.score;
    playerFrozenTimer = d.playerFrozenTimer;
    playerShieldTimer = d.playerShieldTimer;
    selectedHero = { color: d.player.color };
    let stageEl = document.getElementById('stageLabel');
    if (stageEl) stageEl.innerText = d.stageLabel;
    render();
  }
  if (netConn && netConnected && player2) {
    netConn.send({
      t: 'input',
      up: !!(keys['KeyW'] || keys['ArrowUp']),
      down: !!(keys['KeyS'] || keys['ArrowDown']),
      left: !!(keys['KeyA'] || keys['ArrowLeft']),
      right: !!(keys['KeyD'] || keys['ArrowRight']),
      aimAngle: Math.atan2(mouse.y - player2.y, mouse.x - player2.x),
      mouseDown: !!mouse.down
    });
  }
}
