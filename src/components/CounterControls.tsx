import React from "react";
import type { CounterControlsProps } from "../types";

export const CounterControls: React.FC<CounterControlsProps> = ({
  onIncrement,
  onDecrement,
  onReset,
  disabled,
}) => {
  const handleIncrement = async () => {
    try {
      await onIncrement();
    } catch (error) {
      console.error("Increment failed:", error);
    }
  };

  const handleDecrement = async () => {
    try {
      await onDecrement();
    } catch (error) {
      console.error("Decrement failed:", error);
    }
  };

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset the counter to 0?")) {
      try {
        await onReset();
      } catch (error) {
        console.error("Reset failed:", error);
      }
    }
  };

  return (
    <div className="counter-controls">
      <div className="primary-controls">
        <button
          className="control-button decrement"
          onClick={handleDecrement}
          disabled={disabled}
          aria-label="Decrease counter by 1"
          data-testid="decrement-button"
        >
          <span className="button-icon">−</span>
          <span className="button-text">-1</span>
        </button>
        
        <button
          className="control-button increment"
          onClick={handleIncrement}
          disabled={disabled}
          aria-label="Increase counter by 1"
          data-testid="increment-button"
        >
          <span className="button-icon">+</span>
          <span className="button-text">+1</span>
        </button>
      </div>
      
      <div className="secondary-controls">
        <button
          className="control-button reset"
          onClick={handleReset}
          disabled={disabled}
          aria-label="Reset counter to zero"
          data-testid="reset-button"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
