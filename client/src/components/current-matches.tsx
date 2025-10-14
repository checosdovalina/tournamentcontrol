import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Clock, MoreVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CurrentMatchesProps {
  tournamentId?: string;
}

export default function CurrentMatches({ tournamentId }: CurrentMatchesProps) {
  const { toast } = useToast();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  const { data: matches = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: !!tournamentId,
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ matchId, courtId }: { matchId: string; courtId: string }) => {
      return apiRequest("POST", `/api/matches/${matchId}/reassign-court`, { 
        courtId,
        tournamentId 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      setReassignDialogOpen(false);
      setSelectedMatchId(null);
      toast({
        title: "Cancha reasignada",
        description: "El partido ha sido movido a la nueva cancha",
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

  const handleReassignCourt = (courtId: string) => {
    if (!selectedMatchId) return;
    reassignMutation.mutate({ matchId: selectedMatchId, courtId });
  };

  const formatDuration = (startTime: string | Date) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes} min`;
  };

  const formatScore = (score: any) => {
    if (!score || !Array.isArray(score.sets)) return "0-0";
    return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(" | ");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Play className="text-primary mr-2" />
            Partidos en Curso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
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
            <Play className="text-primary mr-2" />
            Partidos en Curso
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            <span className="status-indicator status-occupied"></span>
            <span data-testid="text-active-matches-count">{matches.length}</span> activos
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {matches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay partidos en curso
          </div>
        ) : (
          <div className="space-y-4" data-testid="current-matches-container">
            {matches.map((match: any) => (
              <div
                key={match.id}
                className="p-4 bg-muted/50 rounded-lg border border-border hover:shadow-md transition-all"
                data-testid={`match-${match.court.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-md font-semibold text-sm">
                      {match.court.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1 inline" />
                      <span data-testid={`duration-${match.court.name.toLowerCase().replace(' ', '-')}`}>
                        {formatDuration(match.startTime)}
                      </span>
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`button-menu-${match.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMatchId(match.id);
                          setReassignDialogOpen(true);
                        }}
                        data-testid={`option-reassign-${match.id}`}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reasignar Cancha
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="col-span-1">
                    <p className="font-medium text-sm" data-testid={`team1-${match.court.name.toLowerCase().replace(' ', '-')}`}>
                      {match.pair1.player1.name} / {match.pair1.player2.name}
                    </p>
                  </div>
                  <div className="col-span-1 text-center">
                    <div className="match-score text-primary" data-testid={`score-${match.court.name.toLowerCase().replace(' ', '-')}`}>
                      {formatScore(match.score)}
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="font-medium text-sm" data-testid={`team2-${match.court.name.toLowerCase().replace(' ', '-')}`}>
                      {match.pair2.player1.name} / {match.pair2.player2.name}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Reassign Court Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Cancha</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Selecciona una cancha disponible para reasignar el partido
            </p>
            {courts.map((court) => (
              <Button
                key={court.id}
                variant={court.isAvailable ? "outline" : "ghost"}
                className="w-full justify-start"
                disabled={!court.isAvailable || reassignMutation.isPending}
                onClick={() => handleReassignCourt(court.id)}
                data-testid={`button-court-${court.id}`}
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
