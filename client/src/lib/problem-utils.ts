import { type ProblemButton } from '@shared/schema';
import { toast } from '@/hooks/use-toast';
import type { UseMutationResult } from '@tanstack/react-query';

// Check if icon is "none" or null/undefined
export function isNoIcon(icon: string | null | undefined): boolean {
  return !icon || icon === "none";
}

// Process button data before sending to API (convert "none" to null)
export function processButtonData<T extends { icon?: string | null }>(data: T): T {
  return {
    ...data,
    icon: data.icon === "none" ? null : data.icon
  };
}

// Default form values for button forms
export const defaultButtonFormValues = {
  label: "",
  color: "#6b7280",
  icon: "none",
  active: true,
};

// Standard error handler for mutations
export function handleMutationError(error: Error, title = "Error") {
  toast({
    title,
    description: error.message || "An unexpected error occurred",
    variant: "destructive",
  });
}

// Standard success handler for mutations
export function handleMutationSuccess(message: string, title = "Success") {
  toast({
    title,
    description: message,
  });
}

// Type for button form data
export type ButtonFormData = {
  label: string;
  color: string;
  icon?: string;
  active: boolean;
};