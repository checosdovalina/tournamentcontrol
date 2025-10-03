import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertTournamentUserSchema } from "@shared/schema";
import { z } from "zod";

interface AssignUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string | null;
}

const formSchema = insertTournamentUserSchema;

type FormData = z.infer<typeof formSchema>;

export default function AssignUserModal({ open, onOpenChange, tournamentId }: AssignUserModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: "",
      tournamentId: tournamentId || "",
      role: "scorekeeper",
      status: "active",
    },
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: assignedUsers, refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/tournament-users", tournamentId],
    enabled: !!tournamentId,
  });

  const assignMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest("/api/admin/tournament-users", "POST", {
        ...data,
        tournamentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tournament-users"] });
      refetch();
      toast({ title: "Usuario asignado", description: "El usuario se asignó al torneo" });
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo asignar el usuario", 
        variant: "destructive" 
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/tournament-users/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tournament-users"] });
      refetch();
      toast({ title: "Usuario removido", description: "El usuario se removió del torneo" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo remover el usuario", variant: "destructive" });
    },
  });

  const onSubmit = (data: FormData) => {
    assignMutation.mutate(data);
  };

  const availableUsers = users?.filter(
    (user) => !assignedUsers?.some((au) => au.userId === user.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="modal-assign-user">
        <DialogHeader>
          <DialogTitle>Asignar Usuarios al Torneo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignments */}
          {assignedUsers && assignedUsers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Usuarios Asignados</h4>
              <div className="space-y-2">
                {assignedUsers.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded"
                    data-testid={`assigned-user-${assignment.id}`}
                  >
                    <div>
                      <p className="font-medium">{assignment.user?.name}</p>
                      <p className="text-sm text-muted-foreground">@{assignment.user?.username}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{assignment.role}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate(assignment.id)}
                        data-testid={`button-remove-${assignment.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assign Form */}
          <div>
            <h4 className="text-sm font-medium mb-3">Asignar Nuevo Usuario</h4>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-user">
                            <SelectValue placeholder="Seleccionar usuario..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableUsers?.map((user) => (
                            <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                              {user.name} (@{user.username})
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
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rol en el Torneo</FormLabel>
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

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    data-testid="button-close"
                  >
                    Cerrar
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignMutation.isPending || !availableUsers || availableUsers.length === 0}
                    data-testid="button-submit"
                  >
                    {assignMutation.isPending ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
