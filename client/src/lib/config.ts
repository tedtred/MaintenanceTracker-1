/**
 * Configuration utility for the client application
 * 
 * Provides environment-specific configuration settings
 */

// Detect Docker environment
export function isDockerEnvironment(): boolean {
  // Check if running in the Docker container
  // This could be set via environment variable or inferred from the hostname
  const hostname = window.location.hostname;
  return (
    // IP address-based detection (common in Docker networking)
    hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) !== null ||
    // Docker-specific hostnames
    hostname === 'host.docker.internal' ||
    hostname === 'docker.for.mac.localhost' ||
    hostname === 'docker.for.win.localhost' ||
    // Environment variable check (set in index.html)
    (window as any).__IS_DOCKER__ === true
  );
}

// Detect Replit environment
export function isReplitEnvironment(): boolean {
  return window.location.hostname.endsWith('.repl.co') || 
    window.location.hostname.endsWith('.replit.app') ||
    (window as any).__IS_REPLIT__ === true;
}

// Get the base URL for API requests
export function getApiBaseUrl(): string {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // For Replit, use the same origin
  if (isReplitEnvironment()) {
    return `${protocol}//${hostname}`;
  }
  
  // For Docker with IP-based access, use the specific IP and port
  if (isDockerEnvironment()) {
    // Check for hardcoded IP in Docker environment (192.168.0.122:5000)
    if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return `${protocol}//${hostname}:5000`;
    }
    
    // Otherwise use the same hostname with port 5000
    return `${protocol}//${hostname}:5000`;
  }
  
  // Local development - assume backend is on port 5000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:5000`;
  }
  
  // Default to same origin
  return '';
}

// Get the base path (with trailing slash) for API endpoints
export function getApiBasePath(): string {
  return '/api/';
}

// Full URL for API endpoints (base URL + base path)
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const basePath = getApiBasePath();
  
  // Strip leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If baseUrl is empty, use relative URL
  if (!baseUrl) {
    return `${basePath}${cleanEndpoint}`;
  }
  
  return `${baseUrl}${basePath}${cleanEndpoint}`;
}