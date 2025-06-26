// Session management utility for client-side security
export class SessionManager {
  private static instance: SessionManager;
  private sessionId: string;
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private isRateLimited: boolean = false;
  private rateLimitUntil: number = 0;

  private constructor() {
    // Generate a unique session ID
    this.sessionId = this.generateSessionId();
    
    // Load from localStorage if available (for session persistence)
    const stored = localStorage.getItem('digital-twin-session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.sessionId && Date.now() - parsed.created < 24 * 60 * 60 * 1000) {
          this.sessionId = parsed.sessionId;
        }
      } catch (e) {
        // Invalid stored session, continue with new one
      }
    }
    
    // Store session
    localStorage.setItem('digital-twin-session', JSON.stringify({
      sessionId: this.sessionId,
      created: Date.now()
    }));
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const browserFingerprint = this.getBrowserFingerprint();
    return `session_${timestamp}_${randomPart}_${browserFingerprint}`;
  }

  private getBrowserFingerprint(): string {
    // Create a simple browser fingerprint for session uniqueness
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Digital Twin Fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).substring(0, 8);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public canMakeRequest(): { allowed: boolean; waitTime?: number } {
    const now = Date.now();
    
    // Check if still rate limited
    if (this.isRateLimited && now < this.rateLimitUntil) {
      return { 
        allowed: false, 
        waitTime: this.rateLimitUntil - now 
      };
    } else if (this.isRateLimited && now >= this.rateLimitUntil) {
      // Rate limit expired
      this.isRateLimited = false;
      this.rateLimitUntil = 0;
    }

    // Enforce client-side rate limiting (100ms between requests)
    if (now - this.lastRequestTime < 100) {
      return { 
        allowed: false, 
        waitTime: 100 - (now - this.lastRequestTime) 
      };
    }

    return { allowed: true };
  }

  public recordRequest(): void {
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  public setRateLimited(duration: number): void {
    this.isRateLimited = true;
    this.rateLimitUntil = Date.now() + duration;
  }

  public isCurrentlyRateLimited(): boolean {
    return this.isRateLimited && Date.now() < this.rateLimitUntil;
  }

  public getRemainingWaitTime(): number {
    if (!this.isRateLimited) return 0;
    return Math.max(0, this.rateLimitUntil - Date.now());
  }

  // Security headers for requests
  public getSecurityHeaders(): Record<string, string> {
    return {
      'X-Session-ID': this.sessionId,
      'X-Request-Time': Date.now().toString(),
      'X-Client-Version': '1.0.0'
    };
  }

  // Reset session (useful for testing or user logout)
  public resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.isRateLimited = false;
    this.rateLimitUntil = 0;
    
    localStorage.setItem('digital-twin-session', JSON.stringify({
      sessionId: this.sessionId,
      created: Date.now()
    }));
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
