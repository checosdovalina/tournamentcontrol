import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RecordResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId?: string;
}

export default function RecordResultModal({ open, onOpenChange, tournamentId }: RecordResultModalProps) {
  const [selectedMatch, setSelectedMatch] = useState("");
  const [set1Team1, setSet1Team1] = useState("");
  const [set1Team2, setSet1Team2] = useState("");
  const [set2Team1, setSet2Team1] = useState("");
  const [set2Team2, setSet2Team2] = useState("");
  const [set3Team1, setSet3Team1] = useState("");
  const [set3Team2, setSet3Team2] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournamentId],
    enabled: !!tournamentId && open,
  });

  const selectedMatchData = currentMatches.find((match: any) => match.id === selectedMatch);

  const recordResultMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/results", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Resultado registrado exitosamente",
        description: "El resultado del partido ha sido guardado",
      });
      
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al registrar resultado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedMatch("");
    setSet1Team1("");
    setSet1Team2("");
    setSet2Team1("");
    setSet2Team2("");
    setSet3Team1("");
    setSet3Team2("");
    setNotes("");
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const calculateWinner = () => {
    if (!selectedMatchData) return null;

    const sets = [
      [parseInt(set1Team1) || 0, parseInt(set1Team2) || 0],
      [parseInt(set2Team1) || 0, parseInt(set2Team2) || 0],
    ];

    // Add third set if played
    if (set3Team1 && set3Team2) {
      sets.push([parseInt(set3Team1) || 0, parseInt(set3Team2) || 0]);
    }

    let team1Sets = 0;
    let team2Sets = 0;

    sets.forEach(([score1, score2]) => {
      if (score1 > score2) team1Sets++;
      else if (score2 > score1) team2Sets++;
    });

    if (team1Sets > team2Sets) {
      return {
        winnerId: selectedMatchData.pair1Id,
        loserId: selectedMatchData.pair2Id,
      };
    } else if (team2Sets > team1Sets) {
      return {
        winnerId: selectedMatchData.pair2Id,
        loserId: selectedMatchData.pair1Id,
      };
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMatch || !set1Team1 || !set1Team2 || !set2Team1 || !set2Team2) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete al menos los dos primeros sets",
        variant: "destructive",
      });
      return;
    }

    const winner = calculateWinner();
    if (!winner) {
      toast({
        title: "Resultado inválido",
        description: "No se puede determinar un ganador con los puntajes ingresados",
        variant: "destructive",
      });
      return;
    }

    const sets = [
      [parseInt(set1Team1), parseInt(set1Team2)],
      [parseInt(set2Team1), parseInt(set2Team2)],
    ];

    if (set3Team1 && set3Team2) {
      sets.push([parseInt(set3Team1), parseInt(set3Team2)]);
    }

    const score = { sets };

    recordResultMutation.mutate({
      matchId: selectedMatch,
      winnerId: winner.winnerId,
      loserId: winner.loserId,
      score,
      duration: selectedMatchData ? Math.floor((new Date().getTime() - new Date(selectedMatchData.startTime).getTime()) / (1000 * 60)) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Registrar Resultado del Partido</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Match */}
          <div>
            <Label htmlFor="match">Seleccionar Partido</Label>
            <Select value={selectedMatch} onValueChange={setSelectedMatch}>
              <SelectTrigger data-testid="select-match">
                <SelectValue placeholder="Seleccionar partido en curso" />
              </SelectTrigger>
              <SelectContent>
                {currentMatches.map((match: any) => (
                  <SelectItem key={match.id} value={match.id}>
                    {match.court.name} - {match.pair1.player1.name}/{match.pair1.player2.name} vs {match.pair2.player1.name}/{match.pair2.player2.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMatchData && (
            <>
              {/* Score Input */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-4">Marcador del Partido</h4>
                
                {/* Set 1 */}
                <div className="grid grid-cols-5 gap-4 items-center mb-3">
                  <div className="col-span-2">
                    <span className="text-sm font-medium">
                      {selectedMatchData.pair1.player1.name} / {selectedMatchData.pair1.player2.name}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    placeholder="0"
                    className="col-span-1 text-center font-mono"
                    value={set1Team1}
                    onChange={(e) => setSet1Team1(e.target.value)}
                    data-testid="input-set1-team1"
                  />
                  <span className="text-center text-muted-foreground">vs</span>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    placeholder="0"
                    className="col-span-1 text-center font-mono"
                    value={set1Team2}
                    onChange={(e) => setSet1Team2(e.target.value)}
                    data-testid="input-set1-team2"
                  />
                </div>
                <div className="grid grid-cols-5 gap-4 items-center mb-4">
                  <div className="col-span-2">
                    <span className="text-sm font-medium">
                      {selectedMatchData.pair2.player1.name} / {selectedMatchData.pair2.player2.name}
                    </span>
                  </div>
                  <span className="col-span-3 text-xs text-muted-foreground text-center">Set 1</span>
                </div>

                {/* Set 2 */}
                <div className="grid grid-cols-5 gap-4 items-center mb-3">
                  <div className="col-span-2">
                    <span className="text-sm font-medium">
                      {selectedMatchData.pair1.player1.name} / {selectedMatchData.pair1.player2.name}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    placeholder="0"
                    className="col-span-1 text-center font-mono"
                    value={set2Team1}
                    onChange={(e) => setSet2Team1(e.target.value)}
                    data-testid="input-set2-team1"
                  />
                  <span className="text-center text-muted-foreground">vs</span>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    placeholder="0"
                    className="col-span-1 text-center font-mono"
                    value={set2Team2}
                    onChange={(e) => setSet2Team2(e.target.value)}
                    data-testid="input-set2-team2"
                  />
                </div>
                <div className="grid grid-cols-5 gap-4 items-center mb-4">
                  <div className="col-span-2">
                    <span className="text-sm font-medium">
                      {selectedMatchData.pair2.player1.name} / {selectedMatchData.pair2.player2.name}
                    </span>
                  </div>
                  <span className="col-span-3 text-xs text-muted-foreground text-center">Set 2</span>
                </div>

                {/* Set 3 (Optional) */}
                <div className="grid grid-cols-5 gap-4 items-center mb-3">
                  <div className="col-span-2">
                    <span className="text-sm font-medium">
                      {selectedMatchData.pair1.player1.name} / {selectedMatchData.pair1.player2.name}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    placeholder="0"
                    className="col-span-1 text-center font-mono"
                    value={set3Team1}
                    onChange={(e) => setSet3Team1(e.target.value)}
                    data-testid="input-set3-team1"
                  />
                  <span className="text-center text-muted-foreground">vs</span>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    placeholder="0"
                    className="col-span-1 text-center font-mono"
                    value={set3Team2}
                    onChange={(e) => setSet3Team2(e.target.value)}
                    data-testid="input-set3-team2"
                  />
                </div>
                <div className="grid grid-cols-5 gap-4 items-center">
                  <div className="col-span-2">
                    <span className="text-sm font-medium">
                      {selectedMatchData.pair2.player1.name} / {selectedMatchData.pair2.player2.name}
                    </span>
                  </div>
                  <span className="col-span-3 text-xs text-muted-foreground text-center">Set 3 (Opcional)</span>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Observaciones sobre el partido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="textarea-notes"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-border">
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
              disabled={recordResultMutation.isPending}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              data-testid="button-save-result"
            >
              {recordResultMutation.isPending ? "Guardando..." : "Guardar Resultado"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
