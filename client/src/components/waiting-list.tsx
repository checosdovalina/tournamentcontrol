import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WaitingListProps {
  tournamentId?: string;
}

export default function WaitingList({ tournamentId }: WaitingListProps) {
  const { toast } = useToast();
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [courtSelectionOpen, setCourtSelectionOpen] = useState(false);

  const { data: waitingPairs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pairs/waiting", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: !!tournamentId,
  });

  const availableCourts = courts.filter(c => c.isAvailable);

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/auto-assign/${tournamentId}`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      
      toast({
        title: "Asignación automática completada",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en asignación automática",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const manualAssignMutation = useMutation({
    mutationFn: async ({ pairId, courtId }: { pairId: string; courtId: string }) => {
      const response = await apiRequest("POST", "/api/manual-assign", {
        pairId,
        courtId,
        tournamentId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      
      setCourtSelectionOpen(false);
      setSelectedPairId(null);
      
      toast({
        title: "Asignación completada",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en asignación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAssignCourt = (pairId: string) => {
    if (availableCourts.length === 0) {
      toast({
        title: "No hay canchas disponibles",
        description: "Todas las canchas están ocupadas",
        variant: "destructive",
      });
      return;
    }
    
    if (waitingPairs.length < 2) {
      toast({
        title: "Se necesitan al menos 2 parejas",
        description: "Debe haber al menos otra pareja en espera para crear un partido",
        variant: "destructive",
      });
      return;
    }

    setSelectedPairId(pairId);
    setCourtSelectionOpen(true);
  };

  const formatWaitTime = (waitingSince: string | Date | null) => {
    if (!waitingSince) return "0 min";
    const start = new Date(waitingSince);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
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
              <span data-testid="text-waiting-pairs-count">{waitingPairs.length}</span> parejas
            </span>
            {waitingPairs.length > 1 && (
              <Button
                size="sm"
                onClick={() => autoAssignMutation.mutate()}
                disabled={autoAssignMutation.isPending}
                data-testid="button-auto-assign"
              >
                {autoAssignMutation.isPending ? "Asignando..." : "Asignar Automático"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {waitingPairs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay parejas en lista de espera
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Posición
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pareja
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
              {waitingPairs.map((pair: any, index: number) => (
                <tr key={pair.id} className="hover:bg-muted/50 transition-colors" data-testid={`waiting-pair-${index + 1}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-warning/20 text-warning rounded-full font-semibold">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium" data-testid={`pair-names-${index + 1}`}>
                      {pair.player1.name} / {pair.player2.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1 inline" />
                    <span data-testid={`wait-time-${index + 1}`}>
                      {formatWaitTime(pair.waitingSince)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80 font-medium"
                      onClick={() => handleAssignCourt(pair.id)}
                      data-testid={`button-assign-court-${index + 1}`}
                    >
                      Asignar Cancha
                    </Button>
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
            <DialogTitle>Seleccionar Cancha</DialogTitle>
            <DialogDescription>
              Elige una cancha disponible para asignar la pareja seleccionada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {availableCourts.length === 0 ? (
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
                    if (selectedPairId) {
                      manualAssignMutation.mutate({
                        pairId: selectedPairId,
                        courtId: court.id,
                      });
                    }
                  }}
                  disabled={manualAssignMutation.isPending}
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
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
