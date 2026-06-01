// ============================================
// SALVE O PLANETA — Agrinho 2026
// HTML/CSS/JS puros • Canvas API
// ============================================

const TOTAL_PHASES = 10;
const GOOD_EMOJIS = ["♻️", "🥤", "📦", "🍾", "🥫", "📰", "💧", "🌱", "🍃"];
const BAD_EMOJIS  = ["🏭", "☠️", "🛢️", "☣️", "🔥"];

function phaseConfig(idx) {
  return {
    goal: 8 + idx * 2,
    baseSpeed: 90 + idx * 30,
    spawnEvery: Math.max(0.4, 1.15 - idx * 0.07),
    badRate: Math.min(0.45, 0.18 + idx * 0.03),
    time: 40,
    reward: 3 + idx,
  };
}

// State
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 900, H = 520;

let phaseIdx = 0;
let coins = Number(localStorage.getItem("salveplaneta:coins") || 0);
let lives = 3;
let phaseScore = 0;
let timeLeft = 40;
let status = "menu"; // menu | playing | paused | won | lost | victory
let entities = [];
let lastSpawn = 0;
let elapsed = 0;
let hitFlash = 0;
let playerY = 260;
let keys = { up: false, down: false };
let touchTarget = null;
let lastFrame = 0;
let timerInterval = null;

// HUD elements
const $ = (id) => document.getElementById(id);

function updateHud() {
  $("hudCoins").textContent = coins;
  $("hudLives").textContent = lives;
  $("hudTime").textContent = timeLeft;
  $("hudPhase").textContent = phaseIdx + 1;
  $("hudTotal").textContent = TOTAL_PHASES;
  $("hudScore").textContent = phaseScore;
  $("hudGoal").textContent = phaseConfig(phaseIdx).goal;
}

// Resize canvas to container
function resize() {
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = Math.max(380, Math.min(620, Math.round(w * 0.55)));
  W = w; H = h;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  playerY = Math.min(playerY, H - 60);
}
window.addEventListener("resize", resize);

// ===== Drawing =====
function drawScene(t) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.65);
  sky.addColorStop(0, "#7dd3fc");
  sky.addColorStop(1, "#bae6fd");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.65);

  // Sun
  const sx = W - 90, sy = 80;
  const g = ctx.createRadialGradient(sx, sy, 5, sx, sy, 90);
  g.addColorStop(0, "rgba(253,224,71,0.9)");
  g.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = g;
  ctx.fillRect(sx - 100, sy - 100, 200, 200);
  ctx.fillStyle = "#fde047";
  ctx.beginPath(); ctx.arc(sx, sy, 35, 0, Math.PI * 2); ctx.fill();

  // Mountains
  ctx.fillStyle = "#6b7280";
  drawMountain(W * 0.15, H * 0.65, 280, 220);
  drawMountain(W * 0.55, H * 0.65, 320, 260);
  drawMountain(W * 0.85, H * 0.65, 260, 200);

  // Ground
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(0, H * 0.65, W, H * 0.35);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(0, H * 0.65, W, 8);

  // River
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.86);
  ctx.quadraticCurveTo(W * 0.5, H * 0.82, W, H * 0.88);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

  // Clouds
  const cx = ((t * 0.02) % (W + 200)) - 100;
  drawCloud(cx, 70, 1);
  drawCloud(((cx + W * 0.6) % (W + 200)) - 100, 110, 0.8);

  // Trees
  const treeY = H * 0.7;
  const count = Math.ceil(W / 90);
  for (let i = 0; i < count; i++) drawTree(i * 90 + 45, treeY);
}

function drawMountain(cx, by, hw, hh) {
  ctx.beginPath();
  ctx.moveTo(cx - hw / 2, by);
  ctx.lineTo(cx, by - hh);
  ctx.lineTo(cx + hw / 2, by);
  ctx.closePath(); ctx.fill();
}
function drawCloud(x, y, s) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 25 * s, y - 8 * s, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 55 * s, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y + 10 * s, 24 * s, 0, Math.PI * 2);
  ctx.fill();
}
function drawTree(x, y) {
  ctx.fillStyle = "#7c3a1d";
  ctx.fillRect(x - 5, y, 10, 40);
  ctx.fillStyle = "#15803d";
  ctx.beginPath(); ctx.arc(x, y - 5, 28, 0, Math.PI * 2); ctx.fill();
}
function drawPlayer(x, y, t) {
  const bob = Math.sin(t * 0.006) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, 42, 32, 7, 0, 0, Math.PI * 2); ctx.fill();
  const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#fde68a");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, 38, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = "#15803d"; ctx.stroke();
  ctx.font = "56px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🦸", 0, 2);
  ctx.restore();
}

// ===== Game loop =====
function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  if (status === "playing") {
    elapsed += dt * 1000;
    update(dt);
  }
  render();
  requestAnimationFrame(loop);
}

function update(dt) {
  const cfg = phaseConfig(phaseIdx);

  // Move player
  const speed = 340;
  if (touchTarget != null) {
    const dy = touchTarget - playerY;
    playerY += Math.sign(dy) * Math.min(Math.abs(dy), speed * dt);
  } else {
    if (keys.up) playerY -= speed * dt;
    if (keys.down) playerY += speed * dt;
  }
  playerY = Math.max(50, Math.min(H - 50, playerY));

  // Spawn
  const ramp = Math.min(1.6, 1 + (elapsed / 1000) / 25);
  const curSpawnEvery = Math.max(0.25, cfg.spawnEvery / ramp);
  const curBaseSpeed = cfg.baseSpeed * ramp;

  lastSpawn += dt;
  if (lastSpawn > curSpawnEvery) {
    lastSpawn = 0;
    const isBad = Math.random() < cfg.badRate;
    const emojis = isBad ? BAD_EMOJIS : GOOD_EMOJIS;
    entities.push({
      x: W + 30,
      y: 60 + Math.random() * (H - 120),
      r: 24,
      vx: -(curBaseSpeed + Math.random() * 60),
      kind: isBad ? "bad" : "good",
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    });
  }

  // Move & collide
  const px = 90, py = playerY;
  const remaining = [];
  for (const e of entities) {
    e.x += e.vx * dt;
    if (e.x < -40) continue;
    if (Math.abs(e.x - px) < e.r + 36 && Math.abs(e.y - py) < e.r + 36) {
      if (e.kind === "good") {
        phaseScore++; coins++;
        localStorage.setItem("salveplaneta:coins", String(coins));
      } else {
        lives--;
        hitFlash = 0.4;
      }
      continue;
    }
    remaining.push(e);
  }
  entities = remaining;

  // Win/lose checks
  if (lives <= 0) return endPhase("lost");
  if (phaseScore >= cfg.goal) {
    coins += cfg.reward;
    localStorage.setItem("salveplaneta:coins", String(coins));
    endPhase(phaseIdx + 1 >= TOTAL_PHASES ? "victory" : "won");
  } else if (timeLeft <= 0) {
    endPhase("lost");
  }

  updateHud();
}

function render() {
  drawScene(elapsed);
  ctx.font = "40px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const e of entities) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 6;
    ctx.fillText(e.emoji, e.x, e.y);
    ctx.restore();
  }
  drawPlayer(90, playerY, elapsed);
  if (hitFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${Math.min(0.5, hitFlash)})`;
    ctx.fillRect(0, 0, W, H);
    hitFlash = Math.max(0, hitFlash - 0.016);
  }
}

// ===== Phase control =====
function startPhase(idx) {
  phaseIdx = Math.max(0, Math.min(TOTAL_PHASES - 1, idx));
  const cfg = phaseConfig(phaseIdx);
  phaseScore = 0;
  timeLeft = cfg.time;
  lives = 3;
  entities = [];
  elapsed = 0;
  lastSpawn = 0;
  playerY = H / 2;
  status = "playing";
  $("overlay").classList.add("hidden");
  $("menu").classList.add("hidden");
  $("btnPause").textContent = "⏸ Pausar";
  startTimer();
  updateHud();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (status !== "playing") return;
    timeLeft = Math.max(0, timeLeft - 1);
    updateHud();
  }, 1000);
}

function endPhase(result) {
  status = result;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  showOverlay(result);
}

function showOverlay(result) {
  const o = $("overlay");
  const c = $("overlayCard");
  const cfg = phaseConfig(phaseIdx);
  if (result === "won") {
    c.innerHTML = `
      <h2 style="color:#047857">✅ Fase ${phaseIdx + 1} concluída!</h2>
      <p>Você ganhou <b>🪙 ${cfg.reward} moedas</b>!<br>Total: <b>${coins}</b></p>
      <div class="actions">
        <button class="btn btn-emerald big" id="btnNext">Fase ${phaseIdx + 2} →</button>
        <a href="jardim.html" class="btn btn-light big" style="text-decoration:none">🌳 Jardim</a>
      </div>`;
    o.classList.remove("hidden");
    $("btnNext").onclick = () => startPhase(phaseIdx + 1);
  } else if (result === "lost") {
    c.innerHTML = `
      <h2 style="color:#dc2626">⛔ Game Over</h2>
      <p>${lives <= 0 ? "Você perdeu todas as vidas!" : "Tempo esgotado!"}<br>
      ${phaseIdx > 0 ? `Você voltou para a <b>Fase ${phaseIdx}</b>.` : `Tente a <b>Fase 1</b> novamente.`}</p>
      <div class="actions">
        <button class="btn btn-orange big" id="btnRetry">🔄 Tentar novamente</button>
      </div>`;
    o.classList.remove("hidden");
    $("btnRetry").onclick = () => startPhase(Math.max(0, phaseIdx - 1));
  } else if (result === "victory") {
    c.innerHTML = `
      <h2 style="color:#047857">🏆 Planeta salvo!</h2>
      <p>Você completou as ${TOTAL_PHASES} fases!<br>Moedas: <b>🪙 ${coins}</b></p>
      <div class="actions">
        <button class="btn btn-emerald big" id="btnAgain">🔁 Jogar de novo</button>
        <a href="jardim.html" class="btn btn-light big" style="text-decoration:none">🌳 Jardim</a>
      </div>`;
    o.classList.remove("hidden");
    $("btnAgain").onclick = () => startPhase(0);
  }
}

// ===== Input =====
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "w", "W"].includes(e.key)) { keys.up = true; e.preventDefault(); }
  if (["ArrowDown", "s", "S"].includes(e.key)) { keys.down = true; e.preventDefault(); }
  if (e.key === " " || e.key === "p" || e.key === "P") togglePause();
});
window.addEventListener("keyup", (e) => {
  if (["ArrowUp", "w", "W"].includes(e.key)) keys.up = false;
  if (["ArrowDown", "s", "S"].includes(e.key)) keys.down = false;
});

canvas.addEventListener("pointerdown", onPointer);
canvas.addEventListener("pointermove", onPointer);
canvas.addEventListener("pointerup", () => touchTarget = null);
canvas.addEventListener("pointerleave", () => touchTarget = null);
function onPointer(ev) {
  if (status !== "playing") return;
  const rect = canvas.getBoundingClientRect();
  touchTarget = ev.clientY - rect.top;
}

function togglePause() {
  if (status === "playing") {
    status = "paused";
    $("btnPause").textContent = "▶ Continuar";
    const c = $("overlayCard");
    c.innerHTML = `<h2 style="color:#d97706">⏸ Pausado</h2>
      <div class="actions"><button class="btn btn-emerald big" id="btnResume">▶ Continuar</button></div>`;
    $("overlay").classList.remove("hidden");
    $("btnResume").onclick = togglePause;
  } else if (status === "paused") {
    status = "playing";
    $("btnPause").textContent = "⏸ Pausar";
    $("overlay").classList.add("hidden");
  }
}

$("btnPause").onclick = togglePause;
$("btnRestart").onclick = () => {
  status = "menu";
  if (timerInterval) clearInterval(timerInterval);
  $("overlay").classList.add("hidden");
  $("menu").classList.remove("hidden");
};
$("btnStart").onclick = () => startPhase(0);

// Boot
resize();
updateHud();
lastFrame = performance.now();
requestAnimationFrame(loop);