import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  CounterOperation,
  COUNTER_NAME,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
} from "../types";
import type {
  CounterOperationType,
  UseCounterReturn,
} from "../types";
import { sessionManager } from "../utils/session";

// Utility function for exponential backoff retry
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  baseDelay: number = RETRY_DELAY_MS
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on version mismatch errors - these need immediate refresh
      if (error instanceof Error && error.message.includes("Version mismatch")) {
        throw error;
      }
      
      if (attempt === maxAttempts) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100;
      await sleep(delay);
    }
  }
  
  throw lastError!;
};

export const useCounter = (): UseCounterReturn => {
  const [error, setError] = useState<string | null>(null);
  const [isOperating, setIsOperating] = useState(false);

  // Convex hooks
  const counter = useQuery(api.counter.getCounter, { name: COUNTER_NAME });
  const initializeCounter = useMutation(api.counter.initializeCounter);
  const incrementCounter = useMutation(api.counter.incrementCounter);
  const decrementCounter = useMutation(api.counter.decrementCounter);
  const resetCounter = useMutation(api.counter.resetCounter);

  // Initialize counter on first load
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeCounter({ name: COUNTER_NAME });
      } catch (err) {
        console.error("Failed to initialize counter:", err);
        setError("Failed to initialize counter. Please refresh the page.");
      }
    };

    if (counter === undefined) {
      initialize();
    }
  }, [counter, initializeCounter]);

  // Clear error after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleError = useCallback((err: unknown, operation: CounterOperationType) => {
    console.error(`Counter ${operation} failed:`, err);
    
    if (err instanceof Error) {
      // Handle security-related errors
      if (err.message.includes("blocked") || err.message.includes("Blocked")) {
        const match = err.message.match(/(\d+) seconds/);
        if (match) {
          const duration = parseInt(match[1]) * 1000;
          sessionManager.setRateLimited(duration);
        }
        setError(err.message);
        return;
      }
      
      if (err.message.includes("Rate limit") || err.message.includes("too fast") || err.message.includes("slow down")) {
        sessionManager.setRateLimited(1000); // 1 second rate limit
        setError("Please slow down. Wait 100ms between requests.");
        return;
      }
      
      if (err.message.includes("Version mismatch")) {
        setError("Another user updated the counter. The page will refresh automatically.");
        return;
      }
      
      if (err.message.includes("Automated behavior") || err.message.includes("automation")) {
        setError("Automated behavior detected. Please interact manually.");
        return;
      }
      
      setError(`Security error: ${err.message}`);
    } else {
      setError(`Failed to ${operation} counter. Please try again.`);
    }
  }, []);

  const increment = useCallback(async (): Promise<void> => {
    if (isOperating || !counter) return;
    
    // Client-side rate limiting check
    const canRequest = sessionManager.canMakeRequest();
    if (!canRequest.allowed) {
      setError(`Please wait ${Math.ceil((canRequest.waitTime || 0) / 1000)} seconds before making another request.`);
      return;
    }
    
    setIsOperating(true);
    setError(null);
    
    try {
      // Record the request attempt
      sessionManager.recordRequest();
      
      await executeWithRetry(async () => {
        await incrementCounter({
          name: COUNTER_NAME,
          expectedVersion: counter.version,
          sessionId: sessionManager.getSessionId(),
        });
      });
    } catch (err) {
      handleError(err, CounterOperation.INCREMENT);
    } finally {
      setIsOperating(false);
    }
  }, [counter, incrementCounter, isOperating, handleError]);

  const decrement = useCallback(async (): Promise<void> => {
    if (isOperating || !counter) return;
    
    // Client-side rate limiting check
    const canRequest = sessionManager.canMakeRequest();
    if (!canRequest.allowed) {
      setError(`Please wait ${Math.ceil((canRequest.waitTime || 0) / 1000)} seconds before making another request.`);
      return;
    }
    
    setIsOperating(true);
    setError(null);
    
    try {
      // Record the request attempt
      sessionManager.recordRequest();
      
      await executeWithRetry(async () => {
        await decrementCounter({
          name: COUNTER_NAME,
          expectedVersion: counter.version,
          sessionId: sessionManager.getSessionId(),
        });
      });
    } catch (err) {
      handleError(err, CounterOperation.DECREMENT);
    } finally {
      setIsOperating(false);
    }
  }, [counter, decrementCounter, isOperating, handleError]);

  const reset = useCallback(async (): Promise<void> => {
    if (isOperating) return;
    
    // Client-side rate limiting check
    const canRequest = sessionManager.canMakeRequest();
    if (!canRequest.allowed) {
      setError(`Please wait ${Math.ceil((canRequest.waitTime || 0) / 1000)} seconds before making another request.`);
      return;
    }
    
    setIsOperating(true);
    setError(null);
    
    try {
      // Record the request attempt
      sessionManager.recordRequest();
      
      await executeWithRetry(async () => {
        await resetCounter({ 
          name: COUNTER_NAME,
          sessionId: sessionManager.getSessionId(),
        });
      });
    } catch (err) {
      handleError(err, CounterOperation.RESET);
    } finally {
      setIsOperating(false);
    }
  }, [resetCounter, isOperating, handleError]);

  return {
    counter: counter || null,
    isLoading: counter === undefined || isOperating,
    error,
    increment,
    decrement,
    reset,
  };
};
