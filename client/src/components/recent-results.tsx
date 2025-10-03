import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";

interface RecentResultsProps {
  tournamentId?: string;
}

export default function RecentResults({ tournamentId }: RecentResultsProps) {
  const { data: results = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/results/recent", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 30000,
  });

  const formatTimeAgo = (createdAt: string | Date) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Hace menos de 1 min";
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Hace ${diffHours}h ${diffMinutes % 60}min`;
    
    return created.toLocaleDateString();
  };

  const formatScore = (score: any) => {
    if (!score || !Array.isArray(score.sets)) return "0-0, 0-0";
    return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(", ");
  };

  const getLoserScore = (score: any) => {
    if (!score || !Array.isArray(score.sets)) return "0-0, 0-0";
    return score.sets.map((set: any) => `${set[1] || 0}-${set[0] || 0}`).join(", ");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="text-success mr-2" />
            Resultados Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
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
        <CardTitle className="flex items-center">
          <CheckCircle className="text-success mr-2" />
          Resultados Recientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay resultados recientes
          </div>
        ) : (
          <div className="space-y-4" data-testid="recent-results-container">
            {results.map((result: any) => (
              <div
                key={result.id}
                className="pb-4 border-b border-border last:border-b-0 last:pb-0"
                data-testid={`result-${result.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    <span data-testid={`result-time-${result.id}`}>
                      {formatTimeAgo(result.createdAt)}
                    </span>
                  </span>
                  <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                    {result.match?.court?.name || 'Cancha'}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" data-testid={`winner-${result.id}`}>
                      {result.winner.player1.name} / {result.winner.player2.name}
                    </span>
                    <span className="text-sm font-mono font-semibold text-success" data-testid={`winner-score-${result.id}`}>
                      {formatScore(result.score)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground" data-testid={`loser-${result.id}`}>
                      {result.loser.player1.name} / {result.loser.player2.name}
                    </span>
                    <span className="text-sm font-mono text-muted-foreground" data-testid={`loser-score-${result.id}`}>
                      {getLoserScore(result.score)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
