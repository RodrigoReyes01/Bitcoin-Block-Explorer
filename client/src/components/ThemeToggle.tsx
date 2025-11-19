import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="rounded-lg"
      title={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
    >
      {theme === "light" ? (
        <Moon className="w-5 h-5 text-slate-600" />
      ) : (
        <Sun className="w-5 h-5 text-slate-300" />
      )}
    </Button>
  );
}
