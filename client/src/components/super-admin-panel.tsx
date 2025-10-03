import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, Users, UserCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import CreateTournamentModal from "@/components/modals/create-tournament-modal";
import CreateUserModal from "@/components/modals/create-user-modal";
import AssignUserModal from "@/components/modals/assign-user-modal";

export default function SuperAdminPanel() {
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [assignUserOpen, setAssignUserOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: tournaments, isLoading: loadingTournaments } = useQuery<any[]>({
    queryKey: ["/api/admin/tournaments"],
  });

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/tournaments/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tournaments"] });
      toast({ title: "Torneo eliminado", description: "El torneo se eliminó correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el torneo", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/users/${id}`, "DELETE", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Usuario eliminado", description: "El usuario se eliminó correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el usuario", variant: "destructive" });
    },
  });

  const handleAssignUser = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    setAssignUserOpen(true);
  };

  if (loadingTournaments || loadingUsers) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournaments Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Torneos
              </CardTitle>
              <CardDescription>Gestiona los torneos del sistema</CardDescription>
            </div>
            <Button onClick={() => setCreateTournamentOpen(true)} data-testid="button-create-tournament">
              <Plus className="w-4 h-4 mr-2" />
              Crear Torneo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!tournaments || tournaments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay torneos creados</p>
              <p className="text-sm mt-2">Haz clic en "Crear Torneo" para agregar uno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`tournament-item-${tournament.id}`}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold" data-testid={`text-tournament-name-${tournament.id}`}>
                      {tournament.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {tournament.isActive && (
                      <Badge className="bg-green-600 hover:bg-green-700">Activo</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignUser(tournament.id)}
                      data-testid={`button-assign-users-${tournament.id}`}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Asignar Usuarios
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Usuarios
              </CardTitle>
              <CardDescription>Gestiona los usuarios del sistema</CardDescription>
            </div>
            <Button onClick={() => setCreateUserOpen(true)} data-testid="button-create-user">
              <Plus className="w-4 h-4 mr-2" />
              Crear Usuario
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay usuarios creados</p>
              <p className="text-sm mt-2">Haz clic en "Crear Usuario" para agregar uno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`user-item-${user.id}`}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold" data-testid={`text-user-name-${user.id}`}>
                      {user.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{user.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTournamentModal
        open={createTournamentOpen}
        onOpenChange={setCreateTournamentOpen}
      />
      <CreateUserModal
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
      />
      <AssignUserModal
        open={assignUserOpen}
        onOpenChange={setAssignUserOpen}
        tournamentId={selectedTournament}
      />
    </div>
  );
}
