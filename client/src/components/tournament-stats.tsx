import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Clock, LayersIcon } from "lucide-react";

interface TournamentStatsProps {
  tournamentId?: string;
}

export default function TournamentStats({ tournamentId }: TournamentStatsProps) {
  const { data: stats, isLoading } = useQuery<{ matchesPlayed: number; pairsRegistered: number; avgTime: string; activeCourts: string }>({
    queryKey: ["/api/stats", tournamentId],
    enabled: !!tournamentId,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-6 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: "Partidos Jugados",
      value: stats?.matchesPlayed || 0,
      icon: Trophy,
      color: "text-primary",
      bgColor: "bg-primary/10",
      testId: "stat-matches-played"
    },
    {
      title: "Parejas Registradas", 
      value: stats?.pairsRegistered || 0,
      icon: Users,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      testId: "stat-pairs-registered"
    },
    {
      title: "Tiempo Promedio",
      value: stats?.avgTime || "0 min",
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
      testId: "stat-avg-time"
    },
    {
      title: "Canchas Activas",
      value: stats?.activeCourts || "0/0",
      icon: LayersIcon,
      color: "text-success",
      bgColor: "bg-success/10",
      testId: "stat-active-courts"
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4" data-testid="tournament-stats-container">
      {statsData.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground mt-1" data-testid={stat.testId}>
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                <stat.icon className={`${stat.color} text-xl`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
