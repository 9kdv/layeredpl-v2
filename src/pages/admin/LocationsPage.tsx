import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Printer, 
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  X,
  Boxes,
  MousePointer,
  Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { locationsApi, Location, printersApi, materialsApi, Printer as PrinterType, Material } from '@/lib/adminApi';

// Custom marker icons
const createIcon = (color: 'green' | 'yellow' | 'red') => {
  const colors = {
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444'
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${colors[color]};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Temporary marker icon (blue)
const temporaryMarkerIcon = L.divIcon({
  className: 'custom-marker-temp',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: #3b82f6;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 12px rgba(59,130,246,0.5);
      animation: pulse 1.5s infinite;
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
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
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

export default function LocationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([52.2297, 21.0122]); // Warsaw default
  
  // New state for click-to-set-location flow
  const [pendingLocation, setPendingLocation] = useState<{ id: string; name: string } | null>(null);
  const [temporaryMarker, setTemporaryMarker] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    is_active: true
  });

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

  const createMutation = useMutation({
    mutationFn: locationsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      setIsDialogOpen(false);
      // Set pending location for map click
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
    }
  });

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
    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } finally {
      setIsLoadingAddress(false);
    }
  }, []);

  // Handle map click
  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!pendingLocation) return;
    
    const address = await fetchAddressFromCoords(lat, lng);
    setTemporaryMarker({ lat, lng, address });
  }, [pendingLocation, fetchAddressFromCoords]);

  // Confirm temporary marker position
  const confirmMarkerPosition = useCallback(() => {
    if (!temporaryMarker || !pendingLocation) return;
    
    updateMutation.mutate({
      id: pendingLocation.id,
      latitude: temporaryMarker.lat,
      longitude: temporaryMarker.lng,
      address: temporaryMarker.address
    });
  }, [temporaryMarker, pendingLocation, updateMutation]);

  // Cancel pending location
  const cancelPendingLocation = useCallback(() => {
    setPendingLocation(null);
    setTemporaryMarker(null);
  }, []);

  // Get location status based on printers and materials
  const getLocationStatus = (locationId: string): 'green' | 'yellow' | 'red' => {
    const locationPrinters = printers.filter(p => p.location_id === locationId);
    const locationMaterials = materials.filter(m => m.location_id === locationId);
    
    // Check for errors
    const hasOfflinePrinter = locationPrinters.some(p => p.status === 'offline' || p.status === 'maintenance');
    const hasOutOfStock = locationMaterials.some(m => m.status === 'out_of_stock');
    
    if (hasOfflinePrinter || hasOutOfStock) return 'red';
    
    // Check for warnings
    const hasLowStock = locationMaterials.some(m => m.status === 'low_stock');
    const hasBusyPrinters = locationPrinters.filter(p => p.status === 'busy').length >= locationPrinters.length * 0.8;
    
    if (hasLowStock || hasBusyPrinters) return 'yellow';
    
    return 'green';
  };

  const getLocationStats = (locationId: string) => {
    const locationPrinters = printers.filter(p => p.location_id === locationId);
    const locationMaterials = materials.filter(m => m.location_id === locationId);
    
    const onlinePrinters = locationPrinters.filter(p => p.status === 'available' || p.status === 'busy').length;
    const totalMaterial = locationMaterials.reduce((sum, m) => sum + (m.quantity_available || 0), 0);
    
    return {
      printersOnline: onlinePrinters,
      printersTotal: locationPrinters.length,
      materialKg: totalMaterial.toFixed(1)
    };
  };

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
      setFormData({
        name: '',
        description: '',
        address: '',
        is_active: true
      });
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
      // Create without coordinates - user will click on map
      createMutation.mutate(data as any);
    }
  };

  const openLocationDetails = (location: Location) => {
    setSelectedLocation(location);
    setIsDrawerOpen(true);
  };

  // Set location for coordinate update via map click
  const setLocationForMapClick = (location: Location) => {
    setPendingLocation({ id: location.id, name: location.name });
    setTemporaryMarker(null);
    toast({ 
      title: `Ustawianie pozycji: ${location.name}`, 
      description: 'Kliknij na mapę, aby ustawić współrzędne' 
    });
  };

  // Filter locations with coordinates for the map
  const mappableLocations = useMemo(() => 
    locations.filter(loc => 
      loc.latitude !== null && 
      loc.longitude !== null && 
      !isNaN(Number(loc.latitude)) && 
      !isNaN(Number(loc.longitude))
    ),
    [locations]
  );

  if (locationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa i Lokalizacje</h1>
          <p className="text-muted-foreground">Zarządzaj lokalizacjami produkcyjnymi</p>
        </div>
        <Button onClick={() => openEditDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Dodaj lokalizację
        </Button>
      </div>

      {/* Pending location indicator */}
      {pendingLocation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MousePointer className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-500">Tryb ustawiania pozycji</p>
                <p className="text-sm text-muted-foreground">
                  Kliknij na mapę, aby ustawić współrzędne dla: <strong>{pendingLocation.name}</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {temporaryMarker && (
                <Button size="sm" onClick={confirmMarkerPosition} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Potwierdź pozycję'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={cancelPendingLocation}>
                Anuluj
              </Button>
            </div>
          </div>
          
          {temporaryMarker && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Współrzędne:</strong> {temporaryMarker.lat.toFixed(6)}, {temporaryMarker.lng.toFixed(6)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Adres:</strong> {isLoadingAddress ? 'Ładowanie...' : temporaryMarker.address}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {locations.filter(l => getLocationStatus(l.id) === 'green').length}
              </p>
              <p className="text-sm text-muted-foreground">Sprawne lokalizacje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {locations.filter(l => getLocationStatus(l.id) === 'yellow').length}
              </p>
              <p className="text-sm text-muted-foreground">Ostrzeżenia</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {locations.filter(l => getLocationStatus(l.id) === 'red').length}
              </p>
              <p className="text-sm text-muted-foreground">Problemy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="h-[500px] relative">
            <MapContainer
              center={mapCenter}
              zoom={6}
              className="h-full w-full"
              style={{ zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} />
              <MapClickHandler onMapClick={handleMapClick} isClickMode={!!pendingLocation} />
              
              {/* Existing location markers */}
              {mappableLocations.map((location) => {
                const stats = getLocationStats(location.id);
                
                return (
                  <Marker
                    key={`marker-${location.id}`}
                    position={[Number(location.latitude), Number(location.longitude)]}
                    icon={createIcon(getLocationStatus(location.id))}
                    eventHandlers={{
                      click: () => openLocationDetails(location)
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{location.name}</p>
                        <p className="text-muted-foreground">
                          {stats.printersOnline}/{stats.printersTotal} drukarek online
                        </p>
                        <p className="text-muted-foreground">{stats.materialKg}kg materiału</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Temporary marker */}
              {temporaryMarker && (
                <Marker
                  position={[temporaryMarker.lat, temporaryMarker.lng]}
                  icon={temporaryMarkerIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{pendingLocation?.name}</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {isLoadingAddress ? 'Ładowanie adresu...' : temporaryMarker.address}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
            
            {/* Map overlay for click mode */}
            {pendingLocation && (
              <div className="absolute top-4 left-4 z-[1000] bg-background/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg border">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-blue-500" />
                  Kliknij na mapę
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Locations list */}
      <Card>
        <CardHeader>
          <CardTitle>Lista lokalizacji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {locations.map((location) => {
              const status = getLocationStatus(location.id);
              const stats = getLocationStats(location.id);
              const hasCoords = location.latitude && location.longitude;
              
              return (
                <motion.div
                  key={location.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => hasCoords && openLocationDetails(location)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'green' ? 'bg-green-500' :
                      status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {location.address || (hasCoords ? `${Number(location.latitude).toFixed(4)}, ${Number(location.longitude).toFixed(4)}` : 'Brak współrzędnych')}
                      </p>
                    </div>
                    {!hasCoords && (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                        Brak pozycji
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{stats.printersOnline}/{stats.printersTotal}</p>
                      <p className="text-xs text-muted-foreground">drukarek</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{stats.materialKg}kg</p>
                      <p className="text-xs text-muted-foreground">materiału</p>
                    </div>
                    <div className="flex gap-2">
                      {!hasCoords && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); setLocationForMapClick(location); }}
                          title="Ustaw pozycję na mapie"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(location); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (confirm('Usunąć lokalizację?')) deleteMutation.mutate(location.id); 
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {locations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak lokalizacji</p>
                <p className="text-sm">Dodaj pierwszą lokalizację produkcyjną</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Details Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-[500px] sm:max-w-lg">
          {selectedLocation && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {selectedLocation.name}
                </SheetTitle>
              </SheetHeader>
              
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <div className="space-y-6 pr-4">
                  {/* Address */}
                  <div>
                    <p className="text-sm text-muted-foreground">{selectedLocation.address || 'Brak adresu'}</p>
                    {selectedLocation.description && (
                      <p className="text-sm mt-2">{selectedLocation.description}</p>
                    )}
                  </div>

                  {/* Printers section */}
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Printer className="h-4 w-4" />
                      Drukarki
                    </h3>
                    <div className="space-y-2">
                      {printers.filter(p => p.location_id === selectedLocation.id).map((printer) => (
                        <div key={printer.id} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{printer.name}</span>
                            <Badge variant={
                              printer.status === 'available' ? 'default' :
                              printer.status === 'busy' ? 'secondary' :
                              'destructive'
                            }>
                              {printer.status === 'available' ? 'Dostępna' :
                               printer.status === 'busy' ? 'Pracuje' :
                               printer.status === 'maintenance' ? 'Serwis' : 'Offline'}
                            </Badge>
                          </div>
                          {printer.status === 'busy' && (
                            <Progress value={65} className="h-2" />
                          )}
                        </div>
                      ))}
                      {printers.filter(p => p.location_id === selectedLocation.id).length === 0 && (
                        <p className="text-sm text-muted-foreground">Brak drukarek</p>
                      )}
                    </div>
                  </div>

                  {/* Materials section */}
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <Boxes className="h-4 w-4" />
                      Magazyn materiałów
                    </h3>
                    <div className="space-y-2">
                      {materials.filter(m => m.location_id === selectedLocation.id).map((material) => (
                        <div key={material.id} className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: material.color_hex || '#888' }}
                            />
                            <div>
                              <p className="font-medium">{material.name}</p>
                              <p className="text-xs text-muted-foreground">{material.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              material.status === 'out_of_stock' ? 'text-red-500' :
                              material.status === 'low_stock' ? 'text-yellow-500' : ''
                            }`}>
                              {material.quantity_available} {material.quantity_unit}
                            </p>
                          </div>
                        </div>
                      ))}
                      {materials.filter(m => m.location_id === selectedLocation.id).length === 0 && (
                        <p className="text-sm text-muted-foreground">Brak materiałów</p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edytuj lokalizację' : 'Nowa lokalizacja'}
            </DialogTitle>
            {!editingLocation && (
              <DialogDescription>
                Po dodaniu lokalizacji, kliknij na mapę aby ustawić współrzędne
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Nazwa</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Magazyn Warszawa"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Opis</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opcjonalny opis lokalizacji..."
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Aktywna</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingLocation ? 'Zapisz' : 'Dodaj i ustaw na mapie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
