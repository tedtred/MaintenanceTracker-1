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
