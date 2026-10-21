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
  }, 1400);
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

// ================= 快速拔槍 =================
// ✨ 等待隨機延遲後的「開火！」訊號才能射擊，太早開槍算搶跑；反應時間(ms)換算金幣，越快獎勵越高
let qdState = 'idle'; // idle -> waiting -> ready -> done
let qdSignalTime = 0;
let qdTimeoutId = null;

function openQuickDraw() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('qdModal').classList.remove('hidden');
  qdStartRound();
}
function closeQuickDraw() {
  if (qdTimeoutId) clearTimeout(qdTimeoutId);
  qdState = 'idle';
  document.getElementById('qdModal').classList.add('hidden');
}

function qdStartRound() {
  if (qdTimeoutId) clearTimeout(qdTimeoutId);
  qdState = 'waiting';
  document.getElementById('qdResult').classList.add('hidden');
  document.getElementById('qdSignal').innerText = '👀 準備...';
  document.getElementById('qdSignal').className = 'text-4xl font-black text-slate-400 mb-4';
  let delay = 1000 + Math.random() * 2500;
  qdTimeoutId = setTimeout(() => {
    qdState = 'ready';
    qdSignalTime = Date.now();
    document.getElementById('qdSignal').innerText = '🔫 開火！';
    document.getElementById('qdSignal').className = 'text-4xl font-black text-red-400 mb-4 animate-pulse';
  }, delay);
}

function qdShoot() {
  if (qdState === 'waiting') {
    // 搶跑：訊號還沒出現就開槍
    if (qdTimeoutId) clearTimeout(qdTimeoutId);
    qdState = 'done';
    let resultEl = document.getElementById('qdResult');
    resultEl.classList.remove('hidden');
    resultEl.innerText = '⚠️ 搶跑！還沒看到開火訊號就扣下扳機，沒有獎勵';
    return;
  }
  if (qdState !== 'ready') return;
  let reactionMs = Date.now() - qdSignalTime;
  qdState = 'done';
  let reward, rank;
  if (reactionMs < 200) { reward = 150; rank = '⚡ 神槍手'; }
  else if (reactionMs < 350) { reward = 80; rank = '🤠 老練槍手'; }
  else if (reactionMs < 600) { reward = 40; rank = '👍 還不錯'; }
  else { reward = 10; rank = '🐢 慢了點'; }
  shopData.gold += reward;
  saveShopData();
  updateGoldDisplays();
  let resultEl = document.getElementById('qdResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `${rank}！反應時間 ${reactionMs}ms，獲得 💰${reward} 金幣`;
}

// ================= 打靶場 =================
// ✨ 跟打地鼠相同的格子機制，但換成靶紙，不同圈數命中給分不同(靶心5分/中圈3分/外圈1分)，
// 20秒結束後依總分換算金幣
const SHOOT_RANGE_HOLE_COUNT = 9;
const SHOOT_RANGE_DURATION = 20;
const SHOOT_RANGE_TIERS = { bullseye: { icon: '🎯', points: 5 }, mid: { icon: '🟡', points: 3 }, outer: { icon: '⚪', points: 1 } };
let srTargets = [];
let srScore = 0;
let srTimeLeft = SHOOT_RANGE_DURATION;
let srSpawnIntervalId = null;
let srCountdownIntervalId = null;
let srRunning = false;

function openShootingRange() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('srModal').classList.remove('hidden');
  srTargets = Array.from({ length: SHOOT_RANGE_HOLE_COUNT }, () => ({ up: false, tier: null, hideTimeout: null }));
  srScore = 0;
  srTimeLeft = SHOOT_RANGE_DURATION;
  srRunning = true;
  document.getElementById('srResult').classList.add('hidden');
  renderSrGrid();
  updateSrHud();
  clearInterval(srSpawnIntervalId);
  clearInterval(srCountdownIntervalId);
  srSpawnIntervalId = setInterval(srSpawnTarget, 700);
  srCountdownIntervalId = setInterval(srTick, 1000);
}

function closeShootingRange() {
  clearInterval(srSpawnIntervalId);
  clearInterval(srCountdownIntervalId);
  srTargets.forEach(t => { if (t.hideTimeout) clearTimeout(t.hideTimeout); });
  srRunning = false;
  document.getElementById('srModal').classList.add('hidden');
}

function srSpawnTarget() {
  if (!srRunning) return;
  let downIdx = srTargets.map((t, i) => t.up ? -1 : i).filter(i => i >= 0);
  if (downIdx.length === 0) return;
  let idx = downIdx[Math.floor(Math.random() * downIdx.length)];
  let roll = Math.random();
  let tier = roll < 0.2 ? 'bullseye' : roll < 0.55 ? 'mid' : 'outer';
  srTargets[idx].up = true;
  srTargets[idx].tier = tier;
  renderSrGrid();
  srTargets[idx].hideTimeout = setTimeout(() => {
    srTargets[idx].up = false;
    renderSrGrid();
  }, 1400);
}

function srHitTarget(idx) {
  if (!srRunning || !srTargets[idx] || !srTargets[idx].up) return;
  srScore += SHOOT_RANGE_TIERS[srTargets[idx].tier].points;
  srTargets[idx].up = false;
  if (srTargets[idx].hideTimeout) clearTimeout(srTargets[idx].hideTimeout);
  renderSrGrid();
  updateSrHud();
}

function srTick() {
  if (!srRunning) return;
  srTimeLeft--;
  updateSrHud();
  if (srTimeLeft <= 0) srEndGame();
}

function srEndGame() {
  if (!srRunning) return;
  srRunning = false;
  clearInterval(srSpawnIntervalId);
  clearInterval(srCountdownIntervalId);
  srTargets.forEach(t => { if (t.hideTimeout) clearTimeout(t.hideTimeout); t.up = false; });
  renderSrGrid();
  let reward = srScore * 6;
  shopData.gold += reward;
  saveShopData();
  updateGoldDisplays();
  let resultEl = document.getElementById('srResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `🎯 總分 ${srScore} 分！獲得 💰${reward} 金幣`;
}

function renderSrGrid() {
  document.getElementById('srGrid').innerHTML = srTargets.map((t, i) => `
    <div onclick="srHitTarget(${i})" class="aspect-square bg-slate-800 border-2 border-slate-700 rounded-xl flex items-center justify-center text-3xl cursor-pointer select-none">
      ${t.up ? SHOOT_RANGE_TIERS[t.tier].icon : '▫️'}
    </div>`).join('');
}

function updateSrHud() {
  document.getElementById('srScore').innerText = srScore;
  document.getElementById('srTimeLeft').innerText = srTimeLeft;
}

// ================= 彈夾裝填 =================
// ✨ 指示條在0~100%之間來回擺動(用Date.now()算出來的純函式位置，跟畫面更新頻率無關)，玩家抓準時機
// 點擊「裝填」讓指示條停在甜蜜點(60%~75%)獲得完美裝填獎勵，越偏離甜蜜點獎勵越低；共5輪，加總獎勵
const RELOAD_ROUNDS = 5;
const RELOAD_CYCLE_MS = 1400;
const RELOAD_SWEET_MIN = 0.60, RELOAD_SWEET_MAX = 0.75;
let reloadStartTime = 0;
let reloadRound = 0;
let reloadTotalReward = 0;
let reloadAnimFrameId = null;
let reloadDone = false;

function getReloadPosition() {
  let elapsed = Date.now() - reloadStartTime;
  let t = (elapsed % RELOAD_CYCLE_MS) / RELOAD_CYCLE_MS; // 0..1 貫穿一個完整來回週期
  // 三角波：0 -> 1 -> 0，讓指示條在0~100%之間來回移動而不是瞬間跳回
  return t < 0.5 ? t * 2 : (1 - t) * 2;
}

function openReloadGame() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('reloadModal').classList.remove('hidden');
  reloadRound = 0;
  reloadTotalReward = 0;
  reloadDone = false;
  document.getElementById('reloadResult').classList.add('hidden');
  document.getElementById('reloadLog').innerHTML = '';
  reloadStartRound();
}

function closeReloadGame() {
  if (reloadAnimFrameId) cancelAnimationFrame(reloadAnimFrameId);
  document.getElementById('reloadModal').classList.add('hidden');
}

function reloadStartRound() {
  reloadStartTime = Date.now();
  updateReloadHud();
  if (reloadAnimFrameId) cancelAnimationFrame(reloadAnimFrameId);
  reloadAnimLoop();
}

function reloadAnimLoop() {
  if (reloadDone) return;
  renderReloadBar();
  reloadAnimFrameId = requestAnimationFrame(reloadAnimLoop);
}

function reloadStop() {
  if (reloadDone) return;
  let pos = getReloadPosition();
  let dist = pos < RELOAD_SWEET_MIN ? RELOAD_SWEET_MIN - pos : (pos > RELOAD_SWEET_MAX ? pos - RELOAD_SWEET_MAX : 0);
  let reward, label;
  if (dist === 0) { reward = 30; label = '✨ 完美裝填!'; }
  else if (dist < 0.12) { reward = 15; label = '👍 普通裝填'; }
  else { reward = 0; label = '❌ 裝填失敗'; }
  reloadTotalReward += reward;
  reloadRound++;
  let logEl = document.getElementById('reloadLog');
  logEl.innerHTML += `<div>第${reloadRound}輪：${label} (+💰${reward})</div>`;
  if (reloadRound >= RELOAD_ROUNDS) {
    reloadEndGame();
  } else {
    reloadStartRound();
  }
}

function reloadEndGame() {
  reloadDone = true;
  if (reloadAnimFrameId) cancelAnimationFrame(reloadAnimFrameId);
  shopData.gold += reloadTotalReward;
  saveShopData();
  updateGoldDisplays();
  let resultEl = document.getElementById('reloadResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `🔄 ${RELOAD_ROUNDS} 輪裝填完成！總共獲得 💰${reloadTotalReward} 金幣`;
}

function renderReloadBar() {
  let pos = getReloadPosition();
  document.getElementById('reloadIndicator').style.left = (pos * 100) + '%';
  document.getElementById('reloadRoundLabel').innerText = `第 ${Math.min(reloadRound + 1, RELOAD_ROUNDS)} / ${RELOAD_ROUNDS} 輪`;
}

function updateReloadHud() {
  document.getElementById('reloadRoundLabel').innerText = `第 ${reloadRound + 1} / ${RELOAD_ROUNDS} 輪`;
}

// ================= 骰子大小 =================
// ✨ 下注「大」(總和8~12)或「小」(總和2~6)，兩顆骰子總和為7算明哲保身退還賭注，猜對贏得等額獎金
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let diceBet = 10;
let diceStats = { wins: 0, losses: 0, pushes: 0 };

function openDiceGame() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('diceModal').classList.remove('hidden');
  diceStats = { wins: 0, losses: 0, pushes: 0 };
  document.getElementById('diceResult').innerText = '選擇賭注後下注「大」或「小」！';
  document.getElementById('diceFaces').innerText = '🎲 🎲';
  updateDiceHud();
  renderDiceBetButtons();
}
function closeDiceGame() {
  document.getElementById('diceModal').classList.add('hidden');
}

function diceSetBet(amount) {
  diceBet = amount;
  renderDiceBetButtons();
}

function renderDiceBetButtons() {
  let amounts = [10, 25, 50, 100];
  document.getElementById('diceBetButtons').innerHTML = amounts.map(a => `
    <button onclick="diceSetBet(${a})" class="flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition ${diceBet === a ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'}">💰${a}</button>
  `).join('');
}

function dicePlay(choice) {
  if (shopData.gold < diceBet) {
    document.getElementById('diceResult').innerText = '💸 金幣不足，無法下注！';
    return;
  }
  let d1 = Math.floor(Math.random() * 6) + 1;
  let d2 = Math.floor(Math.random() * 6) + 1;
  let sum = d1 + d2;
  document.getElementById('diceFaces').innerText = `${DICE_FACES[d1 - 1]} ${DICE_FACES[d2 - 1]} (總和 ${sum})`;
  let resultText;
  if (sum === 7) {
    diceStats.pushes++;
    resultText = `🎲 總和7！明哲保身，賭注退還`;
  } else {
    let actual = sum >= 8 ? 'big' : 'small';
    if (choice === actual) {
      shopData.gold += diceBet;
      diceStats.wins++;
      resultText = `🎉 猜中「${actual === 'big' ? '大' : '小'}」！贏得 💰${diceBet}`;
    } else {
      shopData.gold -= diceBet;
      diceStats.losses++;
      resultText = `😢 開出「${actual === 'big' ? '大' : '小'}」，輸掉 💰${diceBet}`;
    }
  }
  saveShopData();
  updateGoldDisplays();
  document.getElementById('diceResult').innerText = resultText;
  updateDiceHud();
}

function updateDiceHud() {
  document.getElementById('diceStats').innerText = `勝 ${diceStats.wins} / 敗 ${diceStats.losses} / 退 ${diceStats.pushes}`;
}

// ================= 猜數字 =================
// ✨ 電腦心中想一個1~50的數字，限制6次猜測機會，依照提示(更大/更小)逐步縮小範圍；
// 用越少次數猜中獎勵越高，超過次數沒猜中則沒有獎勵並公布答案
const NUMGUESS_MAX = 50;
const NUMGUESS_MAX_TRIES = 6;
let numguessSecret = 0;
let numguessTriesLeft = NUMGUESS_MAX_TRIES;
let numguessOver = false;

function openNumberGuess() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('numguessModal').classList.remove('hidden');
  startNumberGuess();
}
function closeNumberGuess() {
  document.getElementById('numguessModal').classList.add('hidden');
}

function startNumberGuess() {
  numguessSecret = Math.floor(Math.random() * NUMGUESS_MAX) + 1;
  numguessTriesLeft = NUMGUESS_MAX_TRIES;
  numguessOver = false;
  document.getElementById('numguessInput').value = '';
  document.getElementById('numguessLog').innerHTML = '';
  document.getElementById('numguessResult').classList.add('hidden');
  updateNumguessHud();
}

function numguessSubmit() {
  if (numguessOver) return;
  let input = document.getElementById('numguessInput');
  let guess = parseInt(input.value, 10);
  if (isNaN(guess) || guess < 1 || guess > NUMGUESS_MAX) return;
  numguessTriesLeft--;
  let logEl = document.getElementById('numguessLog');
  if (guess === numguessSecret) {
    let triesUsed = NUMGUESS_MAX_TRIES - numguessTriesLeft;
    let reward = Math.max(20, 200 - (triesUsed - 1) * 30);
    shopData.gold += reward;
    saveShopData();
    updateGoldDisplays();
    numguessOver = true;
    logEl.innerHTML += `<div class="text-emerald-400">${guess} → 🎉 猜中了！</div>`;
    let resultEl = document.getElementById('numguessResult');
    resultEl.classList.remove('hidden');
    resultEl.innerText = `🔢 用了 ${triesUsed} 次猜中！獲得 💰${reward} 金幣`;
  } else if (numguessTriesLeft <= 0) {
    numguessOver = true;
    logEl.innerHTML += `<div class="text-rose-400">${guess} → ${guess < numguessSecret ? '更大' : '更小'}</div>`;
    let resultEl = document.getElementById('numguessResult');
    resultEl.classList.remove('hidden');
    resultEl.innerText = `😢 次數用盡！正確答案是 ${numguessSecret}，沒有獎勵`;
  } else {
    logEl.innerHTML += `<div class="text-slate-300">${guess} → ${guess < numguessSecret ? '更大' : '更小'}</div>`;
  }
  input.value = '';
  updateNumguessHud();
}

function updateNumguessHud() {
  document.getElementById('numguessTriesLeft').innerText = numguessTriesLeft;
}

// ================= 翻硬幣 =================
// ✨ 下注金額，選正面或反面，50/50機率，猜中贏得等額獎金，猜錯輸掉賭注
const COIN_FACES = { heads: '🟡', tails: '⚫' };
let coinBet = 10;
let coinStats = { wins: 0, losses: 0 };

function openCoinFlip() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('coinModal').classList.remove('hidden');
  coinStats = { wins: 0, losses: 0 };
  document.getElementById('coinResult').innerText = '選擇賭注後猜正面或反面！';
  document.getElementById('coinFace').innerText = '🪙';
  updateCoinHud();
  renderCoinBetButtons();
}
function closeCoinFlip() {
  document.getElementById('coinModal').classList.add('hidden');
}

function coinSetBet(amount) {
  coinBet = amount;
  renderCoinBetButtons();
}

function renderCoinBetButtons() {
  let amounts = [10, 25, 50, 100];
  document.getElementById('coinBetButtons').innerHTML = amounts.map(a => `
    <button onclick="coinSetBet(${a})" class="flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition ${coinBet === a ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'}">💰${a}</button>
  `).join('');
}

function coinPlay(choice) {
  if (shopData.gold < coinBet) {
    document.getElementById('coinResult').innerText = '💸 金幣不足，無法下注！';
    return;
  }
  let actual = Math.random() < 0.5 ? 'heads' : 'tails';
  document.getElementById('coinFace').innerText = COIN_FACES[actual];
  let resultText;
  if (choice === actual) {
    shopData.gold += coinBet;
    coinStats.wins++;
    resultText = `🎉 猜中「${actual === 'heads' ? '正面' : '反面'}」！贏得 💰${coinBet}`;
  } else {
    shopData.gold -= coinBet;
    coinStats.losses++;
    resultText = `😢 開出「${actual === 'heads' ? '正面' : '反面'}」，輸掉 💰${coinBet}`;
  }
  saveShopData();
  updateGoldDisplays();
  document.getElementById('coinResult').innerText = resultText;
  updateCoinHud();
}

function updateCoinHud() {
  document.getElementById('coinStats').innerText = `勝 ${coinStats.wins} / 敗 ${coinStats.losses}`;
}

// ================= 狙擊屏息 =================
// ✨ 準星隨正弦波持續晃動，點擊「屏息」可在短時間內大幅降低晃動幅度(有冷卻時間不能連點)，
// 抓準時機開槍，命中點離準心中央越近分數越高；共3發子彈，累計獎勵
const SNIPER_PERIOD_MS = 2000;
const SNIPER_AMPLITUDE_NORMAL = 1.0;
const SNIPER_AMPLITUDE_HELD = 0.25;
const SNIPER_HOLD_DURATION_MS = 3000;
const SNIPER_HOLD_COOLDOWN_MS = 2000;
const SNIPER_TOTAL_SHOTS = 3;
let sniperStartTime = 0;
let sniperHoldUntil = 0;
let sniperCooldownUntil = 0;
let sniperShotsLeft = SNIPER_TOTAL_SHOTS;
let sniperTotalReward = 0;
let sniperAnimFrameId = null;
let sniperDone = false;

function getSniperSway() {
  let elapsed = Date.now() - sniperStartTime;
  let amp = Date.now() < sniperHoldUntil ? SNIPER_AMPLITUDE_HELD : SNIPER_AMPLITUDE_NORMAL;
  return Math.sin((elapsed / SNIPER_PERIOD_MS) * Math.PI * 2) * amp;
}

function openSniperGame() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('sniperModal').classList.remove('hidden');
  sniperStartTime = Date.now();
  sniperHoldUntil = 0;
  sniperCooldownUntil = 0;
  sniperShotsLeft = SNIPER_TOTAL_SHOTS;
  sniperTotalReward = 0;
  sniperDone = false;
  document.getElementById('sniperResult').classList.add('hidden');
  document.getElementById('sniperLog').innerHTML = '';
  updateSniperHud();
  if (sniperAnimFrameId) cancelAnimationFrame(sniperAnimFrameId);
  sniperAnimLoop();
}

function closeSniperGame() {
  if (sniperAnimFrameId) cancelAnimationFrame(sniperAnimFrameId);
  document.getElementById('sniperModal').classList.add('hidden');
}

function sniperAnimLoop() {
  if (sniperDone) return;
  renderSniperCrosshair();
  sniperAnimFrameId = requestAnimationFrame(sniperAnimLoop);
}

function sniperHoldBreath() {
  if (sniperDone) return;
  if (Date.now() < sniperCooldownUntil) return;
  sniperHoldUntil = Date.now() + SNIPER_HOLD_DURATION_MS;
  sniperCooldownUntil = Date.now() + SNIPER_HOLD_DURATION_MS + SNIPER_HOLD_COOLDOWN_MS;
}

function sniperFire() {
  if (sniperDone || sniperShotsLeft <= 0) return;
  let pos = getSniperSway();
  let dist = Math.abs(pos);
  let reward, label;
  if (dist < 0.05) { reward = 100; label = '🎯 完美爆頭!'; }
  else if (dist < 0.15) { reward = 50; label = '👍 命中要害'; }
  else if (dist < 0.3) { reward = 20; label = '😐 擦邊命中'; }
  else { reward = 0; label = '❌ 偏離目標'; }
  sniperTotalReward += reward;
  sniperShotsLeft--;
  let logEl = document.getElementById('sniperLog');
  logEl.innerHTML += `<div>第${SNIPER_TOTAL_SHOTS - sniperShotsLeft}發：${label} (+💰${reward})</div>`;
  updateSniperHud();
  if (sniperShotsLeft <= 0) sniperEndGame();
}

function sniperEndGame() {
  sniperDone = true;
  if (sniperAnimFrameId) cancelAnimationFrame(sniperAnimFrameId);
  shopData.gold += sniperTotalReward;
  saveShopData();
  updateGoldDisplays();
  let resultEl = document.getElementById('sniperResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `🔫 ${SNIPER_TOTAL_SHOTS} 發子彈射擊完成！總共獲得 💰${sniperTotalReward} 金幣`;
}

function renderSniperCrosshair() {
  let pos = getSniperSway(); // -1..1
  document.getElementById('sniperCrosshair').style.left = (50 + pos * 40) + '%';
  let holding = Date.now() < sniperHoldUntil;
  let onCooldown = !holding && Date.now() < sniperCooldownUntil;
  let btn = document.getElementById('sniperHoldBtn');
  btn.disabled = holding || onCooldown;
  btn.innerText = holding ? '🫁 屏息中...' : (onCooldown ? '⏳ 冷卻中' : '🫁 屏息');
  document.getElementById('sniperShotsLeft').innerText = sniperShotsLeft;
}

function updateSniperHud() {
  document.getElementById('sniperShotsLeft').innerText = sniperShotsLeft;
}

// ================= 連鎖爆頭 =================
// ✨ 6個目標隨機標上1~6號，限時內必須依序由小到大點擊，點錯或超時立刻失敗；
// 全部完成所花的時間越短，獎勵越高
const HEADSHOT_TARGET_COUNT = 6;
const HEADSHOT_TIME_LIMIT_MS = 10000;
let hsOrder = []; // hsOrder[cellIndex] = 該格子被指派的號碼(1~6)
let hsNextNumber = 1;
let hsStartTime = 0;
let hsTimeoutId = null;
let hsDone = false;

function openHeadshotGame() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('headshotModal').classList.remove('hidden');
  startHeadshotGame();
}
function closeHeadshotGame() {
  if (hsTimeoutId) clearTimeout(hsTimeoutId);
  document.getElementById('headshotModal').classList.add('hidden');
}

function startHeadshotGame() {
  if (hsTimeoutId) clearTimeout(hsTimeoutId);
  let numbers = Array.from({ length: HEADSHOT_TARGET_COUNT }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  hsOrder = numbers;
  hsNextNumber = 1;
  hsDone = false;
  hsStartTime = Date.now();
  document.getElementById('headshotResult').classList.add('hidden');
  renderHeadshotGrid();
  hsTimeoutId = setTimeout(() => hsFail('⏰ 時間到！還沒點完就超時了'), HEADSHOT_TIME_LIMIT_MS);
}

function hsClick(idx) {
  if (hsDone) return;
  if (hsOrder[idx] !== hsNextNumber) {
    hsFail(`❌ 點錯順序！應該先點 ${hsNextNumber} 號`);
    return;
  }
  hsNextNumber++;
  renderHeadshotGrid();
  if (hsNextNumber > HEADSHOT_TARGET_COUNT) hsComplete();
}

function hsFail(message) {
  hsDone = true;
  if (hsTimeoutId) clearTimeout(hsTimeoutId);
  renderHeadshotGrid();
  let resultEl = document.getElementById('headshotResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `${message}，沒有獎勵`;
}

function hsComplete() {
  hsDone = true;
  if (hsTimeoutId) clearTimeout(hsTimeoutId);
  let elapsedMs = Date.now() - hsStartTime;
  let reward = Math.max(20, 200 - Math.floor(elapsedMs / 50));
  shopData.gold += reward;
  saveShopData();
  updateGoldDisplays();
  renderHeadshotGrid();
  let resultEl = document.getElementById('headshotResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `🎯 用時 ${(elapsedMs / 1000).toFixed(2)} 秒全部爆頭！獲得 💰${reward} 金幣`;
}

function renderHeadshotGrid() {
  document.getElementById('headshotGrid').innerHTML = hsOrder.map((num, i) => {
    let cleared = num < hsNextNumber;
    return `
      <div onclick="hsClick(${i})" class="aspect-square ${cleared ? 'bg-emerald-800/60 border-emerald-500' : 'bg-slate-800 border-slate-700'} border-2 rounded-xl flex items-center justify-center text-xl font-black ${cleared ? 'text-emerald-300' : 'text-slate-200'} cursor-pointer select-none transition">
        ${cleared ? '💀' : num}
      </div>`;
  }).join('');
}

// ================= 彈道風偏 =================
// ✨ 顯示隨機風速，玩家用滑桿設定補償量，越接近實際風速分數越高；共3輪，加總獎勵
const WINDAGE_ROUNDS = 3;
let wcWindSpeed = 0;
let wcRound = 0;
let wcTotalReward = 0;

function openWindageGame() {
  document.getElementById('minigameHubModal').classList.add('hidden');
  document.getElementById('windageModal').classList.remove('hidden');
  wcRound = 0;
  wcTotalReward = 0;
  document.getElementById('windageResult').classList.add('hidden');
  document.getElementById('windageLog').innerHTML = '';
  wcStartRound();
}
function closeWindageGame() {
  document.getElementById('windageModal').classList.add('hidden');
}

function wcStartRound() {
  wcWindSpeed = Math.round((Math.random() * 9 + 1) * 2) / 2; // 1.0~10.0，取0.5為單位
  document.getElementById('windageWindDisplay').innerText = `💨 風速 ${wcWindSpeed} m/s`;
  document.getElementById('windageSlider').value = 5;
  document.getElementById('windageSliderValue').innerText = '5.0';
  document.getElementById('windageRoundLabel').innerText = `第 ${wcRound + 1} / ${WINDAGE_ROUNDS} 輪`;
}

function wcUpdateSliderLabel() {
  let val = parseFloat(document.getElementById('windageSlider').value);
  document.getElementById('windageSliderValue').innerText = val.toFixed(1);
}

function wcFire() {
  let chosen = parseFloat(document.getElementById('windageSlider').value);
  let diff = Math.abs(chosen - wcWindSpeed);
  let reward, label;
  if (diff === 0) { reward = 60; label = '🎯 完美修正!'; }
  else if (diff <= 0.5) { reward = 35; label = '👍 非常接近'; }
  else if (diff <= 1.5) { reward = 15; label = '😐 還算接近'; }
  else { reward = 0; label = '❌ 偏差太大'; }
  wcTotalReward += reward;
  wcRound++;
  let logEl = document.getElementById('windageLog');
  logEl.innerHTML += `<div>第${wcRound}輪：風速${wcWindSpeed} / 你設定${chosen.toFixed(1)} → ${label} (+💰${reward})</div>`;
  if (wcRound >= WINDAGE_ROUNDS) {
    wcEndGame();
  } else {
    wcStartRound();
  }
}

function wcEndGame() {
  shopData.gold += wcTotalReward;
  saveShopData();
  updateGoldDisplays();
  let resultEl = document.getElementById('windageResult');
  resultEl.classList.remove('hidden');
  resultEl.innerText = `💨 ${WINDAGE_ROUNDS} 輪風偏修正完成！總共獲得 💰${wcTotalReward} 金幣`;
}
