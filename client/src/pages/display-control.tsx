import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Users, Clock } from "lucide-react";
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
    enabled: !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    refetchInterval: 2000,
    staleTime: 0,
  });

  const getCourtStatus = (court: any) => {
    if (!court.isAvailable) {
      return { label: "Ocupada", color: "bg-destructive" };
    }
    if (court.preAssignedAt) {
      return { label: "Pre-asignada", color: "bg-orange-600" };
    }
    return { label: "Disponible", color: "bg-green-600" };
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

        {/* Main Content - Two Columns (70% Queue / 30% Courts) */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-10 gap-6 h-full">
            
            {/* Left Column: Ready Queue with Turns (70% width) */}
            <div className="col-span-7 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <Users className="mr-3" />
                Cola de Turnos
              </h2>
              
              <div className="flex-1 overflow-hidden relative" data-testid="ready-queue-list">
                {readyQueue.length === 0 ? (
                  <div className="text-white/60 text-center py-12">
                    No hay partidos en cola
                  </div>
                ) : readyQueue.length <= 3 ? (
                  <div className="space-y-3">
                    {readyQueue.map((match: any, index: number) => {
                      // Defensive checks for optional fields
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
                              {categoryName && (
                                <span className="px-3 py-1 bg-orange-600/80 text-white rounded-lg text-sm font-semibold">
                                  {categoryName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-white/60 text-sm">
                              <Clock className="w-4 h-4 mr-1" />
                              {plannedTime}
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
                              Esperando: {new Date(match.readySince).toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full overflow-hidden">
                    <div className="animate-scroll-vertical-slow space-y-3">
                      {readyQueue.map((match: any, index: number) => {
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
                                {categoryName && (
                                  <span className="px-3 py-1 bg-orange-600/80 text-white rounded-lg text-sm font-semibold">
                                    {categoryName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-white/60 text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                {plannedTime}
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
                                Esperando: {new Date(match.readySince).toLocaleTimeString('es-ES', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {/* Duplicate for seamless loop */}
                      {readyQueue.map((match: any, index: number) => {
                        const pair1Player1 = match.pair1?.player1?.name || 'Jugador 1';
                        const pair1Player2 = match.pair1?.player2?.name || 'Jugador 2';
                        const pair2Player1 = match.pair2?.player1?.name || 'Jugador 3';
                        const pair2Player2 = match.pair2?.player2?.name || 'Jugador 4';
                        const categoryName = match.category?.name;
                        const plannedTime = match.plannedTime || '--:--';
                        
                        return (
                          <div 
                            key={`${match.id}-dup`}
                            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                            data-testid={`ready-match-${index + 1}-dup`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xl">
                                  #{index + 1}
                                </div>
                                {categoryName && (
                                  <span className="px-3 py-1 bg-orange-600/80 text-white rounded-lg text-sm font-semibold">
                                    {categoryName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center text-white/60 text-sm">
                                <Clock className="w-4 h-4 mr-1" />
                                {plannedTime}
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
                                Esperando: {new Date(match.readySince).toLocaleTimeString('es-ES', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Court Status (30% width - Compact) */}
            <div className="col-span-3 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 overflow-hidden flex flex-col">
              <h2 className="text-xl font-bold text-white mb-3">
                Canchas
              </h2>
              
              <div className="flex-1 overflow-y-auto space-y-2" data-testid="courts-status-list">
                {courts.length === 0 ? (
                  <div className="text-white/60 text-center py-8 text-sm">
                    No hay canchas
                  </div>
                ) : (
                  courts.map((court: any) => {
                    const status = getCourtStatus(court);
                    return (
                      <div 
                        key={court.id}
                        className="bg-white/5 rounded-lg p-3 border border-white/10"
                        data-testid={`court-${court.name.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-white truncate flex-1">
                            {court.name}
                          </h3>
                          <Badge className={`${status.color} text-white text-xs px-2 py-1 ml-2 whitespace-nowrap`}>
                            {status.label}
                          </Badge>
                        </div>
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
