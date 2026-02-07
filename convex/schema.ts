import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Player profiles with their pirate stats
  players: defineTable({
    userId: v.id("users"),
    pirateAlias: v.string(),
    doubloons: v.number(), // In-game currency
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Game tables (poker rooms)
  games: defineTable({
    name: v.string(),
    status: v.union(v.literal("waiting"), v.literal("playing"), v.literal("finished")),
    hostId: v.id("users"),
    maxPlayers: v.number(),
    minBet: v.number(),
    pot: v.number(),
    currentBet: v.number(),
    currentPlayerIndex: v.number(),
    dealerIndex: v.number(),
    communityCards: v.array(v.string()),
    deck: v.array(v.string()),
    round: v.union(v.literal("preflop"), v.literal("flop"), v.literal("turn"), v.literal("river"), v.literal("showdown")),
    createdAt: v.number(),
    lastAction: v.number(),
  }).index("by_status", ["status"]),

  // Players in each game
  gamePlayers: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    seatIndex: v.number(),
    cards: v.array(v.string()),
    bet: v.number(),
    totalBetThisRound: v.number(),
    status: v.union(v.literal("active"), v.literal("folded"), v.literal("allin"), v.literal("waiting")),
    isReady: v.boolean(),
  }).index("by_game", ["gameId"])
    .index("by_user", ["userId"])
    .index("by_game_and_user", ["gameId", "userId"]),
});
