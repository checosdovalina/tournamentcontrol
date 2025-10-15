import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ScheduledMatchWithDetails } from "@shared/schema";

interface WaitingListProps {
  tournamentId?: string;
}

export default function WaitingList({ tournamentId }: WaitingListProps) {
  const { toast } = useToast();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [courtSelectionOpen, setCourtSelectionOpen] = useState(false);

  const { data: allReadyMatches = [], isLoading } = useQuery<ScheduledMatchWithDetails[]>({
    queryKey: ["/api/scheduled-matches/ready", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/scheduled-matches/ready/${tournamentId}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.json();
    },
    enabled: !!tournamentId,
    staleTime: 0,
    refetchInterval: 3000,
  });

  // Filter to show only matches from the last 12 hours (720 minutes)
  const readyMatches = allReadyMatches.filter((match: ScheduledMatchWithDetails) => {
    const players = [
      match.pair1?.player1,
      match.pair1?.player2,
      match.pair2?.player1,
      match.pair2?.player2,
    ].filter(Boolean);

    const checkInTimes = players
      .filter((p: any) => p?.checkInTime)
      .map((p: any) => new Date(p.checkInTime).getTime());
    
    if (checkInTimes.length === 0) return true; // Include matches without check-ins
    
    const earliestCheckIn = Math.min(...checkInTimes);
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - earliestCheckIn) / (1000 * 60));
    return diffMinutes <= 720; // 12 hours = 720 minutes
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: !!tournamentId,
  });

  const availableCourts = courts.filter(c => c.isAvailable);

  const assignAndStartMutation = useMutation({
    mutationFn: async ({ matchId, courtId }: { matchId: string; courtId: string }) => {
      const response = await apiRequest("POST", `/api/scheduled-matches/${matchId}/assign-and-start`, {
        courtId,
        tournamentId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      
      setCourtSelectionOpen(false);
      setSelectedMatchId(null);
      
      toast({
        title: "Partido iniciado",
        description: data.message || "El partido ha comenzado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al iniciar partido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ matchId, courtId }: { matchId: string; courtId: string }) => {
      return apiRequest("PATCH", `/api/scheduled-matches/${matchId}`, { 
        courtId,
        tournamentId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      setCourtSelectionOpen(false);
      setSelectedMatchId(null);
      toast({
        title: "Cancha reasignada",
        description: "La cancha del partido ha sido actualizada",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo reasignar la cancha",
        variant: "destructive",
      });
    },
  });

  const handleAssignCourt = (matchId: string) => {
    if (availableCourts.length === 0) {
      toast({
        title: "No hay canchas disponibles",
        description: "Todas las canchas están ocupadas",
        variant: "destructive",
      });
      return;
    }

    setSelectedMatchId(matchId);
    setCourtSelectionOpen(true);
  };

  const isPlayerPresent = (match: ScheduledMatchWithDetails, playerId: string) => {
    const playerData = match.players.find(p => p.playerId === playerId);
    return playerData?.isPresent === true;
  };

  const formatWaitTime = (players: any[]) => {
    const checkInTimes = players
      .filter(p => p.checkInTime)
      .map(p => new Date(p.checkInTime).getTime());
    
    if (checkInTimes.length === 0) return "0 min";
    
    const earliestCheckIn = Math.min(...checkInTimes);
    const now = new Date().getTime();
    const diffMinutes = Math.floor((now - earliestCheckIn) / (1000 * 60));
    return `${diffMinutes} min`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="text-warning mr-2" />
            Lista de Espera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Clock className="text-warning mr-2" />
            Lista de Espera
          </CardTitle>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              <span className="status-indicator status-waiting"></span>
              <span data-testid="text-waiting-matches-count">{readyMatches.length}</span> {readyMatches.length === 1 ? 'partido' : 'partidos'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {readyMatches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay partidos listos en lista de espera
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Posición
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Partido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tiempo Espera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border" data-testid="waiting-list-body">
              {readyMatches.map((match: ScheduledMatchWithDetails, index: number) => (
                <tr key={match.id} className="hover:bg-muted/50 transition-colors" data-testid={`waiting-match-${index + 1}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-warning/20 text-warning rounded-full font-semibold">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Pareja 1:</span>
                        <span className="font-medium" data-testid={`match-pair1-${index + 1}`}>
                          {match.pair1.player1.name} / {match.pair1.player2.name}
                        </span>
                        {isPlayerPresent(match, match.pair1.player1.id) && isPlayerPresent(match, match.pair1.player2.id) ? (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            ✓ Listos
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">
                            Esperando
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Pareja 2:</span>
                        <span className="font-medium" data-testid={`match-pair2-${index + 1}`}>
                          {match.pair2.player1.name} / {match.pair2.player2.name}
                        </span>
                        {isPlayerPresent(match, match.pair2.player1.id) && isPlayerPresent(match, match.pair2.player2.id) ? (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            ✓ Listos
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 text-xs">
                            Esperando
                          </Badge>
                        )}
                      </div>
                      {match.category && (
                        <Badge variant="outline" className="text-xs">
                          {match.category.name}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1 inline" />
                    <span data-testid={`wait-time-${index + 1}`}>
                      {formatWaitTime(match.players)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {match.courtId ? (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {courts.find(c => c.id === match.courtId)?.name || 'Cancha asignada'}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80 font-medium"
                            onClick={() => handleAssignCourt(match.id)}
                            data-testid={`button-reassign-court-${index + 1}`}
                          >
                            Reasignar
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80 font-medium"
                          onClick={() => handleAssignCourt(match.id)}
                          data-testid={`button-assign-court-${index + 1}`}
                        >
                          Asignar Cancha
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog open={courtSelectionOpen} onOpenChange={setCourtSelectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {readyMatches.find(m => m.id === selectedMatchId)?.courtId 
                ? "Reasignar Cancha" 
                : "Seleccionar Cancha e Iniciar Partido"}
            </DialogTitle>
            <DialogDescription>
              {readyMatches.find(m => m.id === selectedMatchId)?.courtId 
                ? "Elige una nueva cancha para reasignar el partido"
                : "Elige una cancha disponible para asignar e iniciar el partido inmediatamente"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {readyMatches.find(m => m.id === selectedMatchId)?.courtId ? (
              // Show all courts for reassignment
              courts.map((court) => (
                <Button
                  key={court.id}
                  variant={court.isAvailable ? "outline" : "ghost"}
                  className="w-full justify-start text-left h-auto py-3"
                  disabled={!court.isAvailable || reassignMutation.isPending}
                  onClick={() => {
                    if (selectedMatchId) {
                      reassignMutation.mutate({
                        matchId: selectedMatchId,
                        courtId: court.id,
                      });
                    }
                  }}
                  data-testid={`button-select-court-${court.name}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <div className="font-semibold">{court.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {court.surface}
                      </div>
                    </div>
                    <div>
                      {court.isAvailable ? (
                        <span className="text-xs text-green-600 dark:text-green-400">Disponible</span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400">Ocupada</span>
                      )}
                    </div>
                  </div>
                </Button>
              ))
            ) : (
              // Show only available courts for initial assignment
              availableCourts.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No hay canchas disponibles
                </p>
              ) : (
                availableCourts.map((court) => (
                  <Button
                    key={court.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => {
                      if (selectedMatchId) {
                        assignAndStartMutation.mutate({
                          matchId: selectedMatchId,
                          courtId: court.id,
                        });
                      }
                    }}
                    disabled={assignAndStartMutation.isPending}
                    data-testid={`button-select-court-${court.name}`}
                  >
                    <div>
                      <div className="font-semibold">{court.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {court.surface} - Disponible
                      </div>
                    </div>
                  </Button>
                ))
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
