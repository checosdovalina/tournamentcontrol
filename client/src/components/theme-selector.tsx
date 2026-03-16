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
        className="w-96 p-4"
        align="end"
        data-testid="popover-theme-selector"
      >
        <div className="mb-3">
          <h3 className="font-semibold text-sm">Seleccionar tema</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Colores de interfaz y fondo de la aplicación
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
                className={`relative flex flex-col gap-2 rounded-xl border-2 p-0 text-left overflow-hidden transition-all hover:scale-[1.02] ${
                  isActive
                    ? "border-primary shadow-md shadow-primary/20"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {/* Background preview panel */}
                <div
                  className="w-full h-14 flex items-end px-2 pb-1.5 gap-1"
                  style={{ backgroundColor: theme.bgPreview }}
                >
                  {/* Simulated card */}
                  <div
                    className="flex-1 h-8 rounded-t-md flex items-center px-1.5 gap-1"
                    style={{ backgroundColor: theme.vars["--card"], border: `1px solid ${theme.vars["--border"]}` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: theme.vars["--primary"] }}
                    />
                    <div
                      className="h-1.5 rounded-full flex-1"
                      style={{ backgroundColor: theme.vars["--muted"] }}
                    />
                  </div>
                  {/* Primary button */}
                  <div
                    className="h-8 w-8 rounded-t-md flex items-center justify-center"
                    style={{ backgroundColor: theme.vars["--primary"] }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white/80" />
                  </div>
                </div>

                {/* Color swatches + name */}
                <div className="px-2.5 pb-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold leading-tight">{theme.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                      {theme.description}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {theme.preview.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full border border-white/50 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Active checkmark */}
                {isActive && (
                  <div
                    className="absolute top-1.5 right-1.5 rounded-full w-5 h-5 flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: theme.vars["--primary"] }}
                  >
                    <Check className="w-3 h-3 text-white" />
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
