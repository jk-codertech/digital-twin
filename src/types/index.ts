import type { Id } from "../../convex/_generated/dataModel";

// Core counter interface
export interface Counter {
  _id?: Id<"counters">;
  name: string;
  value: number;
  lastUpdated: number;
  version: number;
}

// Counter operation result
export interface CounterOperationResult {
  success: boolean;
  counter: Counter | null;
  error?: string;
}

// Counter operations type
export const CounterOperation = {
  INCREMENT: "increment",
  DECREMENT: "decrement",
  RESET: "reset",
} as const;

export type CounterOperationType = typeof CounterOperation[keyof typeof CounterOperation];

// Button action interface
export interface ButtonAction {
  type: CounterOperationType;
  label: string;
  disabled: boolean;
}

// Error types
export interface CounterError {
  name: string;
  message: string;
  operation: CounterOperationType;
  originalError?: Error;
}

export interface VersionMismatchError extends CounterError {
  name: "VersionMismatchError";
  expectedVersion: number;
  actualVersion: number;
}

// Application state interface
export interface AppState {
  isLoading: boolean;
  error: string | null;
  counter: Counter | null;
}

// Hook return types
export interface UseCounterReturn {
  counter: Counter | null;
  isLoading: boolean;
  error: string | null;
  increment: () => Promise<void>;
  decrement: () => Promise<void>;
  reset: () => Promise<void>;
}

// Component props interfaces
export interface CounterDisplayProps {
  counter: Counter | null;
  isLoading: boolean;
}

export interface CounterControlsProps {
  onIncrement: () => Promise<void>;
  onDecrement: () => Promise<void>;
  onReset: () => Promise<void>;
  disabled: boolean;
}

export interface ErrorDisplayProps {
  error: string | null;
  onDismiss: () => void;
}

// Constants
export const COUNTER_NAME = "global-counter" as const;
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 100;
