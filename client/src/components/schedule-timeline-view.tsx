import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, AlertTriangle } from "lucide-react";
import { es } from "date-fns/locale";
import { useState } from "react";
import type { ScheduledMatchWithDetails } from "@shared/schema";

interface ScheduleTimelineViewProps {
  tournamentId?: string;
}

export default function ScheduleTimelineView({ tournamentId }: ScheduleTimelineViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: matches, isLoading } = useQuery<ScheduledMatchWithDetails[]>({
    queryKey: ["/api/scheduled-matches/day", tournamentId, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!tournamentId) return [];
      const response = await fetch(`/api/scheduled-matches/day/${tournamentId}?day=${format(selectedDate, "yyyy-MM-dd")}`);
      return response.json();
    },
    enabled: !!tournamentId,
  });

  const { data: courts } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    enabled: !!tournamentId,
  });

  // Extract all unique time slots
  const timeSlots = Array.from(
    new Set(
      matches?.map(m => m.plannedTime).filter((time): time is string => Boolean(time)) || []
    )
  ).sort();

  // Group matches by time and court
  const getMatchForTimeAndCourt = (time: string, courtId: string | null) => {
    return matches?.find(m => m.plannedTime === time && m.courtId === courtId);
  };

  // Check for conflicts (same time, same court, multiple matches)
  const hasConflict = (time: string, courtId: string | null) => {
    return matches?.filter(m => m.plannedTime === time && m.courtId === courtId).length || 0 > 1;
  };

  // Get matches for a specific time across all courts
  const getMatchesForTime = (time: string) => {
    return matches?.filter(m => m.plannedTime === time) || [];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Vista de Horarios</h2>
          <p className="text-sm text-muted-foreground">Organización por hora y cancha para evitar duplicidad</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-select-date-timeline">
              <CalendarIcon className="w-4 h-4 mr-2" />
              {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Timeline Grid */}
      {!matches || matches.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay partidos programados para este día</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Timeline by Hour */}
          {timeSlots.map((time) => {
            const timeMatches = getMatchesForTime(time);
            const courtsUsed = Array.from(new Set(timeMatches.map(m => m.courtId).filter(Boolean)));
            const hasMultipleInSameCourt = courtsUsed.some(courtId => 
              timeMatches.filter(m => m.courtId === courtId).length > 1
            );

            return (
              <Card key={time} data-testid={`timeline-slot-${time}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      {time}
                      {hasMultipleInSameCourt && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Conflicto
                        </Badge>
                      )}
                    </CardTitle>
                    <Badge variant="outline">
                      {timeMatches.length} {timeMatches.length === 1 ? 'partido' : 'partidos'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {timeMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`border rounded-lg p-3 ${
                          hasConflict(time, match.courtId) 
                            ? 'border-destructive bg-destructive/10' 
                            : 'border-border'
                        }`}
                        data-testid={`match-card-${match.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="space-y-1">
                            {match.court ? (
                              <Badge variant="secondary" data-testid={`badge-court-${match.id}`}>
                                {match.court.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" data-testid={`badge-no-court-${match.id}`}>
                                Sin cancha
                              </Badge>
                            )}
                            {match.category && (
                              <Badge variant="outline" className="ml-1" data-testid={`badge-category-${match.id}`}>
                                {match.category.name}
                              </Badge>
                            )}
                          </div>
                          {hasConflict(time, match.courtId) && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="font-medium" data-testid={`pair1-${match.id}`}>
                            {match.pair1.player1.name} / {match.pair1.player2.name}
                          </div>
                          <div className="text-muted-foreground" data-testid={`pair2-${match.id}`}>
                            {match.pair2.player1.name} / {match.pair2.player2.name}
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge 
                            variant={match.status === 'playing' ? 'default' : 'secondary'} 
                            className="text-xs"
                            data-testid={`status-${match.id}`}
                          >
                            {match.status === 'scheduled' && 'Programado'}
                            {match.status === 'ready' && 'Listos'}
                            {match.status === 'assigned' && 'Cancha Asignada'}
                            {match.status === 'playing' && 'En Juego'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Court Availability Summary */}
          {courts && courts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumen de Disponibilidad de Canchas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courts.map((court) => {
                    const courtMatches = matches?.filter(m => m.courtId === court.id) || [];
                    const timeSlotCount = Array.from(new Set(courtMatches.map(m => m.plannedTime))).length;
                    
                    return (
                      <div key={court.id} className="border rounded-lg p-4" data-testid={`court-summary-${court.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{court.name}</h4>
                          <Badge variant="outline">
                            {courtMatches.length} {courtMatches.length === 1 ? 'partido' : 'partidos'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {timeSlotCount > 0 ? (
                            <span>{timeSlotCount} {timeSlotCount === 1 ? 'horario ocupado' : 'horarios ocupados'}</span>
                          ) : (
                            <span>Disponible todo el día</span>
                          )}
                        </div>
                        {courtMatches.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <div className="flex flex-wrap gap-1">
                              {Array.from(new Set(courtMatches.map(m => m.plannedTime))).sort().map(time => (
                                <Badge key={time} variant="secondary" className="text-xs">
                                  {time}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
