import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";
import { useKeepAwake } from "@/hooks/use-keep-awake";
import { getCurrentDayTimeInTimezone } from "@/lib/utils";
import courtflowLogoNew from "@assets/_LogosCOURTFLOW  sin fondo_1760480356184.png";
import logoRecord from "@assets/logo-record-new.png";
import { X } from "lucide-react";

export default function DisplayStream() {
  const { courtId } = useParams<{ courtId: string }>();
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const activeAdsRef = useRef<any[]>([]);

  useKeepAwake();
  useWebSocket();

  const { data: court } = useQuery<any>({
    queryKey: ["/api/courts", courtId],
    queryFn: async () => {
      const response = await fetch(`/api/courts/${courtId}`);
      if (!response.ok) throw new Error("Cancha no encontrada");
      return response.json();
    },
    enabled: !!courtId,
  });

  const { data: tournament } = useQuery<{ 
    id: string; 
    name: string;
    tournamentLogoUrl?: string;
    clubLogoUrl?: string;
    systemLogoUrl?: string;
    timezone?: string;
    sponsorRotationSpeed?: number;
    sponsorRotationEnabled?: boolean;
  }>({
    queryKey: ["/api/tournament"],
  });

  const { data: currentMatch } = useQuery<any>({
    queryKey: ["/api/matches/by-court", courtId],
    queryFn: async () => {
      if (!tournament?.id) return null;
      const response = await fetch(`/api/matches/current/${tournament.id}`);
      const matches = await response.json();
      return matches.find((m: any) => m.courtId === courtId) || null;
    },
    enabled: !!courtId && !!tournament?.id,
    refetchInterval: 2000,
    staleTime: 0,
  });

  const { data: banners = [] } = useQuery<any[]>({
    queryKey: ["/api/banners", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/banners?tournamentId=${tournament.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 60000,
  });

  const { data: advertisements = [] } = useQuery<any[]>({
    queryKey: ["/api/advertisements/active", tournament?.id],
    queryFn: async () => {
      if (!tournament?.id) return [];
      const response = await fetch(`/api/advertisements/active/${tournament.id}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!tournament?.id,
    refetchInterval: 60000,
  });

  // Create a time key that changes only when day or minute changes
  const timeKey = useMemo(() => {
    if (tournament?.timezone) {
      const { day, hours, minutes } = getCurrentDayTimeInTimezone(tournament.timezone);
      return `${day}-${hours}-${minutes}`;
    } else {
      const now = currentTime;
      return `${now.getDay()}-${now.getHours()}-${now.getMinutes()}`;
    }
  }, [currentTime, tournament?.timezone]);

  // Filter active advertisements based on day and time
  const activeAds = useMemo(() => {
    let currentDay: string;
    let currentMinutes: number;
    
    if (tournament?.timezone) {
      const { day, totalMinutes } = getCurrentDayTimeInTimezone(tournament.timezone);
      currentDay = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day];
      currentMinutes = totalMinutes;
    } else {
      const now = new Date();
      currentDay = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][now.getDay()];
      currentMinutes = now.getHours() * 60 + now.getMinutes();
    }

    return advertisements.filter((ad: any) => {
      if (!ad.isActive) return false;

      if (ad.activeDays.length > 0 && !ad.activeDays.includes(currentDay)) {
        return false;
      }

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
    }).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [advertisements, timeKey]);

  // Create stable config hash to detect meaningful changes
  const adsConfigHash = useMemo(() => {
    return activeAds
      .map((ad: any) => `${ad.id}-${ad.displayDuration}-${ad.displayInterval}`)
      .join('|');
  }, [activeAds]);

  // Update ref ONLY when config changes
  useEffect(() => {
    activeAdsRef.current = activeAds;
  }, [activeAds]);

  // Stable advertisement rotation system using refs to prevent timer resets
  useEffect(() => {
    if (activeAds.length === 0) {
      setShowAd(false);
      setCurrentAdIndex(0);
      return;
    }

    let showTimer: NodeJS.Timeout | null = null;
    let hideTimer: NodeJS.Timeout | null = null;
    let isActive = true;

    const rotateAd = (index: number) => {
      if (!isActive || activeAdsRef.current.length === 0) return;

      const currentAd = activeAdsRef.current[index];
      if (!currentAd) {
        rotateAd(0);
        return;
      }

      // Show the ad
      setCurrentAdIndex(index);
      setShowAd(true);

      const displayDurationMs = (currentAd.displayDuration || 10) * 1000;
      const displayIntervalMs = (currentAd.displayInterval || 30) * 1000;

      // Hide after displayDuration
      hideTimer = setTimeout(() => {
        if (!isActive) return;
        setShowAd(false);

        // Wait for the interval gap, then show next ad
        const waitTime = Math.max(displayIntervalMs - displayDurationMs, 1000);
        showTimer = setTimeout(() => {
          if (!isActive) return;
          const nextIndex = (index + 1) % activeAdsRef.current.length;
          rotateAd(nextIndex);
        }, waitTime);
      }, displayDurationMs);
    };

    // Start rotation
    rotateAd(0);

    return () => {
      isActive = false;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [adsConfigHash]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentAd = activeAdsRef.current[currentAdIndex];

  const getTournamentLogo = () => {
    if (tournament?.systemLogoUrl) return tournament.systemLogoUrl;
    if (tournament?.tournamentLogoUrl) return tournament.tournamentLogoUrl;
    return courtflowLogoNew;
  };

  const getClubLogo = () => {
    return tournament?.clubLogoUrl || null;
  };

  const formatScore = (score: any) => {
    if (!score || !score.sets) return '';
    return score.sets.map((set: [number, number]) => `${set[0]}-${set[1]}`).join(' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/90 via-primary to-accent/80 overflow-hidden">
      {/* Main Container */}
      <div className="h-screen flex flex-col p-4 gap-4">
        
        {/* Header with logos and RECORD logo */}
        <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 border border-gray-700 shadow-2xl">
          <div className="flex items-center gap-4">
            <img 
              src={getTournamentLogo()} 
              alt="Tournament Logo" 
              className="h-12 md:h-16 object-contain drop-shadow-lg"
            />
          </div>
          <div className="flex-1 flex justify-center">
            <img 
              src={logoRecord} 
              alt="RECORD Highlight Recorder" 
              className="h-20 md:h-24 object-contain drop-shadow-lg"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-white">
              <p className="text-2xl font-bold">
                {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm opacity-80">
                {currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 grid grid-rows-[1fr_auto] gap-4">
          
          {/* Video Stream Section */}
          <div className="bg-black rounded-2xl overflow-hidden relative border border-white/20">
            {court?.streamUrl ? (
              <iframe
                src={court.streamUrl}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                title="Video Stream"
                data-testid="stream-video"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white text-center">
                  <p className="text-2xl mb-2">📹</p>
                  <p className="text-lg">No hay stream configurado para esta cancha</p>
                </div>
              </div>
            )}
            
            {/* Match Info Overlay (if match is playing) */}
            {currentMatch && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                <div className="text-white">
                  <div className="space-y-3">
                    {/* Pair 1 - Name and Scores */}
                    <div className="flex items-center gap-4">
                      <p className="text-2xl font-bold flex-1">
                        {currentMatch.pair1.player1.name} / {currentMatch.pair1.player2.name}
                      </p>
                      {currentMatch.score && currentMatch.score.sets && (
                        <div className="flex gap-3">
                          {currentMatch.score.sets.map((set: [number, number], index: number) => (
                            <div key={index} className="bg-white/10 rounded-lg px-4 py-3 min-w-[70px]">
                              <div className="text-3xl font-bold text-center">{set[0]}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Pair 2 - Name and Scores */}
                    <div className="flex items-center gap-4">
                      <p className="text-2xl font-bold flex-1">
                        {currentMatch.pair2.player1.name} / {currentMatch.pair2.player2.name}
                      </p>
                      {currentMatch.score && currentMatch.score.sets && (
                        <div className="flex gap-3">
                          {currentMatch.score.sets.map((set: [number, number], index: number) => (
                            <div key={index} className="bg-white/10 rounded-lg px-4 py-3 min-w-[70px]">
                              <div className="text-3xl font-bold text-center">{set[1]}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {currentMatch.category && (
                    <div className="mt-4 flex items-center gap-4">
                      <span className="px-4 py-1 bg-orange-600/80 text-white rounded-lg text-sm font-semibold">
                        {currentMatch.category.name}
                      </span>
                      {currentMatch.format && (
                        <span className="px-4 py-1 bg-blue-600/80 text-white rounded-lg text-sm font-semibold">
                          {currentMatch.format}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sponsor Banner */}
          {banners.length > 0 && (
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 border border-gray-700 shadow-xl h-24">
              <div className="h-full overflow-hidden relative">
                <div 
                  className="flex gap-8 animate-marquee"
                  style={{
                    animation: `marquee ${(tournament?.sponsorRotationSpeed || 20)}s linear infinite`,
                    animationPlayState: tournament?.sponsorRotationEnabled === false ? 'paused' : 'running'
                  }}
                >
                  {[...banners, ...banners].map((banner: any, index: number) => (
                    <div key={`${banner.id}-${index}`} className="flex-shrink-0 flex items-center justify-center h-full px-4">
                      <img 
                        src={banner.imageUrl} 
                        alt={banner.sponsorName}
                        className="h-full object-contain max-w-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Advertisement Overlay */}
      {showAd && currentAd && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] animate-fadeIn backdrop-blur-sm"
          data-testid="advertisement-overlay"
          style={{ isolation: 'isolate' }}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full mx-8">
            <button
              onClick={() => setShowAd(false)}
              className="absolute -top-12 right-0 text-white hover:text-white/70 transition-colors"
              data-testid="button-close-ad"
            >
              <X className="w-8 h-8" />
            </button>
            
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              {currentAd.contentType === 'image' && (
                <div className="relative">
                  <img 
                    src={currentAd.contentUrl} 
                    alt="Advertisement"
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                  {currentAd.text && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                      <p className="text-white/90 text-xl">{currentAd.text}</p>
                    </div>
                  )}
                </div>
              )}

              {currentAd.contentType === 'video' && (
                <div className="relative">
                  <video 
                    src={currentAd.contentUrl} 
                    autoPlay 
                    muted 
                    loop
                    className="w-full h-auto max-h-[80vh]"
                    controls
                  />
                  {currentAd.text && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                      <p className="text-white/90 text-xl">{currentAd.text}</p>
                    </div>
                  )}
                </div>
              )}

              {currentAd.contentType === 'text' && (
                <div className="p-16 text-center">
                  <p className="text-3xl text-gray-700 leading-relaxed">{currentAd.text}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
