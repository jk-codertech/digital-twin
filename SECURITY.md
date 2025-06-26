# Security Documentation

This document outlines the comprehensive security measures implemented in the Digital Twin Counter application to protect against various threats and ensure data integrity.

## Overview

The Digital Twin Counter implements a multi-layered security approach with both client-side and server-side protections, comprehensive logging, and real-time monitoring capabilities.

## Security Architecture

### 1. Rate Limiting & DDoS Protection

#### Client-Side Rate Limiting
- **100ms minimum interval** between requests per user
- Browser-based session management with localStorage persistence
- Client-side validation before sending requests to server
- Automatic blocking of rapid-fire requests

#### Server-Side Rate Limiting
- **1 click per 100ms** enforced at the server level
- **100 requests per 10-second window** maximum
- Exponential backoff for violations:
  - Base block duration: 60 seconds
  - Multiplier: 2x for each violation
  - Maximum block duration: 24 hours

#### DDoS Protection
- Volume-based request monitoring
- Automatic IP-based session blocking
- Violation threshold system (5 violations = block)
- Progressive penalty system with exponential backoff

### 2. Session Management

#### Session Creation
```typescript
// Unique session ID generation
session_${timestamp}_${randomPart}_${browserFingerprint}
```

#### Browser Fingerprinting
- User agent string
- Screen resolution
- Language settings
- Timezone offset
- Canvas fingerprinting

#### Session Tracking
- Last activity timestamp
- Request count per window
- Violation count
- Block status and duration
- IP address logging

### 3. Input Validation & Sanitization

#### Counter Name Validation
- **Whitelist approach**: Only "global-counter" allowed
- Maximum length: 50 characters
- Character filtering: Blocks `<>"'&\` to prevent injection
- Non-empty string requirement

#### Counter Value Validation
- Range limits: -1,000,000 to +1,000,000
- Finite number validation
- Server-side boundary checking

#### Version Validation
- Non-negative integer requirement
- Optimistic concurrency control
- Version mismatch detection

### 4. Automated Behavior Detection

#### Bot Detection
- **50ms threshold**: Requests faster than human capability
- Pattern analysis for automated clicking
- User agent analysis
- Behavioral anomaly detection

#### Violation Tracking
- Progressive penalty system
- Violation count reduction for good behavior
- Automatic session blocking for repeated violations

### 5. Server-Authoritative Architecture

#### Zero Client Trust
- All business logic executed on server
- Client-side validation for UX only
- Server-side re-validation of all inputs
- Atomic database operations

#### Optimistic Concurrency Control
- Version-based conflict detection
- Automatic retry with exponential backoff
- Race condition prevention
- Data consistency guarantees

## Security Events & Logging

### Event Types

#### Security Events
- `rate_limit`: Request frequency violations
- `ddos_attempt`: Volume-based attack detection
- `automation_detected`: Bot/automated behavior
- `invalid_input`: Malformed or malicious input
- `blocked_access_attempt`: Access while blocked
- `admin_block`/`admin_unblock`: Administrative actions

#### Severity Levels
- **Low**: Normal operational events
- **Medium**: Minor security violations
- **High**: Significant security threats
- **Critical**: Severe attacks or system compromise

### Audit Trail

#### Request Auditing
```typescript
{
  sessionId: string,
  action: "increment" | "decrement" | "reset",
  input: { name?, expectedVersion? },
  result: "success" | "blocked" | "rate_limited" | "invalid_input",
  timestamp: number,
  processingTime: number,
  ipAddress?: string
}
```

#### Security Event Logging
```typescript
{
  sessionId: string,
  ipAddress?: string,
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  details: {
    action?: string,
    userAgent?: string,
    requestInterval?: number,
    violationCount?: number,
    additionalData?: string
  },
  timestamp: number,
  resolved: boolean
}
```

## Administrative Controls

### Monitoring Queries

#### Real-time Statistics
- Active sessions in last hour
- Security events in last 24 hours
- Currently blocked sessions
- Events by type and severity
- Top violators list

#### Session Management
- View active sessions
- Block/unblock sessions manually
- Adjust violation counts
- View session history

#### Event Management
- Filter events by type/severity
- Mark events as resolved
- Export security logs
- Generate security reports

### Cleanup & Maintenance

#### Automated Cleanup
```typescript
// Clean up old records (configurable retention)
cleanupOldRecords({ olderThanDays: 30 })
```

- Security events cleanup
- Audit log cleanup
- Inactive session cleanup
- Configurable retention periods

## Attack Mitigation

### SQL Injection Prevention
- Parameterized queries through Convex
- Input sanitization and validation
- Type-safe database operations
- No raw SQL execution

### XSS Protection
- Character filtering on inputs
- HTML entity encoding
- Content Security Policy headers
- Safe DOM manipulation

### CSRF Protection
- Session-based validation
- Origin verification
- State verification tokens
- Secure session management

### Replay Attack Prevention
- Timestamp validation
- Session uniqueness
- Request sequence tracking
- Nonce-based protection

## Performance Considerations

### Efficient Operations
- Indexed database queries
- Optimized audit logging
- Lazy cleanup operations
- Minimal security overhead

### Scalability
- Session-based tracking
- Distributed rate limiting ready
- Efficient memory usage
- Background cleanup processes

## Configuration

### Security Constants
```typescript
const RATE_LIMIT_DELAY = 100; // ms between requests
const MAX_REQUESTS = 100; // per 10-second window
const VIOLATION_THRESHOLD = 5; // violations before block
const BLOCK_DURATION_BASE = 60000; // base block duration (ms)
const MAX_BLOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const AUTOMATION_DETECTION_THRESHOLD = 50; // ms for bot detection
```

### Customization
- Adjustable rate limits
- Configurable block durations
- Flexible violation thresholds
- Custom security rules

## Security Best Practices

### Development
1. Never trust client-side validation
2. Always validate inputs server-side
3. Use atomic operations for data consistency
4. Implement comprehensive logging
5. Monitor security events regularly

### Deployment
1. Use HTTPS in production
2. Implement proper CORS policies
3. Regular security audits
4. Monitor security metrics
5. Keep dependencies updated

### Operations
1. Regular log review
2. Automated alerting for critical events
3. Backup security data
4. Performance monitoring
5. Incident response procedures

## Threat Model

### Addressed Threats
- ✅ DDoS attacks
- ✅ Rate limiting bypass
- ✅ Automated clicking/bots
- ✅ Race conditions
- ✅ Data corruption
- ✅ Input injection
- ✅ Session hijacking
- ✅ Replay attacks

### Future Enhancements
- IP geolocation blocking
- Advanced ML-based bot detection
- API key authentication
- Multi-factor authentication
- Advanced threat intelligence

## Incident Response

### Automatic Response
1. Real-time blocking of violating sessions
2. Exponential backoff for repeated violations
3. Comprehensive event logging
4. Performance impact minimization

### Manual Response
1. Admin dashboard for monitoring
2. Manual session blocking/unblocking
3. Security event investigation
4. Custom response actions

## Compliance & Standards

### Security Standards
- OWASP security guidelines
- Zero-trust architecture principles
- Defense in depth strategy
- Principle of least privilege

### Data Protection
- Minimal data collection
- Secure data storage
- Regular data cleanup
- Privacy-conscious design

## Testing Security

### Automated Testing
```bash
# Test rate limiting
for i in {1..20}; do curl -X POST /api/increment & done

# Test DDoS protection
ab -n 1000 -c 100 http://localhost:5173/

# Test input validation
curl -X POST -d '{"name":"<script>alert(1)</script>"}' /api/increment
```

### Manual Testing
1. Open multiple browser tabs
2. Rapidly click increment/decrement
3. Monitor security events in admin dashboard
4. Verify blocking behavior
5. Test session recovery

This comprehensive security implementation ensures the Digital Twin Counter is protected against a wide range of threats while maintaining excellent user experience and performance.
