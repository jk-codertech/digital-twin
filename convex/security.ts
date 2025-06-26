// TypeScript types for Convex functions

// Security constants
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const MAX_REQUESTS = 100; // Max requests per window
const RATE_LIMIT_DELAY = 100; // 100ms between requests
const BLOCK_DURATION_BASE = 60000; // Base block duration: 60 seconds
const VIOLATION_THRESHOLD = 5; // Number of violations before blocking
const MAX_COUNTER_VALUE = 1000000; // Maximum allowed counter value
const MIN_COUNTER_VALUE = -1000000; // Minimum allowed counter value
const MAX_COUNTER_NAME_LENGTH = 50; // Maximum counter name length
const AUTOMATION_DETECTION_THRESHOLD = 50; // ms - too fast indicates automation
const EXPONENTIAL_BACKOFF_MULTIPLIER = 2;
const MAX_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Valid counter names (whitelist)
const VALID_COUNTER_NAMES = ["global-counter"];

// Security validation functions
function validateCounterName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: "Counter name must be a non-empty string" };
  }
  
  if (name.length > MAX_COUNTER_NAME_LENGTH) {
    return { isValid: false, error: "Counter name too long" };
  }
  
  if (!VALID_COUNTER_NAMES.includes(name)) {
    return { isValid: false, error: "Invalid counter name" };
  }
  
  // Check for injection attempts
  if (/[<>"'&\\]/.test(name)) {
    return { isValid: false, error: "Invalid characters in counter name" };
  }
  
  return { isValid: true };
}

function validateCounterValue(value: number): { isValid: boolean; error?: string } {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { isValid: false, error: "Counter value must be a finite number" };
  }
  
  if (value > MAX_COUNTER_VALUE || value < MIN_COUNTER_VALUE) {
    return { isValid: false, error: "Counter value out of allowed range" };
  }
  
  return { isValid: true };
}

function validateVersion(version: number): { isValid: boolean; error?: string } {
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return { isValid: false, error: "Version must be a non-negative integer" };
  }
  
  return { isValid: true };
}

function detectAutomation(session: any, currentTime: number): boolean {
  if (!session.lastActivity) return false;
  
  const timeDiff = currentTime - session.lastActivity;
  return timeDiff < AUTOMATION_DETECTION_THRESHOLD;
}

function calculateBlockDuration(violationCount: number): number {
  const duration = BLOCK_DURATION_BASE * Math.pow(EXPONENTIAL_BACKOFF_MULTIPLIER, violationCount - VIOLATION_THRESHOLD);
  return Math.min(duration, MAX_BLOCK_DURATION);
}

// This function logs an audit trail of user actions
async function logRequest(ctx: any, sessionId: string, action: string, input: any, result: string, processingTime: number) {
  const timestamp = Date.now();
  await ctx.db.insert("requestAudit", {
    sessionId,
    action,
    input,
    result,
    timestamp,
    processingTime,
    ipAddress: ctx.meta.ipAddress,
  });
}

// Enhanced security middleware with comprehensive validation
export async function validateAndEnforceSecurity(ctx: any, sessionId: string, action: string, args: any) {
  const currentTime = Date.now();
  const startTime = currentTime;

  // Input validation
  if (args.name) {
    const nameValidation = validateCounterName(args.name);
    if (!nameValidation.isValid) {
      await logSecurityEvent(ctx, sessionId, "invalid_input", "medium", nameValidation.error!, {
        action,
        userAgent: ctx.auth?.userAgent,
        additionalData: `Invalid name: ${args.name}`,
      });
      await logRequest(ctx, sessionId, action, args, "invalid_input", Date.now() - startTime);
      throw new Error(nameValidation.error!);
    }
  }

  if (args.expectedVersion !== undefined) {
    const versionValidation = validateVersion(args.expectedVersion);
    if (!versionValidation.isValid) {
      await logSecurityEvent(ctx, sessionId, "invalid_input", "medium", versionValidation.error!, {
        action,
        userAgent: ctx.auth?.userAgent,
        additionalData: `Invalid version: ${args.expectedVersion}`,
      });
      await logRequest(ctx, sessionId, action, args, "invalid_input", Date.now() - startTime);
      throw new Error(versionValidation.error!);
    }
  }

  // Get or create session
  let session = await ctx.db
    .query("userSessions")
    .withIndex("by_session", (q: any) => q.eq("sessionId", sessionId))
    .first();

  // Create new session if doesn't exist
  if (!session) {
    const newSessionId = await ctx.db.insert("userSessions", {
      sessionId,
      ipAddress: ctx.auth?.ipAddress,
      userAgent: ctx.auth?.userAgent,
      lastActivity: currentTime,
      requestCount: 1,
      windowStart: currentTime,
      violationCount: 0,
      isBlocked: false,
      createdAt: currentTime,
    });
    
    session = await ctx.db.get(newSessionId);
    return { shouldProceed: true, session, rateLimited: false, blocked: false };
  }

  // Check if session is blocked with exponential backoff
  if (session.isBlocked && session.blockUntil && session.blockUntil > currentTime) {
    await logSecurityEvent(ctx, sessionId, "blocked_access_attempt", "high", "Attempted access while blocked", {
      action,
      userAgent: ctx.auth?.userAgent,
      additionalData: `Block expires: ${new Date(session.blockUntil).toISOString()}`,
    });
    await logRequest(ctx, sessionId, action, args, "blocked", Date.now() - startTime);
    
    const timeLeft = Math.ceil((session.blockUntil - currentTime) / 1000);
    throw new Error(`Access blocked. Try again in ${timeLeft} seconds.`);
  }

  // Unblock if block period has expired
  if (session.isBlocked && (!session.blockUntil || session.blockUntil <= currentTime)) {
    await ctx.db.patch(session._id, {
      isBlocked: false,
      blockUntil: undefined,
      violationCount: Math.max(0, session.violationCount - 1), // Reduce violation count on unblock
    });
    session = { ...session, isBlocked: false, blockUntil: undefined };
  }

  // Reset rate limiting window if expired
  let { requestCount, windowStart, violationCount } = session;
  if (currentTime - windowStart > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    windowStart = currentTime;
  }

  // Automation detection
  if (detectAutomation(session, currentTime)) {
    violationCount++;
    await logSecurityEvent(ctx, sessionId, "automation_detected", "high", "Automation/bot behavior detected", {
      action,
      requestInterval: currentTime - session.lastActivity,
      userAgent: ctx.auth?.userAgent,
    });
    
    if (violationCount >= VIOLATION_THRESHOLD) {
      const blockDuration = calculateBlockDuration(violationCount);
      await ctx.db.patch(session._id, {
        isBlocked: true,
        blockUntil: currentTime + blockDuration,
        violationCount,
        lastActivity: currentTime,
      });
      
      await logSecurityEvent(ctx, sessionId, "blocked", "critical", "Automation threshold exceeded - blocked", {
        action,
        violationCount,
        blockDuration,
      });
      await logRequest(ctx, sessionId, action, args, "blocked", Date.now() - startTime);
      
      throw new Error(`Automated behavior detected. Blocked for ${Math.ceil(blockDuration / 1000)} seconds.`);
    }
    
    await ctx.db.patch(session._id, {
      violationCount,
      lastActivity: currentTime,
    });
    await logRequest(ctx, sessionId, action, args, "rate_limited", Date.now() - startTime);
    
    throw new Error("Please slow down. Wait 100ms between requests.");
  }

  // Rate limiting check
  if (currentTime - session.lastActivity < RATE_LIMIT_DELAY) {
    violationCount++;
    await logSecurityEvent(ctx, sessionId, "rate_limit", "medium", "Request too fast", {
      action,
      requestInterval: currentTime - session.lastActivity,
      userAgent: ctx.auth?.userAgent,
    });
    
    if (violationCount >= VIOLATION_THRESHOLD) {
      const blockDuration = calculateBlockDuration(violationCount);
      await ctx.db.patch(session._id, {
        isBlocked: true,
        blockUntil: currentTime + blockDuration,
        violationCount,
        lastActivity: currentTime,
      });
      
      await logSecurityEvent(ctx, sessionId, "blocked", "high", "Rate limit threshold exceeded - blocked", {
        action,
        violationCount,
        blockDuration,
      });
      await logRequest(ctx, sessionId, action, args, "blocked", Date.now() - startTime);
      
      throw new Error(`Too many violations. Blocked for ${Math.ceil(blockDuration / 1000)} seconds.`);
    }
    
    await ctx.db.patch(session._id, {
      violationCount,
      lastActivity: currentTime,
    });
    await logRequest(ctx, sessionId, action, args, "rate_limited", Date.now() - startTime);
    
    throw new Error("Rate limit exceeded. Please wait 100ms between requests.");
  }

  requestCount++;

  // DDoS protection
  if (requestCount > MAX_REQUESTS) {
    violationCount++;
    await logSecurityEvent(ctx, sessionId, "ddos_attempt", "critical", "Request volume exceeded", {
      action,
      requestCount,
      userAgent: ctx.auth?.userAgent,
    });
    
    if (violationCount >= VIOLATION_THRESHOLD) {
      const blockDuration = calculateBlockDuration(violationCount);
      await ctx.db.patch(session._id, {
        isBlocked: true,
        blockUntil: currentTime + blockDuration,
        violationCount,
        lastActivity: currentTime,
      });
      
      await logSecurityEvent(ctx, sessionId, "blocked", "critical", "DDoS threshold exceeded - blocked", {
        action,
        violationCount,
        blockDuration,
        requestCount,
      });
      await logRequest(ctx, sessionId, action, args, "blocked", Date.now() - startTime);
      
      throw new Error(`DDoS protection activated. Blocked for ${Math.ceil(blockDuration / 1000)} seconds.`);
    }
    
    await ctx.db.patch(session._id, {
      requestCount,
      violationCount,
      lastActivity: currentTime,
    });
    await logRequest(ctx, sessionId, action, args, "rate_limited", Date.now() - startTime);
    
    throw new Error("Request volume too high. Please slow down.");
  }

  // Update session with successful request
  await ctx.db.patch(session._id, {
    requestCount,
    windowStart,
    lastActivity: currentTime,
    violationCount: Math.max(0, violationCount - 0.1), // Slowly decrease violation count for good behavior
  });

  return { shouldProceed: true, session, rateLimited: false, blocked: false };
}

async function logSecurityEvent(ctx: any, sessionId: string, eventType: string, severity: string, message: string, details: any) {
  await ctx.db.insert("securityEvents", {
    sessionId,
    ipAddress: ctx.auth?.ipAddress,
    eventType,
    severity,
    details: { ...details, action: message },
    timestamp: Date.now(),
    resolved: false,
  });
}

// Export utility functions for use in other modules
export { logSecurityEvent, logRequest, validateCounterName, validateCounterValue, validateVersion };

