import React from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { DockerConnectionError } from './docker-connection-error';
import { ConnectionError } from '@/lib/api-error';

// Helper component to handle Docker connection error display
function DockerConnectionErrorWrapper({ errors }: { errors: (Error | null)[] }) {
  // Find the first connection error to display
  const connectionError = errors.find(
    err => err && err instanceof ConnectionError
  ) as ConnectionError | undefined;
  
  return <DockerConnectionError error={connectionError || null} />;
}

interface DataLoaderProps<T> {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: T | undefined;
  children: (data: T) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error | null) => React.ReactNode;
}

/**
 * A generic component that handles the loading, error, and success states
 * of data queries in a consistent manner across the application.
 */
export function DataLoader<T>({
  isLoading,
  isError,
  error,
  data,
  children,
  loadingComponent,
  errorComponent,
}: DataLoaderProps<T>): React.ReactElement {
  if (isLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return errorComponent ? (
      <>{errorComponent(error)}</>
    ) : (
      <div className="flex flex-col h-[50vh] items-center justify-center">
        {/* Display Docker connection error if relevant */}
        {error && error.name === 'ConnectionError' && (
          <div className="w-full max-w-3xl mb-4">
            <DockerConnectionError error={error instanceof ConnectionError ? error : null} />
          </div>
        )}
        <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Data</h3>
          <p>{error?.message || "An unexpected error occurred"}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="bg-muted p-4 rounded-md max-w-md">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return <>{children(data)}</>;
}

/**
 * A wrapper to handle multiple queries at once
 */
interface MultiQueryLoaderProps {
  queries: UseQueryResult<any, Error>[];
  children: React.ReactNode | (() => React.ReactNode);
  loadingComponent?: React.ReactNode;
  errorComponent?: (errors: (Error | null)[]) => React.ReactNode;
}

export function MultiQueryLoader({
  queries,
  children,
  loadingComponent,
  errorComponent,
}: MultiQueryLoaderProps): React.ReactElement {
  const isLoading = queries.some(query => query.isLoading);
  const isError = queries.some(query => query.isError);
  const errors = queries.map(query => query.error);
  
  if (isLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return errorComponent ? (
      <>{errorComponent(errors)}</>
    ) : (
      <div className="flex flex-col h-[50vh] items-center justify-center">
        {/* Display Docker connection error if relevant */}
        {errors.some(err => err && err.name === 'ConnectionError') && (
          <div className="w-full max-w-3xl mb-4">
            <DockerConnectionError 
              error={errors.find(err => err && err instanceof ConnectionError) || null} 
            />
          </div>
        )}
        <div className="bg-destructive/10 text-destructive p-4 rounded-md max-w-md">
          <h3 className="font-semibold mb-2">Error Loading Data</h3>
          <ul className="list-disc pl-4">
            {errors.filter(Boolean).map((error, index) => (
              <li key={index}>{error?.message}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return typeof children === 'function' ? <>{children()}</> : <>{children}</>;
}