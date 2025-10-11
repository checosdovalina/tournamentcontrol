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
import { insertScheduledMatchSchema, type InsertScheduledMatch } from "@shared/schema";
import { z } from "zod";

interface ScheduleMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId?: string;
  selectedDate: Date;
}

const formSchema = insertScheduledMatchSchema.extend({
  plannedTime: z.string().min(1, "La hora es requerida"),
  categoryId: z.string().min(1, "La categoría es requerida"),
  format: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ScheduleMatchModal({ open, onOpenChange, tournamentId, selectedDate }: ScheduleMatchModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tournamentId: tournamentId || "",
      day: selectedDate,
      plannedTime: "",
      pair1Id: "",
      pair2Id: "",
      categoryId: "",
      format: "",
      status: "scheduled",
      courtId: undefined,
    },
  });

  const { data: pairs } = useQuery<any[]>({
    queryKey: ["/api/pairs"],
    enabled: !!tournamentId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories", tournamentId],
    enabled: !!tournamentId,
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        tournamentId: data.tournamentId,
        day: format(selectedDate, "yyyy-MM-dd"),
        plannedTime: data.plannedTime,
        pair1Id: data.pair1Id,
        pair2Id: data.pair2Id,
        categoryId: data.categoryId,
        format: data.format,
        status: "scheduled" as const,
        courtId: undefined,
      };

      return apiRequest("POST", "/api/scheduled-matches", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      toast({ title: "Partido programado", description: "El partido se agregó al calendario" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo programar el partido", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    scheduleMutation.mutate(data);
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

  // Reset pair selections when category changes
  const handleCategoryChange = (value: string) => {
    form.setValue("categoryId", value);
    form.setValue("pair1Id", "");
    form.setValue("pair2Id", "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-schedule-match">
        <DialogHeader>
          <DialogTitle>Programar Partido</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Fecha: <span className="font-medium">{format(selectedDate, "dd/MM/yyyy")}</span>
            </div>

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
                      data-testid="input-planned-time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <Select onValueChange={handleCategoryChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Seleccionar categoría..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id} data-testid={`option-category-${category.id}`}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-format">
                        <SelectValue placeholder="Seleccionar formato..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Round Robin" data-testid="option-format-roundrobin">Round Robin</SelectItem>
                      <SelectItem value="8vos" data-testid="option-format-8vos">8vos de Final</SelectItem>
                      <SelectItem value="4tos" data-testid="option-format-4tos">4tos de Final</SelectItem>
                      <SelectItem value="Semifinal" data-testid="option-format-semifinal">Semifinal</SelectItem>
                      <SelectItem value="Repechaje" data-testid="option-format-repechaje">Repechaje</SelectItem>
                      <SelectItem value="Final" data-testid="option-format-final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pair1Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pareja 1</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedCategoryId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-pair1">
                        <SelectValue placeholder={selectedCategoryId ? "Seleccionar pareja..." : "Primero seleccione una categoría"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredPairs?.map((pair) => (
                        <SelectItem key={pair.id} value={pair.id} data-testid={`option-pair1-${pair.id}`}>
                          {getPairLabel(pair)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pair2Id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pareja 2</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedCategoryId}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-pair2">
                        <SelectValue placeholder={selectedCategoryId ? "Seleccionar pareja..." : "Primero seleccione una categoría"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredPairs?.filter(p => p.id !== form.watch("pair1Id")).map((pair) => (
                        <SelectItem key={pair.id} value={pair.id} data-testid={`option-pair2-${pair.id}`}>
                          {getPairLabel(pair)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
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
                disabled={scheduleMutation.isPending}
                data-testid="button-submit"
              >
                {scheduleMutation.isPending ? "Programando..." : "Programar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
