import React, { useEffect, useState } from "react";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
}) => {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Show status when connection changes
    setShowStatus(true);
    const timer = setTimeout(() => setShowStatus(false), 3000);
    return () => clearTimeout(timer);
  }, [isConnected]);

  if (!showStatus) return null;

  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="status-indicator">
        <span className={`indicator-dot ${isConnected ? 'online' : 'offline'}`}></span>
        <span className="status-text">
          {isConnected ? 'Connected' : 'Reconnecting...'}
        </span>
      </div>
    </div>
  );
};
