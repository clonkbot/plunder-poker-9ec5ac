import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}_${suit}`);
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("games")
      .withIndex("by_status")
      .order("desc")
      .take(20);
  },
});

export const get = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const getWithPlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    const userId = await getAuthUserId(ctx);

    const gamePlayers = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    // Get player profiles
    const playersWithProfiles = await Promise.all(
      gamePlayers.map(async (gp) => {
        const player = await ctx.db
          .query("players")
          .withIndex("by_user", (q) => q.eq("userId", gp.userId))
          .first();

        // Only show cards to the owner
        const cards = gp.userId === userId ? gp.cards : gp.cards.map(() => "hidden");

        return {
          ...gp,
          cards,
          pirateAlias: player?.pirateAlias || "Unknown Pirate",
          doubloons: player?.doubloons || 0,
        };
      })
    );

    return {
      ...game,
      deck: [], // Never expose deck
      players: playersWithProfiles.sort((a, b) => a.seatIndex - b.seatIndex),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    minBet: v.number(),
    maxPlayers: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!player) throw new Error("Create a player profile first");
    if (player.doubloons < args.minBet) throw new Error("Not enough doubloons");

    const gameId = await ctx.db.insert("games", {
      name: args.name,
      status: "waiting",
      hostId: userId,
      maxPlayers: Math.min(Math.max(args.maxPlayers, 2), 6),
      minBet: args.minBet,
      pot: 0,
      currentBet: 0,
      currentPlayerIndex: 0,
      dealerIndex: 0,
      communityCards: [],
      deck: [],
      round: "preflop",
      createdAt: Date.now(),
      lastAction: Date.now(),
    });

    // Add host as first player
    await ctx.db.insert("gamePlayers", {
      gameId,
      userId,
      seatIndex: 0,
      cards: [],
      bet: 0,
      totalBetThisRound: 0,
      status: "waiting",
      isReady: false,
    });

    return gameId;
  },
});

export const join = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "waiting") throw new Error("Game already started");

    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!player) throw new Error("Create a player profile first");
    if (player.doubloons < game.minBet) throw new Error("Not enough doubloons");

    const existing = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game_and_user", (q) =>
        q.eq("gameId", args.gameId).eq("userId", userId)
      )
      .first();

    if (existing) throw new Error("Already in this game");

    const currentPlayers = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (currentPlayers.length >= game.maxPlayers) {
      throw new Error("Game is full");
    }

    await ctx.db.insert("gamePlayers", {
      gameId: args.gameId,
      userId,
      seatIndex: currentPlayers.length,
      cards: [],
      bet: 0,
      totalBetThisRound: 0,
      status: "waiting",
      isReady: false,
    });
  },
});

export const leave = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const gamePlayer = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game_and_user", (q) =>
        q.eq("gameId", args.gameId).eq("userId", userId)
      )
      .first();

    if (!gamePlayer) throw new Error("Not in this game");

    const game = await ctx.db.get(args.gameId);
    if (game?.status === "playing") {
      // Fold if game is in progress
      await ctx.db.patch(gamePlayer._id, { status: "folded" });
    } else {
      await ctx.db.delete(gamePlayer._id);

      // Delete game if empty
      const remainingPlayers = await ctx.db
        .query("gamePlayers")
        .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
        .collect();

      if (remainingPlayers.length === 0 && game) {
        await ctx.db.delete(args.gameId);
      }
    }
  },
});

export const setReady = mutation({
  args: { gameId: v.id("games"), ready: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const gamePlayer = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game_and_user", (q) =>
        q.eq("gameId", args.gameId).eq("userId", userId)
      )
      .first();

    if (!gamePlayer) throw new Error("Not in this game");

    await ctx.db.patch(gamePlayer._id, { isReady: args.ready });
  },
});

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.hostId !== userId) throw new Error("Only host can start");
    if (game.status !== "waiting") throw new Error("Game already started");

    const gamePlayers = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    if (gamePlayers.length < 2) throw new Error("Need at least 2 players");

    const allReady = gamePlayers.every((p) => p.isReady || p.userId === game.hostId);
    if (!allReady) throw new Error("Not all players are ready");

    // Create and shuffle deck
    const deck = createDeck();

    // Deal 2 cards to each player
    for (const gp of gamePlayers) {
      const cards = [deck.pop()!, deck.pop()!];
      await ctx.db.patch(gp._id, {
        cards,
        status: "active",
        bet: 0,
        totalBetThisRound: 0,
      });

      // Deduct buy-in from player's doubloons
      const player = await ctx.db
        .query("players")
        .withIndex("by_user", (q) => q.eq("userId", gp.userId))
        .first();

      if (player) {
        await ctx.db.patch(player._id, {
          doubloons: player.doubloons - game.minBet,
          gamesPlayed: player.gamesPlayed + 1,
        });
      }
    }

    // Set blinds
    const smallBlindIndex = (game.dealerIndex + 1) % gamePlayers.length;
    const bigBlindIndex = (game.dealerIndex + 2) % gamePlayers.length;
    const smallBlind = Math.floor(game.minBet / 2);
    const bigBlind = game.minBet;

    const smallBlindPlayer = gamePlayers.find((p) => p.seatIndex === smallBlindIndex);
    const bigBlindPlayer = gamePlayers.find((p) => p.seatIndex === bigBlindIndex);

    if (smallBlindPlayer) {
      await ctx.db.patch(smallBlindPlayer._id, {
        bet: smallBlind,
        totalBetThisRound: smallBlind,
      });
    }
    if (bigBlindPlayer) {
      await ctx.db.patch(bigBlindPlayer._id, {
        bet: bigBlind,
        totalBetThisRound: bigBlind,
      });
    }

    const startingPlayer = (bigBlindIndex + 1) % gamePlayers.length;

    await ctx.db.patch(args.gameId, {
      status: "playing",
      deck,
      pot: smallBlind + bigBlind,
      currentBet: bigBlind,
      currentPlayerIndex: startingPlayer,
      round: "preflop",
      lastAction: Date.now(),
    });
  },
});

export const bet = mutation({
  args: { gameId: v.id("games"), amount: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");

    const gamePlayers = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const sortedPlayers = gamePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = sortedPlayers[game.currentPlayerIndex];

    if (currentPlayer.userId !== userId) throw new Error("Not your turn");
    if (currentPlayer.status !== "active") throw new Error("Cannot bet");

    const toCall = game.currentBet - currentPlayer.totalBetThisRound;
    const totalBet = toCall + args.amount;

    await ctx.db.patch(currentPlayer._id, {
      bet: currentPlayer.bet + totalBet,
      totalBetThisRound: currentPlayer.totalBetThisRound + totalBet,
    });

    const newCurrentBet = args.amount > 0
      ? currentPlayer.totalBetThisRound + totalBet
      : game.currentBet;

    await ctx.db.patch(args.gameId, {
      pot: game.pot + totalBet,
      currentBet: newCurrentBet,
      lastAction: Date.now(),
    });

    await advanceToNextPlayer(ctx, args.gameId);
  },
});

export const fold = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");

    const gamePlayers = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const sortedPlayers = gamePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = sortedPlayers[game.currentPlayerIndex];

    if (currentPlayer.userId !== userId) throw new Error("Not your turn");

    await ctx.db.patch(currentPlayer._id, { status: "folded" });
    await ctx.db.patch(args.gameId, { lastAction: Date.now() });

    await advanceToNextPlayer(ctx, args.gameId);
  },
});

export const check = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "playing") throw new Error("Game not in progress");

    const gamePlayers = await ctx.db
      .query("gamePlayers")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();

    const sortedPlayers = gamePlayers.sort((a, b) => a.seatIndex - b.seatIndex);
    const currentPlayer = sortedPlayers[game.currentPlayerIndex];

    if (currentPlayer.userId !== userId) throw new Error("Not your turn");
    if (currentPlayer.totalBetThisRound < game.currentBet) {
      throw new Error("Cannot check, must call or fold");
    }

    await ctx.db.patch(args.gameId, { lastAction: Date.now() });
    await advanceToNextPlayer(ctx, args.gameId);
  },
});

async function advanceToNextPlayer(ctx: any, gameId: any) {
  const game = await ctx.db.get(gameId);
  if (!game) return;

  const gamePlayers = await ctx.db
    .query("gamePlayers")
    .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
    .collect();

  const sortedPlayers = gamePlayers.sort((a: any, b: any) => a.seatIndex - b.seatIndex);
  const activePlayers = sortedPlayers.filter((p: any) => p.status === "active");

  // Check for winner
  if (activePlayers.length === 1) {
    await endGame(ctx, gameId, [activePlayers[0].userId]);
    return;
  }

  // Find next active player
  let nextIndex = (game.currentPlayerIndex + 1) % sortedPlayers.length;
  let attempts = 0;
  while (sortedPlayers[nextIndex].status !== "active" && attempts < sortedPlayers.length) {
    nextIndex = (nextIndex + 1) % sortedPlayers.length;
    attempts++;
  }

  // Check if round is complete (everyone has matched the bet)
  const allMatched = activePlayers.every(
    (p: any) => p.totalBetThisRound === game.currentBet
  );

  if (allMatched && nextIndex === (game.dealerIndex + 1) % sortedPlayers.length) {
    // Advance to next round
    await advanceRound(ctx, gameId);
  } else {
    await ctx.db.patch(gameId, { currentPlayerIndex: nextIndex });
  }
}

async function advanceRound(ctx: any, gameId: any) {
  const game = await ctx.db.get(gameId);
  if (!game) return;

  const deck = [...game.deck];
  let communityCards = [...game.communityCards];
  let nextRound = game.round;

  // Reset bets for new round
  const gamePlayers = await ctx.db
    .query("gamePlayers")
    .withIndex("by_game", (q: any) => q.eq("gameId", gameId))
    .collect();

  for (const gp of gamePlayers) {
    await ctx.db.patch(gp._id, { totalBetThisRound: 0 });
  }

  switch (game.round) {
    case "preflop":
      // Deal flop (3 cards)
      deck.pop(); // Burn
      communityCards = [deck.pop()!, deck.pop()!, deck.pop()!];
      nextRound = "flop";
      break;
    case "flop":
      deck.pop(); // Burn
      communityCards.push(deck.pop()!);
      nextRound = "turn";
      break;
    case "turn":
      deck.pop(); // Burn
      communityCards.push(deck.pop()!);
      nextRound = "river";
      break;
    case "river":
      nextRound = "showdown";
      // Determine winner
      const activePlayers = gamePlayers.filter((p: any) => p.status === "active");
      const winnerIds = activePlayers.map((p: any) => p.userId); // Simplified: split pot
      await endGame(ctx, gameId, winnerIds);
      return;
  }

  const sortedPlayers = gamePlayers.sort((a: any, b: any) => a.seatIndex - b.seatIndex);
  let startIndex = (game.dealerIndex + 1) % sortedPlayers.length;
  while (sortedPlayers[startIndex].status !== "active") {
    startIndex = (startIndex + 1) % sortedPlayers.length;
  }

  await ctx.db.patch(gameId, {
    deck,
    communityCards,
    round: nextRound,
    currentBet: 0,
    currentPlayerIndex: startIndex,
  });
}

async function endGame(ctx: any, gameId: any, winnerIds: any[]) {
  const game = await ctx.db.get(gameId);
  if (!game) return;

  const prizePerWinner = Math.floor(game.pot / winnerIds.length);

  for (const winnerId of winnerIds) {
    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q: any) => q.eq("userId", winnerId))
      .first();

    if (player) {
      await ctx.db.patch(player._id, {
        doubloons: player.doubloons + prizePerWinner + game.minBet, // Return buy-in + winnings
        gamesWon: player.gamesWon + 1,
      });
    }
  }

  await ctx.db.patch(gameId, {
    status: "finished",
    lastAction: Date.now(),
  });
}

export const getMyCurrentGame = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const gamePlayer = await ctx.db
      .query("gamePlayers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!gamePlayer) return null;

    const game = await ctx.db.get(gamePlayer.gameId);
    if (!game || game.status === "finished") return null;

    return game;
  },
});
