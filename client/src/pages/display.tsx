import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Volleyball } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";

export default function Display() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: tournament } = useQuery<{ 
    id: string; 
    name: string;
    tournamentLogoUrl?: string;
    clubLogoUrl?: string;
    systemLogoUrl?: string;
  }>({
    queryKey: ["/api/tournament"],
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

  const { data: scheduledMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-matches/today", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await fetch(`/api/scheduled-matches/day/${tournament.id}?day=${today}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

  const { data: recentResults = [] } = useQuery<any[]>({
    queryKey: ["/api/results/today", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/results/today/${tournament.id}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

  const { data: banners = [] } = useQuery<any[]>({
    queryKey: ["/api/banners", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 60000,
  });

  useWebSocket();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatMatchDuration = (startTime: string | Date) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes} min`;
  };

  const formatScore = (score: any) => {
    if (!score) return "0-0";
    
    // Handle new live score format
    if (score.sets && Array.isArray(score.sets)) {
      const pointMap = [0, 15, 30, 40];
      const formatPoints = (points: number) => {
        if (points === 4) return "AD";
        return pointMap[points] || 0;
      };

      // Show completed sets
      let result = score.sets.map((set: any) => `${set[0]}-${set[1]}`).join(" | ");
      
      // Show current game points if available
      if (score.currentPoints && score.currentPoints.length === 2) {
        const p1 = formatPoints(score.currentPoints[0]);
        const p2 = formatPoints(score.currentPoints[1]);
        if (result) result += " | ";
        result += `${p1}-${p2}`;
      }
      
      return result || "0-0";
    }
    
    // Fallback for old format
    return "0-0";
  };

  const formatResultScore = (score: any) => {
    if (!score || !Array.isArray(score.sets)) return "0-0, 0-0";
    return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(", ");
  };


  const activeBanners = banners
    .filter((banner: any) => banner.isActive)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return (
    <div className="fixed inset-0 z-50">
      <div className="h-screen flex flex-col tv-display">
        {/* Header */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center space-x-4">
            {tournament?.tournamentLogoUrl ? (
              <img src={tournament.tournamentLogoUrl} alt="Logo Torneo" className="h-16 w-auto object-contain tv-display-logo" />
            ) : (
              <img src={courtflowLogo} alt="CourtFlow" className="h-16 w-auto tv-display-logo" />
            )}
            <div className="text-white">
              <h1 className="text-2xl font-bold">CourtFlow</h1>
              <p className="text-lg" data-testid="text-tournament-name">
                {tournament?.name || 'Torneo Pádel'}
              </p>
            </div>
          </div>
          
          {(tournament?.clubLogoUrl || tournament?.systemLogoUrl) && (
            <div className="flex items-center space-x-4">
              {tournament?.clubLogoUrl && (
                <img src={tournament.clubLogoUrl} alt="Logo Club" className="h-16 w-auto object-contain" />
              )}
              {tournament?.systemLogoUrl && (
                <img src={tournament.systemLogoUrl} alt="Logo Sistema" className="h-16 w-auto object-contain" />
              )}
            </div>
          )}

          <div className="text-right text-white">
            <p className="text-4xl font-bold font-mono" data-testid="text-current-time">
              {formatTime(currentTime)}
            </p>
            <p className="text-sm text-white/80">
              {currentTime.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white text-xl"
            data-testid="button-close-display"
          >
            <X />
          </Button>
        </div>

        {/* Main Content - 3 Equal Columns */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            
            {/* Column 1: Partidos en Curso */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Volleyball className="mr-3" />
                  Partidos en Curso
                </h2>
                
                <div className="flex-1 overflow-hidden relative" data-testid="current-matches-list">
                  {currentMatches.length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay partidos en curso
                    </div>
                  ) : currentMatches.length <= 3 ? (
                    <div className="space-y-3">
                      {currentMatches.map((match: any) => (
                        <MatchCard key={match.id} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div className="animate-scroll-vertical space-y-3">
                        {currentMatches.map((match: any) => (
                          <MatchCard key={match.id} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} />
                        ))}
                        {currentMatches.map((match: any) => (
                          <MatchCard key={`${match.id}-dup`} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Próximos Partidos */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Volleyball className="mr-3" />
                  Próximos Partidos
                </h2>
                
                <div className="flex-1 overflow-hidden relative" data-testid="next-matches-list">
                  {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay partidos programados
                    </div>
                  ) : scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').length <= 3 ? (
                    <div className="space-y-3">
                      {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                        <NextMatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div className="animate-scroll-vertical space-y-3">
                        {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                          <NextMatchCard key={match.id} match={match} />
                        ))}
                        {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                          <NextMatchCard key={`${match.id}-dup`} match={match} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Últimos Resultados */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Volleyball className="mr-3" />
                  Resultados del Día
                </h2>
                
                <div className="flex-1 overflow-hidden relative" data-testid="recent-results-list">
                  {recentResults.length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay resultados recientes
                    </div>
                  ) : recentResults.length <= 4 ? (
                    <div className="space-y-3">
                      {recentResults.map((result: any) => (
                        <ResultCard key={result.id} result={result} formatResultScore={formatResultScore} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div className="animate-scroll-vertical space-y-3">
                        {recentResults.map((result: any) => (
                          <ResultCard key={result.id} result={result} formatResultScore={formatResultScore} />
                        ))}
                        {recentResults.map((result: any) => (
                          <ResultCard key={`${result.id}-dup`} result={result} formatResultScore={formatResultScore} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Sponsors - Auto Scrolling Marquee */}
        <div className="px-8 py-3 border-t border-white/20 bg-white/5 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm whitespace-nowrap">
              Patrocinadores:
            </div>
            <div className="flex-1 overflow-hidden mx-4">
              {activeBanners.length > 0 ? (
                <div className="relative">
                  <div className="flex animate-marquee space-x-8">
                    {/* Duplicate sponsors for seamless loop */}
                    {[...activeBanners, ...activeBanners, ...activeBanners].map((banner: any, idx: number) => (
                      <div key={`${banner.id}-${idx}`} className="h-16 flex items-center flex-shrink-0">
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
            <div className="text-white/60 text-sm whitespace-nowrap">
              Sistema de Control de Torneos v1.0
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }

        @keyframes scroll-vertical {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
          will-change: transform;
        }

        .animate-marquee:hover {
          animation-play-state: paused;
        }

        .animate-scroll-vertical {
          animation: scroll-vertical 20s linear infinite;
          will-change: transform;
        }

        .animate-scroll-vertical:hover {
          animation-play-state: paused;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
          }
          .animate-scroll-vertical {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

// Match Card Component
function MatchCard({ match, formatMatchDuration, formatScore }: any) {
  return (
    <div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      data-testid={`match-card-${match.court.name.toLowerCase().replace(' ', '-')}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 bg-destructive/80 text-white rounded-lg font-bold text-base">
          {match.court.name}
        </span>
        <span className="text-white/60 text-sm">
          {formatMatchDuration(match.startTime)}
        </span>
      </div>
      <div className="space-y-2 text-white">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium truncate flex-1">
            {match.pair1.player1.name} / {match.pair1.player2.name}
          </span>
          <span className="text-2xl font-mono font-bold ml-2">
            {formatScore(match.score).split(' | ')[0] || '0'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-medium truncate flex-1">
            {match.pair2.player1.name} / {match.pair2.player2.name}
          </span>
          <span className="text-2xl font-mono font-bold ml-2">
            {formatScore(match.score).split(' | ')[1] || '0'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Next Match Card Component
function NextMatchCard({ match }: any) {
  const getStatusBadge = () => {
    if (match.status === 'assigned' && match.court) {
      return <span className="text-white bg-purple-600/80 text-xs px-2 py-1 rounded">Cancha asignada</span>;
    }
    if (match.status === 'ready') {
      return <span className="text-white bg-green-600/80 text-xs px-2 py-1 rounded">✓ Listos</span>;
    }
    const presentCount = match.players?.filter((p: any) => p.isPresent).length || 0;
    if (presentCount > 0) {
      return <span className="text-white/60 text-xs">{presentCount}/4 presentes</span>;
    }
    return <span className="text-white/40 text-xs">Esperando jugadores</span>;
  };

  return (
    <div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      data-testid={`next-match-${match.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 bg-blue-600/80 text-white rounded-lg font-bold text-sm">
          {match.plannedTime || 'Por confirmar'}
        </span>
        <div className="flex items-center gap-2">
          {match.court && (
            <span className="text-white/80 text-sm font-medium">
              {match.court.name}
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>
      {match.category && (
        <div className="mb-2">
          <span className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded">
            {match.category.name}
          </span>
        </div>
      )}
      <div className="space-y-2 text-white">
        <div className="text-base font-medium truncate">
          {match.pair1.player1.name} / {match.pair1.player2.name}
        </div>
        <div className="text-base font-medium truncate">
          {match.pair2.player1.name} / {match.pair2.player2.name}
        </div>
      </div>
    </div>
  );
}

// Result Card Component
function ResultCard({ result, formatResultScore }: any) {
  return (
    <div 
      className="pb-3 border-b border-white/20 last:border-b-0"
      data-testid={`result-${result.id}`}
    >
      <div className="flex items-center justify-between mb-2 text-white/60 text-xs">
        <span>
          {result.createdAt ? 
            `Hace ${Math.floor((new Date().getTime() - new Date(result.createdAt).getTime()) / (1000 * 60))} min` : 
            'Reciente'
          }
        </span>
        <span>{result.match?.court?.name || 'Cancha'}</span>
      </div>
      <div className="space-y-1 text-white">
        <div className="flex justify-between items-center">
          <span className="text-base font-medium truncate flex-1">
            {result.winner.player1.name} / {result.winner.player2.name}
          </span>
          <span className="font-mono font-bold text-success text-base ml-2 flex-shrink-0">
            {formatResultScore(result.score)}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/70">
          <span className="text-base truncate flex-1">
            {result.loser.player1.name} / {result.loser.player2.name}
          </span>
          <span className="font-mono text-base ml-2 flex-shrink-0">
            {formatResultScore(result.score).split(', ').map((set: string) => {
              const [a, b] = set.split('-');
              return `${b}-${a}`;
            }).join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
