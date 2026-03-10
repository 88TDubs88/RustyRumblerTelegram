import { loadGame, saveGame, publicView } from "./shared.js";

export default async () => {
  const game = await loadGame();

  if (game.status === "live" && game.endAt && Date.now() >= game.endAt) {
    game.status = "complete";
    await saveGame(game);
  }

  return new Response(JSON.stringify({ ok: true, game: publicView(game) }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
