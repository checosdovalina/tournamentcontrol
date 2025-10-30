import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface ManageCourtsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageCourtsModal({ open, onOpenChange }: ManageCourtsModalProps) {
  const [newCourtName, setNewCourtName] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [streamUrl, setStreamUrl] = useState("");
  const { toast } = useToast();

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: open,
  });

  const { data: clubs = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
    enabled: open,
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current"],
    enabled: open,
  });

  const addCourtMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/courts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Cancha agregada exitosamente",
        description: `La cancha "${newCourtName}" ha sido creada`,
      });
      setNewCourtName("");
      setSelectedClub("");
      setStreamUrl("");
    },
    onError: (error: any) => {
      toast({
        title: "Error al agregar cancha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCourtMutation = useMutation({
    mutationFn: async ({ courtId, updates }: { courtId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/courts/${courtId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      toast({
        title: "Cancha actualizada",
        description: "El estado de la cancha ha sido actualizado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar cancha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const endMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiRequest("PATCH", `/api/matches/${matchId}`, {
        status: "finished",
        endTime: new Date(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      toast({
        title: "Partido finalizado",
        description: "El partido ha sido marcado como finalizado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al finalizar partido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddCourt = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCourtName || !selectedClub) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete el nombre de la cancha y seleccione un club",
        variant: "destructive",
      });
      return;
    }

    addCourtMutation.mutate({
      name: newCourtName,
      clubId: selectedClub,
      isAvailable: true,
      streamUrl: streamUrl || null,
    });
  };

  const handleEndMatch = (matchId: string) => {
    endMatchMutation.mutate(matchId);
  };

  const getCurrentMatch = (courtId: string) => {
    return currentMatches.find((match: any) => match.courtId === courtId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Gestionar Canchas</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Courts List */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Canchas Existentes</h4>
            {courts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay canchas registradas
              </div>
            ) : (
              <div className="space-y-3" data-testid="courts-management-list">
                {courts.map((court: any) => {
                  const currentMatch = getCurrentMatch(court.id);
                  return (
                    <div
                      key={court.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
                      data-testid={`court-management-${court.name.toLowerCase().replace(' ', '-')}`}
                    >
                      <div className="flex items-center space-x-4">
                        <span className={`status-indicator ${court.isAvailable ? 'status-available' : 'status-occupied'}`}></span>
                        <div>
                          <p className="font-medium" data-testid={`court-management-name-${court.name.toLowerCase().replace(' ', '-')}`}>
                            {court.name}
                          </p>
                          {currentMatch ? (
                            <p className="text-sm text-muted-foreground" data-testid={`court-management-match-${court.name.toLowerCase().replace(' ', '-')}`}>
                              {currentMatch.pair1.player1.name}/{currentMatch.pair1.player2.name} vs {currentMatch.pair2.player1.name}/{currentMatch.pair2.player2.name}
                            </p>
                          ) : (
                            <p className="text-sm text-success">Disponible</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {currentMatch && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleEndMatch(currentMatch.id)}
                            disabled={endMatchMutation.isPending}
                            data-testid={`button-end-match-${court.name.toLowerCase().replace(' ', '-')}`}
                          >
                            Finalizar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!court.isAvailable}
                          data-testid={`button-reassign-${court.name.toLowerCase().replace(' ', '-')}`}
                        >
                          Reasignar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add New Court */}
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-semibold mb-3">Agregar Nueva Cancha</h4>
            <form onSubmit={handleAddCourt} className="space-y-3">
              <div className="flex space-x-3">
                <Input
                  type="text"
                  placeholder="Nombre de la cancha"
                  className="flex-1"
                  value={newCourtName}
                  onChange={(e) => setNewCourtName(e.target.value)}
                  data-testid="input-new-court-name"
                />
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger className="w-48" data-testid="select-new-court-club">
                    <SelectValue placeholder="Seleccionar club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club: any) => (
                      <SelectItem key={club.id} value={club.id}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-3">
                <div className="flex-1">
                  <Label htmlFor="stream-url" className="text-xs text-muted-foreground mb-1 block">
                    URL del Stream de Video (opcional)
                  </Label>
                  <Input
                    id="stream-url"
                    type="url"
                    placeholder="https://ejemplo.com/stream/cam1"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    data-testid="input-new-court-stream-url"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={addCourtMutation.isPending}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 whitespace-nowrap self-end"
                  data-testid="button-add-court"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addCourtMutation.isPending ? "Agregando..." : "Agregar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-border">
          <Button 
            onClick={() => onOpenChange(false)}
            data-testid="button-close-manage-courts"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
