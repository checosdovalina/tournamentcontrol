import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserPlus, ClipboardCheck, Settings, Tv, Bell, Calendar, Shield, Users, Clock, FileSpreadsheet, ChevronDown, LayoutGrid, Repeat, QrCode } from "lucide-react";
import CurrentMatches from "@/components/current-matches";
import CourtStatus from "@/components/court-status";
import WaitingList from "@/components/waiting-list";
import ReadyQueue from "@/components/ready-queue";
import RecentResults from "@/components/recent-results";
import TournamentStats from "@/components/tournament-stats";
import ScheduledMatches from "@/components/scheduled-matches";
import ScheduleTimelineView from "@/components/schedule-timeline-view";
import SuperAdminPanel from "@/components/super-admin-panel";
import PairsManagement from "@/components/pairs-management";
import LiveScoreCapture from "@/components/live-score-capture";
import TournamentQR from "@/components/tournament-qr";
import ImportExcelModal from "@/components/modals/import-excel-modal";
import RegisterPlayerModal from "@/components/modals/register-player-modal";
import RecordResultModal from "@/components/modals/record-result-modal";
import ManageCourtsModal from "@/components/modals/manage-courts-modal";
import TournamentConfigModal from "@/components/modals/tournament-config-modal";
import ImportPairsModal from "@/components/modals/import-pairs-modal";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import courtflowLogo from "@assets/_Logos JC (Court Flow)_1759964500350.png";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [courtsModalOpen, setCourtsModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [importPairsModalOpen, setImportPairsModalOpen] = useState(false);
  const [importExcelModalOpen, setImportExcelModalOpen] = useState(false);

  const { data: user } = useQuery<{ user: { id: string; username: string; name: string; role: string } }>({
    queryKey: ["/api/auth/me"],
  });

  const { data: tournament, isLoading: tournamentLoading, isError: tournamentError } = useQuery<{ id: string; name: string; clubId: string; startDate: Date; endDate: Date; isActive: boolean | null; config: any; userRole?: string; timezone?: string }>({
    queryKey: ["/api/tournament"],
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openFullScreenDisplay = () => {
    setLocation("/display");
  };

  const openRotativeDisplay = () => {
    setLocation("/display-rotative");
  };

  const openControlDisplay = () => {
    setLocation("/display-control");
  };

  if (tournamentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando torneo...</p>
        </div>
      </div>
    );
  }

  if (tournamentError || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-yellow-500 mb-2">No hay torneo activo</h2>
            <p className="text-muted-foreground mb-4">
              No se encontró un torneo activo. Por favor contacta al administrador para activar un torneo.
            </p>
            {user?.user?.role === 'superadmin' && (
              <p className="text-sm text-muted-foreground">
                Como superadmin, puedes activar un torneo desde el panel de administración.
              </p>
            )}
          </div>
          <Button onClick={handleLogout} variant="outline" data-testid="button-logout-no-tournament">
            Cerrar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img src={courtflowLogo} alt="CourtFlow" className="h-[75px] w-auto" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {tournament?.name || "Cargando..."}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Real-time connection status indicator */}
              <div className="flex items-center space-x-2 text-sm">
                <span className="status-indicator status-available pulse-dot"></span>
                <span className="text-muted-foreground hidden sm:inline">Conectado</span>
              </div>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <Button variant="ghost" size="sm" data-testid="button-notifications">
                  <Bell className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                    <span data-testid="text-user-initials">
                      {user?.user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium" data-testid="text-user-name">
                      {user?.user?.name || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-user-role">
                      {user?.user?.role || 'Usuario'}
                    </p>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue={user?.user?.role === 'superadmin' ? 'admin' : 'control'} className="w-full">
          <TabsList className="mb-6">
            {user?.user?.role === 'superadmin' && (
              <TabsTrigger value="admin" data-testid="tab-admin">
                <Shield className="w-4 h-4 mr-2" />
                Administración
              </TabsTrigger>
            )}
            <TabsTrigger value="control" data-testid="tab-control">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Control
            </TabsTrigger>
            <TabsTrigger value="live-score" data-testid="tab-live-score">
              <Tv className="w-4 h-4 mr-2" />
              Captura de Score
            </TabsTrigger>
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <Calendar className="w-4 h-4 mr-2" />
              Programación
            </TabsTrigger>
            <TabsTrigger value="timeline" data-testid="tab-timeline">
              <Clock className="w-4 h-4 mr-2" />
              Horarios
            </TabsTrigger>
            {(user?.user?.role === 'admin' || user?.user?.role === 'superadmin') && (
              <TabsTrigger value="pairs" data-testid="tab-pairs">
                <Users className="w-4 h-4 mr-2" />
                Parejas
              </TabsTrigger>
            )}
            {(user?.user?.role === 'admin' || user?.user?.role === 'superadmin') && (
              <TabsTrigger value="qr-capture" data-testid="tab-qr-capture">
                <QrCode className="w-4 h-4 mr-2" />
                QR Captura
              </TabsTrigger>
            )}
          </TabsList>

          {user?.user?.role === 'superadmin' && (
            <TabsContent value="admin">
              <SuperAdminPanel />
            </TabsContent>
          )}

          <TabsContent value="control" className="space-y-6">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setRegisterModalOpen(true)}
                className="inline-flex items-center"
                data-testid="button-register-pair"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Registrar Pareja
              </Button>
              {user?.user?.role === 'admin' && (
                <Button 
                  onClick={() => setImportPairsModalOpen(true)}
                  variant="secondary"
                  className="inline-flex items-center"
                  data-testid="button-import-pairs"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Importar Excel
                </Button>
              )}
              <Button 
                onClick={() => setResultModalOpen(true)}
                variant="secondary"
                className="inline-flex items-center bg-accent text-accent-foreground hover:bg-accent/90"
                data-testid="button-record-result"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Registrar Resultado
              </Button>
              {user?.user?.role === 'admin' && (
                <Button 
                  onClick={() => setCourtsModalOpen(true)}
                  variant="secondary"
                  className="inline-flex items-center"
                  data-testid="button-manage-courts"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Gestionar Canchas
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="inline-flex items-center"
                    data-testid="button-fullscreen-display"
                  >
                    <Tv className="w-4 h-4 mr-2" />
                    Modo Pantalla Completa
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={openFullScreenDisplay} className="cursor-pointer">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Display Clásico
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openRotativeDisplay} className="cursor-pointer">
                    <Repeat className="w-4 h-4 mr-2" />
                    Display Rotativo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openControlDisplay} className="cursor-pointer">
                    <Users className="w-4 h-4 mr-2" />
                    Mesa de Control
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {user?.user?.role === 'admin' && (
                <Button 
                  onClick={() => setConfigModalOpen(true)}
                  variant="outline"
                  className="inline-flex items-center"
                  data-testid="button-tournament-config"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configuración
                </Button>
              )}
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Matches */}
              <div className="lg:col-span-2">
                <CurrentMatches tournamentId={tournament?.id} />
              </div>

              {/* Court Status */}
              <div className="lg:col-span-1">
                <CourtStatus />
              </div>

              {/* Ready Queue - Matches with all 4 players confirmed */}
              <div className="lg:col-span-2">
                <ReadyQueue tournamentId={tournament?.id} />
              </div>

              {/* Waiting List - Matches with partial confirmation */}
              <div className="lg:col-span-2">
                <WaitingList tournamentId={tournament?.id} />
              </div>

              {/* Recent Results */}
              <div className="lg:col-span-1">
                <RecentResults tournamentId={tournament?.id} showActions={true} timezone={tournament?.timezone} />
              </div>
            </div>

            {/* Tournament Statistics */}
            <TournamentStats tournamentId={tournament?.id} />
          </TabsContent>

          <TabsContent value="live-score">
            <LiveScoreCapture />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduledMatches 
              tournamentId={tournament?.id} 
              userRole={tournament?.userRole}
              onImportClick={() => setImportExcelModalOpen(true)}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <ScheduleTimelineView tournamentId={tournament?.id} />
          </TabsContent>

          {(user?.user?.role === 'admin' || user?.user?.role === 'superadmin') && (
            <TabsContent value="pairs">
              <PairsManagement />
            </TabsContent>
          )}

          {(user?.user?.role === 'admin' || user?.user?.role === 'superadmin') && (
            <TabsContent value="qr-capture">
              {tournament && (
                <TournamentQR 
                  tournamentId={tournament.id} 
                  tournamentName={tournament.name} 
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Modals */}
      <RegisterPlayerModal 
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        tournamentId={tournament?.id}
      />
      <RecordResultModal 
        open={resultModalOpen}
        onOpenChange={setResultModalOpen}
        tournamentId={tournament?.id}
      />
      {user?.user?.role === 'admin' && (
        <ManageCourtsModal 
          open={courtsModalOpen}
          onOpenChange={setCourtsModalOpen}
        />
      )}
      {user?.user?.role === 'admin' && (
        <TournamentConfigModal 
          open={configModalOpen}
          onOpenChange={setConfigModalOpen}
          tournament={tournament}
        />
      )}
      {user?.user?.role === 'admin' && (
        <ImportPairsModal 
          open={importPairsModalOpen}
          onOpenChange={setImportPairsModalOpen}
          tournamentId={tournament?.id}
        />
      )}
      {(user?.user?.role === 'admin' || user?.user?.role === 'superadmin') && tournament && (
        <ImportExcelModal 
          open={importExcelModalOpen}
          onOpenChange={setImportExcelModalOpen}
          tournamentId={tournament.id}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches"] });
          }}
        />
      )}
    </div>
  );
}
