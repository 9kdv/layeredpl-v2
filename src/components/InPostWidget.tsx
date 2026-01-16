import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Check, X, Loader2, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api, InPostLocker } from '@/lib/api';

interface InPostWidgetProps {
  onSelect: (locker: { code: string; address: string }) => void;
  selectedLocker?: { code: string; address: string } | null;
}

export function InPostWidget({ onSelect, selectedLocker }: InPostWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InPostLocker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await api.searchInPostLockers(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleManualVerify = async () => {
    if (!manualCode.trim()) return;

    setIsVerifying(true);
    try {
      const result = await api.verifyInPostLocker(manualCode.toUpperCase());
      if (result.valid) {
        onSelect({ code: manualCode.toUpperCase(), address: result.address || `Paczkomat ${manualCode.toUpperCase()}` });
        setIsOpen(false);
        setManualCode('');
      } else {
        // Show error
      }
    } catch (error) {
      console.error('Verify error:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectLocker = (locker: InPostLocker) => {
    onSelect({ code: locker.name, address: `${locker.address}, ${locker.city}` });
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-3">
      {/* Selected Locker Display */}
      {selectedLocker ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
        >
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-green-400">{selectedLocker.code}</p>
            <p className="text-sm text-muted-foreground truncate">{selectedLocker.address}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect({ code: '', address: '' })}
            className="text-muted-foreground hover:text-foreground"
          >
            Zmień
          </Button>
        </motion.div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full h-14 justify-start gap-3 rounded-xl border-dashed"
        >
          <Package className="w-5 h-5 text-primary" />
          <span>Wybierz paczkomat</span>
        </Button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card border border-border rounded-2xl z-50 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-semibold">Wybierz Paczkomat InPost</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Wpisz miasto lub adres..."
                    className="pl-10"
                  />
                </div>

                {/* Results */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((locker) => (
                      <motion.button
                        key={locker.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleSelectLocker(locker)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{locker.name}</p>
                          <p className="text-xs text-muted-foreground">{locker.address}, {locker.city}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : searchQuery.length >= 3 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nie znaleziono paczkomatów
                  </p>
                ) : null}

                {/* Manual Entry */}
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">
                    Lub wpisz kod paczkomatu ręcznie:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      placeholder="np. KRA010"
                      className="uppercase flex-1"
                    />
                    <Button
                      onClick={handleManualVerify}
                      disabled={isVerifying || !manualCode.trim()}
                    >
                      {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sprawdź'}
                    </Button>
                  </div>
                </div>

                {/* Popular Lockers */}
                <div className="pt-4">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Popularne lokalizacje</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'WAW001', city: 'Warszawa' },
                      { name: 'KRA010', city: 'Kraków' },
                      { name: 'POZ005', city: 'Poznań' },
                      { name: 'GDA003', city: 'Gdańsk' },
                    ].map((loc) => (
                      <button
                        key={loc.name}
                        onClick={() => {
                          setManualCode(loc.name);
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
                      >
                        <Package className="w-4 h-4 text-primary" />
                        <span>{loc.name}</span>
                        <span className="text-muted-foreground text-xs">({loc.city})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}