import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        console.log('Setting theme to:', theme); // Debug log
        set({ theme });
        document.documentElement.setAttribute("data-theme", theme);
        // Force a style recalculation
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(theme);
      },
    }),
    {
      name: "theme-storage",
    }
  )
);

// Initialize theme from stored value
if (typeof window !== "undefined") {
  const theme = useTheme.getState().theme;
  console.log('Initializing theme to:', theme); // Debug log
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}