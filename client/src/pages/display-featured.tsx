import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useKeepAwake } from "@/hooks/use-keep-awake";
import { useWebSocket } from "@/hooks/use-websocket";
import { ChevronDown, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";
import courtflowLogoNew from "@assets/_LogosCOURTFLOW  sin fondo_1760480356184.png";

function PlayerAvatar({ name, photoUrl, size = 120 }: { name: string; photoUrl?: string | null; size?: number }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover border-4 border-white/30 shadow-2xl"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center border-4 border-white/30 shadow-2xl font-bold text-white bg-white/20"
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

function ScoreBoard({ sets }: { sets: [number, number][] }) {
  if (!sets || sets.length === 0) {
    return (
      <div className="text-center">
        <p className="text-white/50 text-lg">Sin sets jugados</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {sets.map(([s1, s2], i) => (
        <div key={i} className="flex items-center gap-4">
          <span className={`text-4xl font-black w-16 text-right ${s1 > s2 ? "text-white" : "text-white/50"}`}>
            {s1}
          </span>
          <span className="text-white/40 text-2xl font-bold">–</span>
          <span className={`text-4xl font-black w-16 text-left ${s2 > s1 ? "text-white" : "text-white/50"}`}>
            {s2}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DisplayFeatured() {
  useKeepAwake();
  useWebSocket();

  const [, setLocation] = useLocation();
  const [, params] = useRoute("/display-featured/:tournamentId");
  const tournamentId = params?.tournamentId;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [autoMatchIndex, setAutoMatchIndex] = useState(0);
  const [pinnedMatchId, setPinnedMatchId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Close selector when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: tournament } = useQuery<{
    id: string;
    name: string;
    tournamentLogoUrl?: string;
    clubLogoUrl?: string;
    systemLogoUrl?: string;
    sponsorRotationEnabled?: boolean;
    sponsorRotationSpeed?: number;
    config?: { displayColors?: { primaryColor?: string; secondaryColor?: string; accentColor?: string; textColor?: string } };
  }>({
    queryKey: [`/api/tournaments/${tournamentId}/public`],
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 1000,
    staleTime: 0,
  });

  const { data: banners = [] } = useQuery<any[]>({
    queryKey: ["/api/banners", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 60000,
  });

  const activeBanners = (banners as any[])
    .filter((b: any) => b.isActive)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Auto-rotate when no match is pinned
  useEffect(() => {
    if (pinnedMatchId || currentMatches.length <= 1) return;
    const t = setInterval(() => {
      setAutoMatchIndex((prev) => (prev + 1) % currentMatches.length);
    }, 30000);
    return () => clearInterval(t);
  }, [pinnedMatchId, currentMatches.length]);

  // Clear pin if the pinned match is no longer active
  useEffect(() => {
    if (pinnedMatchId && currentMatches.length > 0) {
      const stillActive = currentMatches.some((m) => m.id === pinnedMatchId);
      if (!stillActive) setPinnedMatchId(null);
    }
  }, [currentMatches, pinnedMatchId]);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    adTimerRef.current = setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => { if (adTimerRef.current) clearTimeout(adTimerRef.current); };
  }, [currentAdIndex, activeBanners.length]);

  const displayColors = tournament?.config?.displayColors;
  const bgStyle = displayColors
    ? { background: `linear-gradient(135deg, ${displayColors.primaryColor || "#1e3a8a"} 0%, ${displayColors.secondaryColor || "#0f766e"} 100%)` }
    : { background: "linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)" };
  const accentColor = displayColors?.accentColor || "#f97316";

  // Resolve which match to show
  const match = pinnedMatchId
    ? currentMatches.find((m) => m.id === pinnedMatchId) ?? currentMatches[0]
    : currentMatches[autoMatchIndex % Math.max(currentMatches.length, 1)];

  const timeStr = currentTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const matchLabel = (m: any) =>
    `${m.pair1?.player1?.name?.split(" ")[0] ?? "?"} / ${m.pair1?.player2?.name?.split(" ")[0] ?? "?"} vs ${m.pair2?.player1?.name?.split(" ")[0] ?? "?"} / ${m.pair2?.player2?.name?.split(" ")[0] ?? "?"} — ${m.court?.name ?? ""}`;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden select-none" style={bgStyle}>
      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-white/20 flex-shrink-0">
        <div className="flex items-center space-x-4">
          {tournament?.tournamentLogoUrl ? (
            <img src={tournament.tournamentLogoUrl} alt="Logo Torneo" className="h-16 w-auto object-contain" />
          ) : (
            <img src={courtflowLogo} alt="CourtFlow" className="h-16 w-auto" />
          )}
          <div className="text-white">
            <h1 className="text-2xl font-bold">CourtFlow</h1>
            <p className="text-lg">{tournament?.name || "Torneo Pádel"}</p>
          </div>
        </div>

        {(tournament?.clubLogoUrl || tournament?.systemLogoUrl) && (
          <div className="flex items-center space-x-4">
            {tournament?.clubLogoUrl && (
              <img src={tournament.clubLogoUrl} alt="Logo Club" className="h-32 w-auto object-contain" />
            )}
            {tournament?.systemLogoUrl && (
              <img src={tournament.systemLogoUrl} alt="Logo Sistema" className="h-16 w-auto object-contain" />
            )}
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* Match selector */}
          {currentMatches.length > 0 && (
            <div className="relative mr-2" ref={selectorRef}>
              <button
                onClick={() => setSelectorOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
                data-testid="button-match-selector"
              >
                {pinnedMatchId ? "Partido fijado" : "Auto"}
                <ChevronDown className="w-4 h-4" />
              </button>

              {selectorOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Seleccionar partido</p>
                  </div>
                  <button
                    onClick={() => { setPinnedMatchId(null); setSelectorOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors ${!pinnedMatchId ? "bg-white/10" : ""}`}
                  >
                    <RotateCcw className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">Automático</p>
                      <p className="text-white/50 text-xs">Rota entre todos los partidos en curso</p>
                    </div>
                    {!pinnedMatchId && (
                      <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                    )}
                  </button>
                  {currentMatches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setPinnedMatchId(m.id); setSelectorOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors border-t border-white/5 ${pinnedMatchId === m.id ? "bg-white/10" : ""}`}
                      data-testid={`option-match-${m.id}`}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0 flex items-center justify-center">
                        {pinnedMatchId === m.id && (
                          <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {m.pair1?.player1?.name?.split(" ")[0]} / {m.pair1?.player2?.name?.split(" ")[0]}
                        </p>
                        <p className="text-white text-sm font-medium truncate">
                          vs {m.pair2?.player1?.name?.split(" ")[0]} / {m.pair2?.player2?.name?.split(" ")[0]}
                        </p>
                        <p className="text-white/50 text-xs mt-0.5">{m.court?.name} — {m.category?.name || "Sin categoría"}</p>
                      </div>
                      {pinnedMatchId === m.id && (
                        <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-right text-white">
            <div className="flex items-center justify-end space-x-2 mb-1">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">EN VIVO</span>
              </div>
            </div>
            <p className="text-4xl font-bold font-mono">{timeStr}</p>
            <p className="text-sm text-white/80">
              {currentTime.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <img src={courtflowLogoNew} alt="CourtFlow" className="h-20 w-auto object-contain ml-2" />
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white text-xl ml-2"
            data-testid="button-close-display-featured"
          >
            <X />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-4">
        {!match ? (
          <div className="text-center">
            <div className="text-8xl mb-6">🎾</div>
            <h2 className="text-white text-3xl font-bold mb-2">No hay partido en curso</h2>
            <p className="text-white/50 text-lg">Esperando el inicio del próximo partido...</p>
          </div>
        ) : (
          <div className="w-full max-w-6xl">
            {match.category?.name && (
              <div className="text-center mb-6">
                <span
                  className="inline-block px-6 py-2 rounded-full text-white font-bold text-lg tracking-wider uppercase"
                  style={{ background: accentColor }}
                >
                  {match.category.name}
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6 items-center">
              {/* Pair 1 */}
              <div className="flex flex-col items-center gap-5">
                {[match.pair1?.player1, match.pair1?.player2].map((player, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <PlayerAvatar name={player?.name || ""} photoUrl={player?.photoUrl} size={130} />
                    <p className="text-white font-bold text-lg text-center leading-tight max-w-xs">
                      {player?.name || `Jugador ${idx + 1}`}
                    </p>
                    {idx === 0 && <div className="w-px h-4 bg-white/20" />}
                  </div>
                ))}
              </div>

              {/* Score */}
              <div className="flex flex-col items-center gap-6">
                <div className="text-white/40 text-xl font-bold tracking-widest">VS</div>
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-8 py-6 min-w-[200px]">
                  <ScoreBoard sets={match.score?.sets || []} />
                </div>
                <div className="text-white/50 text-sm font-medium tracking-wide">{match.court?.name || ""}</div>
              </div>

              {/* Pair 2 */}
              <div className="flex flex-col items-center gap-5">
                {[match.pair2?.player1, match.pair2?.player2].map((player, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-3">
                    <PlayerAvatar name={player?.name || ""} photoUrl={player?.photoUrl} size={130} />
                    <p className="text-white font-bold text-lg text-center leading-tight max-w-xs">
                      {player?.name || `Jugador ${idx + 3}`}
                    </p>
                    {idx === 0 && <div className="w-px h-4 bg-white/20" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Sponsors - Auto Scrolling Marquee */}
      <div className="px-8 py-3 border-t border-white/20 bg-white/5 overflow-hidden flex-shrink-0">
        <div className="flex items-center justify-center">
          <div className="flex-1 overflow-hidden">
            {activeBanners.length > 0 ? (
              <div className="relative w-full overflow-hidden">
                <div
                  className="inline-flex w-max gap-8"
                  style={{
                    animation: tournament?.sponsorRotationEnabled !== false
                      ? `marquee ${tournament?.sponsorRotationSpeed ?? 20}s linear infinite`
                      : "none",
                  }}
                >
                  {[...activeBanners, ...activeBanners, ...activeBanners].map((banner: any, idx: number) => (
                    <div key={`sponsor-${banner.id}-${idx}`} className="h-10 flex items-center flex-shrink-0">
                      <img
                        src={banner.imageUrl}
                        alt={banner.sponsorName}
                        className="h-full w-auto object-contain"
                        title={banner.sponsorName}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-8">
                <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 1</div>
                <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 2</div>
                <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 3</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
