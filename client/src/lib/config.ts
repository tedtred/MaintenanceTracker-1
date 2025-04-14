/**
 * Configuration for the client application
 */

// Determine the base API URL based on the environment
export const getApiBaseUrl = (): string => {
  // For local development in Docker container or production
  // use relative URLs which will be served by the same server
  return '';
};