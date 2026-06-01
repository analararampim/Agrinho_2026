// ===== Meu Jardim =====
const COINS_KEY = "salveplaneta:coins";
const TREES_KEY = "salveplaneta:trees";
const TREE_COST = 5;

const TIERS = [
  {
    id: "cidade", name: "Cidades", subtitle: "Comece reverdecendo a cidade", icon: "🏙️",
    spots: [
      { id: "parque",   name: "Parque da Cidade", emoji: "🏞️", slots: 6, bg: "bg-parque" },
      { id: "escola",   name: "Escola",           emoji: "🏫", slots: 5, bg: "bg-escola" },
      { id: "rua",      name: "Rua Verde",        emoji: "🏘️", slots: 6, bg: "bg-rua" },
      { id: "praca",    name: "Praça Central",    emoji: "⛲", slots: 5, bg: "bg-praca" },
    ],
  },
  {
    id: "fazenda", name: "Fazendas queimadas", subtitle: "Recupere áreas devastadas por queimadas", icon: "🔥",
    spots: [
      { id: "pasto",   name: "Pasto Queimado", emoji: "🐄", slots: 7, bg: "bg-pasto" },
      { id: "cafezal", name: "Cafezal",        emoji: "☕", slots: 6, bg: "bg-cafezal" },
      { id: "campo",   name: "Campo Aberto",   emoji: "🌾", slots: 8, bg: "bg-campo" },
    ],
  },
  {
    id: "amazonia", name: "Floresta Amazônica", subtitle: "Reflorestamento de mata nativa", icon: "🌳",
    spots: [
      { id: "igarape",  name: "Margem do Igarapé", emoji: "🐊", slots: 8,  bg: "bg-igarape" },
      { id: "mata",     name: "Mata Densa",        emoji: "🦜", slots: 10, bg: "bg-mata" },
      { id: "clareira", name: "Clareira Desmatada",emoji: "🪵", slots: 9,  bg: "bg-clareira" },
    ],
  },
  {
    id: "mundo", name: "Mundo", subtitle: "Reflorestamento global", icon: "🌍",
    spots: [
      { id: "savana",   name: "Savana Africana",      emoji: "🦒", slots: 8, bg: "bg-savana" },
      { id: "artico",   name: "Tundra do Norte",      emoji: "🦊", slots: 6, bg: "bg-artico" },
      { id: "ilha",     name: "Ilha Tropical",        emoji: "🏝️", slots: 7, bg: "bg-ilha" },
      { id: "montanha", name: "Encosta da Montanha",  emoji: "⛰️", slots: 8, bg: "bg-montanha" },
    ],
  },
];

let coins = Number(localStorage.getItem(COINS_KEY) || 0);
let trees = {};
try { trees = JSON.parse(localStorage.getItem(TREES_KEY) || "{}"); } catch { trees = {}; }

const $ = (id) => document.getElementById(id);

function save() {
  localStorage.setItem(COINS_KEY, String(coins));
  localStorage.setItem(TREES_KEY, JSON.stringify(trees));
}

function tierCompleted(tier) {
  return tier.spots.every((s) => (trees[s.id] || 0) >= s.slots);
}

function activeTierIdx() {
  const i = TIERS.findIndex((t) => !tierCompleted(t));
  return i === -1 ? TIERS.length - 1 : i;
}

function totalTrees() {
  return Object.values(trees).reduce((a, b) => a + b, 0);
}

function refreshStats() {
  $("coinsView").textContent = coins;
  $("treesView").textContent = totalTrees();
  $("costView").textContent = TREE_COST;
}

function render() {
  refreshStats();
  const root = $("tiers");
  root.innerHTML = "";
  const active = activeTierIdx();

  TIERS.forEach((tier, tIdx) => {
    const unlocked = tIdx <= active;
    const done = tierCompleted(tier);
    const section = document.createElement("section");
    section.className = "tier" + (unlocked ? "" : " locked");

    const tagDone = done ? `<span class="tag done">✓ Completo</span>` : "";
    const tagLock = !unlocked ? `<span class="tag lock">🔒 Bloqueado</span>` : "";

    section.innerHTML = `
      <h2>${tier.icon} ${tier.name} ${tagDone} ${tagLock}</h2>
      <p class="sub">${tier.subtitle}</p>
      <div class="spots"></div>`;
    const spotsEl = section.querySelector(".spots");

    tier.spots.forEach((s) => {
      const planted = trees[s.id] || 0;
      const full = planted >= s.slots;
      const canAfford = coins >= TREE_COST;
      const disabled = full || !canAfford || !unlocked;

      const card = document.createElement("div");
      card.className = "spot";
      card.dataset.id = s.id;

      let slotsHtml = "";
      for (let i = 0; i < s.slots; i++) {
        const grown = i < planted;
        slotsHtml += `<span class="slot ${grown ? "grown" : ""}">${grown ? "🌳" : "🟫"}</span>`;
      }

      const btnLabel = full ? "🎉 Cheio!" : !unlocked ? "🔒 Bloqueado"
        : !canAfford ? "🪙 Moedas insuficientes" : `🌱 Plantar (-${TREE_COST} 🪙)`;

      card.innerHTML = `
        <div class="spot-head">
          <h3>${s.emoji} ${s.name}</h3>
          <span class="count">${planted}/${s.slots}</span>
        </div>
        <div class="scene ${s.bg}">
          <div class="ground"></div>
          ${slotsHtml}
        </div>
        <button class="plant-btn" ${disabled ? "disabled" : ""}>${btnLabel}</button>`;

      const btn = card.querySelector(".plant-btn");
      btn.addEventListener("click", () => plant(tIdx, s.id, s.slots));
      spotsEl.appendChild(card);
    });

    root.appendChild(section);
  });
}

function plant(tierIdx, id, max) {
  if (coins < TREE_COST) return;
  if (tierIdx > activeTierIdx()) return;
  if ((trees[id] || 0) >= max) return;
  coins -= TREE_COST;
  trees[id] = (trees[id] || 0) + 1;
  save();
  render();
  // Pop on the newly grown tree
  const card = document.querySelector(`.spot[data-id="${id}"]`);
  if (card) {
    card.classList.add("pulse");
    const slots = card.querySelectorAll(".slot.grown");
    const last = slots[slots.length - 1];
    if (last) {
      last.classList.add("pop");
      setTimeout(() => last.classList.remove("pop"), 600);
    }
    setTimeout(() => card.classList.remove("pulse"), 600);
  }
}

// Refresh coins if user comes back from game
window.addEventListener("focus", () => {
  coins = Number(localStorage.getItem(COINS_KEY) || 0);
  render();
});
window.addEventListener("storage", () => {
  coins = Number(localStorage.getItem(COINS_KEY) || 0);
  try { trees = JSON.parse(localStorage.getItem(TREES_KEY) || "{}"); } catch {}
  render();
});

render();