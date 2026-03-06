import { useState, useRef } from "react";
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
import { Pencil, Trash2, Users, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function PlayerPhoto({ name, photoUrl, size = 32 }: { name: string; photoUrl?: string | null; size?: number }) {
  const initials = name
    ? name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "?";
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover border border-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold border border-border"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function PairsManagement() {
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [photoTarget, setPhotoTarget] = useState<{ id: string; name: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tournament } = useQuery<{ id: string }>({
    queryKey: ["/api/tournament"],
  });

  const { data: pairs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/pairs", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/pairs?tournamentId=${tournament.id}`);
      return response.json();
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

  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ playerId, file }: { playerId: string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/players/${playerId}/photo`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al subir foto");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pairs"] });
      toast({ title: "Foto actualizada correctamente" });
      closePhotoModal();
    },
    onError: () => {
      toast({ title: "Error al subir la foto", variant: "destructive" });
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

  const openPhotoModal = (player: { id: string; name: string }) => {
    setPhotoTarget(player);
    setPreviewUrl(null);
    setSelectedFile(null);
    setPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setPhotoModalOpen(false);
    setPhotoTarget(null);
    setPreviewUrl(null);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadPhoto = () => {
    if (!photoTarget || !selectedFile) return;
    uploadPhotoMutation.mutate({ playerId: photoTarget.id, file: selectedFile });
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
                    <div className="space-y-2">
                      {[pair.player1, pair.player2].map((player, idx) => (
                        player ? (
                          <div key={idx} className="flex items-center gap-2">
                            <PlayerPhoto name={player.name} photoUrl={player.photoUrl} />
                            <span className="text-sm">{player.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => openPhotoModal(player)}
                              title="Subir foto del jugador"
                              data-testid={`button-photo-player-${player.id}`}
                            >
                              <Camera className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : null
                      ))}
                    </div>
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

      {/* Photo Upload Modal */}
      <Dialog open={photoModalOpen} onOpenChange={(open) => { if (!open) closePhotoModal(); }}>
        <DialogContent data-testid="dialog-photo-player">
          <DialogHeader>
            <DialogTitle>Foto de {photoTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewUrl ? (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover border-2 border-border"
                />
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg py-8 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Haz clic para seleccionar una foto</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — máx. 5MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              data-testid="input-player-photo"
            />
            {previewUrl && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Cambiar foto
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePhotoModal}>Cancelar</Button>
            <Button
              onClick={handleUploadPhoto}
              disabled={!selectedFile || uploadPhotoMutation.isPending}
              data-testid="button-upload-photo"
            >
              {uploadPhotoMutation.isPending ? "Subiendo..." : "Guardar foto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
