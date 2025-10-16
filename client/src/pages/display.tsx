import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Volleyball } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";
import courtflowLogoNew from "@assets/_LogosCOURTFLOW  sin fondo_1760480356184.png";

export default function Display() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const activeAdsRef = useRef<any[]>([]);

  const { data: tournament } = useQuery<{ 
    id: string; 
    name: string;
    tournamentLogoUrl?: string;
    clubLogoUrl?: string;
    systemLogoUrl?: string;
  }>({
    queryKey: ["/api/tournament"],
  });

  const { data: currentMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/matches/current", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: allScheduledMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-matches/today", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await fetch(`/api/scheduled-matches/day/${tournament.id}?day=${today}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Show all scheduled matches from today without time filtering
  const scheduledMatches = allScheduledMatches;

  const { data: allResults = [] } = useQuery<any[]>({
    queryKey: ["/api/results/recent", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Filter results to show only those from the last 24 hours (1,440 minutes)
  const recentResults = allResults.filter((result: any) => {
    const resultTime = new Date(result.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - resultTime.getTime()) / (1000 * 60));
    return diffMinutes <= 1440;
  });

  // Stable keys for carousels based on item count (prevents animation restart on data updates)
  const upcomingCount = useMemo(() => 
    scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').length,
    [scheduledMatches]
  );
  const currentCount = useMemo(() => currentMatches.length, [currentMatches]);
  const resultsCount = useMemo(() => recentResults.length, [recentResults]);

  const { data: banners = [] } = useQuery<any[]>({
    queryKey: ["/api/banners", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 60000,
  });

  const { data: advertisements = [] } = useQuery<any[]>({
    queryKey: ["/api/advertisements/active", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 60000,
  });

  const { data: announcements = [] } = useQuery<any[]>({
    queryKey: ["/api/announcements/active", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 10000,
  });

  const { data: courts = [] } = useQuery<any[]>({
    queryKey: ["/api/courts"],
    refetchInterval: 3000,
  });

  useWebSocket();

  // Create a time key that changes only when day or minute changes (not every second)
  const timeKey = useMemo(() => {
    const now = currentTime;
    return `${now.getDay()}-${now.getHours()}-${now.getMinutes()}`;
  }, [currentTime]);

  // Filter active advertisements based on day and time - Updates only when advertisements or time (day/minute) changes
  const activeAds = useMemo(() => {
    const now = new Date(); // Get fresh time for filtering
    const currentDay = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return advertisements.filter((ad: any) => {
      if (!ad.isActive) return false;

      // Check day filter
      if (ad.activeDays.length > 0 && !ad.activeDays.includes(currentDay)) {
        return false;
      }

      // Check time filter
      if (ad.startTime || ad.endTime) {
        const [startHour, startMin] = (ad.startTime || '00:00').split(':').map(Number);
        const [endHour, endMin] = (ad.endTime || '23:59').split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          return false;
        }
      }

      return true;
    });
  }, [advertisements, timeKey]);

  // Keep ref updated with latest activeAds
  useEffect(() => {
    activeAdsRef.current = activeAds;
  }, [activeAds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Reset index if it's out of bounds when ads change
  useEffect(() => {
    if (activeAds.length > 0 && currentAdIndex >= activeAds.length) {
      setCurrentAdIndex(0);
    }
  }, [activeAds, currentAdIndex]);

  // Auto-rotate advertisements based on displayDuration and displayInterval
  useEffect(() => {
    const ads = activeAdsRef.current;
    
    if (ads.length === 0) {
      setShowAd(false);
      setCurrentAdIndex(0);
      return;
    }

    const currentAd = ads[currentAdIndex];
    if (!currentAd) {
      setShowAd(false);
      setCurrentAdIndex(0);
      return;
    }

    let intervalTimer: NodeJS.Timeout | null = null;

    // Show ad for displayDuration
    setShowAd(true);
    const showTimer = setTimeout(() => {
      setShowAd(false);
      
      // Wait for remaining interval time before showing next ad
      const waitTime = Math.max((currentAd.displayInterval - currentAd.displayDuration) * 1000, 1000);
      intervalTimer = setTimeout(() => {
        setCurrentAdIndex((prev) => {
          // Access latest activeAds length from ref
          const adsCount = activeAdsRef.current.length;
          if (adsCount === 0) return 0;
          return (prev + 1) % adsCount;
        });
      }, waitTime);
    }, (currentAd.displayDuration || 10) * 1000);

    return () => {
      clearTimeout(showTimer);
      if (intervalTimer) clearTimeout(intervalTimer);
    };
  }, [currentAdIndex, activeAds.length]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatMatchDuration = (startTime: string | Date) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    return `${diffMinutes} min`;
  };

  const formatScore = (score: any) => {
    if (!score) return "0-0";
    
    // Handle new live score format
    if (score.sets && Array.isArray(score.sets)) {
      const pointMap = [0, 15, 30, 40];
      const formatPoints = (points: number) => {
        if (points === 4) return "AD";
        return pointMap[points] || 0;
      };

      // Show completed sets
      let result = score.sets.map((set: any) => `${set[0]}-${set[1]}`).join(" | ");
      
      // Show current game points if available
      if (score.currentPoints && score.currentPoints.length === 2) {
        const p1 = formatPoints(score.currentPoints[0]);
        const p2 = formatPoints(score.currentPoints[1]);
        if (result) result += " | ";
        result += `${p1}-${p2}`;
      }
      
      return result || "0-0";
    }
    
    // Fallback for old format
    return "0-0";
  };

  const formatResultScore = (score: any) => {
    if (!score) return "0-0, 0-0";
    
    // Handle new format with sets array
    if (score.sets && Array.isArray(score.sets)) {
      return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(", ");
    }
    
    // Handle old format (string like "6-4, 6-3")
    if (typeof score === 'string') {
      return score;
    }
    
    return "0-0, 0-0";
  };


  const activeBanners = banners
    .filter((banner: any) => banner.isActive)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
  
  // Debug: log banner count
  console.log(`[DISPLAY] Total banners loaded: ${banners.length}, Active banners: ${activeBanners.length}`);

  return (
    <div className="fixed inset-0 z-50">
      <div className="h-screen flex flex-col tv-display">
        {/* Header */}
        <div className="px-8 py-4 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center space-x-4">
            {tournament?.tournamentLogoUrl ? (
              <img src={tournament.tournamentLogoUrl} alt="Logo Torneo" className="h-16 w-auto object-contain tv-display-logo" />
            ) : (
              <img src={courtflowLogo} alt="CourtFlow" className="h-16 w-auto tv-display-logo" />
            )}
            <div className="text-white">
              <h1 className="text-2xl font-bold">CourtFlow</h1>
              <p className="text-lg" data-testid="text-tournament-name">
                {tournament?.name || 'Torneo Pádel'}
              </p>
            </div>
          </div>
          
          {(tournament?.clubLogoUrl || tournament?.systemLogoUrl) && (
            <div className="flex items-center space-x-4">
              {tournament?.clubLogoUrl && (
                <img src={tournament.clubLogoUrl} alt="Logo Club" className="h-16 w-auto object-contain" />
              )}
              {tournament?.systemLogoUrl && (
                <img src={tournament.systemLogoUrl} alt="Logo Sistema" className="h-16 w-auto object-contain" />
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="text-right text-white">
              <p className="text-4xl font-bold font-mono" data-testid="text-current-time">
                {formatTime(currentTime)}
              </p>
              <p className="text-sm text-white/80">
                {currentTime.toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <img src={courtflowLogoNew} alt="CourtFlow" className="h-20 w-auto object-contain ml-2" />
            <Button 
              onClick={() => setLocation('/')}
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white text-xl ml-2"
              data-testid="button-close-display"
            >
              <X />
            </Button>
          </div>
        </div>

        {/* Announcements Bar */}
        {announcements.length > 0 && (
          <div className="bg-yellow-500/90 backdrop-blur-sm border-y border-yellow-600">
            <div className="px-8 py-3">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-black font-bold whitespace-nowrap">
                  <span className="text-lg">⚠️</span>
                  <span className="text-lg">AVISOS:</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="animate-marquee whitespace-nowrap text-black font-semibold text-lg">
                    {announcements
                      .sort((a: any, b: any) => b.priority - a.priority)
                      .map((announcement: any, index: number) => (
                        <span key={announcement.id} className="inline-block">
                          {announcement.message}
                          {index < announcements.length - 1 && <span className="mx-8">•</span>}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - 3 Equal Columns */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            
            {/* Column 1: Próximos Partidos */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Volleyball className="mr-3" />
                  Próximos Partidos
                </h2>
                
                <div className="flex-1 overflow-hidden relative" data-testid="next-matches-list">
                  {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay partidos programados
                    </div>
                  ) : scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').length <= 2 ? (
                    <div className="space-y-3">
                      {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                        <NextMatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div key={`upcoming-${upcomingCount}`} className="animate-scroll-vertical space-y-3">
                        {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                          <NextMatchCard key={match.id} match={match} />
                        ))}
                        {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                          <NextMatchCard key={`${match.id}-dup`} match={match} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Partidos en Curso */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Volleyball className="mr-3" />
                  Partidos en Curso
                </h2>
                
                <div className="flex-1 overflow-hidden relative" data-testid="current-matches-list">
                  {currentMatches.length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay partidos en curso
                    </div>
                  ) : currentMatches.length <= 2 ? (
                    <div className="space-y-3">
                      {currentMatches.map((match: any) => (
                        <MatchCard key={match.id} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} courts={courts} scheduledMatches={scheduledMatches} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div key={`current-${currentCount}`} className="animate-scroll-vertical space-y-3">
                        {currentMatches.map((match: any) => (
                          <MatchCard key={match.id} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} courts={courts} scheduledMatches={scheduledMatches} />
                        ))}
                        {currentMatches.map((match: any) => (
                          <MatchCard key={`${match.id}-dup`} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} courts={courts} scheduledMatches={scheduledMatches} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Últimos Resultados */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col" style={{ height: '100%' }}>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center flex-shrink-0">
                  <Volleyball className="mr-3" />
                  Resultados del Día
                </h2>
                
                <div className="overflow-hidden relative" style={{ flex: '1 1 auto', minHeight: 0 }} data-testid="recent-results-list">
                  {recentResults.length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay resultados recientes
                    </div>
                  ) : recentResults.length <= 2 ? (
                    <div className="space-y-3">
                      {recentResults.map((result: any) => (
                        <ResultCard key={result.id} result={result} formatResultScore={formatResultScore} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div key={`results-${resultsCount}`} className="animate-scroll-vertical space-y-3">
                        {recentResults.map((result: any) => (
                          <ResultCard key={result.id} result={result} formatResultScore={formatResultScore} />
                        ))}
                        {recentResults.map((result: any) => (
                          <ResultCard key={`${result.id}-dup`} result={result} formatResultScore={formatResultScore} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="pt-3 border-t border-white/20 text-center" style={{ height: '60px', minHeight: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {recentResults.length > 0 ? (
                    <p className="text-yellow-300 text-xl font-bold tracking-widest" data-testid="text-unofficial-score">
                      *** MARCADOR NO OFICIAL ***
                    </p>
                  ) : (
                    <div className="invisible">Placeholder</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Advertisement Display */}
        {showAd && activeAds.length > 0 && activeAds[currentAdIndex] && (
          <FullscreenAdDisplay ad={activeAds[currentAdIndex]} />
        )}

        {/* Footer with Sponsors - Auto Scrolling Marquee */}
        <div className="px-8 py-3 border-t border-white/20 bg-white/5 overflow-hidden">
          <div className="flex items-center justify-center">
            <div className="flex-1 overflow-hidden">
              {activeBanners.length > 0 ? (
                <div className="relative w-full overflow-hidden">
                  <div className="flex space-x-8" style={{ animation: 'marquee 45s linear infinite' }}>
                    {/* Show ALL sponsor logos with smooth rotation */}
                    {[...activeBanners, ...activeBanners, ...activeBanners, ...activeBanners].map((banner: any, idx: number) => (
                      <div key={`sponsor-${banner.id}-${idx}`} className="h-16 flex items-center flex-shrink-0">
                        <img 
                          src={banner.imageUrl} 
                          alt={banner.sponsorName} 
                          className="h-full w-auto object-contain"
                          title={banner.sponsorName}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 1</div>
                  <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 2</div>
                  <div className="text-white/40 text-xs px-4 py-2 bg-white/5 rounded">SPONSOR 3</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fullscreen Advertisement Display Component
function FullscreenAdDisplay({ ad }: { ad: any }) {
  const getContentAnimationClass = () => {
    // Typewriter is only for text, use fade-in for content when typewriter is selected
    if (ad.animationType === 'typewriter') {
      return 'animate-fade-in';
    }
    
    switch (ad.animationType) {
      case 'fade-in':
        return 'animate-fade-in';
      case 'fade-out':
        return 'animate-fade-out';
      case 'slide-in':
        return 'animate-slide-in';
      case 'zoom-in':
        return 'animate-zoom-in';
      case 'zoom-out':
        return 'animate-zoom-out';
      default:
        return 'animate-fade-in';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      data-testid="fullscreen-ad"
    >
      {/* Content */}
      <div className={`relative w-full h-full flex items-center justify-center ${getContentAnimationClass()}`}>
        {ad.contentType === 'image' && (
          <img 
            src={ad.contentUrl} 
            alt="Publicidad" 
            className="max-w-full max-h-full object-contain"
            data-testid="fullscreen-ad-image"
          />
        )}
        {ad.contentType === 'video' && (
          <video 
            src={ad.contentUrl} 
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
            loop
            data-testid="fullscreen-ad-video"
          />
        )}
        {ad.contentType === 'gif' && (
          <img 
            src={ad.contentUrl} 
            alt="Publicidad" 
            className="max-w-full max-h-full object-contain"
            data-testid="fullscreen-ad-gif"
          />
        )}
        
        {/* Text Overlay */}
        {ad.text && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm px-12 py-8 rounded-2xl">
              <h1 className={`text-white text-6xl font-bold text-center ${ad.animationType === 'typewriter' ? 'animate-typewriter overflow-hidden whitespace-nowrap border-r-4 border-white' : ''}`}>
                {ad.text}
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/20">
        <div 
          className="h-full bg-white/80 transition-all duration-1000 ease-linear"
          style={{ 
            animation: `progress ${ad.displayDuration}s linear forwards` 
          }}
          data-testid="ad-progress-bar"
        />
      </div>
    </div>
  );
}

// Match Card Component
function MatchCard({ match, formatMatchDuration, formatScore, courts, scheduledMatches }: any) {
  // Check if this court has a pre-assigned match waiting
  const court = courts?.find((c: any) => c.id === match.courtId);
  const preAssignedMatch = scheduledMatches?.find((sm: any) => 
    sm.id === court?.preAssignedScheduledMatchId && sm.preAssignedAt
  );

  return (
    <div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      data-testid={`match-card-${match.court.name.toLowerCase().replace(' ', '-')}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-destructive/80 text-white rounded-lg font-bold text-lg">
            {match.court.name}
          </span>
          {preAssignedMatch && (
            <span className="px-2 py-1 bg-orange-600/80 text-white rounded text-xs font-medium">
              Siguiente en fila
            </span>
          )}
        </div>
        <span className="text-white/60 text-base">
          {formatMatchDuration(match.startTime)}
        </span>
      </div>
      <div className="space-y-2 text-white">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium truncate flex-1">
            {match.pair1.player1.name} / {match.pair1.player2.name}
          </span>
          <span className="text-[26px] font-mono font-bold ml-2">
            {formatScore(match.score).split(' | ')[0] || '0'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium truncate flex-1">
            {match.pair2.player1.name} / {match.pair2.player2.name}
          </span>
          <span className="text-[26px] font-mono font-bold ml-2">
            {formatScore(match.score).split(' | ')[1] || '0'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Next Match Card Component
function NextMatchCard({ match }: any) {
  const getStatusBadge = () => {
    if (match.status === 'assigned' && match.court) {
      // Check if it's a pre-assignment
      if (match.preAssignedAt) {
        return <span className="text-white bg-orange-600/80 text-sm px-2 py-1 rounded">🕐 Pre-asignada</span>;
      }
      return <span className="text-white bg-purple-600/80 text-sm px-2 py-1 rounded">Cancha asignada</span>;
    }
    if (match.status === 'ready') {
      return <span className="text-white bg-green-600/80 text-sm px-2 py-1 rounded">✓ Listos</span>;
    }
    const presentCount = match.players?.filter((p: any) => p.isPresent).length || 0;
    if (presentCount > 0) {
      return <span className="text-white/60 text-sm">{presentCount}/4 presentes</span>;
    }
    return <span className="text-white/40 text-sm">Esperando jugadores</span>;
  };

  return (
    <div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      data-testid={`next-match-${match.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 bg-blue-600/80 text-white rounded-lg font-bold text-base">
          {match.plannedTime || 'Por confirmar'}
        </span>
        <div className="flex items-center gap-2">
          {match.court && (
            <span className="text-white/80 text-base font-medium">
              {match.court.name}
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>
      {match.category && (
        <div className="mb-2">
          <span className="text-white/60 text-sm bg-white/10 px-2 py-1 rounded">
            {match.category.name}
          </span>
        </div>
      )}
      <div className="space-y-2 text-white">
        <div className="text-lg font-medium truncate">
          {match.pair1.player1.name} / {match.pair1.player2.name}
        </div>
        <div className="text-lg font-medium truncate">
          {match.pair2.player1.name} / {match.pair2.player2.name}
        </div>
      </div>
    </div>
  );
}

// Result Card Component
function ResultCard({ result, formatResultScore }: any) {
  const isDefaultWin = result.scheduledMatch?.outcome === 'default';
  const isCancelled = result.scheduledMatch?.outcome === 'cancelled';
  const outcomeReason = result.scheduledMatch?.outcomeReason;
  
  return (
    <div 
      className="pb-3 border-b border-white/20 last:border-b-0"
      data-testid={`result-${result.id}`}
    >
      <div className="flex items-center justify-between mb-2 text-white/60 text-sm">
        <span>
          {result.createdAt ? 
            `Hace ${Math.floor((new Date().getTime() - new Date(result.createdAt).getTime()) / (1000 * 60))} min` : 
            'Reciente'
          }
        </span>
        <span>{result.match?.court?.name || 'Cancha'}</span>
      </div>
      
      {(isDefaultWin || isCancelled) && outcomeReason ? (
        <div className="p-3 mb-2">
          <p className="text-yellow-400 font-bold text-sm text-center tracking-wide">
            {outcomeReason}
          </p>
        </div>
      ) : null}
      
      <div className="space-y-1 text-white">
        <div className="flex justify-between items-center">
          <span className="text-lg font-medium truncate flex-1">
            {result.winner.player1.name} / {result.winner.player2.name}
          </span>
          <span className="font-mono font-bold text-white text-lg ml-2 flex-shrink-0">
            {formatResultScore(result.score)}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/70">
          <span className="text-lg truncate flex-1">
            {result.loser.player1.name} / {result.loser.player2.name}
          </span>
          <span className="font-mono text-lg ml-2 flex-shrink-0">
            {formatResultScore(result.score).split(', ').map((set: string) => {
              const [a, b] = set.split('-');
              return `${b}-${a}`;
            }).join(', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
