import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar, MapPin } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";

interface Tournament {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  clubId: string;
}

export default function TournamentSelect() {
  const [, setLocation] = useLocation();

  const { data: tournaments, isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments/active"],
  });

  const { data: user } = useQuery<{ user: { id: string; username: string; name: string; role: string } }>({
    queryKey: ["/api/auth/me"],
  });

  const selectTournamentMutation = useMutation({
    mutationFn: async (tournamentId: string) => {
      return apiRequest("POST", `/api/tournaments/select/${tournamentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament"] });
      setLocation("/dashboard");
    },
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando torneos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={courtflowLogo} alt="CourtFlow" className="h-[60px] w-auto" />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Selecciona un Torneo</h1>
          <p className="text-muted-foreground">
            Elige el torneo en el que deseas trabajar
          </p>
        </div>

        {!tournaments || tournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No hay torneos disponibles</h2>
            <p className="text-muted-foreground">
              No tienes acceso a ningún torneo activo. Contacta al administrador.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <Card 
                key={tournament.id} 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => selectTournamentMutation.mutate(tournament.id)}
                data-testid={`card-tournament-${tournament.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    {tournament.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    disabled={selectTournamentMutation.isPending}
                    data-testid={`button-select-tournament-${tournament.id}`}
                  >
                    {selectTournamentMutation.isPending ? "Seleccionando..." : "Entrar al torneo"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
