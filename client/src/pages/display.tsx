import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Volleyball } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";

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
    refetchInterval: 30000,
  });

  const { data: scheduledMatches = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-matches/today", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await fetch(`/api/scheduled-matches/day/${tournament.id}?day=${today}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

  const { data: recentResults = [] } = useQuery<any[]>({
    queryKey: ["/api/results/today", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const response = await fetch(`/api/results/today/${tournament.id}?day=${today}`);
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 30000,
  });

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
    if (!score || !Array.isArray(score.sets)) return "0-0, 0-0";
    return score.sets.map((set: any) => `${set[0] || 0}-${set[1] || 0}`).join(", ");
  };


  const activeBanners = banners
    .filter((banner: any) => banner.isActive)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

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
          <Button 
            onClick={() => setLocation('/')}
            variant="ghost"
            size="sm"
            className="text-white/60 hover:text-white text-xl"
            data-testid="button-close-display"
          >
            <X />
          </Button>
        </div>

        {/* Main Content - 3 Equal Columns */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            
            {/* Column 1: Partidos en Curso */}
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
                  ) : currentMatches.length <= 3 ? (
                    <div className="space-y-3">
                      {currentMatches.map((match: any) => (
                        <MatchCard key={match.id} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div className="animate-scroll-vertical space-y-3">
                        {currentMatches.map((match: any) => (
                          <MatchCard key={match.id} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} />
                        ))}
                        {currentMatches.map((match: any) => (
                          <MatchCard key={`${match.id}-dup`} match={match} formatMatchDuration={formatMatchDuration} formatScore={formatScore} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Próximos Partidos */}
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
                  ) : scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').length <= 3 ? (
                    <div className="space-y-3">
                      {scheduledMatches.filter((m: any) => m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled').map((match: any) => (
                        <NextMatchCard key={match.id} match={match} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div className="animate-scroll-vertical space-y-3">
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

            {/* Column 3: Últimos Resultados */}
            <div className="flex flex-col h-full">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 flex flex-col h-full">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <Volleyball className="mr-3" />
                  Resultados del Día
                </h2>
                
                <div className="flex-1 overflow-hidden relative" data-testid="recent-results-list">
                  {recentResults.length === 0 ? (
                    <div className="text-white/60 text-center py-12">
                      No hay resultados recientes
                    </div>
                  ) : recentResults.length <= 4 ? (
                    <div className="space-y-3">
                      {recentResults.map((result: any) => (
                        <ResultCard key={result.id} result={result} formatResultScore={formatResultScore} />
                      ))}
                    </div>
                  ) : (
                    <div className="h-full overflow-hidden">
                      <div className="animate-scroll-vertical space-y-3">
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
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-sm whitespace-nowrap">
              Patrocinadores:
            </div>
            <div className="flex-1 overflow-hidden mx-4">
              {activeBanners.length > 0 ? (
                <div className="relative">
                  <div className="flex animate-marquee space-x-8">
                    {/* Duplicate sponsors for seamless loop */}
                    {[...activeBanners, ...activeBanners, ...activeBanners].map((banner: any, idx: number) => (
                      <div key={`${banner.id}-${idx}`} className="h-16 flex items-center flex-shrink-0">
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
            <div className="text-white/60 text-sm whitespace-nowrap">
              Sistema de Control de Torneos v1.0
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
function MatchCard({ match, formatMatchDuration, formatScore }: any) {
  return (
    <div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      data-testid={`match-card-${match.court.name.toLowerCase().replace(' ', '-')}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 bg-destructive/80 text-white rounded-lg font-bold text-base">
          {match.court.name}
        </span>
        <span className="text-white/60 text-sm">
          {formatMatchDuration(match.startTime)}
        </span>
      </div>
      <div className="space-y-2 text-white">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium truncate flex-1">
            {match.pair1.player1.name} / {match.pair1.player2.name}
          </span>
          <span className="text-2xl font-mono font-bold ml-2">
            {formatScore(match.score).split(' | ')[0] || '0'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base font-medium truncate flex-1">
            {match.pair2.player1.name} / {match.pair2.player2.name}
          </span>
          <span className="text-2xl font-mono font-bold ml-2">
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
      return <span className="text-white bg-purple-600/80 text-xs px-2 py-1 rounded">Cancha asignada</span>;
    }
    if (match.status === 'ready') {
      return <span className="text-white bg-green-600/80 text-xs px-2 py-1 rounded">✓ Listos</span>;
    }
    const presentCount = match.players?.filter((p: any) => p.isPresent).length || 0;
    if (presentCount > 0) {
      return <span className="text-white/60 text-xs">{presentCount}/4 presentes</span>;
    }
    return <span className="text-white/40 text-xs">Esperando jugadores</span>;
  };

  return (
    <div 
      className="bg-white/5 rounded-xl p-4 border border-white/10"
      data-testid={`next-match-${match.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 bg-blue-600/80 text-white rounded-lg font-bold text-sm">
          {match.plannedTime || 'Por confirmar'}
        </span>
        <div className="flex items-center gap-2">
          {match.court && (
            <span className="text-white/80 text-sm font-medium">
              {match.court.name}
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>
      {match.category && (
        <div className="mb-2">
          <span className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded">
            {match.category.name}
          </span>
        </div>
      )}
      <div className="space-y-2 text-white">
        <div className="text-base font-medium truncate">
          {match.pair1.player1.name} / {match.pair1.player2.name}
        </div>
        <div className="text-base font-medium truncate">
          {match.pair2.player1.name} / {match.pair2.player2.name}
        </div>
      </div>
    </div>
  );
}

// Result Card Component
function ResultCard({ result, formatResultScore }: any) {
  return (
    <div 
      className="pb-3 border-b border-white/20 last:border-b-0"
      data-testid={`result-${result.id}`}
    >
      <div className="flex items-center justify-between mb-2 text-white/60 text-xs">
        <span>
          {result.createdAt ? 
            `Hace ${Math.floor((new Date().getTime() - new Date(result.createdAt).getTime()) / (1000 * 60))} min` : 
            'Reciente'
          }
        </span>
        <span>{result.match?.court?.name || 'Cancha'}</span>
      </div>
      <div className="space-y-1 text-white">
        <div className="flex justify-between items-center">
          <span className="text-base font-medium truncate flex-1">
            {result.winner.player1.name} / {result.winner.player2.name}
          </span>
          <span className="font-mono font-bold text-success text-base ml-2 flex-shrink-0">
            {formatResultScore(result.score)}
          </span>
        </div>
        <div className="flex justify-between items-center text-white/70">
          <span className="text-base truncate flex-1">
            {result.loser.player1.name} / {result.loser.player2.name}
          </span>
          <span className="font-mono text-base ml-2 flex-shrink-0">
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
