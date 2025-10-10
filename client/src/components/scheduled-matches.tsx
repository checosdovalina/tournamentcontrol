import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Calendar as CalendarIcon, Plus, Zap, MapPin, Clock, Users, Check, X, Minus } from "lucide-react";
import ScheduleMatchModal from "@/components/modals/schedule-match-modal";
import type { ScheduledMatchWithDetails, ScheduledMatchPlayer } from "@shared/schema";

interface ScheduledMatchesProps {
  tournamentId?: string;
  userRole?: string;
}

export default function ScheduledMatches({ tournamentId, userRole }: ScheduledMatchesProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const { data: matches, isLoading } = useQuery<ScheduledMatchWithDetails[]>({
    queryKey: ["/api/scheduled-matches/day", tournamentId, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/scheduled-matches/day/${tournamentId}?day=${format(selectedDate, "yyyy-MM-dd")}`);
      return response.json();
    },
    enabled: !!tournamentId,
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/categories/${tournamentId}`);
      return response.json();
    },
    enabled: !!tournamentId,
  });

  const { data: courts } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: !!tournamentId,
  });

  const filteredMatches = matches?.filter(match => 
    (selectedCategory === "all" || match.categoryId === selectedCategory) &&
    match.status !== "playing"
  ) || [];

  const checkInMutation = useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/check-in`, { playerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      toast({ title: "Jugador registrado", description: "Check-in realizado correctamente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo registrar el check-in", variant: "destructive" });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/check-out`, { playerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      toast({ title: "Jugador marcado como ausente", description: "El jugador no se presentó" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo marcar como ausente", variant: "destructive" });
    },
  });

  const resetStatusMutation = useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/reset-status`, { playerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      toast({ title: "Estado reseteado", description: "El jugador está sin confirmar" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo resetear el estado", variant: "destructive" });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async (matchId: string) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/auto-assign`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      toast({ title: "Cancha asignada", description: "Se asignó automáticamente una cancha disponible" });
    },
    onError: () => {
      toast({ title: "Error", description: "No hay canchas disponibles", variant: "destructive" });
    },
  });

  const manualAssignMutation = useMutation({
    mutationFn: async ({ matchId, courtId }: { matchId: string; courtId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/assign-court`, { courtId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      toast({ title: "Cancha asignada", description: "Cancha asignada manualmente" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo asignar la cancha", variant: "destructive" });
    },
  });

  const startMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      toast({ title: "Partido iniciado", description: "El partido está ahora en curso" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo iniciar el partido", variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary" data-testid={`badge-status-scheduled`}>Programado</Badge>;
      case "ready":
        return <Badge className="bg-green-600 hover:bg-green-700" data-testid={`badge-status-ready`}>Listos</Badge>;
      case "assigned":
        return <Badge className="bg-blue-600 hover:bg-blue-700" data-testid={`badge-status-assigned`}>Cancha Asignada</Badge>;
      case "playing":
        return <Badge className="bg-orange-600 hover:bg-orange-700" data-testid={`badge-status-playing`}>En Juego</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const handleCheckIn = (matchId: string, playerId: string) => {
    checkInMutation.mutate({ matchId, playerId });
  };

  const handleCheckOut = (matchId: string, playerId: string) => {
    checkOutMutation.mutate({ matchId, playerId });
  };

  const handleResetStatus = (matchId: string, playerId: string) => {
    resetStatusMutation.mutate({ matchId, playerId });
  };

  const handleAutoAssign = (matchId: string) => {
    autoAssignMutation.mutate(matchId);
  };

  const handleManualAssign = (matchId: string, courtId: string) => {
    manualAssignMutation.mutate({ matchId, courtId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Selector, Category Filter and Schedule Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-select-date">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={es}
                data-testid="calendar-date-picker"
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-category-all">
                Todas las categorías
              </SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {userRole === 'admin' && (
          <Button onClick={() => setScheduleModalOpen(true)} data-testid="button-schedule-match">
            <Plus className="w-4 h-4 mr-2" />
            Programar Partido
          </Button>
        )}
      </div>

      {/* Scheduled Matches List */}
      {!filteredMatches || filteredMatches.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {selectedCategory === "all" 
                  ? "No hay partidos programados para este día" 
                  : "No hay partidos de esta categoría para este día"}
              </p>
              <p className="text-sm mt-2">
                {userRole === 'admin' 
                  ? "Haz clic en 'Programar Partido' para agregar uno" 
                  : "El administrador aún no ha programado partidos para esta fecha"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <Card key={match.id} data-testid={`card-scheduled-match-${match.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span data-testid={`text-match-time-${match.id}`}>
                        {match.plannedTime || "Sin hora"}
                      </span>
                      {match.category && (
                        <Badge variant="outline" data-testid={`badge-category-${match.id}`}>
                          {match.category.name}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(match.status || "scheduled")}
                      {match.court && (
                        <Badge variant="secondary" data-testid={`badge-court-${match.id}`}>
                          <MapPin className="w-3 h-3 mr-1" />
                          {match.court.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Pair 1 */}
                <div className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Pareja 1</span>
                    </div>
                    <span className="text-sm text-muted-foreground" data-testid={`text-pair1-name-${match.id}`}>
                      {match.pair1.player1.name} / {match.pair1.player2.name}
                    </span>
                  </div>
                  {match.players
                    .filter(p => p.pairId === match.pair1Id)
                    .map((player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between py-1.5"
                        data-testid={`player-status-${player.playerId}`}
                      >
                        <span className="text-sm" data-testid={`text-player-name-${player.playerId}`}>
                          {player.player.name}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant={player.isPresent === true ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${player.isPresent === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => handleCheckIn(match.id, player.playerId)}
                            data-testid={`button-present-${player.playerId}`}
                            title="Marcar como presente"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={player.isPresent === false ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${player.isPresent === false ? 'bg-red-600 hover:bg-red-700' : ''}`}
                            onClick={() => handleCheckOut(match.id, player.playerId)}
                            data-testid={`button-absent-${player.playerId}`}
                            title="No se presentó"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={player.isPresent === null ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${player.isPresent === null ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
                            onClick={() => handleResetStatus(match.id, player.playerId)}
                            data-testid={`button-pending-${player.playerId}`}
                            title="Sin confirmar"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pair 2 */}
                <div className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Pareja 2</span>
                    </div>
                    <span className="text-sm text-muted-foreground" data-testid={`text-pair2-name-${match.id}`}>
                      {match.pair2.player1.name} / {match.pair2.player2.name}
                    </span>
                  </div>
                  {match.players
                    .filter(p => p.pairId === match.pair2Id)
                    .map((player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between py-1.5"
                        data-testid={`player-status-${player.playerId}`}
                      >
                        <span className="text-sm" data-testid={`text-player-name-${player.playerId}`}>
                          {player.player.name}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant={player.isPresent === true ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${player.isPresent === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => handleCheckIn(match.id, player.playerId)}
                            data-testid={`button-present-${player.playerId}`}
                            title="Marcar como presente"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={player.isPresent === false ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${player.isPresent === false ? 'bg-red-600 hover:bg-red-700' : ''}`}
                            onClick={() => handleCheckOut(match.id, player.playerId)}
                            data-testid={`button-absent-${player.playerId}`}
                            title="No se presentó"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={player.isPresent === null ? "default" : "outline"}
                            size="sm"
                            className={`w-8 h-8 p-0 ${player.isPresent === null ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
                            onClick={() => handleResetStatus(match.id, player.playerId)}
                            data-testid={`button-pending-${player.playerId}`}
                            title="Sin confirmar"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Court Assignment Controls */}
                {match.status === 'ready' && (userRole === 'admin' || userRole === 'scorekeeper') && (
                  <div className="border-t pt-4 space-y-3">
                    <p className="text-sm font-medium text-green-600">
                      ✓ Todos los jugadores presentes - Listo para asignar cancha
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => handleAutoAssign(match.id)}
                        disabled={autoAssignMutation.isPending}
                        data-testid={`button-auto-assign-${match.id}`}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Asignación Automática
                      </Button>
                      <div className="flex gap-2 flex-1">
                        <Select onValueChange={(courtId) => courtId && handleManualAssign(match.id, courtId)}>
                          <SelectTrigger className="flex-1" data-testid={`select-court-${match.id}`}>
                            <SelectValue placeholder="Seleccionar cancha..." />
                          </SelectTrigger>
                          <SelectContent>
                            {courts?.filter(c => c.isAvailable).map((court) => (
                              <SelectItem key={court.id} value={court.id} data-testid={`option-court-${court.id}`}>
                                {court.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Start Match Control */}
                {match.status === 'assigned' && (userRole === 'admin' || userRole === 'scorekeeper') && (
                  <div className="border-t pt-4">
                    <Button
                      onClick={() => startMatchMutation.mutate(match.id)}
                      disabled={startMatchMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid={`button-start-match-${match.id}`}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {startMatchMutation.isPending ? "Iniciando..." : "Iniciar Partido"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Match Modal */}
      {userRole === 'admin' && (
        <ScheduleMatchModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          tournamentId={tournamentId}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
