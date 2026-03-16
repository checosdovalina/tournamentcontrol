import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Users, Clock, MapPin, GripVertical } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { Badge } from "@/components/ui/badge";
import { useState, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";

export default function DisplayControl() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [draggingMatchId, setDraggingMatchId] = useState<string | null>(null);
  const [draggingMatchIndex, setDraggingMatchIndex] = useState<number | null>(null);
  const [overCourtId, setOverCourtId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  useWebSocket();

  const { data: tournament } = useQuery<{
    id: string;
    name: string;
    tournamentLogoUrl?: string;
  }>({
    queryKey: ["/api/tournament"],
  });

  const { data: readyQueue = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-matches/ready-queue", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/scheduled-matches/ready-queue/${tournament.id}`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/matches/current/${tournament.id}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const assignCourtMutation = useMutation({
    mutationFn: async ({ matchId, courtId }: { matchId: string; courtId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/assign-court`, { courtId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/ready-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
      toast({ title: "Cancha asignada", description: "El partido fue asignado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo asignar la cancha.", variant: "destructive" });
    },
  });

  const sortedCourts = [...courts].sort((a, b) => {
    const nameA = a.name?.toLowerCase() || "";
    const nameB = b.name?.toLowerCase() || "";
    const numA = nameA.match(/\d+/)?.[0];
    const numB = nameB.match(/\d+/)?.[0];
    if (numA && numB && numA !== numB) return parseInt(numA) - parseInt(numB);
    return nameA.localeCompare(nameB);
  });

  const getMatchForCourt = (courtId: string) =>
    currentMatches.find((m: any) => m.courtId === courtId);

  // Drag handlers for queue items
  const handleDragStart = (e: React.DragEvent, matchId: string, index: number) => {
    setDraggingMatchId(matchId);
    setDraggingMatchIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("matchId", matchId);
  };

  const handleDragEnd = () => {
    setDraggingMatchId(null);
    setDraggingMatchIndex(null);
    setOverCourtId(null);
    dragCounterRef.current = {};
  };

  // Drop handlers for court cards
  const handleCourtDragOver = (e: React.DragEvent, courtId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverCourtId(courtId);
  };

  const handleCourtDragEnter = (e: React.DragEvent, courtId: string, isAvailable: boolean) => {
    if (!isAvailable) return;
    dragCounterRef.current[courtId] = (dragCounterRef.current[courtId] || 0) + 1;
    setOverCourtId(courtId);
  };

  const handleCourtDragLeave = (e: React.DragEvent, courtId: string) => {
    dragCounterRef.current[courtId] = (dragCounterRef.current[courtId] || 1) - 1;
    if (dragCounterRef.current[courtId] <= 0) {
      setOverCourtId((prev) => (prev === courtId ? null : prev));
    }
  };

  const handleCourtDrop = (e: React.DragEvent, courtId: string, isAvailable: boolean) => {
    e.preventDefault();
    setOverCourtId(null);
    dragCounterRef.current = {};
    if (!isAvailable) return;
    const matchId = e.dataTransfer.getData("matchId");
    if (!matchId) return;
    assignCourtMutation.mutate({ matchId, courtId });
    setDraggingMatchId(null);
    setDraggingMatchIndex(null);
  };

  const isDragging = draggingMatchId !== null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/20 bg-black/30">
          <div className="flex items-center space-x-4">
            {tournament?.tournamentLogoUrl ? (
              <img src={tournament.tournamentLogoUrl} alt="Logo Torneo" className="h-12 w-auto object-contain" />
            ) : (
              <img src={courtflowLogo} alt="CourtFlow" className="h-12 w-auto" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">Mesa de Control</h1>
              <p className="text-sm text-white/70">{tournament?.name || "Cargando..."}</p>
            </div>
          </div>
          {isDragging && (
            <div className="flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-xl text-sm border border-white/20 animate-pulse">
              <GripVertical className="w-4 h-4" />
              Arrastra el partido a una cancha disponible
            </div>
          )}
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
            data-testid="button-close-display"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Main Content - Two Columns 50/50 */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-2 gap-6 h-full">

            {/* Left Column: Ready Queue */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center">
                <Users className="mr-3" />
                Cola de Turnos
                {readyQueue.length > 0 && (
                  <Badge className="ml-3 bg-blue-600 text-white text-lg px-3">
                    {readyQueue.length}
                  </Badge>
                )}
              </h2>
              {readyQueue.length > 0 && (
                <p className="text-white/50 text-sm mb-4">
                  Arrastra un partido a una cancha disponible para asignarlo
                </p>
              )}

              <div className="flex-1 overflow-y-auto space-y-3" data-testid="ready-queue-list">
                {readyQueue.length === 0 ? (
                  <div className="text-white/60 text-center py-12">
                    No hay partidos en cola
                  </div>
                ) : (
                  readyQueue.map((match: any, index: number) => {
                    const pair1Player1 = match.pair1?.player1?.name || "Jugador 1";
                    const pair1Player2 = match.pair1?.player2?.name || "Jugador 2";
                    const pair2Player1 = match.pair2?.player1?.name || "Jugador 3";
                    const pair2Player2 = match.pair2?.player2?.name || "Jugador 4";
                    const categoryName = match.category?.name;
                    const plannedTime = match.plannedTime || "--:--";
                    const isBeingDragged = draggingMatchId === match.id;

                    return (
                      <div
                        key={match.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, match.id, index)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-xl p-4 border transition-all select-none cursor-grab active:cursor-grabbing ${
                          isBeingDragged
                            ? "opacity-40 scale-95 border-white/30 bg-white/5"
                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/10"
                        }`}
                        data-testid={`ready-match-${index + 1}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Drag handle */}
                          <div className="mt-1 text-white/30 shrink-0">
                            <GripVertical className="w-5 h-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-3">
                              <div className="bg-blue-600 text-white px-3 py-1 rounded-lg font-bold text-lg">
                                #{index + 1}
                              </div>
                              <div className="flex items-center bg-white/20 text-white px-3 py-1 rounded-lg font-bold">
                                <Clock className="w-4 h-4 mr-1.5" />
                                {plannedTime}
                              </div>
                              {categoryName && (
                                <span className="px-3 py-1 bg-orange-600/80 text-white rounded-lg text-sm font-semibold">
                                  {categoryName}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 text-white">
                              <div className="text-base font-medium">
                                {pair1Player1} / {pair1Player2}
                              </div>
                              <div className="text-base font-medium">
                                {pair2Player1} / {pair2Player2}
                              </div>
                            </div>
                            {match.readySince && (
                              <div className="mt-2 text-xs text-white/50">
                                Esperando desde:{" "}
                                {new Date(match.readySince).toLocaleTimeString("es-ES", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Courts */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 overflow-hidden flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <MapPin className="mr-3" />
                Canchas
              </h2>

              <div className="flex-1 overflow-y-auto space-y-3" data-testid="courts-status-list">
                {sortedCourts.length === 0 ? (
                  <div className="text-white/60 text-center py-12">
                    No hay canchas configuradas
                  </div>
                ) : (
                  sortedCourts.map((court: any) => {
                    const activeMatch = getMatchForCourt(court.id);
                    const isOccupied = !!activeMatch;
                    const isDropTarget = overCourtId === court.id;
                    const canDrop = isDragging && !isOccupied;

                    return (
                      <div
                        key={court.id}
                        onDragOver={(e) => handleCourtDragOver(e, court.id, !isOccupied)}
                        onDragEnter={(e) => handleCourtDragEnter(e, court.id, !isOccupied)}
                        onDragLeave={(e) => handleCourtDragLeave(e, court.id)}
                        onDrop={(e) => handleCourtDrop(e, court.id, !isOccupied)}
                        className={`rounded-xl p-4 border transition-all ${
                          isDropTarget && canDrop
                            ? "bg-green-500/40 border-green-400 scale-[1.02] shadow-lg shadow-green-500/30 ring-2 ring-green-400/60"
                            : isOccupied
                            ? "bg-orange-600/20 border-orange-500/50"
                            : canDrop
                            ? "bg-green-600/20 border-green-400/70 border-dashed"
                            : "bg-green-600/20 border-green-500/50"
                        }`}
                        data-testid={`court-${court.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-white">{court.name}</h3>
                          <div className="flex items-center gap-2">
                            {canDrop && !isOccupied && !isDropTarget && (
                              <span className="text-xs text-green-300 font-medium">
                                Suelta aquí
                              </span>
                            )}
                            <Badge
                              className={`${
                                isOccupied ? "bg-orange-600" : "bg-green-600"
                              } text-white px-3 py-1`}
                            >
                              {isOccupied ? "En Juego" : "Disponible"}
                            </Badge>
                          </div>
                        </div>

                        {isOccupied && activeMatch ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              {activeMatch.category && (
                                <span className="text-sm text-white/70">
                                  {activeMatch.category.name}
                                </span>
                              )}
                              {activeMatch.startedAt && (
                                <div className="flex items-center bg-white/20 text-white px-2 py-1 rounded-lg text-sm font-medium">
                                  <Clock className="w-4 h-4 mr-1" />
                                  {new Date(activeMatch.startedAt).toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                              <div className="text-white font-medium">
                                {activeMatch.pair1?.player1?.name || "Jugador 1"} /{" "}
                                {activeMatch.pair1?.player2?.name || "Jugador 2"}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-white">
                                {activeMatch.score?.sets?.length > 0 ? (
                                  <div className="flex items-center justify-center gap-4">
                                    {activeMatch.score.sets.map((set: number[], idx: number) => (
                                      <div key={idx} className="flex items-center">
                                        <span className="text-green-400">{set[0]}</span>
                                        <span className="text-white/50 mx-1">-</span>
                                        <span className="text-blue-400">{set[1]}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-white/50">0-0</span>
                                )}
                              </div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-3">
                              <div className="text-white font-medium">
                                {activeMatch.pair2?.player1?.name || "Jugador 3"} /{" "}
                                {activeMatch.pair2?.player2?.name || "Jugador 4"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`text-center py-4 transition-colors ${
                              isDropTarget && canDrop
                                ? "text-green-200 font-semibold"
                                : "text-white/60"
                            }`}
                          >
                            {isDropTarget && canDrop ? "✓ Asignar aquí" : "Cancha disponible"}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
