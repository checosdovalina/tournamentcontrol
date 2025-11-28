import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Trophy, Plus, Minus, ArrowLeft, Undo2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import courtflowLogo from "@assets/_LogosCOURTFLOW  sin fondo_1760488965348.png";

export default function GuestScore() {
  const { toast } = useToast();
  const [, params] = useRoute("/score/:token");
  const token = params?.token;
  const [, setLocation] = useLocation();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<any[]>([]);
  const [autoFinishCountdown, setAutoFinishCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: match, isLoading, error } = useQuery({
    queryKey: ["/api/matches/public", token],
    queryFn: async () => {
      const response = await fetch(`/api/matches/public/${token}`);
      if (!response.ok) {
        throw new Error("Partido no encontrado");
      }
      return response.json();
    },
    enabled: !!token,
    refetchInterval: 5000,
  });

  const getInitialScore = () => ({
    sets: [] as number[][],
    currentSet: 1,
  });

  const [liveScore, setLiveScore] = useState<any>(getInitialScore());

  useEffect(() => {
    if (match?.score) {
      setLiveScore(match.score);
    } else if (match) {
      setLiveScore(getInitialScore());
    }
  }, [match]);

  const updateScoreMutation = useMutation({
    mutationFn: async (score: any) => {
      const response = await fetch(`/api/matches/public/${token}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      
      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        if (contentType?.includes("application/json")) {
          const error = await response.json();
          throw new Error(error.message || "Failed to update score");
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/public", token] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar score",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completeMatchMutation = useMutation({
    mutationFn: async (winnerId: string) => {
      const response = await fetch(`/api/matches/public/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, score: liveScore }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete match");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Partido finalizado",
        description: "El partido se ha completado exitosamente",
      });
      releaseMutation.mutate(); // Release the match lock
      queryClient.invalidateQueries({ queryKey: ["/api/matches/public", token] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al finalizar partido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Claim match mutation
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!match?.id) return;
      const response = await fetch(`/api/matches/${match.id}/claim`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to claim match");
      }
      return response.json();
    },
    onSuccess: () => {
      setIsClaimed(true);
      // Start heartbeat interval (every 2 minutes)
      heartbeatIntervalRef.current = setInterval(() => {
        if (match?.id) {
          fetch(`/api/matches/${match.id}/heartbeat`, { method: "PATCH" });
        }
      }, 120000); // 2 minutes
    },
    onError: (error: any) => {
      toast({
        title: "Partido no disponible",
        description: error.message || "Este partido está siendo capturado por otro usuario",
        variant: "destructive",
      });
      // Redirect back after 2 seconds
      setTimeout(() => {
        setLocation(`/score-capture/${match?.tournamentId}`);
      }, 2000);
    },
  });

  // Release match mutation
  const releaseMutation = useMutation({
    mutationFn: async () => {
      if (!match?.id) return;
      const response = await fetch(`/api/matches/${match.id}/release`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to release match");
      }
      return response.json();
    },
  });

  // Claim match on mount
  useEffect(() => {
    if (match?.id && !isClaimed && match.status === "playing") {
      claimMutation.mutate();
    }
  }, [match?.id]);

  // Release match on unmount or when leaving the page
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (isClaimed && match?.id) {
        fetch(`/api/matches/${match.id}/release`, { method: "POST" });
      }
    };
  }, [isClaimed, match?.id]);

  const saveToHistory = useCallback((score: any) => {
    setScoreHistory(prev => [...prev, JSON.parse(JSON.stringify(score))]);
  }, []);

  const undoLastAction = useCallback(() => {
    if (scoreHistory.length === 0) return;
    
    const previousScore = scoreHistory[scoreHistory.length - 1];
    setScoreHistory(prev => prev.slice(0, -1));
    setLiveScore(previousScore);
    updateScoreMutation.mutate(previousScore);
    
    // Cancel auto-finish countdown when undoing
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoFinishCountdown(null);
    
    toast({
      title: "Acción deshecha",
      description: "Se restauró el marcador anterior",
    });
  }, [scoreHistory, updateScoreMutation, toast]);

  const addGame = (playerIndex: 0 | 1) => {
    // Save current state to history before making changes
    saveToHistory(liveScore);
    
    const newScore = { ...liveScore };
    const currentSetIndex = newScore.currentSet - 1;
    
    if (!newScore.sets[currentSetIndex]) {
      newScore.sets[currentSetIndex] = [0, 0];
    }
    
    newScore.sets[currentSetIndex][playerIndex]++;
    
    const games = newScore.sets[currentSetIndex];
    const otherIndex = playerIndex === 0 ? 1 : 0;
    
    if ((games[playerIndex] >= 6 && games[playerIndex] - games[otherIndex] >= 2) ||
        (games[playerIndex] === 7 && games[otherIndex] === 6)) {
      newScore.currentSet++;
    }
    
    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const subtractGame = (playerIndex: 0 | 1) => {
    // Save current state to history before making changes
    saveToHistory(liveScore);
    
    const newScore = { ...liveScore };
    const currentSetIndex = newScore.currentSet - 1;
    
    if (newScore.sets[currentSetIndex] && newScore.sets[currentSetIndex][playerIndex] > 0) {
      newScore.sets[currentSetIndex][playerIndex]--;
      setLiveScore(newScore);
      updateScoreMutation.mutate(newScore);
    }
  };

  const isSetComplete = (set: number[]) => {
    return (set[0] >= 6 && set[0] - set[1] >= 2) || 
           (set[1] >= 6 && set[1] - set[0] >= 2) ||
           (set[0] === 7 && set[1] === 6) ||
           (set[1] === 7 && set[0] === 6);
  };

  const isMatchComplete = () => {
    const setsWon = [0, 0];
    
    liveScore.sets.forEach((set: number[]) => {
      if (isSetComplete(set)) {
        if (set[0] > set[1]) setsWon[0]++;
        else if (set[1] > set[0]) setsWon[1]++;
      }
    });
    
    return setsWon[0] >= 2 || setsWon[1] >= 2;
  };

  const getWinnerId = () => {
    const setsWon = [0, 0];
    
    liveScore.sets.forEach((set: number[]) => {
      if (isSetComplete(set)) {
        if (set[0] > set[1]) setsWon[0]++;
        else if (set[1] > set[0]) setsWon[1]++;
      }
    });
    
    if (setsWon[0] >= 2) return match.pair1Id;
    if (setsWon[1] >= 2) return match.pair2Id;
    return null;
  };

  const getCurrentSetGames = () => {
    const currentSetIndex = liveScore.currentSet - 1;
    return liveScore.sets[currentSetIndex] || [0, 0];
  };

  // Auto-finish countdown when match is complete
  useEffect(() => {
    const matchComplete = isMatchComplete();
    const winnerId = getWinnerId();
    
    if (matchComplete && match?.status !== "finished" && winnerId && autoFinishCountdown === null) {
      // Start 15 second countdown
      setAutoFinishCountdown(15);
      
      countdownIntervalRef.current = setInterval(() => {
        setAutoFinishCountdown(prev => {
          if (prev === null || prev <= 1) {
            // Time's up - auto-complete the match
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            completeMatchMutation.mutate(winnerId);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Cleanup on unmount
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [liveScore]);

  // Cancel countdown if match becomes incomplete (e.g., user undid an action)
  useEffect(() => {
    if (!isMatchComplete() && autoFinishCountdown !== null) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setAutoFinishCountdown(null);
    }
  }, [liveScore, autoFinishCountdown]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p>Cargando partido...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-500">Partido no encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSetGames = getCurrentSetGames();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-center mb-4">
          <img 
            src={courtflowLogo} 
            alt="CourtFlow" 
            className="h-16 w-auto"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            releaseMutation.mutate();
            setLocation(`/score-capture/${match.tournamentId}`);
          }}
          className="mb-2"
          data-testid="button-back-to-list"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a la lista
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                <span>Captura de Score - Invitado</span>
              </div>
              <Badge variant="outline">{match.court.name}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pareja 1</p>
                  <p className="font-semibold">
                    {match.pair1.player1.name} / {match.pair1.player2.name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pareja 2</p>
                  <p className="font-semibold">
                    {match.pair2.player1.name} / {match.pair2.player2.name}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Score en Vivo</h3>
                
                {liveScore.sets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Sets Completados:</p>
                    <div className="flex gap-2 flex-wrap">
                      {liveScore.sets.map((set: number[], idx: number) => {
                        const complete = isSetComplete(set);
                        return (
                          <Badge 
                            key={idx} 
                            variant={complete ? "default" : "secondary"}
                            className="text-base px-3 py-1"
                          >
                            {set[0]} - {set[1]}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-center text-muted-foreground mb-4">
                    {match.status === "finished" 
                      ? "Partido Finalizado" 
                      : `Juegos - Set ${liveScore.currentSet}`
                    }
                  </p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center space-y-3">
                      <p className="text-4xl font-bold">{currentSetGames[0]}</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => subtractGame(0)}
                          disabled={match.status === "finished" || isMatchComplete() || currentSetGames[0] === 0}
                          data-testid="button-subtract-game-pair1"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addGame(0)}
                          disabled={match.status === "finished" || isMatchComplete()}
                          data-testid="button-add-game-pair1"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Juego
                        </Button>
                      </div>
                    </div>

                    <div className="text-center space-y-3">
                      <p className="text-4xl font-bold">{currentSetGames[1]}</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => subtractGame(1)}
                          disabled={match.status === "finished" || isMatchComplete() || currentSetGames[1] === 0}
                          data-testid="button-subtract-game-pair2"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addGame(1)}
                          disabled={match.status === "finished" || isMatchComplete()}
                          data-testid="button-add-game-pair2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Juego
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Undo button - always visible when there's history */}
                {scoreHistory.length > 0 && match.status !== "finished" && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={undoLastAction}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      data-testid="button-undo-score"
                    >
                      <Undo2 className="h-4 w-4 mr-2" />
                      Deshacer último cambio
                    </Button>
                  </div>
                )}

                {isMatchComplete() && match.status !== "finished" && (
                  <div className="mt-6 pt-6 border-t space-y-4">
                    {/* Auto-finish countdown */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">
                          Finalizando automáticamente en {autoFinishCountdown || 0} segundos
                        </span>
                      </div>
                      <Progress 
                        value={((autoFinishCountdown || 0) / 15) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-center text-yellow-600 mt-2">
                        Puedes deshacer el último cambio si hubo un error
                      </p>
                    </div>

                    {/* Undo button during countdown */}
                    {scoreHistory.length > 0 && (
                      <Button
                        variant="outline"
                        className="w-full text-orange-600 border-orange-300 hover:bg-orange-50"
                        size="lg"
                        onClick={undoLastAction}
                        data-testid="button-undo-final"
                      >
                        <Undo2 className="h-5 w-5 mr-2" />
                        Deshacer y corregir
                      </Button>
                    )}

                    {/* Manual finish button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => {
                        const winnerId = getWinnerId();
                        if (winnerId) {
                          if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                          }
                          completeMatchMutation.mutate(winnerId);
                        }
                      }}
                      disabled={completeMatchMutation.isPending}
                      data-testid="button-complete-match"
                    >
                      <Trophy className="h-5 w-5 mr-2" />
                      {completeMatchMutation.isPending ? "Finalizando..." : "Finalizar Ahora"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
