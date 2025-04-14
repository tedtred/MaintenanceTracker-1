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
  
  // Format connection errors specially for Docker environment
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    const hostname = window.location.hostname;
    
    // Special message for the Docker environment
    if (hostname === '192.168.0.122') {
      return new ConnectionError(
        `Connection to API failed. Check that the Docker container is exposing port 5000 correctly. URL: ${url}`,
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
