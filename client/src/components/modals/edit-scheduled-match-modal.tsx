import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { ScheduledMatchWithDetails } from "@shared/schema";
import { useEffect } from "react";

interface EditScheduledMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: ScheduledMatchWithDetails | null;
  tournamentId?: string;
}

const formSchema = z.object({
  day: z.date(),
  plannedTime: z.string().min(1, "La hora es requerida"),
  pair1Id: z.string().min(1, "Pareja 1 es requerida"),
  pair2Id: z.string().min(1, "Pareja 2 es requerida"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  format: z.string().optional(),
  courtId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EditScheduledMatchModal({ 
  open, 
  onOpenChange, 
  match,
  tournamentId 
}: EditScheduledMatchModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      day: match?.day ? new Date(match.day) : new Date(),
      plannedTime: match?.plannedTime || "",
      pair1Id: match?.pair1Id || "",
      pair2Id: match?.pair2Id || "",
      categoryId: match?.categoryId || "",
      format: match?.format || "",
      courtId: match?.courtId || undefined,
    },
  });

  // Update form when match changes
  useEffect(() => {
    if (match) {
      form.reset({
        day: match.day ? new Date(match.day) : new Date(),
        plannedTime: match.plannedTime || "",
        pair1Id: match.pair1Id || "",
        pair2Id: match.pair2Id || "",
        categoryId: match.categoryId || "",
        format: match.format || "",
        courtId: match.courtId || undefined,
      });
    }
  }, [match, form]);

  const { data: pairs, isLoading: pairsLoading } = useQuery<any[]>({
    queryKey: ["/api/pairs", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/pairs?tournamentId=${tournamentId}`);
      return response.json();
    },
    enabled: !!tournamentId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories", tournamentId],
    enabled: !!tournamentId,
  });

  const { data: courts } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: !!tournamentId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!match) throw new Error("No match to update");
      
      const payload = {
        day: format(data.day, "yyyy-MM-dd"),
        plannedTime: data.plannedTime,
        pair1Id: data.pair1Id,
        pair2Id: data.pair2Id,
        categoryId: data.categoryId,
        format: data.format || null,
        courtId: data.courtId || null,
      };

      return apiRequest("PATCH", `/api/scheduled-matches/${match.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/api/scheduled-matches" ||
          query.queryKey[0] === "/api/scheduled-matches/day" ||
          query.queryKey[0] === "/api/scheduled-matches/today"
      });
      toast({ title: "Partido actualizado", description: "Los cambios se guardaron correctamente" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo actualizar el partido", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  const getPairLabel = (pair: any) => {
    return `${pair.player1?.name || "?"} / ${pair.player2?.name || "?"}`;
  };

  // Filter pairs by selected category
  const selectedCategoryId = form.watch("categoryId");
  const filteredPairs = pairs?.filter(pair => {
    if (!selectedCategoryId) return true;
    return pair.categoryId === selectedCategoryId;
  }) || [];

  // Reset pair selections when category changes manually
  const handleCategoryChange = (value: string) => {
    const currentCategoryId = form.getValues("categoryId");
    form.setValue("categoryId", value);
    
    // Only reset pairs if the category is actually changing (not initial load)
    if (currentCategoryId && currentCategoryId !== value) {
      form.setValue("pair1Id", "");
      form.setValue("pair2Id", "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Partido Programado</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-edit-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Time */}
              <FormField
                control={form.control}
                name="plannedTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        data-testid="input-edit-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select 
                    onValueChange={handleCategoryChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-category">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem 
                          key={cat.id} 
                          value={cat.id}
                          data-testid={`option-edit-category-${cat.id}`}
                        >
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pair 1 */}
            <FormField
              control={form.control}
              name="pair1Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pareja 1</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={pairsLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-pair1">
                        <SelectValue placeholder={pairsLoading ? "Cargando parejas..." : "Seleccionar pareja 1"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pairsLoading ? (
                        <div className="p-2 text-sm text-muted-foreground">Cargando...</div>
                      ) : filteredPairs.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {selectedCategoryId ? "No hay parejas en esta categoría" : "No hay parejas disponibles"}
                        </div>
                      ) : (
                        filteredPairs.map((pair) => (
                          <SelectItem 
                            key={pair.id} 
                            value={pair.id}
                            disabled={pair.id === form.watch("pair2Id")}
                            data-testid={`option-edit-pair1-${pair.id}`}
                          >
                            {getPairLabel(pair)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pair 2 */}
            <FormField
              control={form.control}
              name="pair2Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pareja 2</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={pairsLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-pair2">
                        <SelectValue placeholder={pairsLoading ? "Cargando parejas..." : "Seleccionar pareja 2"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pairsLoading ? (
                        <div className="p-2 text-sm text-muted-foreground">Cargando...</div>
                      ) : filteredPairs.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          {selectedCategoryId ? "No hay parejas en esta categoría" : "No hay parejas disponibles"}
                        </div>
                      ) : (
                        filteredPairs.map((pair) => (
                          <SelectItem 
                            key={pair.id} 
                            value={pair.id}
                            disabled={pair.id === form.watch("pair1Id")}
                            data-testid={`option-edit-pair2-${pair.id}`}
                          >
                            {getPairLabel(pair)}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Format */}
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-format">
                        <SelectValue placeholder="Seleccionar formato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="best_of_3" data-testid="option-edit-format-bo3">
                        Mejor de 3
                      </SelectItem>
                      <SelectItem value="best_of_5" data-testid="option-edit-format-bo5">
                        Mejor de 5
                      </SelectItem>
                      <SelectItem value="single_set" data-testid="option-edit-format-single">
                        Set único
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Court Selection */}
            <FormField
              control={form.control}
              name="courtId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancha (opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-court">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none" data-testid="option-edit-court-none">
                        Sin asignar
                      </SelectItem>
                      {courts?.map((court) => (
                        <SelectItem 
                          key={court.id} 
                          value={court.id}
                          data-testid={`option-edit-court-${court.id}`}
                        >
                          {court.name} - {court.surface}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-edit-cancel"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-edit-save"
              >
                {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
