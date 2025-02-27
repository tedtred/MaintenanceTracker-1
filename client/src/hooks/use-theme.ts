import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "twilight";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute("data-theme", theme);
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
  document.documentElement.setAttribute("data-theme", theme);
}