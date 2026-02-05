import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Printer, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Boxes,
  MousePointer,
  Navigation,
  Search,
  X,
  Moon,
  Map
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { locationsApi, printersApi, materialsApi, Location, Printer as PrinterType, Material } from '@/lib/adminApi';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons with enhanced styling
const createIcon = (color: 'green' | 'yellow' | 'red') => {
  const colors = {
    green: { bg: '#22c55e', shadow: 'rgba(34, 197, 94, 0.4)' },
    yellow: { bg: '#eab308', shadow: 'rgba(234, 179, 8, 0.4)' },
    red: { bg: '#ef4444', shadow: 'rgba(239, 68, 68, 0.4)' }
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, ${colors[color].bg}, ${colors[color].bg}dd);
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px ${colors[color].shadow}, 0 2px 4px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Temporary marker icon (blue)
const temporaryMarkerIcon = L.divIcon({
  className: 'custom-marker-temp',
  html: `
    <div style="
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 16px rgba(59,130,246,0.5);
      animation: pulse-marker 1.5s infinite;
    ">
      <div style="
        width: 14px;
        height: 14px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Map center controller
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Map click handler component
function MapClickHandler({ 
  onMapClick, 
  isClickMode 
}: { 
  onMapClick: (lat: number, lng: number) => void;
  isClickMode: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (isClickMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Helper to get printer status badge styling - solid background colors
const getPrinterStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-500 text-white';
    case 'busy':
      return 'bg-yellow-500 text-black';
    case 'maintenance':
    case 'offline':
      return 'bg-red-500 text-white';
    default:
      return 'bg-muted text-foreground';
  }
};

const getPrinterStatusLabel = (status: string) => {
  switch (status) {
    case 'available':
      return 'Dostępna';
    case 'busy':
      return 'Pracuje';
    case 'maintenance':
      return 'Serwis';
    case 'offline':
      return 'Offline';
    default:
      return status;
  }
};

export default function LocationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [mapCenter] = useState<[number, number]>([52.2297, 21.0122]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapTheme, setMapTheme] = useState<'dark' | 'streets'>('dark');
  
  const [pendingLocation, setPendingLocation] = useState<{ id: string; name: string } | null>(null);
  const [temporaryMarker, setTemporaryMarker] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    is_active: true
  });

  // API queries
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: locationsApi.getAll
  });

  const { data: printers = [] } = useQuery({
    queryKey: ['admin-printers'],
    queryFn: printersApi.getAll
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['admin-materials'],
    queryFn: materialsApi.getAll
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      setIsDialogOpen(false);
      setPendingLocation({ id: data.id, name: data.name });
      toast({ 
        title: 'Lokalizacja dodana', 
        description: 'Kliknij na mapę, aby ustawić współrzędne' 
      });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Location>) => locationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      setIsDialogOpen(false);
      setTemporaryMarker(null);
      setPendingLocation(null);
      toast({ title: 'Lokalizacja zaktualizowana' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      toast({ title: 'Lokalizacja usunięta' });
    },
    onError: (err: Error) => toast({ title: 'Błąd', description: err.message, variant: 'destructive' })
  });

  // Get location status based on printers and materials
  const getLocationStatus = useCallback((locationId: string): 'green' | 'yellow' | 'red' => {
    const locationPrinters = printers.filter(p => p.location_id === locationId);
    const locationMaterials = materials.filter(m => m.location_id === locationId);
    
    const hasOfflinePrinter = locationPrinters.some(p => p.status === 'offline' || p.status === 'maintenance');
    const hasOutOfStock = locationMaterials.some(m => m.status === 'out_of_stock');
    
    if (hasOfflinePrinter || hasOutOfStock) return 'red';
    
    const hasLowStock = locationMaterials.some(m => m.status === 'low_stock');
    const hasBusyPrinters = locationPrinters.filter(p => p.status === 'busy').length >= locationPrinters.length * 0.8;
    
    if (hasLowStock || hasBusyPrinters) return 'yellow';
    
    return 'green';
  }, [printers, materials]);

  const getLocationStats = useCallback((locationId: string) => {
    const locationPrinters = printers.filter(p => p.location_id === locationId);
    const locationMaterials = materials.filter(m => m.location_id === locationId);
    
    const onlinePrinters = locationPrinters.filter(p => p.status === 'available' || p.status === 'busy').length;
    const totalMaterial = locationMaterials.reduce((sum, m) => {
      const qty = Number(m.quantity_available) || 0;
      return sum + qty;
    }, 0);
    
    return {
      printersOnline: onlinePrinters,
      printersTotal: locationPrinters.length,
      materialKg: totalMaterial.toFixed(1)
    };
  }, [printers, materials]);

  // Reverse geocoding to get address from coordinates
  const fetchAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'pl' } }
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!pendingLocation) return;
    
    const address = await fetchAddressFromCoords(lat, lng);
    setTemporaryMarker({ lat, lng, address });
  }, [pendingLocation, fetchAddressFromCoords]);

  const confirmMarkerPosition = useCallback(() => {
    if (!temporaryMarker || !pendingLocation) return;
    
    updateMutation.mutate({
      id: pendingLocation.id,
      latitude: temporaryMarker.lat,
      longitude: temporaryMarker.lng,
      address: temporaryMarker.address
    });
  }, [temporaryMarker, pendingLocation, updateMutation]);

  const cancelPendingLocation = useCallback(() => {
    setPendingLocation(null);
    setTemporaryMarker(null);
  }, []);

  const openEditDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        description: location.description || '',
        address: location.address || '',
        is_active: location.is_active !== false
      });
    } else {
      setEditingLocation(null);
      setFormData({ name: '', description: '', address: '', is_active: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      description: formData.description || undefined,
      address: formData.address || undefined,
      is_active: formData.is_active
    };

    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, ...data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  const openLocationDetails = (location: Location) => {
    setSelectedLocation(location);
    setIsDetailsOpen(true);
  };

  const setLocationForMapClick = (location: Location) => {
    setPendingLocation({ id: location.id, name: location.name });
    setTemporaryMarker(null);
    toast({ 
      title: `Ustawianie pozycji: ${location.name}`, 
      description: 'Kliknij na mapę, aby ustawić współrzędne' 
    });
  };

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter(loc => 
      loc.name.toLowerCase().includes(query) ||
      loc.address?.toLowerCase().includes(query) ||
      loc.description?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const statusCounts = useMemo(() => ({
    green: locations.filter(l => getLocationStatus(l.id) === 'green').length,
    yellow: locations.filter(l => getLocationStatus(l.id) === 'yellow').length,
    red: locations.filter(l => getLocationStatus(l.id) === 'red').length,
  }), [locations, getLocationStatus]);

  const mappableLocations = useMemo(() => 
    locations.filter(loc => 
      loc.latitude !== null && 
      loc.longitude !== null && 
      loc.latitude !== undefined &&
      loc.longitude !== undefined &&
      !isNaN(Number(loc.latitude)) && 
      !isNaN(Number(loc.longitude))
    ),
    [locations]
  );

  if (locationsLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Ładowanie lokalizacji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-6 space-y-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Mapa i Lokalizacje
            </h1>
            <p className="text-muted-foreground mt-1">Zarządzaj lokalizacjami produkcyjnymi</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Map Theme Toggle */}
            <div className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border">
              <Moon className={`h-4 w-4 ${mapTheme === 'dark' ? 'text-foreground' : 'text-muted-foreground'}`} />
              <Switch
                checked={mapTheme === 'streets'}
                onCheckedChange={(checked) => setMapTheme(checked ? 'streets' : 'dark')}
              />
              <Map className={`h-4 w-4 ${mapTheme === 'streets' ? 'text-foreground' : 'text-muted-foreground'}`} />
            </div>
            <Button onClick={() => openEditDialog()} size="lg" className="gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              Dodaj lokalizację
            </Button>
          </div>
        </div>

        {/* Pending location indicator */}
        <AnimatePresence>
          {pendingLocation && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="bg-primary/10 border border-primary/30 rounded-2xl p-5 overflow-hidden backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-xl">
                    <MousePointer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">Tryb ustawiania pozycji</p>
                    <p className="text-sm text-muted-foreground">
                      Kliknij na mapę, aby ustawić współrzędne dla: <strong>{pendingLocation.name}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {temporaryMarker && (
                    <Button onClick={confirmMarkerPosition} disabled={updateMutation.isPending} className="shadow-md">
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Potwierdź pozycję'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={cancelPendingLocation}>
                    Anuluj
                  </Button>
                </div>
              </div>
              
              {temporaryMarker && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-muted/50 rounded-xl border border-border/50"
                >
                  <p className="text-sm font-medium">
                    📍 {temporaryMarker.lat.toFixed(6)}, {temporaryMarker.lng.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isLoadingAddress ? 'Ładowanie adresu...' : temporaryMarker.address}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="border-status-success/20 bg-gradient-to-br from-status-success/5 to-transparent">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-4 bg-status-success/15 rounded-2xl">
                  <CheckCircle className="h-7 w-7 text-status-success" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{statusCounts.green}</p>
                  <p className="text-sm text-muted-foreground">Sprawne lokalizacje</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="border-status-warning/20 bg-gradient-to-br from-status-warning/5 to-transparent">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-4 bg-status-warning/15 rounded-2xl">
                  <AlertTriangle className="h-7 w-7 text-status-warning" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{statusCounts.yellow}</p>
                  <p className="text-sm text-muted-foreground">Ostrzeżenia</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="border-status-danger/20 bg-gradient-to-br from-status-danger/5 to-transparent">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-4 bg-status-danger/15 rounded-2xl">
                  <XCircle className="h-7 w-7 text-status-danger" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{statusCounts.red}</p>
                  <p className="text-sm text-muted-foreground">Problemy</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Map */}
        <Card className="overflow-hidden shadow-xl border-border/50">
          <CardContent className="p-0">
            <div className="h-[550px] relative">
              <MapContainer
                center={mapCenter}
                zoom={6}
                className="h-full w-full"
                style={{ zIndex: 1 }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  key={mapTheme}
                  attribution={mapTheme === 'dark' ? '&copy; <a href="https://carto.com/">CARTO</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}
                  url={mapTheme === 'dark' 
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                />
                <MapController center={mapCenter} />
                <MapClickHandler onMapClick={handleMapClick} isClickMode={!!pendingLocation} />
                
                {/* Existing location markers with hover tooltip and click to search */}
                {mappableLocations.map((location) => (
                  <Marker
                    key={`marker-${location.id}`}
                    position={[Number(location.latitude), Number(location.longitude)]}
                    icon={createIcon(getLocationStatus(location.id))}
                    eventHandlers={{
                      click: () => setSearchQuery(location.name)
                    }}
                  >
                    <Tooltip 
                      direction="top" 
                      offset={[0, -36]} 
                      opacity={1}
                      className="!bg-background !border-border !text-foreground !rounded-lg !px-3 !py-2 !shadow-xl"
                    >
                      <span className="font-semibold text-sm">{location.name}</span>
                    </Tooltip>
                  </Marker>
                ))}
                
                {/* Temporary marker */}
                {temporaryMarker && (
                  <Marker
                    position={[temporaryMarker.lat, temporaryMarker.lng]}
                    icon={temporaryMarkerIcon}
                  >
                    <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                      <span className="font-semibold">{pendingLocation?.name}</span>
                    </Tooltip>
                  </Marker>
                )}
              </MapContainer>
              
              {pendingLocation && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-4 left-4 z-[1000] bg-background/95 backdrop-blur-md px-4 py-3 rounded-xl shadow-xl border border-border/50"
                >
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-primary animate-pulse" />
                    Kliknij na mapę
                  </p>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Locations list */}
        <Card className="shadow-xl border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-xl">Lista lokalizacji</CardTitle>
              <div className="relative w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po nazwie lub adresie..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-11 h-11 rounded-xl bg-muted/50 border-border/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredLocations.map((location) => {
                  const status = getLocationStatus(location.id);
                  const stats = getLocationStats(location.id);
                  const hasCoords = location.latitude !== undefined && location.longitude !== undefined;
                  
                  return (
                    <motion.div
                      key={location.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-5 border border-border/50 rounded-xl hover:bg-muted/30 hover:border-border transition-all cursor-pointer group shadow-sm"
                      onClick={() => openLocationDetails(location)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full shadow-lg ${
                          status === 'green' ? 'bg-status-success shadow-status-success/30' :
                          status === 'yellow' ? 'bg-status-warning shadow-status-warning/30' : 
                          'bg-status-danger shadow-status-danger/30'
                        }`} />
                        <div>
                          <p className="font-semibold group-hover:text-primary transition-colors">{location.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {location.address || (hasCoords ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}` : 'Brak współrzędnych')}
                          </p>
                        </div>
                        {!hasCoords && (
                          <Badge variant="outline" className="text-status-warning border-status-warning/50 bg-status-warning/10">
                            Brak pozycji
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-semibold">{stats.printersOnline}/{stats.printersTotal}</p>
                          <p className="text-xs text-muted-foreground">drukarek</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-semibold">{stats.materialKg}kg</p>
                          <p className="text-xs text-muted-foreground">materiału</p>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {!hasCoords && (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => setLocationForMapClick(location)}
                              title="Ustaw pozycję na mapie"
                              className="rounded-xl"
                            >
                              <MapPin className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(location)}
                            className="rounded-xl hover:bg-primary/10"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => { 
                              if (confirm('Usunąć lokalizację?')) deleteMutation.mutate(location.id); 
                            }}
                            className="rounded-xl hover:bg-status-danger/10 hover:text-status-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {filteredLocations.length === 0 && locations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16 text-muted-foreground"
                >
                  <Search className="h-14 w-14 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Brak wyników dla "{searchQuery}"</p>
                  <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                    Wyczyść wyszukiwanie
                  </Button>
                </motion.div>
              )}
              
              {locations.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <MapPin className="h-14 w-14 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">Brak lokalizacji</p>
                  <p className="text-sm">Dodaj pierwszą lokalizację produkcyjną</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] rounded-2xl bg-background border-border p-0 overflow-hidden">
            {selectedLocation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col max-h-[85vh]"
              >
                <DialogHeader className="p-6 pb-4 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full ${
                      getLocationStatus(selectedLocation.id) === 'green' ? 'bg-green-500' :
                      getLocationStatus(selectedLocation.id) === 'yellow' ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`} />
                    <DialogTitle className="text-2xl font-bold">{selectedLocation.name}</DialogTitle>
                    <Badge 
                      variant={selectedLocation.is_active ? 'default' : 'secondary'}
                      className="ml-auto"
                    >
                      {selectedLocation.is_active ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                  </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  <div className="space-y-6">
                    {/* Address Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="p-5 rounded-xl bg-muted/50 border border-border/50"
                    >
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
                        Lokalizacja
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">Pełny adres</span>
                          <span className="text-sm font-medium text-right max-w-[60%]">
                            {selectedLocation.address || 'Nie podano'}
                          </span>
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Współrzędne</span>
                          <span className="text-sm font-mono">
                            {selectedLocation.latitude && selectedLocation.longitude 
                              ? `${Number(selectedLocation.latitude).toFixed(4)}, ${Number(selectedLocation.longitude).toFixed(4)}`
                              : 'Nie ustawiono'}
                          </span>
                        </div>
                        {selectedLocation.description && (
                          <>
                            <Separator className="bg-border/50" />
                            <div>
                              <span className="text-sm text-muted-foreground block mb-1">Opis</span>
                              <p className="text-sm">{selectedLocation.description}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>

                    {/* Printers section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="font-semibold flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Printer className="h-4 w-4 text-primary" />
                        </div>
                        Drukarki
                        <span className="text-sm text-muted-foreground font-normal">
                          ({printers.filter(p => p.location_id === selectedLocation.id).length})
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {printers.filter(p => p.location_id === selectedLocation.id).map((printer) => (
                          <div 
                            key={printer.id} 
                            className="p-4 rounded-xl bg-muted/50 border border-border/50"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold">{printer.name} {printer.model}</p>
                              <span className={`text-sm font-medium px-3 py-1 rounded-full ${getPrinterStatusBadgeStyles(printer.status)}`}>
                                {getPrinterStatusLabel(printer.status)}
                              </span>
                            </div>
                            {printer.status === 'busy' && (
                              <div className="mt-3">
                                <Progress value={65} className="h-2" />
                              </div>
                            )}
                          </div>
                        ))}
                        {printers.filter(p => p.location_id === selectedLocation.id).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-8 bg-muted/30 rounded-xl">
                            Brak drukarek w tej lokalizacji
                          </p>
                        )}
                      </div>
                    </motion.div>

                    <Separator />

                    {/* Materials section */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <h3 className="font-semibold flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Boxes className="h-4 w-4 text-primary" />
                        </div>
                        Magazyn materiałów
                        <span className="text-sm text-muted-foreground font-normal">
                          ({materials.filter(m => m.location_id === selectedLocation.id).length})
                        </span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {materials.filter(m => m.location_id === selectedLocation.id).map((material) => (
                          <div 
                            key={material.id} 
                            className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/30"
                          >
                            <div 
                              className="w-8 h-8 rounded-lg border border-border/50 flex-shrink-0" 
                              style={{ backgroundColor: material.color_hex }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{material.name}</p>
                              <p className="text-xs text-muted-foreground">{material.type}</p>
                            </div>
                            <p className={`font-semibold text-sm ${
                              material.status === 'out_of_stock' ? 'text-[hsl(var(--status-danger))]' :
                              material.status === 'low_stock' ? 'text-[hsl(var(--status-warning))]' : 'text-foreground'
                            }`}>
                              {material.quantity_available}{material.quantity_unit}
                            </p>
                          </div>
                        ))}
                        {materials.filter(m => m.location_id === selectedLocation.id).length === 0 && (
                          <p className="text-muted-foreground text-sm text-center py-8 bg-muted/30 rounded-xl col-span-2">
                            Brak materiałów w tej lokalizacji
                          </p>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingLocation ? 'Edytuj lokalizację' : 'Nowa lokalizacja'}
              </DialogTitle>
              {!editingLocation && (
                <DialogDescription>
                  Po dodaniu lokalizacji, kliknij na mapę aby ustawić współrzędne
                </DialogDescription>
              )}
            </DialogHeader>
            
            <div className="space-y-5 py-2">
              <div>
                <Label className="font-medium">Nazwa</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="np. Magazyn Warszawa"
                  className="mt-2 h-11 rounded-xl"
                />
              </div>
              
              <div>
                <Label className="font-medium">Opis</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Opcjonalny opis lokalizacji..."
                  className="mt-2 rounded-xl resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <Label className="font-medium">Aktywna</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            
            <DialogFooter className="gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Anuluj
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                className="rounded-xl shadow-lg"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingLocation ? 'Zapisz' : 'Dodaj i ustaw na mapie'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
