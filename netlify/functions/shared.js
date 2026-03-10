import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const STORE_NAME = "rusty-rumble";
const KEY = "current-game";

export function defaultGameState() {
  return {
    entryAmount: 10,
    minPlayers: 3,
    houseCut: 10,
    split: [50, 30, 20],
    players: [],
    gameCreated: false,
    status: "idle",
    createdAt: null,
    updatedAt: Date.now(),
    liveStartAt: null,
    endAt: null,
    timeline: [{ at: Date.now(), text: "🤖 Rusty is standing by." }],
    winners: null,
    seed: null
  };
}

function getStoreInstance() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function loadGame() {
  const store = getStoreInstance();
  const raw = await store.get(KEY, { consistency: "strong" });
  if (!raw) {
    const state = defaultGameState();
    await saveGame(state);
    return state;
  }
  try {
    return JSON.parse(raw);
  } catch {
    const state = defaultGameState();
    await saveGame(state);
    return state;
  }
}

export async function saveGame(state) {
  state.updatedAt = Date.now();
  const store = getStoreInstance();
  await store.set(KEY, JSON.stringify(state));
  return state;
}

function round2(n) { return Number(n.toFixed(2)); }

export function calcPrizes(state) {
  const totalCollected = state.players.length * state.entryAmount;
  const house = round2(totalCollected * (state.houseCut / 100));
  const prizePool = round2(Math.max(0, totalCollected - house));
  const gold = round2(prizePool * (state.split[0] / 100));
  const silver = round2(prizePool * (state.split[1] / 100));
  const bronze = round2(prizePool * (state.split[2] / 100));
  return { totalCollected: round2(totalCollected), house, prizePool, gold, silver, bronze };
}

function hashToSeed(input) {
  const hex = crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
  return parseInt(hex, 16);
}

function seededShuffle(arr, seedInput) {
  let seed = hashToSeed(seedInput);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const eliminationLines = [
  "{name} slipped on irradiated scrap and vanished into the dust.",
  "{name} pulled the wrong lever and got launched over the junk wall.",
  "{name} wandered into the acid fog. Rusty shakes his head.",
  "{name} got tangled in old cables and dragged off by the wasteland.",
  "{name} stepped on unstable metal and crashed into the scrap pit.",
  "{name} challenged a feral drone and lost badly.",
  "{name} found a glowing barrel. That was a mistake.",
  "{name} tripped over a busted pipe and rolled out of the arena.",
  "{name} was caught in a bolt storm and couldn't recover.",
  "{name} opened a rusted hatch and disappeared below the floor.",
  "{name} got magnetized into the crusher.",
  "{name} took a bad shortcut through the junk vortex.",
  "{name} angered the wasteland pigeons and paid the price.",
  "{name} mistook a mine for treasure.",
  "{name} got buried under a scrap avalanche.",
  "{name} was flung by a broken spring trap.",
  "{name} got too close to the smelter chute.",
  "{name} wandered off chasing shiny scrap.",
  "{name} forgot to tighten a bolt at the worst moment.",
  "{name} earned Rusty’s personal thumbs-down."
];

const suspenseLines = [
  "⚙️ Rusty studies the scavengers...",
  "🌫️ The dust thickens across the arena...",
  "👀 Rusty spots movement in the shadows...",
  "🧨 Something sparks behind the scrap tower...",
  "🔩 A metal groan echoes through the wasteland...",
  "☢️ The arena grows very, very quiet..."
];

function seededPick(arr, seedInput, idx) {
  const seed = hashToSeed(seedInput + ":" + idx);
  return arr[seed % arr.length];
}

export function buildTimeline(state) {
  const prizes = calcPrizes(state);
  const liveStartAt = Date.now();
  const seed = crypto.randomBytes(16).toString("hex");
  const order = seededShuffle(state.players, seed + "|" + state.players.join("|"));
  let ms = 0;
  const timeline = [];

  const push = (delayMs, text) => {
    ms += delayMs;
    timeline.push({ at: liveStartAt + ms, text });
  };

  push(0, "🚨 Rusty seals the gates...");
  push(1200, "3...");
  push(850, "2...");
  push(850, "1...");
  push(900, "⚙️ ENTER THE WASTELAND ⚙️");

  let eliminationIndex = 0;
  while (order.length > 3) {
    if (eliminationIndex % 2 === 0) {
      push(1250, seededPick(suspenseLines, seed, eliminationIndex));
    }
    const out = order.shift();
    const line = seededPick(eliminationLines, seed + "|elim", eliminationIndex).replace("{name}", out);
    push(1800, "💥 " + line);
    eliminationIndex += 1;
  }

  push(1200, "🏁 PODIUM ROUND");
  const bronze = order.shift();
  push(1400, `🥉 ${bronze} survives long enough for Bronze.`);
  push(1200, "⚔️ FINAL DUEL");
  const silver = order.shift();
  const gold = order.shift();
  push(1450, `🥈 ${silver} falls just short and takes Silver.`);
  push(1500, `👑 ${gold} is the last scavenger standing!`);

  return {
    liveStartAt,
    endAt: liveStartAt + ms,
    timeline,
    seed,
    winners: {
      bronze: { name: bronze, prize: prizes.bronze.toFixed(2) },
      silver: { name: silver, prize: prizes.silver.toFixed(2) },
      gold: { name: gold, prize: prizes.gold.toFixed(2) }
    }
  };
}

export function publicView(state) {
  const prizes = calcPrizes(state);
  const now = Date.now();
  const visibleFeed = Array.isArray(state.timeline) ? state.timeline.filter(item => item.at <= now) : [];
  const effectiveStatus = state.status === "live" && state.endAt && now >= state.endAt ? "complete" : state.status;

  return {
    entryAmount: state.entryAmount,
    minPlayers: state.minPlayers,
    houseCut: state.houseCut,
    split: state.split,
    players: state.players,
    gameCreated: state.gameCreated,
    status: effectiveStatus,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    prizePool: prizes.prizePool.toFixed(2),
    prizes: {
      gold: prizes.gold.toFixed(2),
      silver: prizes.silver.toFixed(2),
      bronze: prizes.bronze.toFixed(2)
    },
    visibleFeed,
    winners: effectiveStatus === "complete" ? state.winners : state.winners
  };
}
