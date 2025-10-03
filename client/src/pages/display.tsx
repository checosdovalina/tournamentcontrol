import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Volleyball } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import courtflowLogo from "@assets/courtflow-logo.png";

export default function Display() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  const { data: tournament } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/tournament"],
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

  const { data: waitingPairs = [] } = useQuery<any[]>({
    queryKey: ["/api/pairs/waiting", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

  const { data: recentResults = [] } = useQuery<any[]>({
    queryKey: ["/api/results/recent", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 30000,
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
    if (!score || !Array.isArray(score.sets)) return "0-0";
    return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(" | ");
  };

  const formatResultScore = (score: any) => {
    if (!score || !Array.isArray(score.sets)) return "0-0, 0-0";
    return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(", ");
  };

  const formatWaitTime = (waitingSince: string | Date) => {
    const start = new Date(waitingSince);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes} min`;
  };

  return (
    <div className="fixed inset-0 bg-background z-50">
      <div className="h-screen flex flex-col tv-display">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center space-x-4">
            <img src={courtflowLogo} alt="CourtFlow" className="h-16 w-auto tv-display-logo" />
            <div className="text-white">
              <h1 className="text-3xl font-bold">CourtFlow</h1>
              <p className="text-xl" data-testid="text-tournament-name">
                {tournament?.name || 'Torneo Pádel'}
              </p>
            </div>
          </div>
          <div className="text-right text-white">
            <p className="text-5xl font-bold font-mono" data-testid="text-current-time">
              {formatTime(currentTime)}
            </p>
            <p className="text-white/80">
              {currentTime.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white text-2xl"
            data-testid="button-close-display"
          >
            <X />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="grid grid-cols-2 gap-8 h-full">
            
            {/* Left Column: Current Matches */}
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Volleyball className="mr-3" />
                  Partidos en Curso
                </h2>
                
                <div className="space-y-4" data-testid="current-matches-list">
                  {currentMatches.length === 0 ? (
                    <div className="text-white/60 text-center py-8">
                      No hay partidos en curso
                    </div>
                  ) : (
                    currentMatches.map((match: any) => (
                      <div 
                        key={match.id} 
                        className="bg-white/5 rounded-xl p-5 border border-white/10"
                        data-testid={`match-card-${match.court.name.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-4 py-1 bg-destructive/80 text-white rounded-lg font-bold text-lg">
                            {match.court.name}
                          </span>
                          <span className="text-white/60 text-sm">
                            {formatMatchDuration(match.startTime)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 items-center text-white">
                          <div className="text-lg font-medium">
                            {match.pair1.player1.name} / {match.pair1.player2.name}
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-mono font-bold">
                              {formatScore(match.score)}
                            </div>
                          </div>
                          <div className="text-lg font-medium text-right">
                            {match.pair2.player1.name} / {match.pair2.player2.name}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Waiting List & Results */}
            <div className="space-y-6">
              {/* Waiting List */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Volleyball className="mr-3" />
                  Próximos Partidos
                </h2>
                
                <div className="space-y-3" data-testid="waiting-pairs-list">
                  {waitingPairs.length === 0 ? (
                    <div className="text-white/60 text-center py-4">
                      No hay parejas en espera
                    </div>
                  ) : (
                    waitingPairs.slice(0, 5).map((pair: any, index: number) => (
                      <div 
                        key={pair.id} 
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                        data-testid={`waiting-pair-${index + 1}`}
                      >
                        <div className="flex items-center space-x-4">
                          <span className="w-10 h-10 bg-warning text-warning-foreground rounded-full flex items-center justify-center font-bold text-lg">
                            {index + 1}
                          </span>
                          <span className="text-white text-lg font-medium">
                            {pair.player1.name} / {pair.player2.name}
                          </span>
                        </div>
                        <span className="text-white/60">
                          {pair.waitingSince ? formatWaitTime(pair.waitingSince) : '0 min'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Results */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <Volleyball className="mr-3" />
                  Últimos Resultados
                </h2>
                
                <div className="space-y-4" data-testid="recent-results-list">
                  {recentResults.length === 0 ? (
                    <div className="text-white/60 text-center py-4">
                      No hay resultados recientes
                    </div>
                  ) : (
                    recentResults.slice(0, 4).map((result: any) => (
                      <div 
                        key={result.id} 
                        className="pb-4 border-b border-white/20 last:border-b-0"
                        data-testid={`result-${result.id}`}
                      >
                        <div className="flex items-center justify-between mb-2 text-white/60 text-sm">
                          <span>
                            {result.createdAt ? 
                              `Hace ${Math.floor((new Date().getTime() - new Date(result.createdAt).getTime()) / (1000 * 60))} min` : 
                              'Reciente'
                            }
                          </span>
                          <span>{result.match?.court?.name || 'Cancha'}</span>
                        </div>
                        <div className="space-y-2 text-white">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-medium">
                              {result.winner.player1.name} / {result.winner.player2.name}
                            </span>
                            <span className="font-mono font-bold text-success text-lg">
                              {formatResultScore(result.score)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-white/70">
                            <span className="text-lg">
                              {result.loser.player1.name} / {result.loser.player2.name}
                            </span>
                            <span className="font-mono text-lg">
                              {formatResultScore(result.score).split(', ').map((set: string) => {
                                const [a, b] = set.split('-');
                                return `${b}-${a}`;
                              }).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Sponsors */}
        <div className="px-8 py-4 border-t border-white/20 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm">
              Patrocinadores:
            </div>
            <div className="flex items-center space-x-8">
              <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 1</div>
              <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 2</div>
              <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 3</div>
            </div>
            <div className="text-white/60 text-sm">
              Sistema de Control de Torneos v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
