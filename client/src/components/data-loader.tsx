import React from "react";
import { UseQueryResult } from "@tanstack/react-query";

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
      <div className="flex h-[50vh] items-center justify-center">
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
  children: React.ReactNode;
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
      <div className="flex h-[50vh] items-center justify-center">
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

  return <>{children}</>;
}