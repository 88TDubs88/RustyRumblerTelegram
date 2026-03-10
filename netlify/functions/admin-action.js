import { loadGame, saveGame, defaultGameState, buildTimeline, publicView } from "./shared.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const realCode = process.env.RUSTY_ADMIN_CODE;
  if (!realCode) return json({ ok: false, error: "Admin code not configured" }, 500);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  if (String(body.code || "") !== realCode) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const action = String(body.action || "");
  const payload = body.payload || {};
  const game = await loadGame();

  try {
    if (action === "createGame") {
      const entryAmount = Number(payload.entryAmount);
      const minPlayers = Number(payload.minPlayers);
      const houseCut = Number(payload.houseCut);
      const split = Array.isArray(payload.split) ? payload.split.map(Number) : [];
      if (!entryAmount || entryAmount <= 0) throw new Error("Enter a valid entry amount.");
      if (!minPlayers || minPlayers < 3) throw new Error("Minimum players must be at least 3.");
      if (isNaN(houseCut) || houseCut < 0 || houseCut > 100) throw new Error("House cut must be between 0 and 100.");
      if (split.length !== 3 || split.some(n => isNaN(n)) || split[0] + split[1] + split[2] !== 100) {
        throw new Error("Prize split must be three numbers totaling 100.");
      }

      game.entryAmount = entryAmount;
      game.minPlayers = minPlayers;
      game.houseCut = houseCut;
      game.split = split;
      game.players = [];
      game.gameCreated = true;
      game.status = "ready";
      game.createdAt = Date.now();
      game.liveStartAt = null;
      game.endAt = null;
      game.timeline = [
        { at: Date.now(), text: "🤖 Rusty opens a new rumble in the wasteland." },
        { at: Date.now(), text: `💰 Entry: ${entryAmount} Rusty | Min players: ${minPlayers}` },
        { at: Date.now(), text: `🏆 Split: ${split.join("/")} | House cut: ${houseCut}%` }
      ];
      game.winners = null;
      game.seed = null;

      await saveGame(game);
      return json({ ok: true, game: publicView(game) });
    }

    if (action === "addPlayer") {
      const name = String(payload.name || "").trim();
      if (!name) throw new Error("Enter a player name.");
      if (!game.gameCreated) throw new Error("Create a game first.");
      if (game.status === "live") throw new Error("Cannot add players during a live rumble.");
      if (game.players.some(p => p.toLowerCase() === name.toLowerCase())) throw new Error("That player is already entered.");

      game.players.push(name);
      game.timeline.push({ at: Date.now(), text: `⚙️ ${name} enters the scrap arena.` });

      await saveGame(game);
      return json({ ok: true, game: publicView(game) });
    }

    if (action === "removePlayer") {
      const name = String(payload.name || "").trim();
      if (!name) throw new Error("Enter a player name.");
      const before = game.players.length;
      game.players = game.players.filter(p => p.toLowerCase() !== name.toLowerCase());
      if (game.players.length === before) throw new Error("Player not found.");

      game.timeline.push({ at: Date.now(), text: `🧯 ${name} was removed from the rumble.` });

      await saveGame(game);
      return json({ ok: true, game: publicView(game) });
    }

    if (action === "resetGame") {
      const fresh = defaultGameState();
      await saveGame(fresh);
      return json({ ok: true, game: publicView(fresh) });
    }

    if (action === "startGame") {
      if (!game.gameCreated) throw new Error("Create a game first.");
      if (game.players.length < game.minPlayers) throw new Error("Not enough players to start.");

      const built = buildTimeline(game);
      game.status = "live";
      game.liveStartAt = built.liveStartAt;
      game.endAt = built.endAt;
      game.timeline = built.timeline;
      game.winners = built.winners;
      game.seed = built.seed;

      await saveGame(game);
      return json({ ok: true, game: publicView(game) });
    }

    throw new Error("Unknown action.");
  } catch (err) {
    return json({ ok: false, error: err.message || "Action failed." }, 400);
  }
};
