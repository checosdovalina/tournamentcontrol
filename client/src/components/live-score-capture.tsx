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

  // Initialize score structure
  const getInitialScore = () => ({
    sets: [] as number[][],
    currentSet: 1,
    currentPoints: [0, 0] // Using numeric points: 0, 15, 30, 40, advantage
  });

  const [liveScore, setLiveScore] = useState<any>(getInitialScore());

  // Load score when match is selected
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

  const pointMap = [0, 15, 30, 40];

  // Check if we're in tiebreak
  const isInTiebreak = () => {
    const currentSetIndex = liveScore.currentSet - 1;
    const games = liveScore.sets[currentSetIndex] || [0, 0];
    return games[0] === 6 && games[1] === 6;
  };

  const addPoint = (playerIndex: 0 | 1) => {
    const newScore = { ...liveScore };
    const currentPoints = [...newScore.currentPoints];
    const otherIndex = playerIndex === 0 ? 1 : 0;

    // TIEBREAK LOGIC
    if (isInTiebreak()) {
      currentPoints[playerIndex]++;
      
      // Check if tiebreak is won: first to 7 with 2-point difference
      const winner = currentPoints[playerIndex];
      const loser = currentPoints[otherIndex];
      
      if (winner >= 7 && (winner - loser) >= 2) {
        // Tiebreak won! Add game and move to next set
        addGame(playerIndex);
        return;
      }
      
      // Tiebreak continues
      newScore.currentPoints = currentPoints;
      setLiveScore(newScore);
      updateScoreMutation.mutate(newScore);
      return;
    }

    // NORMAL GAME LOGIC (0-15-30-40-deuce-advantage)
    // Handle deuce and advantage
    if (currentPoints[0] >= 3 && currentPoints[1] >= 3) {
      if (currentPoints[playerIndex] === currentPoints[otherIndex]) {
        // Deuce - give advantage
        currentPoints[playerIndex] = 4;
      } else if (currentPoints[playerIndex] === 4) {
        // Had advantage, wins game
        addGame(playerIndex);
        return;
      } else {
        // Other had advantage, back to deuce
        currentPoints[otherIndex] = 3;
      }
    } else if (currentPoints[playerIndex] === 3) {
      // Wins game (40 to win)
      addGame(playerIndex);
      return;
    } else {
      currentPoints[playerIndex]++;
    }

    newScore.currentPoints = currentPoints;
    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const addGame = (playerIndex: 0 | 1) => {
    const newScore = { ...liveScore };
    const currentSetIndex = newScore.currentSet - 1;
    
    // Initialize current set if needed
    if (!newScore.sets[currentSetIndex]) {
      newScore.sets[currentSetIndex] = [0, 0];
    }

    newScore.sets[currentSetIndex][playerIndex]++;
    const games = newScore.sets[currentSetIndex];
    const otherIndex = playerIndex === 0 ? 1 : 0;

    // Check if set is won (need 6 games and lead by 2, or tiebreak at 7-6)
    if (games[playerIndex] >= 6 && games[playerIndex] - games[otherIndex] >= 2) {
      // Set won, start new set
      newScore.currentSet++;
      newScore.currentPoints = [0, 0];
    } else if (games[playerIndex] === 7 && games[otherIndex] === 6) {
      // Tiebreak won
      newScore.currentSet++;
      newScore.currentPoints = [0, 0];
    } else {
      // Game won, reset points
      newScore.currentPoints = [0, 0];
    }

    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const removePoint = (playerIndex: 0 | 1) => {
    const newScore = { ...liveScore };
    const currentPoints = [...newScore.currentPoints];

    if (currentPoints[playerIndex] > 0) {
      currentPoints[playerIndex]--;
      newScore.currentPoints = currentPoints;
      setLiveScore(newScore);
      updateScoreMutation.mutate(newScore);
    }
  };

  const resetScore = () => {
    const newScore = getInitialScore();
    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const formatPoints = (points: number) => {
    // In tiebreak, show actual numeric points
    if (isInTiebreak()) {
      return points;
    }
    
    // In normal game, use tennis scoring
    if (points === 4) return "AD";
    return pointMap[points] || 0;
  };

  const getCurrentSetGames = () => {
    const currentSetIndex = liveScore.currentSet - 1;
    return liveScore.sets[currentSetIndex] || [0, 0];
  };

  // Check if a set is complete and who won it
  const isSetComplete = (set: number[]) => {
    const [games1, games2] = set;
    // Valid completed sets: 6-x with difference >= 2, or 7-6 (tiebreak), or 7-5
    if (games1 >= 6 && games1 - games2 >= 2) return { complete: true, winner: 0 };
    if (games2 >= 6 && games2 - games1 >= 2) return { complete: true, winner: 1 };
    if (games1 === 7 && games2 === 6) return { complete: true, winner: 0 };
    if (games2 === 7 && games1 === 6) return { complete: true, winner: 1 };
    return { complete: false, winner: null };
  };

  // Check if there's a match winner (best of 3 sets)
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
    
    // First to win 2 sets wins the match
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
          {/* Match Info */}
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

          {/* Sets History */}
          {liveScore.sets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Sets Completados:</h4>
              <div className="flex gap-2">
                {liveScore.sets.map((set: number[], index: number) => (
                  <Badge key={index} variant="outline" className="text-lg px-3 py-1">
                    {set[0]}-{set[1]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Current Set */}
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

            {/* Games in Current Set */}
            <div className="bg-primary/5 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold">{currentSetGames[0]}</p>
                  <p className="text-xs text-muted-foreground">Juegos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{currentSetGames[1]}</p>
                  <p className="text-xs text-muted-foreground">Juegos</p>
                </div>
              </div>
            </div>

            {/* Current Points */}
            <div className="bg-secondary/20 p-3 md:p-6 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2 md:mb-3">
                <p className="text-xs text-center text-muted-foreground">Puntos Actuales</p>
                {isInTiebreak() && (
                  <Badge variant="destructive" className="text-xs">TIEBREAK</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 md:gap-6">
                <div className="text-center">
                  <p className="text-3xl md:text-5xl font-bold mb-2 md:mb-3">{formatPoints(liveScore.currentPoints[0])}</p>
                  <div className="flex gap-1 md:gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 md:h-9 md:w-9 p-0"
                      onClick={() => removePoint(0)}
                      disabled={liveScore.currentPoints[0] === 0}
                      data-testid="button-remove-point-0"
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <Button
                      onClick={() => addPoint(0)}
                      size="sm"
                      className="h-8 md:h-10 px-3 md:px-4"
                      data-testid="button-add-point-0"
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                      <span className="hidden md:inline">Punto</span>
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-3xl md:text-5xl font-bold mb-2 md:mb-3">{formatPoints(liveScore.currentPoints[1])}</p>
                  <div className="flex gap-1 md:gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 md:h-9 md:w-9 p-0"
                      onClick={() => removePoint(1)}
                      disabled={liveScore.currentPoints[1] === 0}
                      data-testid="button-remove-point-1"
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <Button
                      onClick={() => addPoint(1)}
                      size="sm"
                      className="h-8 md:h-10 px-3 md:px-4"
                      data-testid="button-add-point-1"
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4 md:mr-1" />
                      <span className="hidden md:inline">Punto</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Match Winner Section */}
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
