import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChevronLeft, ChevronRight, Plus, Zap, MapPin, Clock, Users, Check, X, Minus, Trash2, CalendarDays, Upload, Pencil, Repeat } from "lucide-react";
import ScheduleMatchModal from "@/components/modals/schedule-match-modal";
import EditScheduledMatchModal from "@/components/modals/edit-scheduled-match-modal";
import type { ScheduledMatchWithDetails, ScheduledMatchPlayer } from "@shared/schema";

interface ScheduledMatchesProps {
  tournamentId?: string;
  userRole?: string;
}

export default function ScheduledMatches({ tournamentId, userRole }: ScheduledMatchesProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [matchToEdit, setMatchToEdit] = useState<ScheduledMatchWithDetails | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  // Query for all scheduled matches in the tournament
  const { data: allTournamentMatches = [], isLoading } = useQuery<ScheduledMatchWithDetails[]>({
    queryKey: ["/api/scheduled-matches", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/scheduled-matches/${tournamentId}`);
      return response.json();
    },
    enabled: !!tournamentId,
    staleTime: 0,
  });

  // Filter matches for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const allMatches = useMemo(() => {
    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");
    
    return allTournamentMatches.filter(match => {
      // Use ISO string directly to avoid timezone issues
      const matchDateStr = match.day.toString().slice(0, 10);
      return matchDateStr >= monthStartStr && matchDateStr <= monthEndStr;
    });
  }, [allTournamentMatches, monthStart, monthEnd]);

  // Get matches for the selected date
  const dayMatches = useMemo(() => {
    if (!selectedDate) return [];
    // Extract date parts directly to avoid timezone conversion
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dayNum = String(selectedDate.getDate()).padStart(2, '0');
    const selectedDateStr = `${year}-${month}-${dayNum}`;
    
    return allMatches.filter(match => {
      // Use ISO string directly to avoid timezone issues
      const matchDateStr = match.day.toString().slice(0, 10);
      return matchDateStr === selectedDateStr;
    });
  }, [allMatches, selectedDate]);

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

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/matches/current/${tournamentId}`);
      return response.json();
    },
    enabled: !!tournamentId,
    staleTime: 0,
  });

  // Group matches by date
  const matchesByDate = useMemo(() => {
    const grouped = new Map<string, ScheduledMatchWithDetails[]>();
    allMatches.forEach(match => {
      // Use ISO string directly to avoid timezone issues
      const dateKey = match.day.toString().slice(0, 10);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(match);
    });
    return grouped;
  }, [allMatches]);

  // Helper function to get time range from match
  const getMatchTimeRange = (match: ScheduledMatchWithDetails) => {
    if (!match.plannedTime) return "all";
    const hour = parseInt(match.plannedTime.split(":")[0]);
    if (hour < 12) return "morning"; // 00:00 - 11:59
    if (hour < 18) return "afternoon"; // 12:00 - 17:59
    return "evening"; // 18:00 - 23:59
  };

  // Helper function to get match status
  const getMatchStatus = (match: ScheduledMatchWithDetails) => {
    // Map backend status values directly
    if (match.status === 'completed') return 'completed';
    if (match.status === 'playing') return 'in_progress';
    
    // For assigned/ready status
    if (match.status === 'assigned' || match.status === 'ready') return 'ready';
    
    // For scheduled status, check if all players have checked in
    if (match.status === 'scheduled') {
      const allPlayersPresent = match.players?.every(p => p.isPresent === true);
      if (allPlayersPresent) return 'ready';
      return 'pending'; // Waiting for check-in
    }
    
    // Default
    return 'pending';
  };

  // Filter day matches by category, status, and time
  const filteredDayMatches = useMemo(() => {
    const filtered = dayMatches?.filter(match => {
      const categoryMatch = selectedCategory === "all" || match.categoryId === selectedCategory;
      
      // For status filter, combine pending and ready into "pending_ready"
      const matchStatus = getMatchStatus(match);
      let statusMatch = statusFilter === "all";
      if (statusFilter === "pending_ready") {
        statusMatch = matchStatus === 'pending' || matchStatus === 'ready';
      } else {
        statusMatch = statusFilter === "all" || matchStatus === statusFilter;
      }
      
      const timeMatch = timeFilter === "all" || getMatchTimeRange(match) === timeFilter;
      return categoryMatch && statusMatch && timeMatch;
    }) || [];

    // Sort by time (hour)
    return filtered.sort((a, b) => {
      const timeA = a.plannedTime || "99:99"; // Matches without time go to the end
      const timeB = b.plannedTime || "99:99";
      return timeA.localeCompare(timeB);
    });
  }, [dayMatches, selectedCategory, statusFilter, timeFilter]);

  // Count matches by status for badges (combine pending and ready)
  const statusCounts = useMemo(() => {
    const counts = { all: 0, pending_ready: 0, in_progress: 0, completed: 0 };
    dayMatches.forEach(match => {
      counts.all++;
      const status = getMatchStatus(match);
      if (status === 'pending' || status === 'ready') counts.pending_ready++;
      else if (status === 'in_progress') counts.in_progress++;
      else if (status === 'completed') counts.completed++;
    });
    return counts;
  }, [dayMatches]);

  // Get available categories for the selected day (only categories with matches)
  const availableCategories = useMemo(() => {
    const categoryIds = new Set(dayMatches.map(m => m.categoryId).filter(Boolean));
    return categories?.filter(cat => categoryIds.has(cat.id)) || [];
  }, [dayMatches, categories]);

  // Get available time ranges for the selected day (only ranges with matches)
  const availableTimeRanges = useMemo(() => {
    const ranges = new Set(dayMatches.map(m => getMatchTimeRange(m)));
    return Array.from(ranges).filter(r => r !== 'all');
  }, [dayMatches]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(monthStart, { locale: es });
    const end = endOfWeek(monthEnd, { locale: es });
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  const checkInMutation = useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/check-in`, { playerId });
    },
    onMutate: async ({ matchId, playerId }) => {
      const queryKey = ["/api/scheduled-matches", tournamentId];
      await queryClient.cancelQueries({ queryKey });
      const previousMatches = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData<ScheduledMatchWithDetails[]>(
        queryKey,
        (old) => {
          if (!old) return old;
          return old.map(match => {
            if (match.id === matchId) {
              return {
                ...match,
                players: match.players.map(p => 
                  p.playerId === playerId ? { ...p, isPresent: true } : p
                )
              };
            }
            return match;
          });
        }
      );
      
      return { previousMatches };
    },
    onError: (err, variables, context) => {
      if (context?.previousMatches) {
        const queryKey = ["/api/scheduled-matches", tournamentId];
        queryClient.setQueryData(queryKey, context.previousMatches);
      }
      toast({ title: "Error", description: "No se pudo registrar el check-in", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/check-out`, { playerId });
    },
    onMutate: async ({ matchId, playerId }) => {
      const queryKey = ["/api/scheduled-matches", tournamentId];
      await queryClient.cancelQueries({ queryKey });
      const previousMatches = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData<ScheduledMatchWithDetails[]>(
        queryKey,
        (old) => {
          if (!old) return old;
          return old.map(match => {
            if (match.id === matchId) {
              return {
                ...match,
                players: match.players.map(p => 
                  p.playerId === playerId ? { ...p, isPresent: false } : p
                )
              };
            }
            return match;
          });
        }
      );
      
      return { previousMatches };
    },
    onError: (err, variables, context) => {
      if (context?.previousMatches) {
        const queryKey = ["/api/scheduled-matches", tournamentId];
        queryClient.setQueryData(queryKey, context.previousMatches);
      }
      toast({ title: "Error", description: "No se pudo marcar como ausente", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
    },
  });

  const resetStatusMutation = useMutation({
    mutationFn: async ({ matchId, playerId }: { matchId: string; playerId: string }) => {
      return apiRequest("POST", `/api/scheduled-matches/${matchId}/reset-status`, { playerId });
    },
    onMutate: async ({ matchId, playerId }) => {
      const queryKey = ["/api/scheduled-matches", tournamentId];
      await queryClient.cancelQueries({ queryKey });
      const previousMatches = queryClient.getQueryData(queryKey);
      
      queryClient.setQueryData<ScheduledMatchWithDetails[]>(
        queryKey,
        (old) => {
          if (!old) return old;
          return old.map(match => {
            if (match.id === matchId) {
              return {
                ...match,
                players: match.players.map(p => 
                  p.playerId === playerId ? { ...p, isPresent: null } : p
                )
              };
            }
            return match;
          });
        }
      );
      
      return { previousMatches };
    },
    onError: (err, variables, context) => {
      if (context?.previousMatches) {
        const queryKey = ["/api/scheduled-matches", tournamentId];
        queryClient.setQueryData(queryKey, context.previousMatches);
      }
      toast({ title: "Error", description: "No se pudo resetear el estado", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiRequest("POST", `/api/scheduled-matches/${matchId}/auto-assign`, { tournamentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      toast({ title: "Cancha asignada", description: "Se asignó automáticamente una cancha disponible" });
    },
    onError: (error: any) => {
      // Extract message from error format "404: {message}"
      const errorMessage = error.message || "";
      const messageParts = errorMessage.split(": ");
      const message = messageParts.length > 1 ? messageParts.slice(1).join(": ") : "No hay canchas disponibles";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const manualAssignMutation = useMutation({
    mutationFn: async ({ matchId, courtId }: { matchId: string; courtId: string }) => {
      const response = await apiRequest("POST", `/api/scheduled-matches/${matchId}/assign-court`, { courtId, tournamentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      toast({ title: "Cancha asignada", description: "Cancha asignada manualmente" });
    },
    onError: (error: any) => {
      // Extract message from error format "404: {message}"
      const errorMessage = error.message || "";
      const messageParts = errorMessage.split(": ");
      const message = messageParts.length > 1 ? messageParts.slice(1).join(": ") : "No se pudo asignar la cancha";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });


  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiRequest("DELETE", `/api/scheduled-matches/${matchId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      toast({ title: "Partido eliminado", description: "El partido programado ha sido eliminado" });
      setDeleteDialogOpen(null);
    },
    onError: (error: any) => {
      // Extract message from error format "404: {message}"
      const errorMessage = error.message || "";
      const messageParts = errorMessage.split(": ");
      const message = messageParts.length > 1 ? messageParts.slice(1).join(": ") : "No se pudo eliminar el partido";
      toast({ title: "Error", description: message, variant: "destructive" });
      setDeleteDialogOpen(null);
    },
  });

  const reactivateMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const response = await apiRequest("POST", `/api/scheduled-matches/${matchId}/reactivate`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/results/recent"] });
      toast({ title: "Partido reactivado", description: "El partido ha sido reactivado y puede ser jugado nuevamente" });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "";
      const messageParts = errorMessage.split(": ");
      const message = messageParts.length > 1 ? messageParts.slice(1).join(": ") : "No se pudo reactivar el partido";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary" className="text-sm" data-testid={`badge-status-scheduled`}>Programado</Badge>;
      case "ready":
        return <Badge className="bg-green-600 hover:bg-green-700 text-sm" data-testid={`badge-status-ready`}>Listos</Badge>;
      case "assigned":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-sm" data-testid={`badge-status-assigned`}>Cancha Asignada</Badge>;
      case "playing":
        return <Badge className="bg-orange-600 hover:bg-orange-700 text-sm" data-testid={`badge-status-playing`}>En Juego</Badge>;
      case "completed":
        return <Badge className="bg-gray-600 hover:bg-gray-700 text-sm" data-testid={`badge-status-completed`}>Completado</Badge>;
      default:
        return <Badge variant="outline" className="text-sm" data-testid={`badge-status-${status}`}>{status}</Badge>;
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

  const handleDayClick = (day: Date) => {
    // Always update selected date first, before checking matches
    setSelectedDate(day);
    
    // Extract date parts directly to avoid timezone conversion
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayNum = String(day.getDate()).padStart(2, '0');
    const dayKey = `${year}-${month}-${dayNum}`;
    
    const matches = matchesByDate.get(dayKey) || [];
    if (matches.length > 0 || userRole === 'admin') {
      setSheetOpen(true);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
    setSheetOpen(true);
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tournamentId) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/scheduled-matches/import/${tournamentId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al importar partidos');
      }

      // Show results
      if (result.success > 0) {
        toast({
          title: "Importación exitosa",
          description: `${result.success} partido${result.success > 1 ? 's' : ''} importado${result.success > 1 ? 's' : ''} correctamente.`,
        });
        
        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            query.queryKey[0] === "/api/scheduled-matches"
        });
      }

      if (result.errors.length > 0) {
        toast({
          title: "Errores en importación",
          description: `${result.errors.length} fila${result.errors.length > 1 ? 's' : ''} con errores. Revisa el archivo.`,
          variant: "destructive",
        });
        console.error('Import errors:', result.errors);
      }
    } catch (error: any) {
      toast({
        title: "Error al importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-[500px] bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg sm:text-2xl font-semibold min-w-[150px] sm:min-w-[200px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
            Hoy
          </Button>
        </div>

        {userRole === 'admin' && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setScheduleModalOpen(true)} 
              data-testid="button-schedule-match"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Programar Partido</span>
              <span className="sm:hidden">Programar</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('match-import-file')?.click()}
              disabled={isImporting}
              data-testid="button-import-matches"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
            <input
              id="match-import-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Monthly Calendar Grid */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
              <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day, idx) => {
              // Extract date parts directly to avoid timezone conversion
              const year = day.getFullYear();
              const month = String(day.getMonth() + 1).padStart(2, '0');
              const dayNum = String(day.getDate()).padStart(2, '0');
              const dayKey = `${year}-${month}-${dayNum}`;
              
              const dayMatches = matchesByDate.get(dayKey) || [];
              const matchCount = dayMatches.length;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDayToday = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  disabled={!isCurrentMonth}
                  className={`
                    relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-2 rounded-lg border-2 transition-all text-left
                    ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground/30 cursor-not-allowed border-transparent' : 'hover:border-primary/50 hover:shadow-md cursor-pointer'}
                    ${isDayToday ? 'border-primary bg-primary/10' : 'border-border'}
                    ${matchCount > 0 && isCurrentMonth ? 'bg-accent/20' : ''}
                  `}
                  data-testid={`calendar-day-${dayKey}`}
                >
                  <div className="flex flex-col h-full">
                    <span className={`text-xs sm:text-sm font-medium ${isDayToday ? 'text-primary' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {matchCount > 0 && isCurrentMonth && (
                      <div className="mt-auto">
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">
                          <span className="hidden sm:inline">{matchCount} {matchCount === 1 ? 'partido' : 'partidos'}</span>
                          <span className="sm:hidden">{matchCount}</span>
                        </Badge>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Details Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:!w-screen sm:!max-w-none h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </SheetTitle>
            <SheetDescription>
              {filteredDayMatches.length > 0 
                ? `${filteredDayMatches.length} ${filteredDayMatches.length === 1 ? 'partido programado' : 'partidos programados'}`
                : 'No hay partidos programados'}
            </SheetDescription>
          </SheetHeader>

          {/* Filters */}
          <div className="mt-4 space-y-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Estado del Partido</label>
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                  <TabsTrigger value="all" className="text-xs px-2" data-testid="tab-status-all">
                    <span className="hidden sm:inline">Todos</span>
                    <span className="sm:hidden">All</span>
                    <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.all}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending_ready" className="text-xs px-2" data-testid="tab-status-pending-ready">
                    <span className="hidden sm:inline">Pendiente / Listos</span>
                    <span className="sm:hidden">Pend.</span>
                    <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.pending_ready}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="in_progress" className="text-xs px-2" data-testid="tab-status-in-progress">
                    <span className="hidden sm:inline">En Curso</span>
                    <span className="sm:hidden">Curso</span>
                    <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.in_progress}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs px-2" data-testid="tab-status-completed">
                    <span className="hidden sm:inline">Terminados</span>
                    <span className="sm:hidden">Fin</span>
                    <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.completed}</Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Category and Time Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Categoría</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full" data-testid="select-category-filter">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-category-all">
                      Todas
                    </SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Horario</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="w-full" data-testid="select-time-filter">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-time-all">
                      Todos
                    </SelectItem>
                    {availableTimeRanges.includes('morning') && (
                      <SelectItem value="morning" data-testid="option-time-morning">
                        Mañana (00:00 - 11:59)
                      </SelectItem>
                    )}
                    {availableTimeRanges.includes('afternoon') && (
                      <SelectItem value="afternoon" data-testid="option-time-afternoon">
                        Tarde (12:00 - 17:59)
                      </SelectItem>
                    )}
                    {availableTimeRanges.includes('evening') && (
                      <SelectItem value="evening" data-testid="option-time-evening">
                        Noche (18:00 - 23:59)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Matches List */}
          {filteredDayMatches.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {dayMatches.length === 0 
                  ? "No hay partidos programados" 
                  : "No hay partidos con los filtros seleccionados"}
              </p>
              <p className="text-sm mt-2">
                Intenta cambiar los filtros para ver más resultados
              </p>
              {userRole === 'admin' && (
                <Button 
                  onClick={() => {
                    setScheduleModalOpen(true);
                    setSheetOpen(false);
                  }} 
                  className="mt-4"
                  data-testid="button-schedule-from-empty"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Programar Partido
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 mt-6">
              {filteredDayMatches.map((match) => (
            <Card key={match.id} data-testid={`card-scheduled-match-${match.id}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span data-testid={`text-match-time-${match.id}`}>
                        {match.plannedTime || "Sin hora"}
                      </span>
                      {match.category && (
                        <Badge variant="outline" className="text-sm" data-testid={`badge-category-${match.id}`}>
                          {match.category.name}
                        </Badge>
                      )}
                      {match.format && (
                        <Badge variant="secondary" className="text-sm" data-testid={`badge-format-${match.id}`}>
                          {match.format}
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(match.status || "scheduled")}
                      {match.court && (
                        <Badge variant="secondary" className="text-sm" data-testid={`badge-court-${match.id}`}>
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {match.court.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {userRole === 'admin' && (
                    <div className="flex gap-1">
                      {/* Reactivate Button - Only for completed matches */}
                      {match.status === "completed" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-green-600"
                          onClick={() => reactivateMatchMutation.mutate(match.id)}
                          disabled={reactivateMatchMutation.isPending}
                          data-testid={`button-reactivate-match-${match.id}`}
                          title="Reactivar partido"
                        >
                          <Repeat className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Edit Button - Only for non-playing/completed matches */}
                      {match.status !== "playing" && match.status !== "completed" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setMatchToEdit(match);
                            setEditModalOpen(true);
                          }}
                          data-testid={`button-edit-match-${match.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Delete Button */}
                      <AlertDialog 
                        open={deleteDialogOpen === match.id} 
                        onOpenChange={(open) => {
                          if (!deleteMatchMutation.isPending) {
                            setDeleteDialogOpen(open ? match.id : null);
                          }
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-match-${match.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar partido programado?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminará el partido programado para{" "}
                              {match.pair1.player1.name}/{match.pair1.player2.name} vs{" "}
                              {match.pair2.player1.name}/{match.pair2.player2.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deleteMatchMutation.isPending}>Cancelar</AlertDialogCancel>
                            <Button
                              onClick={() => deleteMatchMutation.mutate(match.id)}
                              className="bg-destructive hover:bg-destructive/90"
                              disabled={deleteMatchMutation.isPending}
                              data-testid={`button-confirm-delete-${match.id}`}
                            >
                              {deleteMatchMutation.isPending ? "Eliminando..." : "Eliminar"}
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-2">
                {/* Compact Pair View */}
                {[
                  { pairId: match.pair1Id, pair: match.pair1, label: "Pareja 1" },
                  { pairId: match.pair2Id, pair: match.pair2, label: "Pareja 2" }
                ].map(({ pairId, pair, label }) => {
                  const pairPlayers = match.players.filter(p => p.pairId === pairId);
                  const allPresent = pairPlayers.every(p => p.isPresent === true);
                  const anyAbsent = pairPlayers.some(p => p.isPresent === false);
                  
                  return (
                    <div key={pairId} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">{label}:</span>
                          <span className="font-medium" data-testid={`text-${label.toLowerCase().replace(' ', '')}-name-${match.id}`}>
                            {pair.player1.name} / {pair.player2.name}
                          </span>
                          {allPresent && (
                            <Badge variant="default" className="bg-green-600 text-xs ml-2">
                              ✓ Confirmados
                            </Badge>
                          )}
                          {anyAbsent && (
                            <Badge variant="destructive" className="text-xs ml-2">
                              Ausente
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          {pairPlayers.map((player) => (
                            <div key={player.playerId} className="flex gap-1" data-testid={`player-controls-${player.playerId}`}>
                              <Button
                                variant={player.isPresent === true ? "default" : "ghost"}
                                size="sm"
                                className={`w-8 h-8 p-0 ${player.isPresent === true ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => handleCheckIn(match.id, player.playerId)}
                                disabled={match.status === "completed" || match.status === "playing"}
                                data-testid={`button-present-${player.playerId}`}
                                title={`${player.player.name}: Marcar como presente`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={player.isPresent === false ? "default" : "ghost"}
                                size="sm"
                                className={`w-8 h-8 p-0 ${player.isPresent === false ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                onClick={() => handleCheckOut(match.id, player.playerId)}
                                disabled={match.status === "completed" || match.status === "playing"}
                                data-testid={`button-absent-${player.playerId}`}
                                title={`${player.player.name}: No se presentó`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={player.isPresent === null ? "default" : "ghost"}
                                size="sm"
                                className={`w-8 h-8 p-0 ${player.isPresent === null ? 'bg-gray-600 hover:bg-gray-700' : ''}`}
                                onClick={() => handleResetStatus(match.id, player.playerId)}
                                disabled={match.status === "completed" || match.status === "playing"}
                                data-testid={`button-pending-${player.playerId}`}
                                title={`${player.player.name}: Sin confirmar`}
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Court Assignment Controls */}
                {(() => {
                  // Check if at least one pair is confirmed
                  const pair1Players = match.players.filter(p => p.pairId === match.pair1Id);
                  const pair2Players = match.players.filter(p => p.pairId === match.pair2Id);
                  const pair1Confirmed = pair1Players.length === 2 && pair1Players.every(p => p.isPresent === true);
                  const pair2Confirmed = pair2Players.length === 2 && pair2Players.every(p => p.isPresent === true);
                  const atLeastOnePairConfirmed = pair1Confirmed || pair2Confirmed;
                  const allPlayersConfirmed = pair1Confirmed && pair2Confirmed;

                  if (!atLeastOnePairConfirmed || !(userRole === 'admin' || userRole === 'scorekeeper')) {
                    return null;
                  }

                  return (
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium text-green-600">
                        {allPlayersConfirmed 
                          ? "✓ Todos los jugadores presentes - Listo para asignar cancha"
                          : "✓ Al menos una pareja confirmada - Puedes asignar cancha"
                        }
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
                              {courts?.map((court) => {
                                const isAvailable = court.isAvailable;
                                let canPreAssign = false;
                                let matchDuration = 0;
                                
                                if (!isAvailable) {
                                  const currentMatch = currentMatches.find(m => m.courtId === court.id && m.status === "playing");
                                  if (currentMatch) {
                                    matchDuration = Math.floor((Date.now() - new Date(currentMatch.startTime).getTime()) / (1000 * 60));
                                    canPreAssign = matchDuration >= 40;
                                  }
                                }

                                // Only show available courts or courts that can be pre-assigned
                                if (!isAvailable && !canPreAssign) return null;

                                return (
                                  <SelectItem key={court.id} value={court.id} data-testid={`option-court-${court.id}`}>
                                    {court.name}
                                    {canPreAssign && ` (Pre-asignar - ${matchDuration} min)`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Pre-assigned court notice */}
                {match.status === 'assigned' && match.preAssignedAt && (userRole === 'admin' || userRole === 'scorekeeper') && (
                  <div className="border-t pt-4">
                    {(() => {
                      const assignedCourt = courts?.find(c => c.id === match.courtId);
                      const courtStillBusy = assignedCourt && !assignedCourt.isAvailable;
                      
                      if (courtStillBusy) {
                        return (
                          <p className="text-sm text-orange-500 text-center">
                            ⏳ Cancha pre-asignada. El partido iniciará automáticamente cuando termine el partido actual.
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Schedule Match Modal */}
      {userRole === 'admin' && (
        <ScheduleMatchModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          tournamentId={tournamentId}
          selectedDate={selectedDate || new Date()}
        />
      )}

      {/* Edit Match Modal */}
      {userRole === 'admin' && (
        <EditScheduledMatchModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          match={matchToEdit}
          tournamentId={tournamentId}
        />
      )}
    </div>
  );
}
