import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Plus, Minus, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function LiveScoreCapture() {
  const { toast } = useToast();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const { data: tournament } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/tournament"],
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 10000,
  });

  const selectedMatch = currentMatches.find((m: any) => m.id === selectedMatchId);

  const getInitialScore = () => ({
    sets: [] as number[][],
    currentSet: 1,
  });

  const [liveScore, setLiveScore] = useState<any>(getInitialScore());

  const handleSelectMatch = (match: any) => {
    setSelectedMatchId(match.id);
    
    if (match.score) {
      setLiveScore(match.score);
    } else {
      setLiveScore(getInitialScore());
    }
  };

  const updateScoreMutation = useMutation({
    mutationFn: async (score: any) => {
      const response = await apiRequest("PATCH", `/api/matches/${selectedMatchId}/score`, { score });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current", tournament?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar score",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addGame = (playerIndex: 0 | 1) => {
    const newScore = { ...liveScore };
    const currentSetIndex = newScore.currentSet - 1;
    
    if (!newScore.sets[currentSetIndex]) {
      newScore.sets[currentSetIndex] = [0, 0];
    }

    newScore.sets[currentSetIndex][playerIndex]++;
    const games = newScore.sets[currentSetIndex];
    const otherIndex = playerIndex === 0 ? 1 : 0;

    if (games[playerIndex] >= 6 && games[playerIndex] - games[otherIndex] >= 2) {
      newScore.currentSet++;
    } else if (games[playerIndex] === 7 && games[otherIndex] === 6) {
      newScore.currentSet++;
    }

    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const removeGame = (playerIndex: 0 | 1) => {
    const newScore = { ...liveScore };
    const currentSetIndex = newScore.currentSet - 1;
    
    if (newScore.sets[currentSetIndex] && newScore.sets[currentSetIndex][playerIndex] > 0) {
      newScore.sets[currentSetIndex][playerIndex]--;
      setLiveScore(newScore);
      updateScoreMutation.mutate(newScore);
    }
  };

  const resetScore = () => {
    const newScore = getInitialScore();
    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const getCurrentSetGames = () => {
    const currentSetIndex = liveScore.currentSet - 1;
    return liveScore.sets[currentSetIndex] || [0, 0];
  };

  const isSetComplete = (set: number[]) => {
    const [games1, games2] = set;
    if (games1 >= 6 && games1 - games2 >= 2) return { complete: true, winner: 0 };
    if (games2 >= 6 && games2 - games1 >= 2) return { complete: true, winner: 1 };
    if (games1 === 7 && games2 === 6) return { complete: true, winner: 0 };
    if (games2 === 7 && games1 === 6) return { complete: true, winner: 1 };
    return { complete: false, winner: null };
  };

  const getMatchWinner = () => {
    if (!selectedMatch || !liveScore.sets || liveScore.sets.length === 0) return null;
    
    let setsWonByPair1 = 0;
    let setsWonByPair2 = 0;
    
    liveScore.sets.forEach((set: number[]) => {
      const setResult = isSetComplete(set);
      if (setResult.complete) {
        if (setResult.winner === 0) setsWonByPair1++;
        if (setResult.winner === 1) setsWonByPair2++;
      }
    });
    
    if (setsWonByPair1 >= 2) return { winnerIndex: 0, winnerPairId: selectedMatch.pair1Id };
    if (setsWonByPair2 >= 2) return { winnerIndex: 1, winnerPairId: selectedMatch.pair2Id };
    
    return null;
  };

  const matchWinner = selectedMatch ? getMatchWinner() : null;

  const finishMatchMutation = useMutation({
    mutationFn: async () => {
      if (!matchWinner) {
        throw new Error("No hay ganador determinado");
      }
      
      const response = await apiRequest("POST", `/api/matches/${selectedMatchId}/finish`, {
        winnerPairId: matchWinner.winnerPairId,
        sets: liveScore.sets,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Partido finalizado",
        description: "El resultado ha sido guardado y la cancha liberada",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current", tournament?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      setSelectedMatchId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al finalizar partido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!selectedMatch) {
    return (
      <Card>
        <CardHeader className="pb-3 md:pb-6">
          <CardTitle className="flex items-center text-base md:text-lg">
            <Trophy className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            <span className="hidden md:inline">Captura de Score en Tiempo Real</span>
            <span className="md:hidden">Captura de Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6">
          {currentMatches.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 md:py-8 text-sm">
              No hay partidos en curso para capturar score
            </p>
          ) : (
            <div className="space-y-2 md:space-y-3">
              <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                Selecciona un partido para comenzar a capturar el score:
              </p>
              {currentMatches.map((match: any) => (
                <Button
                  key={match.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 md:py-4 px-3"
                  onClick={() => handleSelectMatch(match)}
                  data-testid={`button-select-match-${match.id}`}
                >
                  <div className="w-full">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs md:text-sm truncate">{match.pair1?.player1?.name || 'Jugador 1'} / {match.pair1?.player2?.name || 'Jugador 2'}</p>
                        <p className="text-xs text-muted-foreground my-0.5">vs</p>
                        <p className="font-semibold text-xs md:text-sm truncate">{match.pair2?.player1?.name || 'Jugador 3'} / {match.pair2?.player2?.name || 'Jugador 4'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{match.court?.name || 'Cancha'}</Badge>
                        {match.categoryName && (
                          <p className="text-xs text-muted-foreground mt-1 hidden md:block">{match.categoryName}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const currentSetGames = getCurrentSetGames();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Trophy className="mr-2 h-5 w-5" />
              Captura de Score - {selectedMatch.court?.name || 'Cancha'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMatchId(null)}
              data-testid="button-back-to-matches"
            >
              ← Volver
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">{selectedMatch.pair1?.player1?.name || 'Jugador 1'} / {selectedMatch.pair1?.player2?.name || 'Jugador 2'}</p>
              </div>
              <div className="text-right">
                <Badge variant="secondary">{selectedMatch.categoryName || "Sin categoría"}</Badge>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground my-2">vs</p>
            <div>
              <p className="font-semibold">{selectedMatch.pair2?.player1?.name || 'Jugador 3'} / {selectedMatch.pair2?.player2?.name || 'Jugador 4'}</p>
            </div>
          </div>

          {liveScore.sets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Sets Completados:</h4>
              <div className="flex gap-2">
                {liveScore.sets.map((set: number[], index: number) => {
                  const setResult = isSetComplete(set);
                  return (
                    <Badge 
                      key={index} 
                      variant={setResult.complete ? "default" : "outline"} 
                      className="text-lg px-3 py-1"
                    >
                      {set[0]}-{set[1]}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-medium">Set {liveScore.currentSet}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={resetScore}
                data-testid="button-reset-score"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reiniciar
              </Button>
            </div>

            <div className="bg-secondary/20 p-4 md:p-6 rounded-lg">
              <p className="text-sm text-center text-muted-foreground mb-4">Juegos en Set Actual</p>
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                <div className="text-center">
                  <p className="text-4xl md:text-6xl font-bold mb-3 md:mb-4">{currentSetGames[0]}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 md:h-10 md:w-10 p-0"
                      onClick={() => removeGame(0)}
                      disabled={currentSetGames[0] === 0}
                      data-testid="button-remove-game-0"
                    >
                      <Minus className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                    <Button
                      onClick={() => addGame(0)}
                      size="sm"
                      className="h-9 md:h-12 px-4 md:px-6 text-sm md:text-base"
                      disabled={!!matchWinner}
                      data-testid="button-add-game-0"
                    >
                      <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                      Juego
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-4xl md:text-6xl font-bold mb-3 md:mb-4">{currentSetGames[1]}</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 md:h-10 md:w-10 p-0"
                      onClick={() => removeGame(1)}
                      disabled={currentSetGames[1] === 0}
                      data-testid="button-remove-game-1"
                    >
                      <Minus className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                    <Button
                      onClick={() => addGame(1)}
                      size="sm"
                      className="h-9 md:h-12 px-4 md:px-6 text-sm md:text-base"
                      disabled={!!matchWinner}
                      data-testid="button-add-game-1"
                    >
                      <Plus className="h-4 w-4 md:h-5 md:w-5 mr-1" />
                      Juego
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {matchWinner && (
            <div className="bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-4">
              <div className="text-center">
                <Trophy className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-green-700 dark:text-green-300 mb-1">
                  ¡Partido Ganado!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                  {matchWinner.winnerIndex === 0 
                    ? `${selectedMatch.pair1?.player1?.name} / ${selectedMatch.pair1?.player2?.name}` 
                    : `${selectedMatch.pair2?.player1?.name} / ${selectedMatch.pair2?.player2?.name}`}
                </p>
                <Button
                  onClick={() => finishMatchMutation.mutate()}
                  disabled={finishMatchMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-finish-match"
                >
                  {finishMatchMutation.isPending ? "Finalizando..." : "Finalizar Partido y Liberar Cancha"}
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Los cambios se guardan automáticamente y se reflejan en tiempo real
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
