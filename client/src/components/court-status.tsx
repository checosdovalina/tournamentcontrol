import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayersIcon, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function CourtStatus() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const { data: courts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    refetchInterval: 30000,
  });

  const releaseOrphanedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/courts/release-orphaned", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      if (data.courts.length > 0) {
        toast({
          title: "Canchas liberadas",
          description: `Se liberaron ${data.courts.length} cancha${data.courts.length > 1 ? 's' : ''}: ${data.courts.join(', ')}`,
        });
      } else {
        toast({
          title: "Sin cambios",
          description: "No se encontraron canchas huérfanas para liberar",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron liberar las canchas",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LayersIcon className="text-secondary mr-2" />
            Estado de Canchas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasOrphanedCourts = courts.some(c => !c.isAvailable);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <LayersIcon className="text-secondary mr-2" />
            Estado de Canchas
          </CardTitle>
          {isAdmin && hasOrphanedCourts && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => releaseOrphanedMutation.mutate()}
              disabled={releaseOrphanedMutation.isPending}
              data-testid="button-release-orphaned-courts"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${releaseOrphanedMutation.isPending ? 'animate-spin' : ''}`} />
              Liberar Canchas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3" data-testid="courts-status-container">
          {courts.map((court: any) => (
            <div
              key={court.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                court.isAvailable
                  ? 'bg-success/5 border-success/20'
                  : 'bg-destructive/5 border-destructive/20'
              }`}
              data-testid={`court-${court.name.toLowerCase().replace(' ', '-')}`}
            >
              <div className="flex items-center space-x-3">
                <span className={`status-indicator ${
                  court.isAvailable ? 'status-available' : 'status-occupied'
                }`}></span>
                <span className="font-medium" data-testid={`court-name-${court.name.toLowerCase().replace(' ', '-')}`}>
                  {court.name}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                court.isAvailable
                  ? 'bg-success text-success-foreground'
                  : 'bg-destructive text-destructive-foreground'
              }`} data-testid={`court-status-${court.name.toLowerCase().replace(' ', '-')}`}>
                {court.isAvailable ? 'Disponible' : 'Ocupada'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
