import React from "react";
import type { ErrorDisplayProps } from "../types";

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  return (
    <div className="error-display" role="alert" aria-live="polite">
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <span className="error-message">{error}</span>
        <button
          className="error-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss error"
          data-testid="dismiss-error"
        >
          ×
        </button>
      </div>
    </div>
  );
};
