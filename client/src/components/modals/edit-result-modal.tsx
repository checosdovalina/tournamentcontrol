import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EditResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: any;
}

export default function EditResultModal({ open, onOpenChange, result }: EditResultModalProps) {
  const [sets, setSets] = useState<number[][]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (result?.score?.sets) {
      setSets(result.score.sets);
    }
  }, [result]);

  const updateResultMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/results/${result.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Resultado actualizado",
        description: "El resultado ha sido modificado exitosamente",
      });
      
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar resultado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate new winner based on sets
    let team1Sets = 0;
    let team2Sets = 0;

    sets.forEach(([score1, score2]) => {
      if (score1 > score2) team1Sets++;
      else if (score2 > score1) team2Sets++;
    });

    const newWinnerId = team1Sets > team2Sets 
      ? result.match.pair1Id 
      : result.match.pair2Id;
    
    const newLoserId = team1Sets > team2Sets 
      ? result.match.pair2Id 
      : result.match.pair1Id;

    updateResultMutation.mutate({
      score: { sets },
      winnerId: newWinnerId,
      loserId: newLoserId,
    });
  };

  const updateSet = (setIndex: number, team: number, value: string) => {
    const newSets = [...sets];
    if (!newSets[setIndex]) {
      newSets[setIndex] = [0, 0];
    }
    newSets[setIndex][team] = parseInt(value) || 0;
    setSets(newSets);
  };

  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Resultado</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                {result.match.pair1?.player1?.name} / {result.match.pair1?.player2?.name}
              </p>
              <p className="text-xs text-muted-foreground my-1">vs</p>
              <p className="text-sm font-medium">
                {result.match.pair2?.player1?.name} / {result.match.pair2?.player2?.name}
              </p>
            </div>
          </div>

          {/* Sets */}
          <div className="space-y-3">
            {[0, 1, 2].map((setIndex) => (
              <div key={setIndex} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                <div>
                  <Label className="text-xs">Set {setIndex + 1} - Equipo 1</Label>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    value={sets[setIndex]?.[0] || ""}
                    onChange={(e) => updateSet(setIndex, 0, e.target.value)}
                    placeholder="0"
                    required={setIndex < 2}
                  />
                </div>
                <span className="text-muted-foreground mt-6">-</span>
                <div>
                  <Label className="text-xs">Set {setIndex + 1} - Equipo 2</Label>
                  <Input
                    type="number"
                    min="0"
                    max="7"
                    value={sets[setIndex]?.[1] || ""}
                    onChange={(e) => updateSet(setIndex, 1, e.target.value)}
                    placeholder="0"
                    required={setIndex < 2}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateResultMutation.isPending}>
              {updateResultMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
