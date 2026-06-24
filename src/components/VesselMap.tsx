import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Vessel, MaritimeZone, Alert } from '../types';
import { mockMovements, MAP_CENTER, MAP_DEFAULT_ZOOM } from '../data';

interface VesselMapProps {
  vessels: Vessel[];
  zones: MaritimeZone[];
  alerts: Alert[];
  selectedVesselId?: string | null;
  onSelectVessel?: (vesselId: string) => void;
  height?: string;
  showAllTrails?: boolean;
}

export default function VesselMap({
  vessels,
  zones,
  alerts,
  selectedVesselId,
  onSelectVessel,
  height = '500px',
  showAllTrails = false,
}: VesselMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const zonesRef = useRef<L.Polygon[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  const [mapReady, setMapReady] = useState(false);

  // Function to get color based on risk level
  const getColorByRisk = (risk: string) => {
    if (risk === 'High') return '#ef4444'; // Red
    if (risk === 'Medium') return '#f97316'; // Orange/Yellow
    return '#06b6d4'; // Cyan
  };

  // 1. Map Initialization and Cleanup
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      center: MAP_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    const isLightMode = document.documentElement.classList.contains('light-mode');
    const tileUrl = isLightMode
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    setMapReady(true);

    const initialSizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(initialSizeTimer);
      // Clean up previous layers manually just in case
      (Object.values(markersRef.current) as L.Marker[]).forEach((marker) => marker.remove());
      markersRef.current = {};
      polylinesRef.current.forEach((line) => line.remove());
      polylinesRef.current = [];
      zonesRef.current.forEach((z) => z.remove());
      zonesRef.current = [];

      tileLayer.remove();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // 2. Map layers drawing and updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Recalculate dimensions
    map.invalidateSize();
    const sizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Update tile layers URL dynamically when theme changes
    const isLightMode = document.documentElement.classList.contains('light-mode');
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(
        isLightMode
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      );
    }

    // Clean previous layers
    (Object.values(markersRef.current) as L.Marker[]).forEach((marker) => marker.remove());
    markersRef.current = {};
    polylinesRef.current.forEach((line) => line.remove());
    polylinesRef.current = [];
    zonesRef.current.forEach((z) => z.remove());
    zonesRef.current = [];

    // Draw Zones
    zones.forEach((zone) => {
      const color = getColorByRisk(zone.risk_level);
      const polygon = L.polygon(zone.polygon_coordinates, {
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(map);

      polygon.bindTooltip(`
        <div class="px-2 py-1 text-xs font-sans text-slate-100 bg-slate-900 border border-slate-700 rounded shadow">
          <strong class="text-rose-400 font-semibold">${zone.zone_name}</strong><br/>
          <span class="text-slate-400 capitalize">${zone.zone_type} (${zone.risk_level} Risk)</span>
        </div>
      `, { sticky: true, className: 'bg-transparent border-none shadow-none p-0' });

      zonesRef.current.push(polygon);
    });

    // Draw vessel historical tracks
    vessels.forEach((vessel) => {
      const isSelected = vessel.vessel_id === selectedVesselId;
      if (showAllTrails || isSelected) {
        const history = mockMovements
          .filter((m) => m.vessel_id === vessel.vessel_id)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (history.length > 1) {
          const latlngs = history.map((m) => [m.latitude, m.longitude] as [number, number]);
          const color = getColorByRisk(vessel.risk_level);
          const polyline = L.polyline(latlngs, {
            color: color,
            weight: isSelected ? 3 : 1.5,
            opacity: isSelected ? 0.9 : 0.4,
            dashArray: isSelected ? '0' : '3, 6',
          }).addTo(map);

          polylinesRef.current.push(polyline);
        }
      }
    });

    // Render vessels custom HTML markers
    vessels.forEach((vessel) => {
      const isSelected = vessel.vessel_id === selectedVesselId;
      const color = getColorByRisk(vessel.risk_level);
      const isHighRisk = vessel.risk_level === 'High';
      const hasAisGap = vessel.status.toLowerCase().includes('gap') || vessel.status.toLowerCase().includes('inactive');
      const hasActiveAlert = alerts.some((alert) => alert.vessel_id === vessel.vessel_id && alert.status === 'Active');

      const markerHtml = `
        <div class="relative flex items-center justify-center w-10 h-10">
          ${
            hasActiveAlert
              ? `<div class="absolute inset-1 rounded-full bg-rose-600/35 marker-alert-active z-0"></div>`
              : isHighRisk 
              ? `<div class="absolute inset-0 w-full h-full rounded-full bg-rose-500/20 animate-ping" style="animation-duration: 2s;"></div>` 
              : ''
          }
          ${
            isSelected
              ? `<div class="absolute inset-x-0 inset-y-0 w-8 h-8 rounded-full border-2 border-white animate-spin" style="animation-duration: 3s;"></div>`
              : ''
          }
          <div 
            class="flex items-center justify-center transition-all"
            style="transform: rotate(${vessel.heading}deg);"
          >
            <svg 
              width="${isSelected ? '24' : '18'}" 
              height="${isSelected ? '24' : '18'}" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M12 2L4 21L12 17L20 21L12 2Z" 
                fill="${color}" 
                stroke="${isSelected ? '#ffffff' : '#030712'}" 
                stroke-width="1.5" 
                stroke-linejoin="round"
              />
            </svg>
          </div>
          ${
            hasAisGap
              ? `<div class="absolute -top-1 -right-1 bg-amber-500 text-[8px] font-bold text-slate-950 rounded-full px-1 py-0.5 shadow-sm border border-slate-950">GAP</div>`
              : isHighRisk
              ? `<div class="absolute -top-1 -right-1 bg-rose-600 text-[8px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center shadow-sm border border-slate-950">!</div>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-vessel-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([vessel.latitude, vessel.longitude], {
        icon: customIcon,
      }).addTo(map);

      // Create rich customized operations popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3 font-sans w-64 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg shadow-2xl';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold text-sm tracking-tight text-slate-200">${vessel.vessel_name}</h4>
          <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
            vessel.risk_level === 'High'
              ? 'border-rose-500 bg-rose-500/10 text-rose-400'
              : vessel.risk_level === 'Medium'
              ? 'border-amber-500 bg-amber-500/10 text-amber-400'
              : 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
          }">
            RISK ${vessel.risk_score}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-300 mb-2 border-t border-slate-800/80 pt-1.5">
          <div><span class="text-slate-500">MMSI Hash:</span> <span class="font-mono text-[11px]">${vessel.mmsi_hash.slice(-7)}</span></div>
          <div><span class="text-slate-500">Hull Type:</span> <span class="font-medium">${vessel.vessel_type}</span></div>
          <div><span class="text-slate-500">Speed:</span> <span class="font-mono text-cyan-400 font-semibold">${vessel.speed} kn (${Math.round(vessel.speed * 1.852)} km/h)</span></div>
          <div><span class="text-slate-500">Heading:</span> <span class="font-mono">${vessel.heading}° (${getCardinalDirection(vessel.heading)})</span></div>
          <div class="col-span-2"><span class="text-slate-500">Flag:</span> <span>${vessel.flag_state || 'N/A'}</span></div>
          <div class="col-span-2"><span class="text-slate-500">Status:</span> <span class="${isHighRisk ? 'text-rose-400' : 'text-slate-200'}">${vessel.status}</span></div>
        </div>
        
        <div class="text-[10px] text-slate-500 italic mb-2">
          Last Contact: ${new Date(vessel.last_ais_time).toLocaleString()}
        </div>
        
        <button 
          id="btn-intel-${vessel.vessel_id}"
          class="w-full text-center py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-cyan-950 hover:to-slate-900 text-cyan-400 hover:text-cyan-300 rounded border border-cyan-500/30 hover:border-cyan-500/50 text-xs font-semibold tracking-wider transition duration-150 active:scale-95 shadow cursor-pointer"
        >
          OPEN INTEL REPORT
        </button>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'custom-tactical-popup',
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-intel-${vessel.vessel_id}`);
        if (btn && onSelectVessel) {
          btn.addEventListener('click', () => {
            onSelectVessel(vessel.vessel_id);
            marker.closePopup();
          });
        }
      });

      markersRef.current[vessel.vessel_id] = marker;

      if (isSelected) {
        setTimeout(() => {
          map.setView([vessel.latitude, vessel.longitude], Math.max(map.getZoom(), 12));
          marker.openPopup();
        }, 100);
      }
    });

    function getCardinalDirection(heading: number): string {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round(((heading % 360) / 45)) % 8;
      return directions[index];
    }

    return () => {
      clearTimeout(sizeTimer);
    };
  }, [mapReady, vessels, zones, alerts, selectedVesselId, showAllTrails, document.documentElement.className]);;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner group">
      <div className="absolute top-2.5 right-2.5 z-[1000] flex flex-col gap-1.5 bg-slate-950/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-800 max-w-[200px] pointer-events-none">
        <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tactical Legend</h5>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-500/50 shrink-0"></span>
          <span className="text-[11px] text-slate-300">High Risk Threat</span>
        </div>
        <div className="flex items-center gap-2 flex-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow shadow-orange-500/50 shrink-0"></span>
          <span className="text-[11px] text-slate-300">Medium Risk Anomaly</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow shadow-cyan-500/50 shrink-0"></span>
          <span className="text-[11px] text-slate-300">Low Risk Marine</span>
        </div>
        <div className="border-t border-slate-800/80 pt-1 mt-1 flex items-center gap-2">
          <span className="w-5 h-0.5 border-t border-dashed border-rose-500 shrink-0"></span>
          <span className="text-[9px] text-slate-400">Military Geofence</span>
        </div>
      </div>
      
      <div 
        id="map-container"
        ref={mapContainerRef} 
        style={{ height, width: '100%' }} 
        className="z-10 focus:outline-none"
      />
    </div>
  );
}
