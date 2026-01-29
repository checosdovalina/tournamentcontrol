import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trophy, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ScheduledMatchWithDetails } from "@shared/schema";

interface ReadyQueueProps {
  tournamentId?: string;
}

export default function ReadyQueue({ tournamentId }: ReadyQueueProps) {
  const { data: queueMatches = [], isLoading } = useQuery<ScheduledMatchWithDetails[]>({
    queryKey: ["/api/scheduled-matches/ready-queue", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/scheduled-matches/ready-queue/${tournamentId}`, {
        cache: 'no-cache',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tournamentId,
    staleTime: 0,
    refetchInterval: 3000,
  });

  const formatTime = (time: string | null) => {
    if (!time) return "--:--";
    return time;
  };

  const formatWaitingTime = (readySince: string | Date | null) => {
    if (!readySince) return "N/A";
    const now = new Date().getTime();
    const ready = new Date(readySince).getTime();
    const diffMinutes = Math.floor((now - ready) / (1000 * 60));
    
    if (diffMinutes < 1) return "Recién confirmado";
    if (diffMinutes < 60) return `${diffMinutes} min`;
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Cola de Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Cargando cola...</p>
        </CardContent>
      </Card>
    );
  }

  if (queueMatches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Cola de Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay partidos en espera de cancha
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Cola de Turnos
          </div>
          <Badge variant="secondary">{queueMatches.length} en cola</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queueMatches.map((match, index) => {
            const allPlayersReady = match.players?.every(p => p.isPresent) || false;

            return (
              <div
                key={match.id}
                className={`p-4 border rounded-lg ${
                  index === 0 ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                data-testid={`queue-match-${match.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={index === 0 ? "default" : "secondary"} data-testid={`queue-position-${index + 1}`}>
                        #{index + 1}
                      </Badge>
                      {match.category && (
                        <span className="text-sm font-medium text-muted-foreground">
                          {match.category.name}
                        </span>
                      )}
                      {match.format && (
                        <Badge variant="outline">{match.format}</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p className="text-sm font-semibold" data-testid={`pair1-${match.id}`}>
                          {match.pair1.player1.name} / {match.pair1.player2.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold" data-testid={`pair2-${match.id}`}>
                          {match.pair2.player1.name} / {match.pair2.player2.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Hora programada: {formatTime(match.plannedTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users2 className="h-3 w-3" />
                        <span>Esperando: {formatWaitingTime(match.readySince)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {allPlayersReady && (
                      <Badge variant="default" className="bg-success text-white">
                        4/4 Confirmados
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge variant="default" className="bg-warning text-white">
                        Siguiente
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
