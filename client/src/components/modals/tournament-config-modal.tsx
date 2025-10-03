import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, Plus, Trash2, UserPlus } from "lucide-react";

interface TournamentConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: any;
}

interface Sponsor {
  name: string;
  url: string;
}

export default function TournamentConfigModal({ open, onOpenChange, tournament }: TournamentConfigModalProps) {
  const [tournamentName, setTournamentName] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [newSponsorName, setNewSponsorName] = useState("");
  const [newSponsorUrl, setNewSponsorUrl] = useState("");
  const { toast } = useToast();

  const { data: clubs = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
    enabled: open,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const updateTournamentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/tournaments/${tournament.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament"] });
      toast({
        title: "Configuración guardada",
        description: "La configuración del torneo ha sido actualizada",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar configuración",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (tournament && open) {
      setTournamentName(tournament.name || "");
      setSelectedClub(tournament.clubId || "");
      setStartDate(tournament.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : "");
      setEndDate(tournament.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : "");
      setSponsors(tournament.config?.sponsors || []);
    }
  }, [tournament, open]);

  const handleAddSponsor = () => {
    if (!newSponsorName) return;
    
    setSponsors([...sponsors, { name: newSponsorName, url: newSponsorUrl }]);
    setNewSponsorName("");
    setNewSponsorUrl("");
  };

  const handleRemoveSponsor = (index: number) => {
    setSponsors(sponsors.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournamentName || !selectedClub || !startDate || !endDate) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const config = {
      ...tournament.config,
      sponsors,
      logos: tournament.config?.logos || {},
    };

    updateTournamentMutation.mutate({
      name: tournamentName,
      clubId: selectedClub,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      config,
    });
  };

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary';
      case 'scorekeeper':
        return 'bg-secondary/10 text-secondary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Configuración del Torneo</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Settings */}
          <div>
            <h4 className="text-md font-semibold mb-4">Información General</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tournamentName">Nombre del Torneo</Label>
                <Input
                  id="tournamentName"
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  data-testid="input-tournament-name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="club">Club Sede</Label>
                <Select value={selectedClub} onValueChange={setSelectedClub}>
                  <SelectTrigger data-testid="select-tournament-club">
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
              <div>
                <Label htmlFor="startDate">Fecha de Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">Fecha de Finalización</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                  required
                />
              </div>
            </div>
          </div>

          {/* Logos & Branding */}
          <div className="border-t border-border pt-6">
            <h4 className="text-md font-semibold mb-4">Logos y Marca</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Logo del Torneo</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20">
                  <CloudUpload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Subir logo</p>
                  <p className="text-xs text-muted-foreground mt-1">Funcionalidad próximamente</p>
                </div>
              </div>
              <div>
                <Label>Logo del Club</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20">
                  <CloudUpload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Subir logo</p>
                  <p className="text-xs text-muted-foreground mt-1">Funcionalidad próximamente</p>
                </div>
              </div>
              <div>
                <Label>Logo del Sistema</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer bg-muted/20">
                  <CloudUpload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Subir logo</p>
                  <p className="text-xs text-muted-foreground mt-1">Funcionalidad próximamente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sponsor Banners */}
          <div className="border-t border-border pt-6">
            <h4 className="text-md font-semibold mb-4">Banners de Patrocinadores</h4>
            <div className="space-y-3">
              {sponsors.map((sponsor, index) => (
                <div key={index} className="flex items-center space-x-3" data-testid={`sponsor-${index}`}>
                  <Input
                    type="text"
                    placeholder="Nombre del patrocinador"
                    className="flex-1"
                    value={sponsor.name}
                    readOnly
                  />
                  <Input
                    type="text"
                    placeholder="URL del banner"
                    className="flex-1"
                    value={sponsor.url}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSponsor(index)}
                    className="text-destructive hover:text-destructive/80"
                    data-testid={`button-remove-sponsor-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center space-x-3">
                <Input
                  type="text"
                  placeholder="Nombre del patrocinador"
                  className="flex-1"
                  value={newSponsorName}
                  onChange={(e) => setNewSponsorName(e.target.value)}
                  data-testid="input-new-sponsor-name"
                />
                <Input
                  type="text"
                  placeholder="URL del banner"
                  className="flex-1"
                  value={newSponsorUrl}
                  onChange={(e) => setNewSponsorUrl(e.target.value)}
                  data-testid="input-new-sponsor-url"
                />
                <Button
                  type="button"
                  onClick={handleAddSponsor}
                  disabled={!newSponsorName}
                  className="text-primary hover:text-primary/80"
                  data-testid="button-add-sponsor"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              </div>
            </div>
          </div>

          {/* User Management */}
          <div className="border-t border-border pt-6">
            <h4 className="text-md font-semibold mb-4">Gestión de Usuarios</h4>
            <div className="space-y-3" data-testid="users-management-list">
              {users.map((user: any) => (
                <Card key={user.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                          {getUserInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`user-name-${user.id}`}>{user.name}</p>
                          <p className="text-sm text-muted-foreground" data-testid={`user-username-${user.id}`}>{user.username}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-md text-sm font-medium ${getRoleColor(user.role)}`}>
                        {user.role === 'admin' ? 'Administrador' : user.role === 'scorekeeper' ? 'Escribano' : 'Usuario'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <div className="text-center text-muted-foreground">
                    <UserPlus className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Agregar Usuario</p>
                    <p className="text-xs mt-1">Funcionalidad próximamente</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-config"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateTournamentMutation.isPending}
              data-testid="button-save-config"
            >
              {updateTournamentMutation.isPending ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
