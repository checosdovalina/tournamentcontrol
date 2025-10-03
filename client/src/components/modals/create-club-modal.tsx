import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertClubSchema } from "@shared/schema";
import { z } from "zod";

interface CreateClubModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  club?: any;
}

type FormData = z.infer<typeof insertClubSchema>;

export default function CreateClubModal({ open, onOpenChange, club }: CreateClubModalProps) {
  const { toast } = useToast();
  const isEditing = !!club;

  const form = useForm<FormData>({
    resolver: zodResolver(insertClubSchema),
    defaultValues: {
      name: club?.name || "",
      address: club?.address || "",
      logoUrl: club?.logoUrl || "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEditing) {
        return apiRequest("PATCH", `/api/clubs/${club.id}`, data);
      }
      return apiRequest("POST", "/api/clubs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      toast({ 
        title: isEditing ? "Club actualizado" : "Club creado", 
        description: isEditing ? "El club se actualizó exitosamente" : "El club se creó exitosamente"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || `No se pudo ${isEditing ? 'actualizar' : 'crear'} el club`, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-create-club">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Club' : 'Crear Nuevo Club'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Club</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Club Deportivo Central" data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Av. Principal 123, Ciudad" 
                      data-testid="input-address"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL del Logo (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="https://ejemplo.com/logo.png" 
                      data-testid="input-logoUrl"
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
                {saveMutation.isPending ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Club")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
