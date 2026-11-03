import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Layers,
  Filter,
  Navigation,
  Plus,
  Volume2,
  Calendar,
  Compass,
  AlertTriangle,
  TreePine,
  Car,
  Hammer,
  Megaphone,
  User,
} from 'lucide-react';
import { SoundObservation } from '../types';

interface SoundMapViewProps {
  observations: SoundObservation[];
  onAddObservation: (obs: Partial<SoundObservation>) => void;
  activeMetrics?: { dbSpl: number; dbfs: number; primarySound: string; confidence: number };
}

export const SoundMapView: React.FC<SoundMapViewProps> = ({
  observations,
  onAddObservation,
  activeMetrics,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedObs, setSelectedObs] = useState<SoundObservation | null>(null);
  const [isPinningMode, setIsPinningMode] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center (San Francisco)
    const map = L.map(mapContainerRef.current, {
      center: [37.7749, -122.4194],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark-styled OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const heatGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    heatLayerRef.current = heatGroup;
    mapInstanceRef.current = map;

    // Handle map click for pinning mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isPinningMode) {
        onAddObservation({
          latitude: Number(e.latlng.lat.toFixed(5)),
          longitude: Number(e.latlng.lng.toFixed(5)),
          address: `Coordinates: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`,
          dbSpl: activeMetrics?.dbSpl || 64.0,
          dbfs: activeMetrics?.dbfs || -30.0,
          primarySound: activeMetrics?.primarySound || 'Community Observation',
          confidence: activeMetrics?.confidence || 0.88,
          category: 'ambient',
        });
        setIsPinningMode(false);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync markers and heat circles when observations or filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const heatGroup = heatLayerRef.current;
    if (!map || !markersGroup || !heatGroup) return;

    markersGroup.clearLayers();
    heatGroup.clearLayers();

    const filtered = observations.filter((obs) => {
      if (selectedCategory === 'all') return true;
      return obs.category === selectedCategory;
    });

    filtered.forEach((obs) => {
      // Color determined by dB SPL
      let color = '#10B981'; // green (<50)
      if (obs.dbSpl >= 80) color = '#F43F5E'; // red
      else if (obs.dbSpl >= 65) color = '#F59E0B'; // orange
      else if (obs.dbSpl >= 50) color = '#36C7B0'; // teal

      // Acoustic propagation zone circle (Heatmap simulation)
      if (showHeatmap) {
        const radiusMeters = Math.max(120, (obs.dbSpl - 35) * 8);
        const heatCircle = L.circle([obs.latitude, obs.longitude], {
          radius: radiusMeters,
          fillColor: color,
          fillOpacity: 0.18,
          color: color,
          opacity: 0.45,
          weight: 1.5,
        });
        heatCircle.addTo(heatGroup);
      }

      // Marker Icon (Pulsing custom HTML div icon)
      const customIcon = L.divIcon({
        className: 'custom-sound-marker',
        html: `
          <div style="
            background: #151F31;
            border: 2px solid ${color};
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            color: ${color};
            font-size: 11px;
            font-weight: bold;
            font-family: monospace;
          ">
            ${Math.round(obs.dbSpl)}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([obs.latitude, obs.longitude], { icon: customIcon });

      marker.on('click', () => {
        setSelectedObs(obs);
      });

      marker.addTo(markersGroup);
    });
  }, [observations, selectedCategory, showHeatmap]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.2 });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation failed:', err);
      },
      { timeout: 8000 }
    );
  };

  const jumpToLocation = (lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([lat, lng], 15, { duration: 1.0 });
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#151F31] rounded-2xl border border-[#29364B]">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#36C7B0]" />
            Category:
          </span>
          {[
            { id: 'all', label: 'All Sounds' },
            { id: 'traffic', label: 'Traffic' },
            { id: 'nature', label: 'Nature' },
            { id: 'construction', label: 'Construction' },
            { id: 'siren', label: 'Sirens' },
            { id: 'speech', label: 'Speech' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#36C7B0] text-[#07131B] border-[#36C7B0] font-semibold'
                  : 'bg-[#0B1220] text-slate-300 border-[#29364B] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Map Tool Actions */}
        <div className="flex items-center gap-2">
          {/* Heatmap Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-colors ${
              showHeatmap
                ? 'bg-[#29364B] text-[#36C7B0] border-[#36C7B0]/50'
                : 'bg-[#0B1220] text-slate-400 border-[#29364B]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Heatmap {showHeatmap ? 'On' : 'Off'}
          </button>

          {/* Locate Me */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1220] hover:bg-[#29364B] text-slate-300 text-xs rounded-xl border border-[#29364B] transition-colors"
            title="Pan to current GPS location"
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-[#36C7B0]' : ''}`} />
            My Location
          </button>

          {/* Pin Observation Mode */}
          <button
            onClick={() => setIsPinningMode(!isPinningMode)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl border transition-all ${
              isPinningMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                : 'bg-[#36C7B0] text-[#07131B] border-[#36C7B0] hover:bg-[#2fb29d]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {isPinningMode ? 'Click Map to Pin' : 'Pin Here'}
          </button>
        </div>
      </div>

      {/* Preset Location Quick Jump Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
        <span className="shrink-0 flex items-center gap-1 text-slate-400">
          <Compass className="w-3.5 h-3.5 text-[#36C7B0]" />
          Explore Zones:
        </span>
        <button
          onClick={() => jumpToLocation(37.7749, -122.4194)}
          className="px-2.5 py-1 bg-[#151F31] hover:bg-[#29364B] text-slate-300 rounded-lg border border-[#29364B] shrink-0"
        >
          Market St Traffic (76 dBA)
        </button>
        <button
          onClick={() => jumpToLocation(37.7699, -122.4469)}
          className="px-2.5 py-1 bg-[#151F31] hover:bg-[#29364B] text-slate-300 rounded-lg border border-[#29364B] shrink-0"
        >
          Golden Gate Birds (43 dBA)
        </button>
        <button
          onClick={() => jumpToLocation(37.7891, -122.4014)}
          className="px-2.5 py-1 bg-[#151F31] hover:bg-[#29364B] text-slate-300 rounded-lg border border-[#29364B] shrink-0"
        >
          SOMA Jackhammer (83 dBA)
        </button>
        <button
          onClick={() => jumpToLocation(37.7955, -122.3937)}
          className="px-2.5 py-1 bg-[#151F31] hover:bg-[#29364B] text-slate-300 rounded-lg border border-[#29364B] shrink-0"
        >
          Embarcadero Water (50 dBA)
        </button>
      </div>

      {/* Map Viewport Container */}
      <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-[#29364B] shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Pinning Mode Banner */}
        {isPinningMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-amber-500 text-slate-950 text-xs font-semibold rounded-full shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Click anywhere on the map to pin this acoustic observation!
            <button
              onClick={() => setIsPinningMode(false)}
              className="ml-2 underline text-[11px] text-slate-900"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] p-3 bg-[#151F31]/90 backdrop-blur-md border border-[#29364B] rounded-2xl text-xs space-y-1.5 shadow-xl">
          <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
            Sound Intensity (dBA SPL)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10B981]" />
            <span className="text-slate-300">&lt; 50 dBA (Quiet Sanctuary)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#36C7B0]" />
            <span className="text-slate-300">50 - 65 dBA (Moderate Urban)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
            <span className="text-slate-300">65 - 80 dBA (Loud Traffic)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F43F5E]" />
            <span className="text-slate-300">&gt; 80 dBA (Hazardous Noise)</span>
          </div>
        </div>

        {/* Selected Observation Drawer / Card */}
        {selectedObs && (
          <div className="absolute top-4 right-4 z-[1000] w-80 p-4 bg-[#151F31]/95 backdrop-blur-md border border-[#29364B] rounded-2xl shadow-2xl space-y-3 animate-fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#36C7B0] uppercase tracking-wider">
                  {selectedObs.category.toUpperCase()} OBSERVER
                </span>
                <h3 className="text-sm font-bold text-white">{selectedObs.primarySound}</h3>
              </div>
              <button
                onClick={() => setSelectedObs(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 bg-[#0B1220] rounded-xl border border-[#29364B] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">Sound Intensity</div>
                <div className="text-lg font-bold font-mono text-white">
                  {selectedObs.dbSpl.toFixed(1)} <span className="text-xs font-normal text-slate-400">dBA</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400">AI Confidence</div>
                <div className="text-lg font-bold font-mono text-[#36C7B0]">
                  {(selectedObs.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#36C7B0]" />
                <span className="truncate">{selectedObs.address}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{new Date(selectedObs.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Reported by {selectedObs.reportedBy}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
