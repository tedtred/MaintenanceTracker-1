/**
 * Configuration for the client application
 */

// Determine the base API URL based on the environment
export const getApiBaseUrl = (): string => {
  // Get the current hostname and port
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Handle special case for Docker environment with hardcoded IP
  if (hostname === '192.168.0.122') {
    // For Docker, use the current window location (same origin)
    return window.location.origin;
  } 
  
  // For all other environments (Replit, localhost, production),
  // use relative URLs which will be served by the same server
  return '';
};

// Check if we're running inside a Docker container
export const isDockerEnvironment = (): boolean => {
  // We can check this by calling our environment API endpoint
  // or by checking the hostname
  const hostname = window.location.hostname;
  return hostname === '192.168.0.122' || (typeof window !== 'undefined' && 
         window.location.hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) !== null);
};