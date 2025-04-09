import React from 'react';

interface SkeletonLoaderProps {
  title?: boolean;
  titleWidth?: string;
  contentHeight?: string;
  className?: string;
}

export function SkeletonLoader({ 
  title = true, 
  titleWidth = "w-1/4", 
  contentHeight = "h-64",
  className = ""
}: SkeletonLoaderProps) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      {title && <div className={`h-8 ${titleWidth} bg-muted rounded`}></div>}
      <div className={`${contentHeight} bg-muted rounded`}></div>
    </div>
  );
}