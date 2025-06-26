import React from "react";
import { CounterControls } from "./components/CounterControls";
import { CounterDisplay } from "./components/CounterDisplay";
import { ErrorDisplay } from "./components/ErrorDisplay";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { useCounter } from "./hooks/useCounter";
import "./styles.css";

const App: React.FC = () => {
  const { counter, isLoading, error, increment, decrement, reset } = useCounter();
  const isConnected = true; // This would normally come from a connection status hook

  const handleDismissError = () => {
    // Error will auto-dismiss after 5 seconds in the hook
    console.log("Error dismissed");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Digital Twin Counter</h1>
        <p className="app-description">
          Real-time global counter with atomic operations
        </p>
        <ConnectionStatus isConnected={isConnected} />
      </header>

      <main className="app-main">
        <div className="counter-container">
          <CounterDisplay counter={counter} isLoading={isLoading} />
          <CounterControls
            onIncrement={increment}
            onDecrement={decrement}
            onReset={reset}
            disabled={isLoading}
          />
        </div>
        
        <ErrorDisplay
          error={error}
          onDismiss={handleDismissError}
        />
      </main>

      <footer className="app-footer">
        <p>Built with React, TypeScript, Vite, and Convex</p>
      </footer>
    </div>
  );
};

export default App;
