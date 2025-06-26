import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counters: defineTable({
    name: v.string(),
    value: v.number(),
    lastUpdated: v.number(),
    version: v.number(), // For optimistic concurrency control
    lastModifiedBy: v.optional(v.string()), // Track last modifier
  }).index("by_name", ["name"]),
  
  // Rate limiting and security tracking
  userSessions: defineTable({
    sessionId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    lastActivity: v.number(),
    requestCount: v.number(),
    windowStart: v.number(),
    violationCount: v.number(),
    isBlocked: v.boolean(),
    blockUntil: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_ip", ["ipAddress"])
    .index("by_last_activity", ["lastActivity"]),
    
  // Security event logging
  securityEvents: defineTable({
    sessionId: v.string(),
    ipAddress: v.optional(v.string()),
    eventType: v.string(), // "rate_limit", "ddos_attempt", "automation_detected", "invalid_input"
    severity: v.string(), // "low", "medium", "high", "critical"
    details: v.object({
      action: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      requestInterval: v.optional(v.number()),
      violationCount: v.optional(v.number()),
      additionalData: v.optional(v.string()),
    }),
    timestamp: v.number(),
    resolved: v.boolean(),
  }).index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_severity", ["severity"])
    .index("by_event_type", ["eventType"]),
    
  // Request audit trail
  requestAudit: defineTable({
    sessionId: v.string(),
    action: v.string(),
    input: v.object({
      name: v.optional(v.string()),
      expectedVersion: v.optional(v.number()),
    }),
    result: v.string(), // "success", "blocked", "rate_limited", "invalid_input"
    timestamp: v.number(),
    processingTime: v.number(),
    ipAddress: v.optional(v.string()),
  }).index("by_session", ["sessionId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_result", ["result"]),
});
