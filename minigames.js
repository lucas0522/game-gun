// ✨ 小遊戲：角色選擇畫面可進入的三款獨立小遊戲，跟主遊戲的 gameState/update() 迴圈完全無關，
// 純粹用計時器(setInterval/setTimeout)與DOM操作運作，獎勵直接發放金幣到 shopData

function openMinigameHub() {
  document.getElementById('minigameHubModal').classList.remove('hidden');
}
function closeMinigameHub() {
  document.getElementById('minigameHubModal').classList.add('hidden');
}

// ================= 打地鼠 =================
const WAM_HOLE_COUNT = 9;
const WAM_DURATION = 20; // 秒
let wamHoles = [];
let wamScore = 0;
let wamTimeLeft = WAM_DURATION;
let wamSpawnIntervalId = null;
let wamCountdownIntervalId = null;
let wamRunning = false;

function openWhackAMole() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('wamModal').classList.remove('hidden');
  wamHoles = Array.from({ length: WAM_HOLE_COUNT }, () => ({ up: false, hideTimeout: null }));
  wamScore = 0;
  wamTimeLeft = WAM_DURATION;
  wamRunning = true;
  document.getElementById('wamResult').classList.add('hidden');
  renderWamGrid();
  updateWamHud();
  clearInterval(wamSpawnIntervalId);
  clearInterval(wamCountdownIntervalId);
  wamSpawnIntervalId = setInterval(wamSpawnMole, 700);
  wamCountdownIntervalId = setInterval(wamTick, 1000);
}

function closeWhackAMole() {
  clearInterval(wamSpawnIntervalId);
  clearInterval(wamCountdownIntervalId);
  wamHoles.forEach(h => { if (h.hideTimeout) clearTimeout(h.hideTimeout); });
  wamRunning = false;
  document.getElementById('wamModal').classList.add('hidden');
}

function wamSpawnMole() {
  if (!wamRunning) return;
  let downHoles = wamHoles.map((h, i) => h.up ? -1 : i).filter(i => i >= 0);
  if (downHoles.length === 0) return;
  let idx = downHoles[Math.floor(Math.random() * downHoles.length)];
  wamHoles[idx].up = true;
  renderWamGrid();
  wamHoles[idx].hideTimeout = setTimeout(() => {
    wamHoles[idx].up = false;
    renderWamGrid();
  }, 850);
}

function wamHitMole(idx) {
  if (!wamRunning || !wamHoles[idx] || !wamHoles[idx].up) return;
  wamHoles[idx].up = false;
  if (wamHoles[idx].hideTimeout) clearTimeout(wamHoles[idx].hideTimeout);
  wamScore++;
  renderWamGrid();
  updateWamHud();
}

function wamTick() {
  if (!wamRunning) return;
  wamTimeLeft--;
  updateWamHud();
  if (wamTimeLeft <= 0) wamEndGame();
}

function wamEndGame() {
  if (!wamRunning) return;
  wamRunning = false;
  clearInterval(wamSpawnIntervalId);
  clearInterval(wamCountdownIntervalId);
  wamHoles.forEach(h => { if (h.hideTimeout) clearTimeout(h.hideTimeout); h.up = false; });
  renderWamGrid();
  let reward = wamScore * 8;
  shopData.gold += reward;
  saveShopData();
  updateGoldDisplays();
  let wamResultEl = document.getElementById('wamResult');
  wamResultEl.classList.remove('hidden');
  wamResultEl.innerText = `🔨 擊中 ${wamScore} 隻地鼠！獲得 💰${reward} 金幣`;
}

function renderWamGrid() {
  document.getElementById('wamGrid').innerHTML = wamHoles.map((h, i) => `
    <div onclick="wamHitMole(${i})" class="aspect-square bg-slate-800 border-2 border-slate-700 rounded-xl flex items-center justify-center text-3xl cursor-pointer select-none">
      ${h.up ? '🐹' : '🕳️'}
    </div>`).join('');
}

function updateWamHud() {
  document.getElementById('wamScore').innerText = wamScore;
  document.getElementById('wamTimeLeft').innerText = wamTimeLeft;
}

// ================= 猜拳對決 =================
const RPS_CHOICES = { rock: { icon: '🪨', beats: 'scissors' }, paper: { icon: '📄', beats: 'rock' }, scissors: { icon: '✂️', beats: 'paper' } };
let rpsBet = 10;
let rpsStats = { wins: 0, losses: 0, ties: 0 };

function openRPS() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('rpsModal').classList.remove('hidden');
  rpsStats = { wins: 0, losses: 0, ties: 0 };
  document.getElementById('rpsResult').innerText = '選擇賭注後出拳開始對決！';
  updateRpsHud();
  renderRpsBetButtons();
}
function closeRPS() {
  document.getElementById('rpsModal').classList.add('hidden');
}

function rpsSetBet(amount) {
  rpsBet = amount;
  renderRpsBetButtons();
}

function renderRpsBetButtons() {
  let amounts = [10, 25, 50, 100];
  document.getElementById('rpsBetButtons').innerHTML = amounts.map(a => `
    <button onclick="rpsSetBet(${a})" class="flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition ${rpsBet === a ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'}">💰${a}</button>
  `).join('');
}

function rpsPlay(playerChoice) {
  if (shopData.gold < rpsBet) {
    document.getElementById('rpsResult').innerText = '💸 金幣不足，無法下注！';
    return;
  }
  let keys = Object.keys(RPS_CHOICES);
  let cpuChoice = keys[Math.floor(Math.random() * keys.length)];
  let resultText;
  if (playerChoice === cpuChoice) {
    rpsStats.ties++;
    resultText = `🤝 平手！電腦出 ${RPS_CHOICES[cpuChoice].icon}，賭注退還`;
  } else if (RPS_CHOICES[playerChoice].beats === cpuChoice) {
    shopData.gold += rpsBet;
    rpsStats.wins++;
    resultText = `🎉 獲勝！電腦出 ${RPS_CHOICES[cpuChoice].icon}，贏得 💰${rpsBet}`;
  } else {
    shopData.gold -= rpsBet;
    rpsStats.losses++;
    resultText = `😢 落敗！電腦出 ${RPS_CHOICES[cpuChoice].icon}，輸掉 💰${rpsBet}`;
  }
  saveShopData();
  updateGoldDisplays();
  document.getElementById('rpsResult').innerText = resultText;
  updateRpsHud();
}

function updateRpsHud() {
  document.getElementById('rpsStats').innerText = `勝 ${rpsStats.wins} / 敗 ${rpsStats.losses} / 平 ${rpsStats.ties}`;
}

// ================= 記憶翻牌 =================
const MEMORY_EMOJIS = ['🍎', '🍋', '🍇', '🍓', '🍑', '🍉'];
let memoryCards = [];
let memoryFlipped = [];
let memoryMatchedCount = 0;
let memoryMoves = 0;
let memoryBusy = false;
let memoryResolveTimeout = null;

function openMemoryMatch() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('memoryModal').classList.remove('hidden');
  startMemoryGame();
}
function closeMemoryMatch() {
  if (memoryResolveTimeout) clearTimeout(memoryResolveTimeout);
  document.getElementById('memoryModal').classList.add('hidden');
}

function startMemoryGame() {
  if (memoryResolveTimeout) clearTimeout(memoryResolveTimeout);
  let deck = MEMORY_EMOJIS.concat(MEMORY_EMOJIS);
  for (let i = deck.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  memoryCards = deck.map(icon => ({ icon, matched: false }));
  memoryFlipped = [];
  memoryMatchedCount = 0;
  memoryMoves = 0;
  memoryBusy = false;
  document.getElementById('memoryResult').classList.add('hidden');
  renderMemoryGrid();
  updateMemoryHud();
}

function memoryFlip(idx) {
  if (memoryBusy) return;
  if (memoryCards[idx].matched || memoryFlipped.includes(idx)) return;
  memoryFlipped.push(idx);
  renderMemoryGrid();
  if (memoryFlipped.length === 2) {
    memoryMoves++;
    updateMemoryHud();
    let [a, b] = memoryFlipped;
    if (memoryCards[a].icon === memoryCards[b].icon) {
      memoryCards[a].matched = true;
      memoryCards[b].matched = true;
      memoryMatchedCount += 2;
      memoryFlipped = [];
      renderMemoryGrid();
      if (memoryMatchedCount === memoryCards.length) memoryEndGame();
    } else {
      memoryBusy = true;
      memoryResolveTimeout = setTimeout(() => {
        memoryFlipped = [];
        memoryBusy = false;
        renderMemoryGrid();
      }, 700);
    }
  }
}

function memoryEndGame() {
  let pairCount = MEMORY_EMOJIS.length;
  let reward = Math.max(20, 150 - Math.max(0, memoryMoves - pairCount) * 10);
  shopData.gold += reward;
  saveShopData();
  updateGoldDisplays();
  let memoryResultEl = document.getElementById('memoryResult');
  memoryResultEl.classList.remove('hidden');
  memoryResultEl.innerText = `🧠 用了 ${memoryMoves} 次翻牌全部配對成功！獲得 💰${reward} 金幣`;
}

function renderMemoryGrid() {
  document.getElementById('memoryGrid').innerHTML = memoryCards.map((c, i) => {
    let shown = c.matched || memoryFlipped.includes(i);
    return `
      <div onclick="memoryFlip(${i})" class="aspect-square ${c.matched ? 'bg-emerald-800/60 border-emerald-500' : 'bg-slate-800 border-slate-700'} border-2 rounded-xl flex items-center justify-center text-2xl cursor-pointer select-none transition">
        ${shown ? c.icon : '❓'}
      </div>`;
  }).join('');
}

function updateMemoryHud() {
  document.getElementById('memoryMoves').innerText = memoryMoves;
  document.getElementById('memoryMatched').innerText = memoryMatchedCount / 2;
}
