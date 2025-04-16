export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ConnectionError extends Error {
  constructor(message: string, public originalError: unknown) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export async function handleAPIResponse(response: Response) {
  if (!response.ok) {
    let message = 'An error occurred';
    let errors;

    try {
      const data = await response.json();
      message = data.message || `Error: ${response.statusText}`;
      errors = data.errors;
    } catch {
      message = `Error: ${response.statusText}`;
    }

    throw new APIError(message, response.status, errors);
  }

  return response;
}

// Helper function for managing fetch errors in Docker environment
export function formatConnectionError(error: unknown, url: string): Error {
  // If it's already an APIError, just return it
  if (error instanceof APIError) {
    return error;
  }
  
  // Import isDockerEnvironment from config module
  // Dynamic import to avoid circular dependency issues
  let isDockerEnv = false;
  try {
    // First check if we're in an obvious Docker environment
    isDockerEnv = 
      window.location.hostname.match(/^(\d{1,3}\.){3}\d{1,3}$/) !== null ||
      window.location.hostname === 'host.docker.internal' ||
      window.location.hostname === 'docker.for.mac.localhost' ||
      window.location.hostname === 'docker.for.win.localhost' || 
      // Check specific ports which are typically used in Docker deployments
      (window.location.hostname === 'localhost' && 
        (window.location.port === '5000' || window.location.port === '80' || 
        window.location.port === '443')) || 
      document.cookie.includes('docker=true') ||
      (window as any).__IS_DOCKER__ === true ||
      (window as any).RUNNING_IN_DOCKER === true ||
      (window as any).DOCKER_ENV === true;
  } catch (e) {
    console.error('Error detecting Docker environment', e);
    // If we can't detect the environment, assume it's not Docker
    isDockerEnv = false;
  }
  
  // Format connection errors specially for Docker environment
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    // Special message for the Docker environment
    if (isDockerEnv) {
      const urlParts = new URL(url);
      const port = urlParts.port || '5000';
      
      return new ConnectionError(
        `Docker Connection Error: Unable to connect to the API at ${url}. This may be caused by:
        
        1. The API container might not be running
        2. CORS settings might be blocking your request
        3. The container may not be properly exposing port ${port}
        4. Network connectivity issues between containers
        
        Check your Docker configuration and ensure the server is running. Common commands:
        
        - Check logs: docker-compose logs app
        - Check containers: docker-compose ps
        - Check running containers: docker ps
        - Try restarting: docker-compose restart app
        - Try rebuilding: docker-compose build app && docker-compose up -d
        
        If you've just started the Docker containers, please wait a moment as the server may still be initializing.`,
        error
      );
    }
    
    return new ConnectionError(
      `Connection to API failed. Please check your network connection. URL: ${url}`,
      error
    );
  }
  
  // Otherwise, just return the original error
  return error instanceof Error 
    ? error 
    : new Error(String(error));
}
