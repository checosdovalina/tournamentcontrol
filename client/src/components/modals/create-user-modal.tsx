import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
}

type FormData = z.infer<typeof insertUserSchema> & { password?: string };

export default function CreateUserModal({ open, onOpenChange, user }: CreateUserModalProps) {
  const { toast } = useToast();
  const isEditing = !!user;

  const formSchema = isEditing
    ? insertUserSchema.extend({
        password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres").optional(),
      })
    : insertUserSchema.extend({
        password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
      });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "scorekeeper",
    },
  });

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        username: user?.username || "",
        password: "",
        name: user?.name || "",
        role: user?.role || "scorekeeper",
      });
    }
  }, [open, user, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = data.password ? data : { ...data, password: undefined };
      if (isEditing) {
        return apiRequest("PATCH", `/api/admin/users/${user.id}`, payload);
      }
      return apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: isEditing ? "Usuario actualizado" : "Usuario creado", 
        description: isEditing ? "El usuario se actualizó exitosamente" : "El usuario se creó exitosamente"
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || `No se pudo ${isEditing ? 'actualizar' : 'crear'} el usuario`, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="modal-create-user">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Juan Pérez" data-testid="input-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="juanperez" data-testid="input-username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña {isEditing && "(dejar en blanco para no cambiar)"}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} placeholder="••••••" data-testid="input-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="scorekeeper">Escribano</SelectItem>
                      <SelectItem value="display">Pantalla</SelectItem>
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
                disabled={saveMutation.isPending}
                data-testid="button-submit"
              >
                {saveMutation.isPending ? "Guardando..." : (isEditing ? "Actualizar" : "Crear Usuario")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
