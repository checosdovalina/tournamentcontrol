import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertTournamentSchema } from "@shared/schema";
import { z } from "zod";

interface CreateTournamentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: any;
}

const formSchema = insertTournamentSchema.extend({
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().min(1, "Fecha de fin requerida"),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateTournamentModal({ open, onOpenChange, tournament }: CreateTournamentModalProps) {
  const { toast } = useToast();
  const isEditing = !!tournament;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      clubId: "",
      startDate: "",
      endDate: "",
      isActive: true,
      tournamentLogoUrl: "",
      clubLogoUrl: "",
      systemLogoUrl: "",
    },
  });

  // Reset form when tournament changes or modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: tournament?.name || "",
        clubId: tournament?.clubId || "",
        startDate: tournament?.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : "",
        endDate: tournament?.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : "",
        isActive: tournament?.isActive ?? true,
        tournamentLogoUrl: tournament?.tournamentLogoUrl || "",
        clubLogoUrl: tournament?.clubLogoUrl || "",
        systemLogoUrl: tournament?.systemLogoUrl || "",
      });
    }
  }, [open, tournament, form]);

  const { data: clubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      };
      if (isEditing) {
        return apiRequest("PATCH", `/api/admin/tournaments/${tournament.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/tournaments", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tournaments"] });
      toast({ 
        title: isEditing ? "Torneo actualizado" : "Torneo creado", 
        description: isEditing ? "El torneo se actualizó exitosamente" : "El torneo se creó exitosamente"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || `No se pudo ${isEditing ? 'actualizar' : 'crear'} el torneo`, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-create-tournament">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Torneo' : 'Crear Nuevo Torneo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Torneo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Torneo Primavera 2024" data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clubId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Club</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-club">
                        <SelectValue placeholder="Seleccionar club..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clubs?.map((club) => (
                        <SelectItem key={club.id} value={club.id} data-testid={`option-club-${club.id}`}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Fin</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tournamentLogoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Logo del Torneo (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="https://ejemplo.com/torneo-logo.png" 
                      data-testid="input-tournament-logo"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clubLogoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Logo del Club (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="https://ejemplo.com/club-logo.png" 
                      data-testid="input-club-logo"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemLogoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Logo del Sistema (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="https://ejemplo.com/sistema-logo.png" 
                      data-testid="input-system-logo"
                      value={field.value || ""}
                    />
                  </FormControl>
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
                disabled={saveMutation.isPending}
                data-testid="button-submit"
              >
                {saveMutation.isPending ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Torneo")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
