/**
 * Configuration for the client application
 */

// Determine the base API URL based on the environment
export const getApiBaseUrl = (): string => {
  // Detect location protocol and hostname
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // If in local Docker environment, we may get a hard-coded IP
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In development environment, we use the current hostname but with port 5000
  if (!isProduction && hostname !== 'localhost' && !hostname.includes('replit')) {
    // In Docker environment, use the current hostname with correct port
    return `${protocol}//${hostname}:5000`;
  }
  
  // For local development (localhost) or Replit, use relative URLs
  // which will be served by the same server
  return '';
};