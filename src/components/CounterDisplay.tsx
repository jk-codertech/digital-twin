import React from "react";
import type { CounterDisplayProps } from "../types";

export const CounterDisplay: React.FC<CounterDisplayProps> = ({
  counter,
  isLoading,
}) => {
  const formatLastUpdated = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="counter-display">
      <div className="counter-value-container">
        <span className="counter-label">Global Counter</span>
        <div className="counter-value">
          {isLoading ? (
            <div className="loading-spinner" aria-label="Loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <span className="value" data-testid="counter-value">
              {counter?.value ?? 0}
            </span>
          )}
        </div>
      </div>
      
      {counter && !isLoading && (
        <div className="counter-metadata">
          <small className="last-updated">
            Last updated: {formatLastUpdated(counter.lastUpdated)}
          </small>
          <small className="version-info">
            Version: {counter.version}
          </small>
        </div>
      )}
    </div>
  );
};
