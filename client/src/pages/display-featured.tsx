import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useKeepAwake } from "@/hooks/use-keep-awake";
import { useWebSocket } from "@/hooks/use-websocket";
import courtflowLogo from "@assets/_LogosCOURTFLOW  sin fondo_1760480356184.png";

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
          <span
            className={`text-4xl font-black w-16 text-right ${s1 > s2 ? "text-white" : "text-white/50"}`}
          >
            {s1}
          </span>
          <span className="text-white/40 text-2xl font-bold">–</span>
          <span
            className={`text-4xl font-black w-16 text-left ${s2 > s1 ? "text-white" : "text-white/50"}`}
          >
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

  const [, params] = useRoute("/display-featured/:tournamentId");
  const tournamentId = params?.tournamentId;
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const adTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: tournament } = useQuery<{
    id: string;
    name: string;
    tournamentLogoUrl?: string;
    clubLogoUrl?: string;
    systemLogoUrl?: string;
    timezone?: string;
    config?: {
      displayColors?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        textColor?: string;
      };
    };
  }>({
    queryKey: [`/api/tournaments/${tournamentId}/public`],
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: sponsors = [] } = useQuery<any[]>({
    queryKey: ["/api/banners", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const res = await fetch(`/api/banners/${tournamentId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  const activeSponsors = (sponsors as any[]).filter((s: any) => s.isActive !== false);

  useEffect(() => {
    if (currentMatches.length > 1) {
      const t = setInterval(() => {
        setMatchIndex((prev) => (prev + 1) % currentMatches.length);
      }, 30000);
      return () => clearInterval(t);
    }
  }, [currentMatches.length]);

  useEffect(() => {
    if (activeSponsors.length <= 1) return;
    adTimerRef.current = setTimeout(() => {
      setCurrentAdIndex((prev) => (prev + 1) % activeSponsors.length);
    }, 6000);
    return () => {
      if (adTimerRef.current) clearTimeout(adTimerRef.current);
    };
  }, [currentAdIndex, activeSponsors.length]);

  const displayColors = tournament?.config?.displayColors;
  const bgStyle = displayColors
    ? {
        background: `linear-gradient(135deg, ${displayColors.primaryColor || "#1e3a8a"} 0%, ${displayColors.secondaryColor || "#0f766e"} 100%)`,
      }
    : { background: "linear-gradient(135deg, #1e3a8a 0%, #0f766e 100%)" };

  const accentColor = displayColors?.accentColor || "#f97316";

  const match = currentMatches[matchIndex % Math.max(currentMatches.length, 1)];

  const timeStr = currentTime.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen flex flex-col overflow-hidden select-none" style={bgStyle}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          {tournament?.tournamentLogoUrl ? (
            <img src={tournament.tournamentLogoUrl} alt="Logo torneo" className="h-12 w-auto object-contain" />
          ) : (
            <img src={courtflowLogo} alt="CourtFlow" className="h-10 w-auto object-contain opacity-80" />
          )}
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">
              {tournament?.name || "Torneo"}
            </h1>
            {match && (
              <p className="text-white/60 text-sm">{match.court?.name || "Cancha"}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {currentMatches.length > 1 && (
            <div className="flex gap-1">
              {currentMatches.map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ background: i === matchIndex ? accentColor : "rgba(255,255,255,0.3)" }}
                />
              ))}
            </div>
          )}
          <span className="text-white/80 text-2xl font-mono font-semibold">{timeStr}</span>
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
            {/* Category */}
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

            {/* Players + Score layout */}
            <div className="grid grid-cols-3 gap-6 items-center">
              {/* Pair 1 */}
              <div className="flex flex-col items-center gap-5">
                <div className="flex flex-col items-center gap-3">
                  <PlayerAvatar
                    name={match.pair1?.player1?.name || ""}
                    photoUrl={match.pair1?.player1?.photoUrl}
                    size={130}
                  />
                  <p className="text-white font-bold text-lg text-center leading-tight max-w-xs">
                    {match.pair1?.player1?.name || "Jugador 1"}
                  </p>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex flex-col items-center gap-3">
                  <PlayerAvatar
                    name={match.pair1?.player2?.name || ""}
                    photoUrl={match.pair1?.player2?.photoUrl}
                    size={130}
                  />
                  <p className="text-white font-bold text-lg text-center leading-tight max-w-xs">
                    {match.pair1?.player2?.name || "Jugador 2"}
                  </p>
                </div>
              </div>

              {/* Score center */}
              <div className="flex flex-col items-center gap-6">
                <div className="text-white/40 text-xl font-bold tracking-widest">VS</div>
                <div className="bg-black/30 backdrop-blur-sm rounded-2xl px-8 py-6 min-w-[200px]">
                  <ScoreBoard sets={match.score?.sets || []} />
                </div>
                <div className="text-white/50 text-sm font-medium tracking-wide">
                  {match.court?.name || ""}
                </div>
              </div>

              {/* Pair 2 */}
              <div className="flex flex-col items-center gap-5">
                <div className="flex flex-col items-center gap-3">
                  <PlayerAvatar
                    name={match.pair2?.player1?.name || ""}
                    photoUrl={match.pair2?.player1?.photoUrl}
                    size={130}
                  />
                  <p className="text-white font-bold text-lg text-center leading-tight max-w-xs">
                    {match.pair2?.player1?.name || "Jugador 3"}
                  </p>
                </div>
                <div className="w-px h-6 bg-white/20" />
                <div className="flex flex-col items-center gap-3">
                  <PlayerAvatar
                    name={match.pair2?.player2?.name || ""}
                    photoUrl={match.pair2?.player2?.photoUrl}
                    size={130}
                  />
                  <p className="text-white font-bold text-lg text-center leading-tight max-w-xs">
                    {match.pair2?.player2?.name || "Jugador 4"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sponsors bar */}
      {activeSponsors.length > 0 && (
        <div className="flex-shrink-0 bg-white/10 backdrop-blur-sm py-3 px-8">
          <div className="flex items-center justify-center gap-8 h-12">
            {activeSponsors.map((sponsor: any, i: number) => (
              <div
                key={sponsor.id}
                className="transition-opacity duration-500"
                style={{ opacity: activeSponsors.length === 1 || i === currentAdIndex ? 1 : 0.3 }}
              >
                {sponsor.logoUrl ? (
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <span className="text-white/70 font-semibold text-sm">{sponsor.name}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
