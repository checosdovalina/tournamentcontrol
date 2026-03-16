import { createContext, useContext, useEffect, useState } from "react";

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  preview: string[];
  vars: {
    "--primary": string;
    "--primary-foreground": string;
    "--secondary": string;
    "--secondary-foreground": string;
    "--accent": string;
    "--accent-foreground": string;
    "--ring": string;
  };
}

export const THEMES: AppTheme[] = [
  {
    id: "courtflow",
    name: "CourtFlow",
    description: "Azul y naranja – el tema original",
    preview: ["hsl(215,75%,45%)", "hsl(180,65%,45%)", "hsl(25,95%,55%)"],
    vars: {
      "--primary": "hsl(215, 75%, 45%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(180, 65%, 45%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(25, 95%, 55%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(215, 75%, 45%)",
    },
  },
  {
    id: "oceano",
    name: "Océano",
    description: "Azul marino y cian profundo",
    preview: ["hsl(210,100%,30%)", "hsl(190,90%,40%)", "hsl(45,100%,55%)"],
    vars: {
      "--primary": "hsl(210, 100%, 30%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(190, 90%, 40%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(45, 100%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(210, 100%, 30%)",
    },
  },
  {
    id: "bosque",
    name: "Bosque",
    description: "Verde esmeralda y ámbar",
    preview: ["hsl(145,65%,32%)", "hsl(158,55%,45%)", "hsl(38,95%,55%)"],
    vars: {
      "--primary": "hsl(145, 65%, 32%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(158, 55%, 45%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(38, 95%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(145, 65%, 32%)",
    },
  },
  {
    id: "fuego",
    name: "Fuego",
    description: "Rojo intenso y naranja brillante",
    preview: ["hsl(0,80%,45%)", "hsl(22,90%,50%)", "hsl(50,100%,55%)"],
    vars: {
      "--primary": "hsl(0, 80%, 45%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(22, 90%, 50%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(50, 100%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(0, 80%, 45%)",
    },
  },
  {
    id: "violeta",
    name: "Violeta",
    description: "Púrpura elegante y magenta",
    preview: ["hsl(270,65%,45%)", "hsl(290,60%,50%)", "hsl(330,85%,60%)"],
    vars: {
      "--primary": "hsl(270, 65%, 45%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(290, 60%, 50%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(330, 85%, 60%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(270, 65%, 45%)",
    },
  },
  {
    id: "grafito",
    name: "Grafito",
    description: "Gris pizarra moderno y minimalista",
    preview: ["hsl(220,15%,30%)", "hsl(220,10%,50%)", "hsl(215,75%,55%)"],
    vars: {
      "--primary": "hsl(220, 15%, 30%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(220, 10%, 50%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(215, 75%, 55%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(215, 75%, 55%)",
    },
  },
  {
    id: "coral",
    name: "Coral",
    description: "Rosa cálido y fucsia vibrante",
    preview: ["hsl(355,75%,55%)", "hsl(330,70%,55%)", "hsl(280,65%,55%)"],
    vars: {
      "--primary": "hsl(355, 75%, 55%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(330, 70%, 55%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(280, 65%, 55%)",
      "--accent-foreground": "hsl(0, 0%, 100%)",
      "--ring": "hsl(355, 75%, 55%)",
    },
  },
  {
    id: "jade",
    name: "Jade",
    description: "Verde jade y turquesa fresco",
    preview: ["hsl(168,65%,38%)", "hsl(185,75%,42%)", "hsl(32,90%,55%)"],
    vars: {
      "--primary": "hsl(168, 65%, 38%)",
      "--primary-foreground": "hsl(0, 0%, 100%)",
      "--secondary": "hsl(185, 75%, 42%)",
      "--secondary-foreground": "hsl(0, 0%, 100%)",
      "--accent": "hsl(32, 90%, 55%)",
      "--accent-foreground": "hsl(215, 25%, 15%)",
      "--ring": "hsl(168, 65%, 38%)",
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
