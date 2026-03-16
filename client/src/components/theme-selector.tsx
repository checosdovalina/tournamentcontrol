import { Palette, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme, THEMES } from "@/contexts/theme-context";
import { useState } from "react";

export function ThemeSelector() {
  const { currentTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-9 px-3"
          data-testid="button-open-theme-selector"
          title="Selector de tema"
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">Tema</span>
          {/* Current theme mini swatch */}
          <div className="flex gap-0.5 ml-1">
            {currentTheme.preview.map((color, i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-4"
        align="end"
        data-testid="popover-theme-selector"
      >
        <div className="mb-3">
          <h3 className="font-semibold text-sm">Seleccionar tema</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Elige una paleta de colores para la interfaz
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((theme) => {
            const isActive = theme.id === currentTheme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  setOpen(false);
                }}
                data-testid={`button-theme-${theme.id}`}
                className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition-all hover:bg-muted/50 ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {/* Color swatches */}
                <div className="flex gap-1.5 w-full">
                  {theme.preview.map((color, i) => (
                    <div
                      key={i}
                      className={`h-5 rounded-md flex-1 ${i === 0 ? "flex-[2]" : "flex-1"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Name + description */}
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{theme.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                    {theme.description}
                  </p>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
