import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateAndEnforceSecurity } from "./security";

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

// Secure atomic increment operation with comprehensive security
export const incrementCounter = mutation({
  args: { 
    name: v.string(),
    expectedVersion: v.optional(v.number()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Enforce security - this handles all validation, rate limiting, and logging
    await validateAndEnforceSecurity(ctx, args.sessionId, "increment", args);
    
    // Server-side business logic - zero client trust
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
        lastModifiedBy: args.sessionId,
      });
      
      // Log successful request
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "increment",
        input: { name: args.name, expectedVersion: args.expectedVersion },
        result: "success",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined, // Will be populated by security middleware
      });
      
      return { 
        _id: newCounterId,
        name: args.name, 
        value: 1, 
        lastUpdated: now, 
        version: 1,
        lastModifiedBy: args.sessionId,
      };
    }
    
    // Server-side version validation - no client trust
    if (args.expectedVersion !== undefined && counter.version !== args.expectedVersion) {
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "increment",
        input: { name: args.name, expectedVersion: args.expectedVersion },
        result: "version_mismatch",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined,
      });
      throw new Error(`Version mismatch: expected ${args.expectedVersion}, got ${counter.version}`);
    }
    
    // Server-side value validation
    const newValue = counter.value + 1;
    if (newValue > 1000000 || newValue < -1000000) {
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "increment",
        input: { name: args.name, expectedVersion: args.expectedVersion },
        result: "value_out_of_range",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined,
      });
      throw new Error("Counter value would exceed allowed range");
    }
    
    const now = Date.now();
    const newVersion = counter.version + 1;
    
    await ctx.db.patch(counter._id, {
      value: newValue,
      lastUpdated: now,
      version: newVersion,
      lastModifiedBy: args.sessionId,
    });
    
    // Log successful operation
    await ctx.db.insert("requestAudit", {
      sessionId: args.sessionId,
      action: "increment",
      input: { name: args.name, expectedVersion: args.expectedVersion },
      result: "success",
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      ipAddress: undefined,
    });
    
    return { 
      ...counter,
      value: newValue, 
      lastUpdated: now, 
      version: newVersion,
      lastModifiedBy: args.sessionId,
    };
  },
});

// Secure atomic decrement operation with comprehensive security
export const decrementCounter = mutation({
  args: { 
    name: v.string(),
    expectedVersion: v.optional(v.number()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Enforce security - this handles all validation, rate limiting, and logging
    await validateAndEnforceSecurity(ctx, args.sessionId, "decrement", args);
    
    // Server-side business logic - zero client trust
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
        lastModifiedBy: args.sessionId,
      });
      
      // Log successful request
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "decrement",
        input: { name: args.name, expectedVersion: args.expectedVersion },
        result: "success",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined, // Will be populated by security middleware
      });
      
      return { 
        _id: newCounterId,
        name: args.name, 
        value: -1, 
        lastUpdated: now, 
        version: 1,
        lastModifiedBy: args.sessionId,
      };
    }
    
    // Server-side version validation - no client trust
    if (args.expectedVersion !== undefined && counter.version !== args.expectedVersion) {
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "decrement",
        input: { name: args.name, expectedVersion: args.expectedVersion },
        result: "version_mismatch",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined,
      });
      throw new Error(`Version mismatch: expected ${args.expectedVersion}, got ${counter.version}`);
    }
    
    // Server-side value validation
    const newValue = counter.value - 1;
    if (newValue > 1000000 || newValue < -1000000) {
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "decrement",
        input: { name: args.name, expectedVersion: args.expectedVersion },
        result: "value_out_of_range",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined,
      });
      throw new Error("Counter value would exceed allowed range");
    }
    
    const now = Date.now();
    const newVersion = counter.version + 1;
    
    await ctx.db.patch(counter._id, {
      value: newValue,
      lastUpdated: now,
      version: newVersion,
      lastModifiedBy: args.sessionId,
    });
    
    // Log successful operation
    await ctx.db.insert("requestAudit", {
      sessionId: args.sessionId,
      action: "decrement",
      input: { name: args.name, expectedVersion: args.expectedVersion },
      result: "success",
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      ipAddress: undefined,
    });
    
    return { 
      ...counter,
      value: newValue, 
      lastUpdated: now, 
      version: newVersion,
      lastModifiedBy: args.sessionId,
    };
  },
});

// Secure reset counter to zero with comprehensive security
export const resetCounter = mutation({
  args: { 
    name: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    // Enforce security - this handles all validation, rate limiting, and logging
    await validateAndEnforceSecurity(ctx, args.sessionId, "reset", args);
    
    // Server-side business logic - zero client trust
    const counter = await ctx.db
      .query("counters")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (!counter) {
      await ctx.db.insert("requestAudit", {
        sessionId: args.sessionId,
        action: "reset",
        input: { name: args.name },
        result: "counter_not_found",
        timestamp: Date.now(),
        processingTime: Date.now() - startTime,
        ipAddress: undefined,
      });
      throw new Error("Counter not found");
    }
    
    const now = Date.now();
    const newVersion = counter.version + 1;
    
    await ctx.db.patch(counter._id, {
      value: 0,
      lastUpdated: now,
      version: newVersion,
      lastModifiedBy: args.sessionId,
    });
    
    // Log successful operation
    await ctx.db.insert("requestAudit", {
      sessionId: args.sessionId,
      action: "reset",
      input: { name: args.name },
      result: "success",
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
      ipAddress: undefined,
    });
    
    return { 
      ...counter,
      value: 0, 
      lastUpdated: now, 
      version: newVersion,
      lastModifiedBy: args.sessionId,
    };
  },
});
