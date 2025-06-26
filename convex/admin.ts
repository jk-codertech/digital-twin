import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Security monitoring queries for admin dashboard
export const getSecurityEvents = query({
  args: {
    limit: v.optional(v.number()),
    severity: v.optional(v.string()),
    eventType: v.optional(v.string()),
    resolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.severity) {
      const events = await ctx.db
        .query("securityEvents")
        .withIndex("by_severity", (q) => q.eq("severity", args.severity!))
        .order("desc")
        .take(args.limit || 100);
      return events.filter(event => 
        args.resolved === undefined || event.resolved === args.resolved
      );
    } else if (args.eventType) {
      const events = await ctx.db
        .query("securityEvents")
        .withIndex("by_event_type", (q) => q.eq("eventType", args.eventType!))
        .order("desc")
        .take(args.limit || 100);
      return events.filter(event => 
        args.resolved === undefined || event.resolved === args.resolved
      );
    } else {
      const events = await ctx.db
        .query("securityEvents")
        .withIndex("by_timestamp")
        .order("desc")
        .take(args.limit || 100);
      return events.filter(event => 
        args.resolved === undefined || event.resolved === args.resolved
      );
    }
  },
});

export const getActiveSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    return await ctx.db
      .query("userSessions")
      .withIndex("by_last_activity")
      .filter((q) => q.gt(q.field("lastActivity"), twentyFourHoursAgo))
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getBlockedSessions = query({
  args: {},
  handler: async (ctx) => {
    const currentTime = Date.now();
    
    return await ctx.db
      .query("userSessions")
      .filter((q) => 
        q.and(
          q.eq(q.field("isBlocked"), true),
          q.gt(q.field("blockUntil"), currentTime)
        )
      )
      .collect();
  },
});

export const getRequestAuditLogs = query({
  args: {
    sessionId: v.optional(v.string()),
    action: v.optional(v.string()),
    result: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.sessionId) {
      return await ctx.db
        .query("requestAudit")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId!))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.result) {
      return await ctx.db
        .query("requestAudit")
        .withIndex("by_result", (q) => q.eq("result", args.result!))
        .order("desc")
        .take(args.limit || 100);
    } else {
      return await ctx.db
        .query("requestAudit")
        .withIndex("by_timestamp")
        .order("desc")
        .take(args.limit || 100);
    }
  },
});

// Security statistics
export const getSecurityStats = query({
  args: {},
  handler: async (ctx) => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    // Get security events in last 24 hours
    const recentEvents = await ctx.db
      .query("securityEvents")
      .withIndex("by_timestamp")
      .filter((q) => q.gt(q.field("timestamp"), twentyFourHoursAgo))
      .collect();
    
    // Get active sessions
    const activeSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_last_activity")
      .filter((q) => q.gt(q.field("lastActivity"), oneHourAgo))
      .collect();
    
    // Get blocked sessions
    const blockedSessions = await ctx.db
      .query("userSessions")
      .filter((q) => 
        q.and(
          q.eq(q.field("isBlocked"), true),
          q.gt(q.field("blockUntil"), Date.now())
        )
      )
      .collect();
    
    // Categorize events by type and severity
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalEvents24h: recentEvents.length,
      activeSessionsLastHour: activeSessions.length,
      currentlyBlocked: blockedSessions.length,
      eventsByType,
      eventsBySeverity,
      topViolators: blockedSessions
        .sort((a, b) => b.violationCount - a.violationCount)
        .slice(0, 10)
        .map(session => ({
          sessionId: session.sessionId,
          violationCount: session.violationCount,
          blockUntil: session.blockUntil,
          ipAddress: session.ipAddress,
        })),
    };
  },
});

// Admin actions
export const resolveSecurityEvent = mutation({
  args: { eventId: v.id("securityEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { resolved: true });
  },
});

export const unblockSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        isBlocked: false,
        blockUntil: undefined,
        violationCount: 0,
      });
      
      // Log admin action
      await ctx.db.insert("securityEvents", {
        sessionId: args.sessionId,
        eventType: "admin_unblock",
        severity: "low",
        details: {
          action: "Session manually unblocked by admin",
          additionalData: `Admin unblocked session ${args.sessionId}`,
        },
        timestamp: Date.now(),
        resolved: true,
      });
    }
  },
});

export const blockSession = mutation({
  args: { 
    sessionId: v.string(),
    duration: v.number(), // in milliseconds
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("userSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (session) {
      await ctx.db.patch(session._id, {
        isBlocked: true,
        blockUntil: Date.now() + args.duration,
        violationCount: session.violationCount + 1,
      });
      
      // Log admin action
      await ctx.db.insert("securityEvents", {
        sessionId: args.sessionId,
        eventType: "admin_block",
        severity: "high",
        details: {
          action: "Session manually blocked by admin",
          additionalData: `Reason: ${args.reason}. Duration: ${args.duration}ms`,
        },
        timestamp: Date.now(),
        resolved: true,
      });
    }
  },
});

// Cleanup old records (run periodically)
export const cleanupOldRecords = mutation({
  args: { olderThanDays: v.number() },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanDays * 24 * 60 * 60 * 1000);
    
    // Clean up old security events
    const oldEvents = await ctx.db
      .query("securityEvents")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();
    
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }
    
    // Clean up old audit logs
    const oldAudits = await ctx.db
      .query("requestAudit")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();
    
    for (const audit of oldAudits) {
      await ctx.db.delete(audit._id);
    }
    
    // Clean up inactive sessions
    const inactiveSessions = await ctx.db
      .query("userSessions")
      .withIndex("by_last_activity")
      .filter((q) => q.lt(q.field("lastActivity"), cutoffTime))
      .collect();
    
    for (const session of inactiveSessions) {
      await ctx.db.delete(session._id);
    }
    
    return {
      deletedEvents: oldEvents.length,
      deletedAudits: oldAudits.length,
      deletedSessions: inactiveSessions.length,
    };
  },
});
