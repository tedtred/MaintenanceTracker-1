import { type Express } from "express";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Check if we're running in Replit
export const isReplit = !!process.env.REPL_ID || !!process.env.REPL_SLUG;

// Check if we're running in Docker
export const isDocker = !!process.env.IS_DOCKER || !!process.env.DOCKER_ENV || !!process.env.RUNNING_IN_DOCKER;

// Production mode is when NODE_ENV is production AND we're not in Replit
export const isProduction = process.env.NODE_ENV === "production" && !isReplit;
