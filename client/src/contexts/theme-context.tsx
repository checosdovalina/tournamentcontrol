import { createContext, useContext, useEffect, useState } from "react";

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  preview: string[];      // [primary, secondary, accent]
  bgPreview: string;      // background swatch color for selector
  vars: {
    "--primary": string;
    "--primary-foreground": string;
    "--secondary": string;
    "--secondary-foreground": string;
    "--accent": string;
    "--accent-foreground": string;
    "--ring": string;
    "--background": string;
    "--foreground": string;
    "--card": string;
    "--card-foreground": string;
    "--muted": string;
    "--muted-foreground": string;
    "--border": string;
    "--input": string;
    "--popover": string;
    "--popover-foreground": string;
  };
}

export const THEMES: AppTheme[] = [
  {
    id: "courtflow",
    name: "CourtFlow",
    description: "Azul y naranja – el tema original",
    preview: ["hsl(215,75%,45%)", "hsl(180,65%,45%)", "hsl(25,95%,55%)"],
    bgPreview: "hsl(210,20%,98%)",
    vars: {
      "--primary": "hsl(215, 75%, 45%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(180, 65%, 45%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(25, 95%, 55%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(215, 75%, 45%)",
      "--background": "hsl(210, 20%, 98%)",
      "--foreground": "hsl(215, 25%, 15%)",
      "--card": "hsl(0, 0%, 100%)",
      "--card-foreground": "hsl(215, 25%, 15%)",
      "--muted": "hsl(210, 20%, 96%)",
      "--muted-foreground": "hsl(215, 15%, 45%)",
      "--border": "hsl(215, 20%, 88%)",
      "--input": "hsl(215, 20%, 88%)",
      "--popover": "hsl(0, 0%, 100%)",
      "--popover-foreground": "hsl(215, 25%, 15%)",
    },
  },
  {
    id: "oceano",
    name: "Océano",
    description: "Azul marino y cian profundo",
    preview: ["hsl(210,100%,30%)", "hsl(190,90%,40%)", "hsl(45,100%,55%)"],
    bgPreview: "hsl(210,35%,96%)",
    vars: {
      "--primary": "hsl(210, 100%, 30%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(190, 90%, 40%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(45, 100%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(210, 100%, 30%)",
      "--background": "hsl(210, 35%, 96%)",
      "--foreground": "hsl(210, 40%, 12%)",
      "--card": "hsl(205, 40%, 99%)",
      "--card-foreground": "hsl(210, 40%, 12%)",
      "--muted": "hsl(210, 30%, 92%)",
      "--muted-foreground": "hsl(210, 20%, 40%)",
      "--border": "hsl(210, 30%, 85%)",
      "--input": "hsl(210, 30%, 85%)",
      "--popover": "hsl(205, 40%, 99%)",
      "--popover-foreground": "hsl(210, 40%, 12%)",
    },
  },
  {
    id: "bosque",
    name: "Bosque",
    description: "Verde esmeralda y ámbar natural",
    preview: ["hsl(145,65%,32%)", "hsl(158,55%,45%)", "hsl(38,95%,55%)"],
    bgPreview: "hsl(140,25%,96%)",
    vars: {
      "--primary": "hsl(145, 65%, 32%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(158, 55%, 45%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(38, 95%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(145, 65%, 32%)",
      "--background": "hsl(140, 25%, 96%)",
      "--foreground": "hsl(145, 30%, 12%)",
      "--card": "hsl(135, 30%, 99%)",
      "--card-foreground": "hsl(145, 30%, 12%)",
      "--muted": "hsl(140, 20%, 92%)",
      "--muted-foreground": "hsl(145, 15%, 40%)",
      "--border": "hsl(140, 20%, 85%)",
      "--input": "hsl(140, 20%, 85%)",
      "--popover": "hsl(135, 30%, 99%)",
      "--popover-foreground": "hsl(145, 30%, 12%)",
    },
  },
  {
    id: "fuego",
    name: "Fuego",
    description: "Rojo intenso y naranja brillante",
    preview: ["hsl(0,80%,45%)", "hsl(22,90%,50%)", "hsl(50,100%,55%)"],
    bgPreview: "hsl(20,30%,97%)",
    vars: {
      "--primary": "hsl(0, 80%, 45%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(22, 90%, 50%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(50, 100%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(0, 80%, 45%)",
      "--background": "hsl(20, 30%, 97%)",
      "--foreground": "hsl(10, 35%, 12%)",
      "--card": "hsl(20, 40%, 100%)",
      "--card-foreground": "hsl(10, 35%, 12%)",
      "--muted": "hsl(20, 25%, 93%)",
      "--muted-foreground": "hsl(15, 20%, 42%)",
      "--border": "hsl(20, 25%, 86%)",
      "--input": "hsl(20, 25%, 86%)",
      "--popover": "hsl(20, 40%, 100%)",
      "--popover-foreground": "hsl(10, 35%, 12%)",
    },
  },
  {
    id: "violeta",
    name: "Violeta",
    description: "Púrpura elegante y magenta vibrante",
    preview: ["hsl(270,65%,45%)", "hsl(290,60%,50%)", "hsl(330,85%,60%)"],
    bgPreview: "hsl(270,25%,97%)",
    vars: {
      "--primary": "hsl(270, 65%, 45%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(290, 60%, 50%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(330, 85%, 60%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(270, 65%, 45%)",
      "--background": "hsl(270, 25%, 97%)",
      "--foreground": "hsl(270, 30%, 12%)",
      "--card": "hsl(265, 30%, 100%)",
      "--card-foreground": "hsl(270, 30%, 12%)",
      "--muted": "hsl(270, 20%, 93%)",
      "--muted-foreground": "hsl(270, 15%, 42%)",
      "--border": "hsl(270, 20%, 86%)",
      "--input": "hsl(270, 20%, 86%)",
      "--popover": "hsl(265, 30%, 100%)",
      "--popover-foreground": "hsl(270, 30%, 12%)",
    },
  },
  {
    id: "grafito",
    name: "Grafito",
    description: "Gris pizarra moderno y minimalista",
    preview: ["hsl(220,15%,30%)", "hsl(220,10%,50%)", "hsl(215,75%,55%)"],
    bgPreview: "hsl(220,15%,96%)",
    vars: {
      "--primary": "hsl(220, 15%, 30%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(220, 10%, 50%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(215, 75%, 55%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(215, 75%, 55%)",
      "--background": "hsl(220, 15%, 96%)",
      "--foreground": "hsl(220, 20%, 12%)",
      "--card": "hsl(220, 20%, 100%)",
      "--card-foreground": "hsl(220, 20%, 12%)",
      "--muted": "hsl(220, 12%, 92%)",
      "--muted-foreground": "hsl(220, 10%, 42%)",
      "--border": "hsl(220, 12%, 86%)",
      "--input": "hsl(220, 12%, 86%)",
      "--popover": "hsl(220, 20%, 100%)",
      "--popover-foreground": "hsl(220, 20%, 12%)",
    },
  },
  {
    id: "coral",
    name: "Coral",
    description: "Rosa cálido y fucsia vibrante",
    preview: ["hsl(355,75%,55%)", "hsl(330,70%,55%)", "hsl(280,65%,55%)"],
    bgPreview: "hsl(350,30%,97%)",
    vars: {
      "--primary": "hsl(355, 75%, 55%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(330, 70%, 55%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(280, 65%, 55%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(355, 75%, 55%)",
      "--background": "hsl(350, 30%, 97%)",
      "--foreground": "hsl(350, 30%, 12%)",
      "--card": "hsl(345, 35%, 100%)",
      "--card-foreground": "hsl(350, 30%, 12%)",
      "--muted": "hsl(350, 22%, 93%)",
      "--muted-foreground": "hsl(350, 15%, 42%)",
      "--border": "hsl(350, 22%, 87%)",
      "--input": "hsl(350, 22%, 87%)",
      "--popover": "hsl(345, 35%, 100%)",
      "--popover-foreground": "hsl(350, 30%, 12%)",
    },
  },
  {
    id: "jade",
    name: "Jade",
    description: "Verde jade y turquesa fresco",
    preview: ["hsl(168,65%,38%)", "hsl(185,75%,42%)", "hsl(32,90%,55%)"],
    bgPreview: "hsl(168,25%,96%)",
    vars: {
      "--primary": "hsl(168, 65%, 38%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(185, 75%, 42%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(32, 90%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(168, 65%, 38%)",
      "--background": "hsl(168, 25%, 96%)",
      "--foreground": "hsl(168, 30%, 12%)",
      "--card": "hsl(165, 30%, 100%)",
      "--card-foreground": "hsl(168, 30%, 12%)",
      "--muted": "hsl(168, 20%, 92%)",
      "--muted-foreground": "hsl(168, 15%, 40%)",
      "--border": "hsl(168, 20%, 85%)",
      "--input": "hsl(168, 20%, 85%)",
      "--popover": "hsl(165, 30%, 100%)",
      "--popover-foreground": "hsl(168, 30%, 12%)",
    },
  },
];

interface ThemeContextValue {
  currentTheme: AppTheme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: THEMES[0],
  setTheme: () => {},
});

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem("courtflow-theme");
    return THEMES.find((t) => t.id === saved) ?? THEMES[0];
  });

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    setCurrentTheme(theme);
    localStorage.setItem("courtflow-theme", themeId);
    applyTheme(theme);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
