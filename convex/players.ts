import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const PIRATE_ADJECTIVES = [
  "Salty", "Barnacle", "Scurvy", "One-Eyed", "Blackbeard", "Pegleg",
  "Ironhook", "Rum-Soaked", "Storm", "Ghost", "Crimson", "Shadow"
];

const PIRATE_NOUNS = [
  "Jack", "Bill", "Bones", "Morgan", "Cutlass", "Drake",
  "Sparrow", "Flint", "Silver", "Hook", "Kidd", "Rackham"
];

function generatePirateAlias(): string {
  const adj = PIRATE_ADJECTIVES[Math.floor(Math.random() * PIRATE_ADJECTIVES.length)];
  const noun = PIRATE_NOUNS[Math.floor(Math.random() * PIRATE_NOUNS.length)];
  return `${adj} ${noun}`;
}

export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) return existing;

    const playerId = await ctx.db.insert("players", {
      userId,
      pirateAlias: generatePirateAlias(),
      doubloons: 1000, // Starting currency
      gamesPlayed: 0,
      gamesWon: 0,
      createdAt: Date.now(),
    });

    return await ctx.db.get(playerId);
  },
});

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateAlias = mutation({
  args: { alias: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!player) throw new Error("Player not found");

    await ctx.db.patch(player._id, { pirateAlias: args.alias });
  },
});

export const addDoubloons = mutation({
  args: { amount: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const player = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!player) throw new Error("Player not found");

    await ctx.db.patch(player._id, {
      doubloons: player.doubloons + args.amount
    });
  },
});

export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});
