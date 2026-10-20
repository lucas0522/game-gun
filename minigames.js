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
