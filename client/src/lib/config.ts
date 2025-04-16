/**
 * Configuration utility for the client application
 * 
 * Provides environment-specific configuration settings
 */

// Detect Docker environment
export function isDockerEnvironment(): boolean {
  // Log the detection attempt only once
  if (!(window as any)._hasLoggedEnvironment) {
    console.log("Checking for Docker environment");
    (window as any)._hasLoggedEnvironment = true;
  }
  
  // The hostname of the current page
  const hostname = window.location.hostname;
  
  // Multiple detection methods for Docker environment
  const isDocker = (
    // IP address-based detection (common in Docker networking)
    hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) !== null ||
    // Docker-specific hostnames
    hostname === 'host.docker.internal' ||
    hostname === 'docker.for.mac.localhost' ||
    hostname === 'docker.for.win.localhost' ||
    // Check specific ports which are typically used in Docker deployments
    (hostname === 'localhost' && 
     (window.location.port === '5000' || window.location.port === '80' || 
      window.location.port === '443')) ||
    // Environment variable check (set in index.html)
    (window as any).__IS_DOCKER__ === true ||
    (window as any).RUNNING_IN_DOCKER === true ||
    (window as any).DOCKER_ENV === true ||
    // Previous Docker detection
    document.cookie.includes('docker=true')
  );
  
  if (isDocker) {
    // Remember Docker environment in a cookie for future page loads
    document.cookie = "docker=true; path=/; max-age=86400";
    console.log("Docker environment detected - applying connection optimizations");
  }
  
  return isDocker;
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
    // Retrieve the port from the current URL or use the default Docker port
    const currentPort = window.location.port;
    const port = currentPort && currentPort !== '80' && currentPort !== '443' 
                ? currentPort  // Use the current port if it exists and is not a standard HTTP/HTTPS port
                : '5000';      // Default to port 5000 for Docker (standard port mapping)
                
    console.log(`Using Docker API connection: ${protocol}//${hostname}:${port}`);
    
    // Check if we're accessing via IP address
    if (hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return `${protocol}//${hostname}:${port}`;
    }
    
    // For localhost, host.docker.internal, etc.
    return `${protocol}//${hostname}:${port}`;
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