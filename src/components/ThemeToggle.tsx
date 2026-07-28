import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "theme";

function getInitial(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = getInitial();
    setTheme(t);
    document.documentElement.classList.toggle("dark", t === "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      className="grid size-9 place-items-center rounded-xl bg-card text-foreground shadow-sm transition hover:bg-primary/10"
    >
      {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}