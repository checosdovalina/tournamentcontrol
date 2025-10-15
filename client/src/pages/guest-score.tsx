import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import courtflowLogo from "@assets/_LogosCOURTFLOW  sin fondo_1760488965348.png";

export default function GuestScore() {
  const { toast } = useToast();
  const [, params] = useRoute("/score/:token");
  const token = params?.token;

  // Fetch match data using the public endpoint
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Initialize score structure
  const getInitialScore = () => ({
    sets: [] as number[][],
    currentSet: 1,
    currentPoints: [0, 0],
  });

  const [liveScore, setLiveScore] = useState<any>(getInitialScore());

  // Load score when match data is available
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
      
      const winner = currentPoints[playerIndex];
      const loser = currentPoints[otherIndex];
      
      if (winner >= 7 && (winner - loser) >= 2) {
        addGame(playerIndex);
        return;
      }
      
      newScore.currentPoints = currentPoints;
      setLiveScore(newScore);
      updateScoreMutation.mutate(newScore);
      return;
    }

    // NORMAL GAME LOGIC
    if (currentPoints[0] >= 3 && currentPoints[1] >= 3) {
      if (currentPoints[playerIndex] === currentPoints[otherIndex]) {
        currentPoints[playerIndex] = 4;
      } else if (currentPoints[playerIndex] === 4) {
        addGame(playerIndex);
        return;
      } else {
        currentPoints[otherIndex] = 3;
      }
    } else if (currentPoints[playerIndex] === 3) {
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
    
    if (!newScore.sets[currentSetIndex]) {
      newScore.sets[currentSetIndex] = [0, 0];
    }
    
    newScore.sets[currentSetIndex][playerIndex]++;
    newScore.currentPoints = [0, 0];
    
    const games = newScore.sets[currentSetIndex];
    const otherIndex = playerIndex === 0 ? 1 : 0;
    
    // Check if set is won (6-4, 7-5, 7-6)
    if ((games[playerIndex] >= 6 && games[playerIndex] - games[otherIndex] >= 2) ||
        (games[playerIndex] === 7 && games[otherIndex] === 6)) {
      newScore.currentSet++;
    }
    
    setLiveScore(newScore);
    updateScoreMutation.mutate(newScore);
  };

  const pointMap = [0, 15, 30, 40];

  const displayPoint = (points: number) => {
    if (isInTiebreak()) return points.toString();
    if (points === 4) return "AD";
    return pointMap[points] || "0";
  };

  const subtractPoint = (playerIndex: 0 | 1) => {
    const newScore = { ...liveScore };
    const currentPoints = [...newScore.currentPoints];
    
    if (currentPoints[playerIndex] > 0) {
      currentPoints[playerIndex]--;
      newScore.currentPoints = currentPoints;
      setLiveScore(newScore);
      updateScoreMutation.mutate(newScore);
    }
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img 
            src={courtflowLogo} 
            alt="CourtFlow" 
            className="h-16 w-auto"
          />
        </div>

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
              {/* Match Info */}
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

              {/* Live Score Display */}
              <div className="space-y-4">
                <h3 className="font-semibold">Score en Vivo</h3>
                
                {/* Sets Display */}
                {liveScore.sets.length > 0 && (
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="font-medium">Sets:</div>
                    <div className="flex gap-4">
                      {liveScore.sets.map((set: number[], idx: number) => (
                        <div key={idx} className="flex gap-1">
                          <Badge variant="secondary">{set[0]}</Badge>
                          <Badge variant="secondary">{set[1]}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Game */}
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isInTiebreak() ? "Tie-break" : `Juego Actual - Set ${liveScore.currentSet}`}
                  </p>
                  <div className="flex gap-4 items-center justify-center">
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-2xl font-bold">{displayPoint(liveScore.currentPoints[0])}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => subtractPoint(0)}
                          data-testid="button-subtract-point-pair1"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addPoint(0)}
                          data-testid="button-add-point-pair1"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="h-12" />
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => subtractPoint(1)}
                          data-testid="button-subtract-point-pair2"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => addPoint(1)}
                          data-testid="button-add-point-pair2"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-2xl font-bold">{displayPoint(liveScore.currentPoints[1])}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
