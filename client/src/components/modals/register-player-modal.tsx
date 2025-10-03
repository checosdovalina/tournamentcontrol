import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RegisterPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId?: string;
}

export default function RegisterPlayerModal({ open, onOpenChange, tournamentId }: RegisterPlayerModalProps) {
  const [player1Name, setPlayer1Name] = useState("");
  const [player2Name, setPlayer2Name] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [markPresent, setMarkPresent] = useState(false);
  const { toast } = useToast();

  const { data: clubs = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  const registerPairMutation = useMutation({
    mutationFn: async (data: any) => {
      // Create players first
      const player1Response = await apiRequest("POST", "/api/players", {
        name: data.player1Name,
        clubId: data.clubId
      });
      const player1 = await player1Response.json();

      const player2Response = await apiRequest("POST", "/api/players", {
        name: data.player2Name, 
        clubId: data.clubId
      });
      const player2 = await player2Response.json();

      // Create pair
      const pairResponse = await apiRequest("POST", "/api/pairs", {
        player1Id: player1.id,
        player2Id: player2.id,
        tournamentId: data.tournamentId,
        isPresent: data.markPresent,
        isWaiting: data.markPresent,
        waitingSince: data.markPresent ? new Date() : null
      });
      
      return pairResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Pareja registrada exitosamente",
        description: `${player1Name} / ${player2Name} han sido registrados`,
      });
      
      // Reset form
      setPlayer1Name("");
      setPlayer2Name("");
      setSelectedClub("");
      setMarkPresent(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al registrar pareja",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!player1Name || !player2Name || !selectedClub || !tournamentId) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    registerPairMutation.mutate({
      player1Name,
      player2Name,
      clubId: selectedClub,
      tournamentId,
      markPresent,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Nueva Pareja</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="player1">Jugador 1</Label>
            <Input
              id="player1"
              data-testid="input-player1"
              type="text"
              placeholder="Nombre completo"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="player2">Jugador 2</Label>
            <Input
              id="player2"
              data-testid="input-player2"
              type="text"
              placeholder="Nombre completo"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="club">Club</Label>
            <Select value={selectedClub} onValueChange={setSelectedClub}>
              <SelectTrigger data-testid="select-club">
                <SelectValue placeholder="Seleccionar club" />
              </SelectTrigger>
              <SelectContent>
                {clubs.map((club: any) => (
                  <SelectItem 
                    key={club.id} 
                    value={club.id}
                    data-testid={`option-club-${club.id}`}
                  >
                    {club.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="mark-present"
              data-testid="checkbox-mark-present"
              checked={markPresent}
              onCheckedChange={(checked) => setMarkPresent(checked === true)}
            />
            <Label htmlFor="mark-present" className="text-sm">
              Marcar como presente
            </Label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={registerPairMutation.isPending}
              data-testid="button-register-pair"
            >
              {registerPairMutation.isPending ? "Registrando..." : "Registrar Pareja"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
