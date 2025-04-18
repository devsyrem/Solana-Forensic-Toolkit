import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Add error handling for HMR and WebSocket issues
if (import.meta.hot) {
  // Add custom error handler for HMR
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    console.log('HMR update incoming:', payload.type);
  });
  
  // Add custom error recovery for disconnects
  import.meta.hot.on('vite:error', (error) => {
    console.warn('Vite HMR error:', error);
    // Don't crash on HMR errors, just log them
  });
}

// Add global error handler to prevent crashes
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent the error from crashing the application
  event.preventDefault();
});

console.log('Application starting with environment:', import.meta.env.MODE);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
