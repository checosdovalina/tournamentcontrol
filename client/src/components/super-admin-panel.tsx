import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, Users, UserCheck, Trash2, MapPin, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import CreateTournamentModal from "@/components/modals/create-tournament-modal";
import CreateUserModal from "@/components/modals/create-user-modal";
import CreateClubModal from "@/components/modals/create-club-modal";
import AssignUserModal from "@/components/modals/assign-user-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SuperAdminPanel() {
  const [createTournamentOpen, setCreateTournamentOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createClubOpen, setCreateClubOpen] = useState(false);
  const [assignUserOpen, setAssignUserOpen] = useState(false);
  const [editClubOpen, setEditClubOpen] = useState(false);
  const [editTournamentOpen, setEditTournamentOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{type: string; id: string; name: string} | null>(null);
  const { toast } = useToast();

  const { data: tournaments, isLoading: loadingTournaments } = useQuery<any[]>({
    queryKey: ["/api/admin/tournaments"],
  });

  const { data: users, isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: clubs, isLoading: loadingClubs } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const endpoints = {
        club: `/api/clubs/${id}`,
        tournament: `/api/admin/tournaments/${id}`,
        user: `/api/admin/users/${id}`,
      };
      return apiRequest(endpoints[type as keyof typeof endpoints], "DELETE", {});
    },
    onSuccess: (_, variables) => {
      const queryKeys = {
        club: ["/api/clubs"],
        tournament: ["/api/admin/tournaments"],
        user: ["/api/admin/users"],
      };
      queryClient.invalidateQueries({ queryKey: queryKeys[variables.type as keyof typeof queryKeys] });
      toast({ title: "Eliminado", description: `${variables.type === 'club' ? 'Club' : variables.type === 'tournament' ? 'Torneo' : 'Usuario'} eliminado correctamente` });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    },
  });

  const handleAssignUser = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    setAssignUserOpen(true);
  };

  const handleEditClub = (club: any) => {
    setSelectedClub(club);
    setEditClubOpen(true);
  };

  const handleEditTournament = (tournament: any) => {
    setSelectedClub(tournament); // Reusing selectedClub for tournament
    setEditTournamentOpen(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditUserOpen(true);
  };

  const handleDelete = (type: string, id: string, name: string) => {
    setItemToDelete({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate({ type: itemToDelete.type, id: itemToDelete.id });
    }
  };

  if (loadingTournaments || loadingUsers || loadingClubs) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clubs Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Clubes
              </CardTitle>
              <CardDescription>Gestiona los clubes del sistema</CardDescription>
            </div>
            <Button onClick={() => setCreateClubOpen(true)} data-testid="button-create-club">
              <Plus className="w-4 h-4 mr-2" />
              Crear Club
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!clubs || clubs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay clubes creados</p>
              <p className="text-sm mt-2">Haz clic en "Crear Club" para agregar uno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`club-item-${club.id}`}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold" data-testid={`text-club-name-${club.id}`}>
                      {club.name}
                    </h4>
                    {club.address && (
                      <p className="text-sm text-muted-foreground">{club.address}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClub(club)}
                      data-testid={`button-edit-club-${club.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete('club', club.id, club.name)}
                      data-testid={`button-delete-club-${club.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTournament(tournament)}
                      data-testid={`button-edit-tournament-${tournament.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete('tournament', tournament.id, tournament.name)}
                      data-testid={`button-delete-tournament-${tournament.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete('user', user.id, user.name)}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateClubModal
        open={createClubOpen}
        onOpenChange={setCreateClubOpen}
      />
      <CreateClubModal
        open={editClubOpen}
        onOpenChange={setEditClubOpen}
        club={selectedClub}
      />
      <CreateTournamentModal
        open={createTournamentOpen}
        onOpenChange={setCreateTournamentOpen}
      />
      <CreateTournamentModal
        open={editTournamentOpen}
        onOpenChange={setEditTournamentOpen}
        tournament={selectedClub}
      />
      <CreateUserModal
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
      />
      <CreateUserModal
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
        user={selectedUser}
      />
      <AssignUserModal
        open={assignUserOpen}
        onOpenChange={setAssignUserOpen}
        tournamentId={selectedTournament}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente{" "}
              <span className="font-semibold">{itemToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
