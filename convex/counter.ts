import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Query to get the current counter value
export const getCounter = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    return counter || { name: args.name, value: 0, lastUpdated: Date.now(), version: 0 };
  },
});

// Initialize counter if it doesn't exist
export const initializeCounter = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!existing) {
      const now = Date.now();
      await ctx.db.insert("counters", {
        name: args.name,
        value: 0,
        lastUpdated: now,
        version: 0,
      });
    }
    
    return existing || { name: args.name, value: 0, lastUpdated: Date.now(), version: 0 };
  },
});

// Atomic increment operation
export const incrementCounter = mutation({
  args: { 
    name: v.string(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!counter) {
      // Counter doesn't exist, create it with value 1
      const now = Date.now();
      const newCounterId = await ctx.db.insert("counters", {
        name: args.name,
        value: 1,
        lastUpdated: now,
        version: 1,
      });
      
      return { 
        _id: newCounterId,
        name: args.name, 
        value: 1, 
        lastUpdated: now, 
        version: 1 
      };
    }
    
    // Check version for optimistic concurrency control
    if (args.expectedVersion !== undefined && counter.version !== args.expectedVersion) {
      throw new Error(`Version mismatch: expected ${args.expectedVersion}, got ${counter.version}`);
    }
    
    const now = Date.now();
    const newValue = counter.value + 1;
    const newVersion = counter.version + 1;
    
    await ctx.db.patch(counter._id, {
      value: newValue,
      lastUpdated: now,
      version: newVersion,
    });
    
    return { 
      ...counter,
      value: newValue, 
      lastUpdated: now, 
      version: newVersion 
    };
  },
});

// Atomic decrement operation
export const decrementCounter = mutation({
  args: { 
    name: v.string(),
    expectedVersion: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!counter) {
      // Counter doesn't exist, create it with value -1
      const now = Date.now();
      const newCounterId = await ctx.db.insert("counters", {
        name: args.name,
        value: -1,
        lastUpdated: now,
        version: 1,
      });
      
      return { 
        _id: newCounterId,
        name: args.name, 
        value: -1, 
        lastUpdated: now, 
        version: 1 
      };
    }
    
    // Check version for optimistic concurrency control
    if (args.expectedVersion !== undefined && counter.version !== args.expectedVersion) {
      throw new Error(`Version mismatch: expected ${args.expectedVersion}, got ${counter.version}`);
    }
    
    const now = Date.now();
    const newValue = counter.value - 1;
    const newVersion = counter.version + 1;
    
    await ctx.db.patch(counter._id, {
      value: newValue,
      lastUpdated: now,
      version: newVersion,
    });
    
    return { 
      ...counter,
      value: newValue, 
      lastUpdated: now, 
      version: newVersion 
    };
  },
});

// Reset counter to zero
export const resetCounter = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!counter) {
      return null;
    }
    
    const now = Date.now();
    const newVersion = counter.version + 1;
    
    await ctx.db.patch(counter._id, {
      value: 0,
      lastUpdated: now,
      version: newVersion,
    });
    
    return { 
      ...counter,
      value: 0, 
      lastUpdated: now, 
      version: newVersion 
    };
  },
});
