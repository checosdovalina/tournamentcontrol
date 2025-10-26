import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock, Clock } from "lucide-react";
import courtflowLogo from "@assets/_LogosCOURTFLOW  sin fondo_1760488965348.png";

export default function ScoreSelect() {
  const [, params] = useRoute("/score-capture/:tournamentId");
  const tournamentId = params?.tournamentId;
  const [, setLocation] = useLocation();

  const { data: matches, isLoading } = useQuery({
    queryKey: ["/api/matches/tournament", tournamentId, "active"],
    queryFn: async () => {
      const response = await fetch(`/api/matches/tournament/${tournamentId}/active`);
      if (!response.ok) {
        throw new Error("Failed to load matches");
      }
      return response.json();
    },
    enabled: !!tournamentId,
    refetchInterval: 5000, // Refresh every 5 seconds to show updated lock status
  });

  const handleSelectMatch = (match: any) => {
    if (!match.isAvailableForCapture) {
      return; // Don't allow selection if locked
    }
    // Navigate to the guest-score page with the match's access token
    setLocation(`/score/${match.accessToken}`);
  };

  const formatExpiresIn = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p>Cargando partidos...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <img 
                src={courtflowLogo} 
                alt="CourtFlow" 
                className="h-16 w-auto"
              />
            </div>
            <CardTitle className="text-center">Captura de Scores</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>No hay partidos activos en este momento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Selecciona un Partido
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Toca un partido disponible para comenzar a capturar el score
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {matches.map((match: any) => (
                <Card 
                  key={match.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    match.isAvailableForCapture 
                      ? 'border-green-500 hover:border-green-600' 
                      : 'border-red-300 opacity-60 cursor-not-allowed'
                  }`}
                  onClick={() => handleSelectMatch(match)}
                  data-testid={`card-match-${match.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {match.court?.name || 'Sin cancha'}
                          </Badge>
                          {!match.isAvailableForCapture && (
                            <div className="flex items-center gap-1 text-red-500 text-xs">
                              <Lock className="h-3 w-3" />
                              <span>En uso</span>
                              {match.captureExpiresIn > 0 && (
                                <span className="flex items-center gap-1 ml-1">
                                  <Clock className="h-3 w-3" />
                                  {formatExpiresIn(match.captureExpiresIn)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Pareja 1</p>
                            <p className="font-medium">
                              {match.pair1?.player1?.name || 'N/A'} / {match.pair1?.player2?.name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pareja 2</p>
                            <p className="font-medium">
                              {match.pair2?.player1?.name || 'N/A'} / {match.pair2?.player2?.name || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {match.score?.sets && match.score.sets.length > 0 && (
                          <div className="flex gap-2 text-xs">
                            <span className="text-muted-foreground">Score:</span>
                            {match.score.sets.map((set: number[], idx: number) => (
                              <span key={idx} className="font-mono">
                                {set[0]}-{set[1]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {match.isAvailableForCapture && (
                        <Button 
                          size="sm" 
                          className="shrink-0"
                          data-testid={`button-select-match-${match.id}`}
                        >
                          Capturar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-white/70 text-sm">
          Los partidos marcados con <Lock className="inline h-3 w-3" /> están siendo capturados por otro usuario
        </p>
      </div>
    </div>
  );
}
