import React from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { isDockerEnvironment } from '@/lib/config';
import { ConnectionError } from '@/lib/api-error';

interface DockerConnectionErrorProps {
  error: Error | null;
}

export function DockerConnectionError({ error }: DockerConnectionErrorProps) {
  // Only show this error component in Docker environment and when there's a connection error
  if (!error || !isDockerEnvironment() || !(error instanceof ConnectionError)) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>Docker Network Configuration Error</AlertTitle>
      <AlertDescription>
        <p className="mb-2">
          There appears to be a network configuration issue with your Docker environment.
          The application is running at {window.location.origin} but cannot connect to the API.
        </p>
        <p className="mb-2">
          Please check:
        </p>
        <ul className="list-disc list-inside mb-2">
          <li>The Docker container is exposing port 5000 correctly</li>
          <li>The app can make network requests to its own API services</li>
          <li>No network security settings are blocking the connection</li>
        </ul>
        <p className="text-sm font-mono">{error.message}</p>
      </AlertDescription>
    </Alert>
  );
}