import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Users, Clock, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";

export default function DisplayControl() {
  const [, setLocation] = useLocation();

  useWebSocket();

  const { data: tournament } = useQuery<{ 
    id: string; 
    name: string;
    tournamentLogoUrl?: string;
  }>({
    queryKey: ["/api/tournament"],
  });

  const { data: readyQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-matches/ready-queue", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/scheduled-matches/ready-queue/${tournament.id}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/matches/current/${tournament.id}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const sortedCourts = [...courts].sort((a, b) => {
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    const numMatchA = nameA.match(/\d+/);
    const numMatchB = nameB.match(/\d+/);
    const numA = numMatchA ? parseInt(numMatchA[0]) : null;
    const numB = numMatchB ? parseInt(numMatchB[0]) : null;
    if (numA !== null && numB !== null) {
      if (numA !== numB) return numA - numB;
    } else if (numA !== null) {
      return 1;
    } else if (numB !== null) {
      return -1;
    }
    return nameA.localeCompare(nameB);
  });

  const getMatchForCourt = (courtId: string) => {
    return currentMatches.find((match: any) => match.courtId === courtId);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/20 bg-black/30">
          <div className="flex items-center space-x-4">
            {tournament?.tournamentLogoUrl ? (
              <img src={tournament.tournamentLogoUrl} alt="Logo Torneo" className="h-12 w-auto object-contain" />
            ) : (
              <img src={courtflowLogo} alt="CourtFlow" className="h-12 w-auto" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">Mesa de Control</h1>
              <p className="text-sm text-white/70">{tournament?.name || "Cargando..."}</p>
            </div>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            data-testid="button-close-display"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Main Content - Two Columns 50/50 */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            
            {/* Left Column: Ready Queue (50%) */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <Users className="mr-3" />
                Cola de Turnos
                {readyQueue.length > 0 && (
                  <Badge className="ml-3 bg-blue-600 text-white text-lg px-3">
                    {readyQueue.length}
                  </Badge>
                )}
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-3" data-testid="ready-queue-list">
                {readyQueue.length === 0 ? (
                  <div className="text-white/60 text-center py-12">
                    No hay partidos en cola
                  </div>
                ) : (
                  readyQueue.map((match: any, index: number) => {
                    const pair1Player1 = match.pair1?.player1?.name || 'Jugador 1';
                    const pair1Player2 = match.pair1?.player2?.name || 'Jugador 2';
                    const pair2Player1 = match.pair2?.player1?.name || 'Jugador 3';
                    const pair2Player2 = match.pair2?.player2?.name || 'Jugador 4';
                    const categoryName = match.category?.name;
                    const plannedTime = match.plannedTime || '--:--';
                    
                    return (
                      <div 
                        key={match.id}
                        className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                        data-testid={`ready-match-${index + 1}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
                              #{index + 1}
                            </div>
                            <div className="flex items-center bg-white/20 text-white px-3 py-2 rounded-lg font-bold text-lg">
                              <Clock className="w-5 h-5 mr-2" />
                              {plannedTime}
                            </div>
                            {categoryName && (
                              <span className="px-3 py-1 bg-orange-600/80 text-white rounded-lg text-sm font-semibold">
                                {categoryName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2 text-white">
                          <div className="text-base font-medium">
                            {pair1Player1} / {pair1Player2}
                          </div>
                          <div className="text-base font-medium">
                            {pair2Player1} / {pair2Player2}
                          </div>
                        </div>
                        {match.readySince && (
                          <div className="mt-2 text-xs text-white/50">
                            Esperando desde: {new Date(match.readySince).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Courts with Active Matches (50%) */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <MapPin className="mr-3" />
                Canchas
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-3" data-testid="courts-status-list">
                {sortedCourts.length === 0 ? (
                  <div className="text-white/60 text-center py-12">
                    No hay canchas configuradas
                  </div>
                ) : (
                  sortedCourts.map((court: any) => {
                    const activeMatch = getMatchForCourt(court.id);
                    const isOccupied = !!activeMatch;
                    
                    return (
                      <div 
                        key={court.id}
                        className={`rounded-xl p-4 border transition-colors ${
                          isOccupied 
                            ? 'bg-orange-600/20 border-orange-500/50' 
                            : 'bg-green-600/20 border-green-500/50'
                        }`}
                        data-testid={`court-${court.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-white">
                            {court.name}
                          </h3>
                          <Badge className={`${isOccupied ? 'bg-orange-600' : 'bg-green-600'} text-white px-3 py-1`}>
                            {isOccupied ? 'En Juego' : 'Disponible'}
                          </Badge>
                        </div>
                        
                        {isOccupied && activeMatch ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              {activeMatch.category && (
                                <span className="text-sm text-white/70">
                                  {activeMatch.category.name}
                                </span>
                              )}
                              {activeMatch.startedAt && (
                                <div className="flex items-center bg-white/20 text-white px-2 py-1 rounded-lg text-sm font-medium">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {new Date(activeMatch.startedAt).toLocaleTimeString('es-ES', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              )}
                            </div>
                            
                            {/* Team 1 */}
                            <div className="bg-white/10 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-white font-medium">
                                  {activeMatch.pair1?.player1?.name || 'Jugador 1'} / {activeMatch.pair1?.player2?.name || 'Jugador 2'}
                                </div>
                              </div>
                            </div>
                            
                            {/* Score */}
                            <div className="text-center">
                              <div className="text-3xl font-bold text-white">
                                {activeMatch.score?.sets?.length > 0 ? (
                                  <div className="flex items-center justify-center gap-4">
                                    {activeMatch.score.sets.map((set: number[], idx: number) => (
                                      <div key={idx} className="flex items-center">
                                        <span className="text-green-400">{set[0]}</span>
                                        <span className="text-white/50 mx-1">-</span>
                                        <span className="text-blue-400">{set[1]}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-white/50">0-0</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Team 2 */}
                            <div className="bg-white/10 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-white font-medium">
                                  {activeMatch.pair2?.player1?.name || 'Jugador 3'} / {activeMatch.pair2?.player2?.name || 'Jugador 4'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4 text-white/60">
                            Cancha disponible
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
