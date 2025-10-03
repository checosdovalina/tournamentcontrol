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
}

type FormData = z.infer<typeof insertClubSchema>;

export default function CreateClubModal({ open, onOpenChange }: CreateClubModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(insertClubSchema),
    defaultValues: {
      name: "",
      address: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/clubs", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clubs"] });
      toast({ title: "Club creado", description: "El club se creó exitosamente" });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo crear el club", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-create-club">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Club</DialogTitle>
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
                disabled={createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending ? "Creando..." : "Crear Club"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
