import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayersIcon } from "lucide-react";

export default function CourtStatus() {
  const { data: courts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    refetchInterval: 30000,
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/30">
        <CardTitle className="flex items-center">
          <LayersIcon className="text-secondary mr-2" />
          Estado de Canchas
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3" data-testid="courts-status-container">
          {courts.map((court: any) => {
            const isEnabled = court.isEnabled !== false; // Default to true if not set
            const isActuallyAvailable = court.isAvailable && isEnabled;
            
            return (
              <div
                key={court.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isActuallyAvailable
                    ? 'bg-success/5 border-success/20'
                    : 'bg-destructive/5 border-destructive/20'
                }`}
                data-testid={`court-${court.name.toLowerCase().replace(' ', '-')}`}
              >
                <div className="flex items-center space-x-3">
                  <span className={`status-indicator ${
                    isActuallyAvailable ? 'status-available' : 'status-occupied'
                  }`}></span>
                  <span className="font-medium" data-testid={`court-name-${court.name.toLowerCase().replace(' ', '-')}`}>
                    {court.name}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  isActuallyAvailable
                    ? 'bg-success text-success-foreground'
                    : 'bg-destructive text-destructive-foreground'
                }`} data-testid={`court-status-${court.name.toLowerCase().replace(' ', '-')}`}>
                  {!isEnabled ? 'No disponible' : court.isAvailable ? 'Disponible' : 'Ocupada'}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
