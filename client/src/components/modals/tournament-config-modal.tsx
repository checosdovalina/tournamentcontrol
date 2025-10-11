import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Save, X, Image, Zap, MoveRight, ZoomIn, Type, Sparkles } from "lucide-react";

interface TournamentConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournament?: any;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  tournamentId: string;
}

interface SponsorBanner {
  id: string;
  sponsorName: string;
  imageUrl: string;
  link: string | null;
  displayOrder: number;
  tournamentId: string;
}

interface Advertisement {
  id: string;
  tournamentId: string;
  contentType: 'image' | 'video' | 'gif';
  contentUrl: string;
  text: string | null;
  animationType: 'fade-in' | 'fade-out' | 'slide-in' | 'zoom-in' | 'zoom-out' | 'typewriter';
  displayDuration: number;
  displayInterval: number;
  startTime: string | null;
  endTime: string | null;
  activeDays: string[];
  isActive: boolean;
}

export default function TournamentConfigModal({ open, onOpenChange, tournament }: TournamentConfigModalProps) {
  const [tournamentName, setTournamentName] = useState("");
  const [selectedClub, setSelectedClub] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("");
  const [systemLogoUrl, setSystemLogoUrl] = useState("");
  const { toast } = useToast();

  // Category state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryDescription, setEditCategoryDescription] = useState("");

  // Banner state
  const [newBannerName, setNewBannerName] = useState("");
  const [newBannerUrl, setNewBannerUrl] = useState("");
  const [newBannerLink, setNewBannerLink] = useState("");
  const [editingBanner, setEditingBanner] = useState<string | null>(null);
  const [editBannerName, setEditBannerName] = useState("");
  const [editBannerUrl, setEditBannerUrl] = useState("");
  const [editBannerLink, setEditBannerLink] = useState("");

  // Advertisement state
  const [newAdType, setNewAdType] = useState<'image' | 'video' | 'gif'>('image');
  const [newAdUrl, setNewAdUrl] = useState("");
  const [newAdText, setNewAdText] = useState("");
  const [newAdAnimation, setNewAdAnimation] = useState<'fade-in' | 'fade-out' | 'slide-in' | 'zoom-in' | 'zoom-out' | 'typewriter'>('fade-in');
  const [newAdDuration, setNewAdDuration] = useState("10");
  const [newAdInterval, setNewAdInterval] = useState("60");
  const [newAdStartTime, setNewAdStartTime] = useState("");
  const [newAdEndTime, setNewAdEndTime] = useState("");
  const [newAdActiveDays, setNewAdActiveDays] = useState<string[]>(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
  const [editingAd, setEditingAd] = useState<string | null>(null);
  const [editAdType, setEditAdType] = useState<'image' | 'video' | 'gif'>('image');
  const [editAdUrl, setEditAdUrl] = useState("");
  const [editAdText, setEditAdText] = useState("");
  const [editAdAnimation, setEditAdAnimation] = useState<'fade-in' | 'fade-out' | 'slide-in' | 'zoom-in' | 'zoom-out' | 'typewriter'>('fade-in');
  const [editAdDuration, setEditAdDuration] = useState("10");
  const [editAdInterval, setEditAdInterval] = useState("60");
  const [editAdStartTime, setEditAdStartTime] = useState("");
  const [editAdEndTime, setEditAdEndTime] = useState("");
  const [editAdActiveDays, setEditAdActiveDays] = useState<string[]>([]);

  const { data: clubs = [] } = useQuery<any[]>({
    queryKey: ["/api/clubs"],
    enabled: open,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: [`/api/categories/${tournament?.id}`],
    enabled: open && !!tournament?.id,
  });

  const { data: banners = [], isLoading: bannersLoading } = useQuery<SponsorBanner[]>({
    queryKey: [`/api/banners/${tournament?.id}`],
    enabled: open && !!tournament?.id,
  });

  const { data: advertisements = [], isLoading: advertisementsLoading } = useQuery<Advertisement[]>({
    queryKey: [`/api/advertisements/${tournament?.id}`],
    enabled: open && !!tournament?.id,
  });

  const updateTournamentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", `/api/admin/tournaments/${tournament.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tournaments"] });
      toast({
        title: "Configuración guardada",
        description: "La información del torneo ha sido actualizada",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; tournamentId: string }) => {
      const response = await apiRequest("POST", "/api/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${tournament?.id}`] });
      setNewCategoryName("");
      setNewCategoryDescription("");
      toast({
        title: "Categoría creada",
        description: "La categoría ha sido agregada al torneo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear categoría",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; description?: string } }) => {
      const response = await apiRequest("PATCH", `/api/categories/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${tournament?.id}`] });
      setEditingCategory(null);
      toast({
        title: "Categoría actualizada",
        description: "Los cambios han sido guardados",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/categories/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/categories/${tournament?.id}`] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido removida del torneo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createBannerMutation = useMutation({
    mutationFn: async (data: { sponsorName: string; imageUrl: string; link: string | null; tournamentId: string; displayOrder: number }) => {
      const response = await apiRequest("POST", "/api/banners", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/banners/${tournament?.id}`] });
      setNewBannerName("");
      setNewBannerUrl("");
      setNewBannerLink("");
      toast({
        title: "Banner agregado",
        description: "El banner de patrocinador ha sido creado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear banner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { sponsorName?: string; imageUrl?: string; link?: string | null } }) => {
      const response = await apiRequest("PATCH", `/api/banners/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/banners/${tournament?.id}`] });
      setEditingBanner(null);
      toast({
        title: "Banner actualizado",
        description: "Los cambios han sido guardados",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/banners/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/banners/${tournament?.id}`] });
      toast({
        title: "Banner eliminado",
        description: "El banner ha sido removido",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAdvertisementMutation = useMutation({
    mutationFn: async (data: { tournamentId: string; contentType: string; contentUrl: string; text: string | null; animationType: string; displayDuration: number; displayInterval: number; startTime: string | null; endTime: string | null; activeDays: string[] }) => {
      const response = await apiRequest("POST", "/api/advertisements", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/advertisements/${tournament?.id}`] });
      setNewAdType('image');
      setNewAdUrl("");
      setNewAdText("");
      setNewAdAnimation('fade-in');
      setNewAdDuration("10");
      setNewAdInterval("60");
      setNewAdStartTime("");
      setNewAdEndTime("");
      setNewAdActiveDays(['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']);
      toast({
        title: "Publicidad agregada",
        description: "El contenido publicitario ha sido creado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear publicidad",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAdvertisementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PATCH", `/api/advertisements/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/advertisements/${tournament?.id}`] });
      toast({
        title: "Publicidad actualizada",
        description: "El contenido publicitario ha sido modificado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteAdvertisementMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/advertisements/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/advertisements/${tournament?.id}`] });
      toast({
        title: "Publicidad eliminada",
        description: "El contenido ha sido removido",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (tournament && open) {
      setTournamentName(tournament.name || "");
      setSelectedClub(tournament.clubId || "");
      setStartDate(tournament.startDate ? new Date(tournament.startDate).toISOString().split('T')[0] : "");
      setEndDate(tournament.endDate ? new Date(tournament.endDate).toISOString().split('T')[0] : "");
      setLogoUrl(tournament.tournamentLogoUrl || "");
      setClubLogoUrl(tournament.clubLogoUrl || "");
      setSystemLogoUrl(tournament.systemLogoUrl || "");
    }
  }, [tournament, open]);

  const handleSubmitGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tournamentName || !selectedClub || !startDate || !endDate) {
      toast({
        title: "Campos incompletos",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    updateTournamentMutation.mutate({
      name: tournamentName,
      clubId: selectedClub,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      tournamentLogoUrl: logoUrl || null,
      clubLogoUrl: clubLogoUrl || null,
      systemLogoUrl: systemLogoUrl || null,
    });
  };

  const handleAddCategory = () => {
    if (!newCategoryName || !tournament?.id) return;
    
    createCategoryMutation.mutate({
      name: newCategoryName,
      description: newCategoryDescription || "",
      tournamentId: tournament.id,
    });
  };

  const handleStartEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.name);
    setEditCategoryDescription(category.description || "");
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;
    
    updateCategoryMutation.mutate({
      id: editingCategory,
      data: {
        name: editCategoryName,
        description: editCategoryDescription,
      },
    });
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryName("");
    setEditCategoryDescription("");
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("¿Está seguro de eliminar esta categoría?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleAddBanner = () => {
    if (!newBannerName || !newBannerUrl || !tournament?.id) return;
    
    const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.displayOrder)) : 0;
    
    createBannerMutation.mutate({
      sponsorName: newBannerName,
      imageUrl: newBannerUrl,
      link: newBannerLink || null,
      tournamentId: tournament.id,
      displayOrder: maxOrder + 1,
    });
  };

  const handleStartEditBanner = (banner: SponsorBanner) => {
    setEditingBanner(banner.id);
    setEditBannerName(banner.sponsorName);
    setEditBannerUrl(banner.imageUrl);
    setEditBannerLink(banner.link || "");
  };

  const handleSaveBanner = () => {
    if (!editingBanner) return;
    
    updateBannerMutation.mutate({
      id: editingBanner,
      data: {
        sponsorName: editBannerName,
        imageUrl: editBannerUrl,
        link: editBannerLink || null,
      },
    });
  };

  const handleCancelEditBanner = () => {
    setEditingBanner(null);
    setEditBannerName("");
    setEditBannerUrl("");
    setEditBannerLink("");
  };

  const handleDeleteBanner = (id: string) => {
    if (confirm("¿Está seguro de eliminar este banner?")) {
      deleteBannerMutation.mutate(id);
    }
  };

  const handleAddAdvertisement = () => {
    if (!newAdUrl || !tournament?.id) return;
    
    createAdvertisementMutation.mutate({
      tournamentId: tournament.id,
      contentType: newAdType,
      contentUrl: newAdUrl,
      text: newAdText || null,
      animationType: newAdAnimation,
      displayDuration: parseInt(newAdDuration),
      displayInterval: parseInt(newAdInterval),
      startTime: newAdStartTime || null,
      endTime: newAdEndTime || null,
      activeDays: newAdActiveDays,
    });
  };

  const handleStartEditAdvertisement = (ad: Advertisement) => {
    setEditingAd(ad.id);
    setEditAdType(ad.contentType);
    setEditAdUrl(ad.contentUrl);
    setEditAdText(ad.text || "");
    setEditAdAnimation(ad.animationType);
    setEditAdDuration(ad.displayDuration.toString());
    setEditAdInterval(ad.displayInterval.toString());
    setEditAdStartTime(ad.startTime || "");
    setEditAdEndTime(ad.endTime || "");
    setEditAdActiveDays(ad.activeDays);
  };

  const handleSaveAdvertisement = () => {
    if (!editingAd) return;
    
    updateAdvertisementMutation.mutate({
      id: editingAd,
      data: {
        contentType: editAdType,
        contentUrl: editAdUrl,
        text: editAdText || null,
        animationType: editAdAnimation,
        displayDuration: parseInt(editAdDuration),
        displayInterval: parseInt(editAdInterval),
        startTime: editAdStartTime || null,
        endTime: editAdEndTime || null,
        activeDays: editAdActiveDays,
      },
    });
    setEditingAd(null);
  };

  const handleCancelEditAdvertisement = () => {
    setEditingAd(null);
    setEditAdType('image');
    setEditAdUrl("");
    setEditAdText("");
    setEditAdAnimation('fade-in');
    setEditAdDuration("10");
    setEditAdInterval("60");
    setEditAdStartTime("");
    setEditAdEndTime("");
    setEditAdActiveDays([]);
  };

  const handleDeleteAdvertisement = (id: string) => {
    if (confirm("¿Está seguro de eliminar esta publicidad?")) {
      deleteAdvertisementMutation.mutate(id);
    }
  };

  const handleToggleDay = (day: string, isEditing: boolean = false) => {
    if (isEditing) {
      setEditAdActiveDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
    } else {
      setNewAdActiveDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración del Torneo</DialogTitle>
          <DialogDescription>
            Gestiona la información, categorías, logos y patrocinadores del torneo
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categorías</TabsTrigger>
            <TabsTrigger value="logos" data-testid="tab-logos">Logos</TabsTrigger>
            <TabsTrigger value="sponsors" data-testid="tab-sponsors">Patrocinadores</TabsTrigger>
            <TabsTrigger value="ads" data-testid="tab-ads">Publicidad</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <form onSubmit={handleSubmitGeneral} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tournamentName">Nombre del Torneo *</Label>
                  <Input
                    id="tournamentName"
                    type="text"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    data-testid="input-tournament-name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="club">Club Sede *</Label>
                  <Select value={selectedClub} onValueChange={setSelectedClub}>
                    <SelectTrigger data-testid="select-tournament-club">
                      <SelectValue placeholder="Seleccionar club" />
                    </SelectTrigger>
                    <SelectContent>
                      {clubs.map((club: any) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="input-start-date"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha de Finalización *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="input-end-date"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-general"
                >
                  Cerrar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTournamentMutation.isPending}
                  data-testid="button-save-general"
                >
                  {updateTournamentMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Categorías del Torneo</h4>
                <span className="text-sm text-muted-foreground">{categories.length} categorías</span>
              </div>
              
              {categoriesLoading ? (
                <p className="text-sm text-muted-foreground">Cargando categorías...</p>
              ) : categories.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <p className="text-sm">No hay categorías creadas</p>
                    <p className="text-xs mt-1">Agrega la primera categoría abajo</p>
                  </CardContent>
                </Card>
              ) : (
                categories.map((category) => (
                  <Card key={category.id} data-testid={`category-${category.id}`}>
                    <CardContent className="p-4">
                      {editingCategory === category.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="editCategoryName">Nombre</Label>
                            <Input
                              id="editCategoryName"
                              value={editCategoryName}
                              onChange={(e) => setEditCategoryName(e.target.value)}
                              data-testid="input-edit-category-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editCategoryDescription">Descripción</Label>
                            <Input
                              id="editCategoryDescription"
                              value={editCategoryDescription}
                              onChange={(e) => setEditCategoryDescription(e.target.value)}
                              data-testid="input-edit-category-description"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEditCategory}
                              data-testid="button-cancel-edit-category"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveCategory}
                              disabled={updateCategoryMutation.isPending}
                              data-testid="button-save-category"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium" data-testid={`category-name-${category.id}`}>
                              {category.name}
                            </p>
                            {category.description && (
                              <p className="text-sm text-muted-foreground" data-testid={`category-description-${category.id}`}>
                                {category.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditCategory(category)}
                              data-testid={`button-edit-category-${category.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Agregar Nueva Categoría</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Nombre de la categoría (ej: Masculino A, Femenino B)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    data-testid="input-new-category-name"
                  />
                  <Input
                    placeholder="Descripción (opcional)"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    data-testid="input-new-category-description"
                  />
                  <Button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={!newCategoryName || createCategoryMutation.isPending}
                    className="w-full"
                    data-testid="button-add-category"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Categoría
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Logos Tab */}
          <TabsContent value="logos" className="space-y-4 mt-4">
            <form onSubmit={handleSubmitGeneral} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Proporciona las URLs de los logos. Los logos se mostrarán en las pantallas del torneo.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="logoUrl">Logo del Torneo</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="logoUrl"
                      type="text"
                      placeholder="https://ejemplo.com/logo-torneo.png o data:image/..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      data-testid="input-logo-url"
                    />
                    {logoUrl && (
                      <div className="w-16 h-16 border border-border rounded flex items-center justify-center bg-muted">
                        <img 
                          src={logoUrl} 
                          alt="Logo preview" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="clubLogoUrl">Logo del Club</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="clubLogoUrl"
                      type="text"
                      placeholder="https://ejemplo.com/logo-club.png o data:image/..."
                      value={clubLogoUrl}
                      onChange={(e) => setClubLogoUrl(e.target.value)}
                      data-testid="input-club-logo-url"
                    />
                    {clubLogoUrl && (
                      <div className="w-16 h-16 border border-border rounded flex items-center justify-center bg-muted">
                        <img 
                          src={clubLogoUrl} 
                          alt="Club logo preview" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="systemLogoUrl">Logo del Sistema</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="systemLogoUrl"
                      type="text"
                      placeholder="https://ejemplo.com/logo-sistema.png o data:image/..."
                      value={systemLogoUrl}
                      onChange={(e) => setSystemLogoUrl(e.target.value)}
                      data-testid="input-system-logo-url"
                    />
                    {systemLogoUrl && (
                      <div className="w-16 h-16 border border-border rounded flex items-center justify-center bg-muted">
                        <img 
                          src={systemLogoUrl} 
                          alt="System logo preview" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel-logos"
                >
                  Cerrar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateTournamentMutation.isPending}
                  data-testid="button-save-logos"
                >
                  {updateTournamentMutation.isPending ? "Guardando..." : "Guardar Logos"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Sponsors Tab */}
          <TabsContent value="sponsors" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Banners de Patrocinadores</h4>
                <span className="text-sm text-muted-foreground">{banners.length} banners</span>
              </div>
              
              {bannersLoading ? (
                <p className="text-sm text-muted-foreground">Cargando banners...</p>
              ) : banners.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay banners de patrocinadores</p>
                    <p className="text-xs mt-1">Agrega el primer banner abajo</p>
                  </CardContent>
                </Card>
              ) : (
                banners.map((banner) => (
                  <Card key={banner.id} data-testid={`banner-${banner.id}`}>
                    <CardContent className="p-4">
                      {editingBanner === banner.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="editBannerName">Nombre del Patrocinador</Label>
                            <Input
                              id="editBannerName"
                              value={editBannerName}
                              onChange={(e) => setEditBannerName(e.target.value)}
                              data-testid="input-edit-banner-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editBannerUrl">URL de la Imagen</Label>
                            <Input
                              id="editBannerUrl"
                              type="url"
                              value={editBannerUrl}
                              onChange={(e) => setEditBannerUrl(e.target.value)}
                              data-testid="input-edit-banner-url"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editBannerLink">Enlace (opcional)</Label>
                            <Input
                              id="editBannerLink"
                              type="url"
                              value={editBannerLink}
                              onChange={(e) => setEditBannerLink(e.target.value)}
                              placeholder="https://ejemplo.com"
                              data-testid="input-edit-banner-link"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEditBanner}
                              data-testid="button-cancel-edit-banner"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveBanner}
                              disabled={updateBannerMutation.isPending}
                              data-testid="button-save-banner"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-20 h-20 border border-border rounded flex items-center justify-center bg-muted overflow-hidden">
                              <img 
                                src={banner.imageUrl} 
                                alt={banner.sponsorName}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div>
                              <p className="font-medium" data-testid={`banner-name-${banner.id}`}>
                                {banner.sponsorName}
                              </p>
                              {banner.link && (
                                <a 
                                  href={banner.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                  data-testid={`banner-link-${banner.id}`}
                                >
                                  {banner.link}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditBanner(banner)}
                              data-testid={`button-edit-banner-${banner.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-banner-${banner.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Agregar Nuevo Banner</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Nombre del patrocinador"
                    value={newBannerName}
                    onChange={(e) => setNewBannerName(e.target.value)}
                    data-testid="input-new-banner-name"
                  />
                  <Input
                    type="url"
                    placeholder="URL de la imagen del banner"
                    value={newBannerUrl}
                    onChange={(e) => setNewBannerUrl(e.target.value)}
                    data-testid="input-new-banner-url"
                  />
                  <Input
                    type="url"
                    placeholder="Enlace del patrocinador (opcional)"
                    value={newBannerLink}
                    onChange={(e) => setNewBannerLink(e.target.value)}
                    data-testid="input-new-banner-link"
                  />
                  <Button
                    type="button"
                    onClick={handleAddBanner}
                    disabled={!newBannerName || !newBannerUrl || createBannerMutation.isPending}
                    className="w-full"
                    data-testid="button-add-banner"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Banner
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Advertisements Tab */}
          <TabsContent value="ads" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Contenido Publicitario</h4>
                <span className="text-sm text-muted-foreground">{advertisements.length} anuncios</span>
              </div>
              
              {advertisementsLoading ? (
                <p className="text-sm text-muted-foreground">Cargando publicidad...</p>
              ) : advertisements.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay contenido publicitario</p>
                    <p className="text-xs mt-1">Agrega el primer anuncio abajo</p>
                  </CardContent>
                </Card>
              ) : (
                advertisements.map((ad) => (
                  <Card key={ad.id} data-testid={`ad-${ad.id}`}>
                    <CardContent className="p-4">
                      {editingAd === ad.id ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="editAdType">Tipo de Contenido</Label>
                            <Select value={editAdType} onValueChange={(value: any) => setEditAdType(value)}>
                              <SelectTrigger data-testid="select-edit-ad-type">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="image">Imagen</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="gif">GIF Animado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="editAdUrl">URL del Contenido</Label>
                            <Input
                              id="editAdUrl"
                              type="url"
                              value={editAdUrl}
                              onChange={(e) => setEditAdUrl(e.target.value)}
                              data-testid="input-edit-ad-url"
                            />
                          </div>
                          <div>
                            <Label htmlFor="editAdText">Texto Opcional</Label>
                            <Input
                              id="editAdText"
                              placeholder="Texto para mostrar sobre el contenido"
                              value={editAdText}
                              onChange={(e) => setEditAdText(e.target.value)}
                              data-testid="input-edit-ad-text"
                            />
                          </div>
                          <div>
                            <Label>Tipo de Animación</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <Button
                                type="button"
                                variant={editAdAnimation === 'fade-in' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditAdAnimation('fade-in')}
                                data-testid="button-edit-animation-fade-in"
                                className="flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Fade In
                              </Button>
                              <Button
                                type="button"
                                variant={editAdAnimation === 'fade-out' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditAdAnimation('fade-out')}
                                data-testid="button-edit-animation-fade-out"
                                className="flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Fade Out
                              </Button>
                              <Button
                                type="button"
                                variant={editAdAnimation === 'slide-in' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditAdAnimation('slide-in')}
                                data-testid="button-edit-animation-slide-in"
                                className="flex items-center gap-1"
                              >
                                <MoveRight className="w-3 h-3" />
                                Slide In
                              </Button>
                              <Button
                                type="button"
                                variant={editAdAnimation === 'zoom-in' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditAdAnimation('zoom-in')}
                                data-testid="button-edit-animation-zoom-in"
                                className="flex items-center gap-1"
                              >
                                <ZoomIn className="w-3 h-3" />
                                Zoom In
                              </Button>
                              <Button
                                type="button"
                                variant={editAdAnimation === 'zoom-out' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditAdAnimation('zoom-out')}
                                data-testid="button-edit-animation-zoom-out"
                                className="flex items-center gap-1"
                              >
                                <ZoomIn className="w-3 h-3" />
                                Zoom Out
                              </Button>
                              <Button
                                type="button"
                                variant={editAdAnimation === 'typewriter' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditAdAnimation('typewriter')}
                                data-testid="button-edit-animation-typewriter"
                                className="flex items-center gap-1"
                              >
                                <Type className="w-3 h-3" />
                                Letra x Letra
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="editAdDuration">Duración (segundos)</Label>
                              <Input
                                id="editAdDuration"
                                type="number"
                                min="1"
                                value={editAdDuration}
                                onChange={(e) => setEditAdDuration(e.target.value)}
                                data-testid="input-edit-ad-duration"
                              />
                            </div>
                            <div>
                              <Label htmlFor="editAdInterval">Cada cuántos segundos aparece</Label>
                              <Input
                                id="editAdInterval"
                                type="number"
                                min="1"
                                value={editAdInterval}
                                onChange={(e) => setEditAdInterval(e.target.value)}
                                data-testid="input-edit-ad-interval"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="editAdStartTime">Hora Inicio (opcional)</Label>
                              <Input
                                id="editAdStartTime"
                                type="time"
                                value={editAdStartTime}
                                onChange={(e) => setEditAdStartTime(e.target.value)}
                                data-testid="input-edit-ad-start-time"
                              />
                            </div>
                            <div>
                              <Label htmlFor="editAdEndTime">Hora Fin (opcional)</Label>
                              <Input
                                id="editAdEndTime"
                                type="time"
                                value={editAdEndTime}
                                onChange={(e) => setEditAdEndTime(e.target.value)}
                                data-testid="input-edit-ad-end-time"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Días Activos</Label>
                            <div className="grid grid-cols-7 gap-2 mt-2">
                              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, idx) => (
                                <Button
                                  key={day}
                                  type="button"
                                  variant={editAdActiveDays.includes(day) ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleToggleDay(day, true)}
                                  data-testid={`button-edit-day-${day}`}
                                  className="h-9"
                                >
                                  {day}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEditAdvertisement}
                              data-testid="button-cancel-edit-ad"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveAdvertisement}
                              disabled={updateAdvertisementMutation.isPending}
                              data-testid="button-save-ad"
                            >
                              <Save className="w-4 h-4 mr-1" />
                              Guardar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary font-medium">
                                {ad.contentType}
                              </span>
                              <span className="text-xs text-muted-foreground">{ad.displayDuration}s</span>
                              <span className="text-xs px-2 py-1 rounded bg-secondary/10 text-secondary-foreground">
                                {ad.animationType}
                              </span>
                            </div>
                            <p className="text-sm font-medium truncate max-w-md" data-testid={`ad-url-${ad.id}`}>
                              {ad.contentUrl}
                            </p>
                            {(ad.startTime || ad.endTime) && (
                              <p className="text-xs text-muted-foreground">
                                Horario: {ad.startTime || '00:00'} - {ad.endTime || '23:59'}
                              </p>
                            )}
                            {ad.activeDays.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Días: {ad.activeDays.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditAdvertisement(ad)}
                              data-testid={`button-edit-ad-${ad.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAdvertisement(ad.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-ad-${ad.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Agregar Nueva Publicidad</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="newAdType">Tipo de Contenido</Label>
                    <Select value={newAdType} onValueChange={(value: any) => setNewAdType(value)}>
                      <SelectTrigger data-testid="select-new-ad-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Imagen</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="gif">GIF Animado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="url"
                    placeholder="URL del contenido (imagen/video/GIF)"
                    value={newAdUrl}
                    onChange={(e) => setNewAdUrl(e.target.value)}
                    data-testid="input-new-ad-url"
                  />
                  <Input
                    placeholder="Texto opcional (mostrar sobre el contenido)"
                    value={newAdText}
                    onChange={(e) => setNewAdText(e.target.value)}
                    data-testid="input-new-ad-text"
                  />
                  <div>
                    <Label>Tipo de Animación</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={newAdAnimation === 'fade-in' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewAdAnimation('fade-in')}
                        data-testid="button-animation-fade-in"
                        className="flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Fade In
                      </Button>
                      <Button
                        type="button"
                        variant={newAdAnimation === 'fade-out' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewAdAnimation('fade-out')}
                        data-testid="button-animation-fade-out"
                        className="flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        Fade Out
                      </Button>
                      <Button
                        type="button"
                        variant={newAdAnimation === 'slide-in' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewAdAnimation('slide-in')}
                        data-testid="button-animation-slide-in"
                        className="flex items-center gap-1"
                      >
                        <MoveRight className="w-3 h-3" />
                        Slide In
                      </Button>
                      <Button
                        type="button"
                        variant={newAdAnimation === 'zoom-in' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewAdAnimation('zoom-in')}
                        data-testid="button-animation-zoom-in"
                        className="flex items-center gap-1"
                      >
                        <ZoomIn className="w-3 h-3" />
                        Zoom In
                      </Button>
                      <Button
                        type="button"
                        variant={newAdAnimation === 'zoom-out' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewAdAnimation('zoom-out')}
                        data-testid="button-animation-zoom-out"
                        className="flex items-center gap-1"
                      >
                        <ZoomIn className="w-3 h-3" />
                        Zoom Out
                      </Button>
                      <Button
                        type="button"
                        variant={newAdAnimation === 'typewriter' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNewAdAnimation('typewriter')}
                        data-testid="button-animation-typewriter"
                        className="flex items-center gap-1"
                      >
                        <Type className="w-3 h-3" />
                        Letra x Letra
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newAdDuration">Duración (segundos)</Label>
                      <Input
                        id="newAdDuration"
                        type="number"
                        min="1"
                        placeholder="10"
                        value={newAdDuration}
                        onChange={(e) => setNewAdDuration(e.target.value)}
                        data-testid="input-new-ad-duration"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newAdInterval">Cada cuántos segundos aparece</Label>
                      <Input
                        id="newAdInterval"
                        type="number"
                        min="1"
                        placeholder="60"
                        value={newAdInterval}
                        onChange={(e) => setNewAdInterval(e.target.value)}
                        data-testid="input-new-ad-interval"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newAdStartTime">Hora Inicio (opcional)</Label>
                      <Input
                        id="newAdStartTime"
                        type="time"
                        value={newAdStartTime}
                        onChange={(e) => setNewAdStartTime(e.target.value)}
                        data-testid="input-new-ad-start-time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="newAdEndTime">Hora Fin (opcional)</Label>
                      <Input
                        id="newAdEndTime"
                        type="time"
                        value={newAdEndTime}
                        onChange={(e) => setNewAdEndTime(e.target.value)}
                        data-testid="input-new-ad-end-time"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Días Activos (opcional)</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2">
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={newAdActiveDays.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleDay(day, false)}
                          data-testid={`button-new-day-${day}`}
                          className="h-9"
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddAdvertisement}
                    disabled={!newAdUrl || createAdvertisementMutation.isPending}
                    className="w-full"
                    data-testid="button-add-ad"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Publicidad
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
