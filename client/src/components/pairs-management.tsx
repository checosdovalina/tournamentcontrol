import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PairsManagement() {
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: tournament } = useQuery<{ id: string }>({
    queryKey: ["/api/tournament"],
  });

  const { data: pairs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pairs", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/pairs`);
      const allPairs = await response.json();
      return allPairs.filter((p: any) => p.tournamentId === tournament.id);
    },
    enabled: !!tournament?.id,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", tournament?.id],
    enabled: !!tournament?.id,
  });

  const updatePairMutation = useMutation({
    mutationFn: async ({ pairId, categoryId }: { pairId: string; categoryId: string }) => {
      return apiRequest("PATCH", `/api/pairs/${pairId}`, { categoryId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairs"] });
      toast({ title: "Pareja actualizada correctamente" });
      setEditModalOpen(false);
      setSelectedPair(null);
    },
    onError: () => {
      toast({ title: "Error al actualizar pareja", variant: "destructive" });
    },
  });

  const deletePairMutation = useMutation({
    mutationFn: async (pairId: string) => {
      return apiRequest("DELETE", `/api/pairs/${pairId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairs"] });
      toast({ title: "Pareja eliminada correctamente" });
      setDeleteModalOpen(false);
      setSelectedPair(null);
    },
    onError: () => {
      toast({ title: "Error al eliminar pareja", variant: "destructive" });
    },
  });

  const handleEdit = (pair: any) => {
    setSelectedPair(pair);
    setSelectedCategory(pair.categoryId || "");
    setEditModalOpen(true);
  };

  const handleDelete = (pair: any) => {
    setSelectedPair(pair);
    setDeleteModalOpen(true);
  };

  const handleUpdatePair = () => {
    if (!selectedPair || !selectedCategory) return;
    updatePairMutation.mutate({ pairId: selectedPair.id, categoryId: selectedCategory });
  };

  const handleConfirmDelete = () => {
    if (!selectedPair) return;
    deletePairMutation.mutate(selectedPair.id);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Sin categoría";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Sin categoría";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Cargando parejas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-xl font-bold">Parejas Registradas</h2>
        </div>
        <Badge variant="secondary">{pairs.length} parejas</Badge>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jugadores</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay parejas registradas
                </TableCell>
              </TableRow>
            ) : (
              pairs.map((pair) => (
                <TableRow key={pair.id} data-testid={`row-pair-${pair.id}`}>
                  <TableCell className="font-medium">
                    {pair.player1?.name || "?"} / {pair.player2?.name || "?"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryName(pair.categoryId)}</Badge>
                  </TableCell>
                  <TableCell>
                    {pair.isPresent ? (
                      <Badge className="bg-green-600">Presente</Badge>
                    ) : pair.isWaiting ? (
                      <Badge className="bg-yellow-600">En espera</Badge>
                    ) : (
                      <Badge variant="secondary">Registrada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pair)}
                        data-testid={`button-edit-pair-${pair.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pair)}
                        data-testid={`button-delete-pair-${pair.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent data-testid="dialog-edit-pair">
          <DialogHeader>
            <DialogTitle>Editar Pareja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm font-medium mb-2">Jugadores:</p>
              <p className="text-sm text-muted-foreground">
                {selectedPair?.player1?.name || "?"} / {selectedPair?.player2?.name || "?"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePair}
              disabled={!selectedCategory || updatePairMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updatePairMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent data-testid="dialog-delete-pair">
          <DialogHeader>
            <DialogTitle>Eliminar Pareja</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              ¿Estás seguro de que deseas eliminar la pareja de{" "}
              <strong>
                {selectedPair?.player1?.name || "?"} / {selectedPair?.player2?.name || "?"}
              </strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Esta acción no se puede deshacer.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletePairMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePairMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
