import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { X, Clock, Users, Trophy, TrendingUp, Activity } from "lucide-react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import courtflowLogoNew from "@assets/_LogosCOURTFLOW  sin fondo_1760480356184.png";

type ScreenType = 'current' | 'upcoming' | 'results' | 'advertisement';

export default function DisplayRotative() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('current');
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

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

  const upcomingMatches = allScheduledMatches.filter((m: any) => 
    m.status !== 'playing' && m.status !== 'completed' && m.status !== 'cancelled'
  ).slice(0, 8);

  const { data: allResults = [] } = useQuery<any[]>({
    queryKey: ["/api/results/recent", tournament?.id],
    enabled: !!tournament?.id,
    refetchInterval: 5000,
    staleTime: 0,
  });

  const recentResults = allResults.filter((result: any) => {
    const resultTime = new Date(result.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - resultTime.getTime()) / (1000 * 60));
    return diffMinutes <= 1440;
  }).slice(0, 8);

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

  useWebSocket();

  // Time key for filtering ads
  const timeKey = useMemo(() => {
    const now = currentTime;
    return `${now.getDay()}-${now.getHours()}-${now.getMinutes()}`;
  }, [currentTime]);

  const activeAds = useMemo(() => {
    const now = new Date();
    const currentDay = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return advertisements.filter((ad: any) => {
      if (!ad.isActive) return false;
      if (ad.activeDays.length > 0 && !ad.activeDays.includes(currentDay)) return false;
      if (ad.startTime || ad.endTime) {
        const [startHour, startMin] = (ad.startTime || '00:00').split(':').map(Number);
        const [endHour, endMin] = (ad.endTime || '23:59').split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        if (currentMinutes < startMinutes || currentMinutes > endMinutes) return false;
      }
      return true;
    });
  }, [advertisements, timeKey]);

  const activeBanners = banners
    .filter((banner: any) => banner.isActive)
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Screen rotation logic: current -> ad -> upcoming -> ad -> results -> ad -> repeat
  // Only include screens with data and ads between actual content
  useEffect(() => {
    const screens: ScreenType[] = [];
    const hasAds = activeAds.length > 0;
    
    // Always show current matches
    screens.push('current');
    
    // Add upcoming if there are matches, with ad before it
    if (upcomingMatches.length > 0) {
      if (hasAds) screens.push('advertisement');
      screens.push('upcoming');
    }
    
    // Add results if available, with ad before it
    if (recentResults.length > 0) {
      if (hasAds) screens.push('advertisement');
      screens.push('results');
    }
    
    // Add final ad before looping back to current (only if we have other content)
    if (hasAds && screens.length > 1) {
      screens.push('advertisement');
    }

    let currentIndex = 0;
    const rotationTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % screens.length;
      setCurrentScreen(screens[currentIndex]);
      
      // Rotate ads when showing advertisement screen
      if (screens[currentIndex] === 'advertisement') {
        setCurrentAdIndex(prev => (prev + 1) % activeAds.length);
      }
    }, 15000); // 15 seconds per screen

    return () => clearInterval(rotationTimer);
  }, [activeAds.length, upcomingMatches.length, recentResults.length]);

  const formatScore = (match: any) => {
    if (!match.score?.sets || match.score.sets.length === 0) return "0-0";
    return match.score.sets.map((set: any) => 
      `${set[0] || 0}-${set[1] || 0}`
    ).join(", ");
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-8 py-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <img 
                src={tournament?.systemLogoUrl || courtflowLogoNew} 
                alt="CourtFlow" 
                className="h-16 w-auto"
              />
              {tournament?.tournamentLogoUrl && (
                <div className="h-12 w-px bg-white/30" />
              )}
              {tournament?.tournamentLogoUrl && (
                <img 
                  src={tournament.tournamentLogoUrl} 
                  alt={tournament.name} 
                  className="h-16 w-auto"
                />
              )}
            </div>
            
            <div className="text-right">
              <h1 className="text-3xl font-bold text-white">{tournament?.name}</h1>
              <p className="text-white/80 text-lg mt-1">{formatDate(currentTime)}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-5xl font-bold text-white tabular-nums">
                  {formatTime(currentTime)}
                </div>
              </div>
              <Button
                onClick={() => setLocation("/")}
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                data-testid="button-close-display"
              >
                <X className="h-8 w-8" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area with transition */}
        <div className="flex-1 overflow-hidden transition-all duration-500 ease-in-out">
          {currentScreen === 'current' && (
            <CurrentMatchesScreen matches={currentMatches} formatScore={formatScore} />
          )}
          
          {currentScreen === 'upcoming' && (
            <UpcomingMatchesScreen matches={upcomingMatches} />
          )}
          
          {currentScreen === 'results' && (
            <ResultsScreen results={recentResults} formatScore={formatScore} />
          )}
          
          {currentScreen === 'advertisement' && activeAds.length > 0 && (
            <AdvertisementScreen ad={activeAds[currentAdIndex % activeAds.length]} />
          )}
        </div>

        {/* Footer with sponsor logos */}
        <div className="px-8 py-4 bg-[#1F2937] border-t border-[#374151]">
          {activeBanners.length > 0 ? (
            <div className="relative w-full overflow-hidden">
              <div className="inline-flex w-max gap-8" style={{ animation: 'marquee 35s linear infinite' }}>
                {[...activeBanners, ...activeBanners].map((banner: any, idx: number) => (
                  <div key={`sponsor-${banner.id}-${idx}`} className="h-16 flex items-center flex-shrink-0">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.sponsorName} 
                      className="h-full w-auto object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-[#6B7280]">
              <p>Powered by CourtFlow</p>
            </div>
          )}
        </div>
      </div>

      {/* Announcements overlay */}
      {announcements.length > 0 && (
        <div className="fixed top-24 left-0 right-0 z-50 pointer-events-none">
          <div className="bg-[#F59E0B] text-white px-8 py-3 shadow-lg">
            <div className="overflow-hidden">
              <div className="animate-marquee whitespace-nowrap">
                {announcements.map((ann: any, idx: number) => (
                  <span key={ann.id} className="inline-block mx-12 text-xl font-semibold">
                    📢 {ann.message}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Current Matches Screen Component
function CurrentMatchesScreen({ matches, formatScore }: { matches: any[], formatScore: (match: any) => string }) {
  if (matches.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-24 w-24 text-[#6B7280] mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-3">No hay partidos en curso</h2>
          <p className="text-2xl text-[#9CA3AF]">Esperando próximos partidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 flex flex-col overflow-hidden">
      <div className="mb-6 flex items-center space-x-3 flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-[#10B981] flex items-center justify-center animate-pulse">
          <Activity className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white">Partidos en Curso</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4">
          {matches.map((match: any) => (
            <div key={match.id} className="bg-[#1F2937] rounded-2xl p-4 border-2 border-[#10B981] h-fit">
              <div className="flex justify-between items-center mb-3">
                <div className="bg-[#3B82F6] text-white px-3 py-1 rounded-lg font-bold text-sm">
                  {match.court?.name || 'Sin cancha'}
                </div>
                <div className="text-[#10B981] font-bold text-base">EN VIVO</div>
              </div>
              
              <div className="bg-[#111827] rounded-xl p-3 mb-2">
                <div className="text-[#9CA3AF] text-xs mb-1">{match.category?.name}</div>
                <div className="text-white text-lg font-bold truncate">
                  {match.pair1?.player1?.name} / {match.pair1?.player2?.name}
                </div>
              </div>
              
              <div className="text-center my-2">
                <div className="text-[#F59E0B] text-2xl font-bold">{formatScore(match)}</div>
              </div>
              
              <div className="bg-[#111827] rounded-xl p-3">
                <div className="text-[#9CA3AF] text-xs mb-1">{match.category?.name}</div>
                <div className="text-white text-lg font-bold truncate">
                  {match.pair2?.player1?.name} / {match.pair2?.player2?.name}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Upcoming Matches Screen Component
function UpcomingMatchesScreen({ matches }: { matches: any[] }) {
  if (matches.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-24 w-24 text-[#6B7280] mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-3">No hay próximos partidos programados</h2>
          <p className="text-2xl text-[#9CA3AF]">Los partidos aparecerán aquí cuando sean programados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 flex flex-col overflow-hidden">
      <div className="mb-6 flex items-center space-x-3 flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-[#2563EB] flex items-center justify-center">
          <Clock className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white">Próximos Partidos</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4">
          {matches.map((match: any, idx: number) => (
            <div key={match.id} className="bg-gradient-to-br from-[#1F2937] to-[#111827] rounded-2xl p-4 border-2 border-[#374151] relative overflow-hidden h-fit">
              <div className="absolute top-3 right-3 bg-[#2563EB] text-white w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold">
                #{idx + 1}
              </div>
              
              <div className="mb-3 pr-14">
                <div className="text-[#F59E0B] font-bold text-lg mb-1">
                  {match.plannedTime || 'Por definir'}
                </div>
                <div className="text-[#9CA3AF] text-xs">{match.category?.name}</div>
              </div>
              
              <div className="space-y-2">
                <div className="bg-[#111827] rounded-lg p-2">
                  <div className="text-white font-bold text-base truncate">
                    {match.pair1?.player1?.name} / {match.pair1?.player2?.name}
                  </div>
                </div>
                
                <div className="text-center text-[#6B7280] font-bold text-sm">VS</div>
                
                <div className="bg-[#111827] rounded-lg p-2">
                  <div className="text-white font-bold text-base truncate">
                    {match.pair2?.player1?.name} / {match.pair2?.player2?.name}
                  </div>
                </div>
              </div>
              
              {match.court ? (
                <div className="mt-3 bg-[#10B981] text-white px-2 py-1 rounded-lg text-center font-semibold text-sm">
                  ✓ Asignado: {match.court.name}
                </div>
              ) : match.status === 'pre_assigned' ? (
                <div className="mt-3 bg-[#F59E0B] text-white px-2 py-1 rounded-lg text-center font-semibold text-sm">
                  ⏳ Pre-asignado
                </div>
              ) : (
                <div className="mt-3 bg-[#6B7280] text-white px-2 py-1 rounded-lg text-center font-semibold text-sm">
                  ⏱ En espera
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Results Screen Component
function ResultsScreen({ results, formatScore }: { results: any[], formatScore: (result: any) => string }) {
  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-24 w-24 text-[#6B7280] mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-3">No hay resultados recientes</h2>
          <p className="text-2xl text-[#9CA3AF]">Los resultados aparecerán aquí cuando se completen partidos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 flex flex-col overflow-hidden">
      <div className="mb-6 flex items-center space-x-3 flex-shrink-0">
        <div className="h-12 w-12 rounded-full bg-[#F59E0B] flex items-center justify-center">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <h2 className="text-4xl font-bold text-white">Resultados Recientes</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-4">
          {results.map((result: any) => (
            <div key={result.id} className="bg-[#1F2937] rounded-2xl p-4 border-2 border-[#374151] h-fit">
              <div className="flex justify-between items-start mb-3">
                <div className="text-[#9CA3AF] text-xs">{result.match?.category?.name}</div>
                <div className="text-[#6B7280] text-xs">
                  {new Date(result.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div className={`rounded-lg p-3 mb-2 ${result.winnerId === result.match?.pair1?.id ? 'bg-[#10B981]/20 border-2 border-[#10B981]' : 'bg-[#111827]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-base font-bold truncate">
                      {result.match?.pair1?.player1?.name} / {result.match?.pair1?.player2?.name}
                    </div>
                  </div>
                  {result.winnerId === result.match?.pair1?.id && (
                    <Trophy className="h-6 w-6 text-[#10B981] flex-shrink-0" />
                  )}
                </div>
              </div>
              
              <div className="text-center my-2">
                <div className="text-[#F59E0B] text-xl font-bold">{formatScore(result)}</div>
              </div>
              
              <div className={`rounded-lg p-3 ${result.winnerId === result.match?.pair2?.id ? 'bg-[#10B981]/20 border-2 border-[#10B981]' : 'bg-[#111827]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-base font-bold truncate">
                      {result.match?.pair2?.player1?.name} / {result.match?.pair2?.player2?.name}
                    </div>
                  </div>
                  {result.winnerId === result.match?.pair2?.id && (
                    <Trophy className="h-6 w-6 text-[#10B981] flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Advertisement Screen Component
function AdvertisementScreen({ ad }: { ad: any }) {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-br from-[#1F2937] to-[#111827] p-8">
      <div className="max-w-6xl w-full">
        {ad.contentType === 'video' ? (
          <video
            src={ad.contentUrl}
            autoPlay
            muted
            loop
            className="w-full h-auto max-h-[70vh] rounded-2xl shadow-2xl"
          />
        ) : (
          <img
            src={ad.contentUrl}
            alt={ad.title}
            className="w-full h-auto max-h-[70vh] object-contain rounded-2xl shadow-2xl"
          />
        )}
        
        {ad.textOverlay && (
          <div className="mt-8 text-center">
            <h3 className="text-5xl font-bold text-white mb-4">{ad.title}</h3>
            <p className="text-2xl text-[#D1D5DB]">{ad.textOverlay}</p>
          </div>
        )}
      </div>
    </div>
  );
}
