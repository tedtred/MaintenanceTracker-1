import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Type declaration for global properties we're adding
declare global {
  interface Window {
    __REPLIT_ENV__?: boolean;
    __HMR_DISABLED__?: boolean;
  }
}

// Prevent Vite HMR WebSocket connections in Replit environment
// This fixes connection issues in the Replit webview
if (import.meta.env.DEV) {
  // Disable WebSocket connection attempts by overriding the WebSocket constructor
  // Only in development mode to prevent unnecessary connection attempts
  const isReplit = window.location.hostname.includes('replit');
  
  if (isReplit) {
    console.log("Running in Replit environment - HMR disabled");
    
    // Add a global flag to indicate we're in Replit (for debugging)
    window.__REPLIT_ENV__ = true;
    
    try {
      // Prevent unnecessary WebSocket connection errors in console
      const originalWebSocket = window.WebSocket;
      
      // Create a mock WebSocket constructor
      const mockWebSocketConstructor = function(this: WebSocket, ...args: any[]) {
        // Filter out Vite HMR WebSocket connections
        const url = args[0];
        if (typeof url === 'string' && (url.includes('hmr') || url.includes('vite'))) {
          console.log('Blocked WebSocket connection to:', url);
          // Return a fake WebSocket that does nothing
          return {
            addEventListener: () => {},
            removeEventListener: () => {},
            send: () => {},
            close: () => {},
          } as unknown as WebSocket;
        }
        
        // For non-Vite connections, proceed with the original WebSocket
        return new originalWebSocket(url);
      } as unknown as typeof WebSocket;
      
      // Preserve prototype chain
      mockWebSocketConstructor.prototype = originalWebSocket.prototype;
      
      // Replace the WebSocket constructor
      window.WebSocket = mockWebSocketConstructor;
      
      console.log("Successfully patched WebSocket to block HMR connections");
    } catch (e) {
      console.error("Failed to patch WebSocket:", e);
    }
  }
}

// Mount React application
const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Root element not found - unable to mount React application");
}
