import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counters: defineTable({
    name: v.string(),
    value: v.number(),
    lastUpdated: v.number(),
    version: v.number(), // For optimistic concurrency control
  }).index("by_name", ["name"]),
});
