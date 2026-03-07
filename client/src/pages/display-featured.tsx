import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useKeepAwake } from "@/hooks/use-keep-awake";
import { useWebSocket } from "@/hooks/use-websocket";
import { ChevronDown, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";
import courtflowLogoNew from "@assets/_LogosCOURTFLOW  sin fondo_1760480356184.png";

function formatPlayerName(name: string) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return name.toUpperCase();
  const initial = parts[0][0].toUpperCase() + ".";
  const last = parts.slice(1).join(" ").toUpperCase();
  return `${initial} ${last}`;
}

function PlayerCutout({
  name,
  photoUrl,
  align,
}: {
  name: string;
  photoUrl?: string | null;
  align: "left" | "right";
}) {
  const initials = name
    ? name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";
  const displayName = formatPlayerName(name);

  return (
    <div className={`flex flex-col items-center gap-2 h-full justify-end`}>
      <div className="relative flex-1 w-full flex items-start justify-center overflow-hidden pt-2">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-full w-auto max-w-full object-contain object-top drop-shadow-2xl"
            style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.7))" }}
          />
        ) : (
          <div
            className="flex items-center justify-center rounded-full bg-white/10 border-4 border-white/20 mt-8"
            style={{ width: 180, height: 180 }}
          >
            <span className="text-white/60 text-6xl font-black">{initials}</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
      </div>
      <p
        className={`text-white font-bold tracking-widest text-xl uppercase pb-3 text-center leading-tight`}
        style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
      >
        {displayName || `Jugador`}
      </p>
    </div>
  );
}

function ScoreBoard({ sets }: { sets: [number, number][] }) {
  if (!sets || sets.length === 0) {
    return <p className="text-white/40 text-lg">Sin sets</p>;
  }
  return (
    <div className="flex flex-col items-center gap-2">
      {sets.map(([s1, s2], i) => (
        <div key={i} className="flex items-center gap-4">
          <span className={`text-6xl font-black w-16 text-right tabular-nums ${s1 > s2 ? "text-white" : "text-white/40"}`}>{s1}</span>
          <span className="text-white/30 text-2xl">–</span>
          <span className={`text-6xl font-black w-16 text-left tabular-nums ${s2 > s1 ? "text-white" : "text-white/40"}`}>{s2}</span>
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
  const [autoMatchIndex, setAutoMatchIndex] = useState(0);
  const [pinnedMatchId, setPinnedMatchId] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

  useEffect(() => {
    if (pinnedMatchId || currentMatches.length <= 1) return;
    const t = setInterval(() => {
      setAutoMatchIndex((prev) => (prev + 1) % currentMatches.length);
    }, 30000);
    return () => clearInterval(t);
  }, [pinnedMatchId, currentMatches.length]);

  useEffect(() => {
    if (pinnedMatchId && currentMatches.length > 0) {
      const stillActive = currentMatches.some((m) => m.id === pinnedMatchId);
      if (!stillActive) setPinnedMatchId(null);
    }
  }, [currentMatches, pinnedMatchId]);

  const displayColors = tournament?.config?.displayColors;
  const bgStyle = displayColors
    ? { background: `linear-gradient(135deg, ${displayColors.primaryColor || "#0f172a"} 0%, ${displayColors.secondaryColor || "#1e3a8a"} 100%)` }
    : { background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)" };
  const accentColor = displayColors?.accentColor || "#f97316";

  const match = pinnedMatchId
    ? currentMatches.find((m) => m.id === pinnedMatchId) ?? currentMatches[0]
    : currentMatches[autoMatchIndex % Math.max(currentMatches.length, 1)];

  const timeStr = currentTime.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  const p1 = match?.pair1?.player1;
  const p2 = match?.pair1?.player2;
  const p3 = match?.pair2?.player1;
  const p4 = match?.pair2?.player2;

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={bgStyle}>

      {/* Header */}
      <div className="px-8 py-3 flex items-center justify-between border-b border-white/10 flex-shrink-0 bg-black/20 backdrop-blur-sm relative z-10">
        <div className="flex items-center space-x-4">
          {tournament?.tournamentLogoUrl ? (
            <img src={tournament.tournamentLogoUrl} alt="Logo Torneo" className="h-14 w-auto object-contain" />
          ) : (
            <img src={courtflowLogo} alt="CourtFlow" className="h-14 w-auto" />
          )}
          <div className="text-white">
            <h1 className="text-xl font-bold leading-tight">{tournament?.name || "Torneo Pádel"}</h1>
            {match?.category?.name && (
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
                {match.category.name}
              </p>
            )}
          </div>
        </div>

        {(tournament?.clubLogoUrl || tournament?.systemLogoUrl) && (
          <div className="flex items-center space-x-4">
            {tournament?.clubLogoUrl && (
              <img src={tournament.clubLogoUrl} alt="Logo Club" className="h-20 w-auto object-contain" />
            )}
            {tournament?.systemLogoUrl && (
              <img src={tournament.systemLogoUrl} alt="Logo Sistema" className="h-14 w-auto object-contain" />
            )}
          </div>
        )}

        <div className="flex items-center space-x-3">
          {currentMatches.length > 0 && (
            <div className="relative" ref={selectorRef}>
              <button
                onClick={() => setSelectorOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                data-testid="button-match-selector"
              >
                {pinnedMatchId ? "Partido fijado" : "Auto"}
                <ChevronDown className="w-3.5 h-3.5" />
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
                    {!pinnedMatchId && <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />}
                  </button>
                  {currentMatches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setPinnedMatchId(m.id); setSelectorOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors border-t border-white/5 ${pinnedMatchId === m.id ? "bg-white/10" : ""}`}
                      data-testid={`option-match-${m.id}`}
                    >
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0 flex items-center justify-center">
                        {pinnedMatchId === m.id && <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />}
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
                      {pinnedMatchId === m.id && <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: accentColor }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="text-right text-white">
            <div className="flex items-center justify-end space-x-1.5 mb-0.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">EN VIVO</span>
            </div>
            <p className="text-3xl font-bold font-mono leading-none">{timeStr}</p>
          </div>
          <img src={courtflowLogoNew} alt="CourtFlow" className="h-16 w-auto object-contain" />
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white"
            data-testid="button-close-display-featured"
          >
            <X />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden relative">
        {!match ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-8xl mb-6">🎾</div>
            <h2 className="text-white text-3xl font-bold mb-2">No hay partido en curso</h2>
            <p className="text-white/50 text-lg">Esperando el inicio del próximo partido...</p>
          </div>
        ) : (
          <div className="h-full grid" style={{ gridTemplateColumns: "1fr 280px 1fr" }}>

            {/* Pair 1 — left side (2 players side by side) */}
            <div className="grid grid-cols-2 h-full overflow-hidden">
              <PlayerCutout name={p1?.name || "Jugador 1"} photoUrl={p1?.photoUrl} align="left" />
              <PlayerCutout name={p2?.name || "Jugador 2"} photoUrl={p2?.photoUrl} align="right" />
            </div>

            {/* Center divider */}
            <div className="flex flex-col items-center justify-center gap-5 px-4 relative">
              {/* Left vertical line */}
              <div className="absolute left-0 top-8 bottom-8 w-px bg-white/20" />
              {/* Right vertical line */}
              <div className="absolute right-0 top-8 bottom-8 w-px bg-white/20" />

              {/* Tournament logo */}
              {tournament?.tournamentLogoUrl ? (
                <img src={tournament.tournamentLogoUrl} alt="Torneo" className="w-32 h-auto object-contain" />
              ) : (
                <img src={courtflowLogoNew} alt="CourtFlow" className="w-28 h-auto object-contain opacity-80" />
              )}

              {/* VS */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="text-3xl font-black tracking-widest"
                  style={{ color: accentColor, textShadow: `0 0 30px ${accentColor}80` }}
                >
                  VS
                </div>
              </div>

              {/* Score */}
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-5 w-full">
                <ScoreBoard sets={match.score?.sets || []} />
              </div>

              {/* Court */}
              {match.court?.name && (
                <div className="text-center">
                  <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">Cancha</p>
                  <p className="text-white font-bold text-sm tracking-wide">{match.court.name}</p>
                </div>
              )}
            </div>

            {/* Pair 2 — right side (2 players side by side) */}
            <div className="grid grid-cols-2 h-full overflow-hidden">
              <PlayerCutout name={p3?.name || "Jugador 3"} photoUrl={p3?.photoUrl} align="left" />
              <PlayerCutout name={p4?.name || "Jugador 4"} photoUrl={p4?.photoUrl} align="right" />
            </div>
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      </div>

      {/* Sponsor banner */}
      <div className="px-8 py-3 border-t border-white/10 bg-black/30 overflow-hidden flex-shrink-0">
        <div className="flex items-center justify-center">
          <div className="flex-1 overflow-hidden">
            {activeBanners.length > 0 ? (
              <div className="relative w-full overflow-hidden">
                <div
                  className="inline-flex w-max gap-10"
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
                <div className="text-white/30 text-xs px-4 py-2 bg-white/5 rounded">PATROCINADOR</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
