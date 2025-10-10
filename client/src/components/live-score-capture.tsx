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

  const finishMatchMutation = useMutation({
    mutationFn: async () => {
      const winner = getWinner();
      if (winner === null) {
        throw new Error("No hay un ganador definido");
      }

      const winnerId = winner === 0 ? selectedMatch.pair1Id : selectedMatch.pair2Id;
      const loserId = winner === 0 ? selectedMatch.pair2Id : selectedMatch.pair1Id;

      const response = await apiRequest("POST", "/api/results", {
        matchId: selectedMatchId,
        winnerId,
        loserId,
        score: { sets: liveScore.sets },
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Partido finalizado",
        description: "El resultado ha sido guardado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current", tournament?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
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

    // Reset points after game
    newScore.currentPoints = [0, 0];

    // Check if set is won
    let setWon = false;
    
    // Win by 2 games difference (e.g., 6-4, 6-3, 6-2, 6-1, 6-0, or 7-5, 8-6, etc.)
    if (games[playerIndex] >= 6 && (games[playerIndex] - games[otherIndex]) >= 2) {
      setWon = true;
    }
    // Tiebreak won (7-6)
    else if (games[playerIndex] === 7 && games[otherIndex] === 6) {
      setWon = true;
    }
    // At 6-6, enter tiebreak mode (don't end set)
    else if (games[0] === 6 && games[1] === 6) {
      setWon = false;
    }

    if (setWon) {
      // Set won, check if match is won (best of 3)
      const setsWon = getSetsWon(newScore.sets);
      if (setsWon[playerIndex] + 1 >= 2) {
        // Match won! Don't increment set number
        // Match is over
      } else {
        // Start new set
        newScore.currentSet++;
      }
    }

    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  // Calculate sets won by each pair
  const getSetsWon = (sets: number[][]) => {
    const setsWon = [0, 0];
    sets.forEach((set) => {
      if (set[0] > set[1]) {
        setsWon[0]++;
      } else if (set[1] > set[0]) {
        setsWon[1]++;
      }
    });
    return setsWon;
  };

  // Check if there's a winner (best of 3 sets)
  const getWinner = () => {
    const setsWon = getSetsWon(liveScore.sets);
    if (setsWon[0] >= 2) return 0;
    if (setsWon[1] >= 2) return 1;
    return null;
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
  const winner = getWinner();
  const isMatchFinished = winner !== null;

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

          {/* Winner Message */}
          {isMatchFinished && (
            <div className="bg-green-100 dark:bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="font-semibold text-green-700 dark:text-green-300">
                  ¡Partido Finalizado! Ganador: {winner === 0 
                    ? `${selectedMatch.pair1?.player1?.name} / ${selectedMatch.pair1?.player2?.name}`
                    : `${selectedMatch.pair2?.player1?.name} / ${selectedMatch.pair2?.player2?.name}`
                  }
                </p>
              </div>
            </div>
          )}

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
                      disabled={liveScore.currentPoints[0] === 0 || isMatchFinished}
                      data-testid="button-remove-point-0"
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <Button
                      onClick={() => addPoint(0)}
                      size="sm"
                      className="h-8 md:h-10 px-3 md:px-4"
                      disabled={isMatchFinished}
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
                      disabled={liveScore.currentPoints[1] === 0 || isMatchFinished}
                      data-testid="button-remove-point-1"
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                    <Button
                      onClick={() => addPoint(1)}
                      size="sm"
                      className="h-8 md:h-10 px-3 md:px-4"
                      disabled={isMatchFinished}
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

          {/* Finish Match Button */}
          {isMatchFinished && (
            <div className="flex justify-center">
              <Button
                size="lg"
                className="w-full md:w-auto"
                onClick={() => finishMatchMutation.mutate()}
                disabled={finishMatchMutation.isPending}
                data-testid="button-finish-match"
              >
                <Trophy className="mr-2 h-5 w-5" />
                {finishMatchMutation.isPending ? "Guardando..." : "Finalizar Partido y Guardar Resultado"}
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            {isMatchFinished 
              ? "Haz clic en 'Finalizar Partido' para guardar el resultado"
              : "Los cambios se guardan automáticamente y se reflejan en tiempo real"
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
