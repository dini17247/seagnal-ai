import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Vessel,
  Movement,
  MaritimeZone,
  Alert,
} from '../types';

import {
  MAP_CENTER,
  MAP_DEFAULT_ZOOM,
} from '../data';

interface VesselMapProps {
  vessels: Vessel[];
  zones: MaritimeZone[];
  alerts: Alert[];
  movements: Movement[];
  selectedVesselId?: string | null;
  onSelectVessel?: (vesselId: string) => void;
  onOpenIntelReport?: (vesselId: string) => void;
  onOpenVesselProfile?: (vesselId: string) => void;
  showProfileButton?: boolean;
  height?: string;
  showAllTrails?: boolean;
  showAnimation?: boolean;
  compact?: boolean;
}

export default function VesselMap({
  vessels,
  zones,
  alerts,
  movements,
  selectedVesselId,
  onSelectVessel,
  onOpenIntelReport,
  onOpenVesselProfile,
  showProfileButton = true,
  height = '500px',
  showAllTrails = false,
  showAnimation = true,
  compact = false,
}: VesselMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylinesRef = useRef<L.Polyline[]>([]);
  const zonesRef = useRef<L.Polygon[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationCursorRef = useRef<Record<string, number>>({});
  const popupOpenVesselIdRef = useRef<string | null>(null);
  const boundsPointsRef = useRef<L.LatLngExpression[]>([]);
  const userHasMovedMapRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const lastFitSignatureRef = useRef<string | null>(null);
  const lastSelectedVesselIdRef = useRef<string | null>(null);

  const onSelectVesselRef = useRef(onSelectVessel);
  const onOpenIntelReportRef = useRef(onOpenIntelReport);
  const onOpenVesselProfileRef = useRef(onOpenVesselProfile);

  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onSelectVesselRef.current = onSelectVessel;
    onOpenIntelReportRef.current = onOpenIntelReport;
    onOpenVesselProfileRef.current = onOpenVesselProfile;
  }, [onSelectVessel, onOpenIntelReport, onOpenVesselProfile]);

  const sourceLabel = useMemo(() => {
    const sources = Array.from(
      new Set(
        [
          ...vessels.map((vessel) => vessel.source_dataset),
          ...zones.map((zone) => zone.source_dataset),
        ].filter((source): source is string => Boolean(source && source.trim()))
      )
    );

    if (sources.length === 0) {
      return 'BigQuery maritime tables / controlled mock AIS data';
    }

    return sources.slice(0, 3).join(', ');
  }, [vessels, zones]);

  const getColorByRisk = (risk: string) => {
    if (risk === 'High') return '#ef4444';
    if (risk === 'Medium') return '#f97316';
    return '#06b6d4';
  };

  const fitMapToCurrentData = (animate = true) => {
    const map = mapInstanceRef.current;
    const points = boundsPointsRef.current;

    if (!map || points.length === 0) {
      return;
    }

    const bounds = L.latLngBounds(points);

    if (!bounds.isValid()) {
      return;
    }

    programmaticMoveRef.current = true;

    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      map.setView(bounds.getCenter(), compact ? 10 : 12, { animate });
    } else {
      map.fitBounds(bounds, {
        padding: compact ? [18, 18] : [44, 44],
        maxZoom: compact ? 10 : 10,
        animate,
      });
    }

    window.setTimeout(() => {
      programmaticMoveRef.current = false;
    }, 500);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CENTER,
      zoom: MAP_DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    const markUserMapInteraction = () => {
      if (!programmaticMoveRef.current) {
        userHasMovedMapRef.current = true;
      }
    };

    map.on('dragstart zoomstart', markUserMapInteraction);

    const isLightMode = document.documentElement.classList.contains('light-mode');
    const tileUrl = isLightMode
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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

      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }

      for (const markerId in markersRef.current) {
        markersRef.current[markerId]?.remove();
      }
      markersRef.current = {};

      polylinesRef.current.forEach((line) => line.remove());
      polylinesRef.current = [];

      zonesRef.current.forEach((zone) => zone.remove());
      zonesRef.current = [];

      map.off('dragstart zoomstart');
      tileLayer.remove();
      map.remove();

      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    map.invalidateSize();

    const sizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    if (animationTimerRef.current) {
      clearInterval(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    const isLightMode = document.documentElement.classList.contains('light-mode');

    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(
        isLightMode
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      );
    }

    for (const markerId in markersRef.current) {
      markersRef.current[markerId]?.remove();
    }
    markersRef.current = {};

    polylinesRef.current.forEach((line) => line.remove());
    polylinesRef.current = [];

    zonesRef.current.forEach((zone) => zone.remove());
    zonesRef.current = [];

    animationCursorRef.current = {};

    const boundsPoints: L.LatLngExpression[] = [];

    function getCardinalDirection(heading: number): string {
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const index = Math.round((heading % 360) / 45) % 8;
      return directions[index];
    }

    const buildVesselIcon = (vessel: Vessel, heading = vessel.heading) => {
      const isSelected = vessel.vessel_id === selectedVesselId;
      const color = getColorByRisk(vessel.risk_level);
      const isHighRisk = vessel.risk_level === 'High';
      const vesselStatus = vessel.status?.toLowerCase() ?? '';
      const hasAisGap = vesselStatus.includes('gap') || vesselStatus.includes('inactive');
      const hasActiveAlert = alerts.some(
        (alert) => alert.vessel_id === vessel.vessel_id && alert.status === 'Active'
      );

      const markerSize = compact ? 30 : 34;
      const svgSize = isSelected ? (compact ? 20 : 22) : compact ? 15 : 17;
      const badgeSizeClass = compact ? 'w-3.5 h-3.5 text-[7px]' : 'w-4 h-4 text-[8px]';

      const markerHtml = `
        <div class="relative flex items-center justify-center vessel-marker-motion" style="width:${markerSize}px;height:${markerSize}px;">
          ${
            isSelected
              ? `<div class="absolute inset-0 rounded-full border-2 border-white/90 shadow-[0_0_18px_rgba(255,255,255,0.45)]"></div>`
              : hasActiveAlert
                ? `<div class="absolute inset-1.5 rounded-full border border-rose-500/80 bg-rose-500/10"></div>`
                : isHighRisk
                  ? `<div class="absolute inset-2 rounded-full border border-rose-500/50 bg-rose-500/5"></div>`
                  : ''
          }
          <div 
            class="flex items-center justify-center transition-transform duration-700 ease-linear drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            style="transform: rotate(${heading}deg);"
          >
            <svg 
              width="${svgSize}" 
              height="${svgSize}" 
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
              ? `<div class="absolute -top-1 -right-1 bg-amber-500 text-[7px] font-black text-slate-950 rounded-full px-1 py-0.5 shadow-sm border border-slate-950">G</div>`
              : isHighRisk
                ? `<div class="absolute -top-1 -right-1 bg-rose-600 font-black text-white rounded-full ${badgeSizeClass} flex items-center justify-center shadow-sm border border-slate-950">!</div>`
                : ''
          }
        </div>
      `;

      return L.divIcon({
        html: markerHtml,
        className: 'custom-vessel-marker',
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });
    };

    const movementByVessel = new Map<string, Movement[]>();

    movements.forEach((movement) => {
      const history = movementByVessel.get(movement.vessel_id) ?? [];
      history.push(movement);
      movementByVessel.set(movement.vessel_id, history);
    });

    movementByVessel.forEach((history) => {
      history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    zones.forEach((zone) => {
      if (!zone.polygon_coordinates || zone.polygon_coordinates.length < 3) {
        return;
      }

      const color = getColorByRisk(zone.risk_level);

      const polygon = L.polygon(zone.polygon_coordinates, {
        color,
        fillColor: color,
        fillOpacity: compact ? 0.025 : zone.risk_level === 'High' ? 0.035 : 0.025,
        weight: compact ? 0.9 : 1.1,
        dashArray: '4, 4',
      }).addTo(map);

      boundsPoints.push(...zone.polygon_coordinates);

      polygon.bindTooltip(
        `
        <div class="px-2 py-1 text-xs font-sans text-slate-100 bg-slate-900 border border-slate-700 rounded shadow">
          <strong class="text-rose-400 font-semibold">${zone.zone_name}</strong><br/>
          <span class="text-slate-400 capitalize">${zone.zone_type} (${zone.risk_level} Risk)</span>
          ${zone.source_dataset ? `<br/><span class="text-[10px] text-slate-500">Source: ${zone.source_dataset}</span>` : ''}
        </div>
      `,
        {
          sticky: true,
          className: 'bg-transparent border-none shadow-none p-0',
        }
      );

      zonesRef.current.push(polygon);
    });

    vessels.forEach((vessel) => {
      const isSelected = vessel.vessel_id === selectedVesselId;
      const history = movementByVessel.get(vessel.vessel_id) ?? [];

      if (showAllTrails || isSelected) {
        if (history.length > 1) {
          const latlngs = history.map((movement) => [
            movement.latitude,
            movement.longitude,
          ] as [number, number]);

          const color = getColorByRisk(vessel.risk_level);

          const polyline = L.polyline(latlngs, {
            color,
            weight: isSelected ? 3 : 1.5,
            opacity: isSelected ? 0.85 : 0.26,
            dashArray: isSelected ? '0' : '3, 6',
          }).addTo(map);

          boundsPoints.push(...latlngs);
          polylinesRef.current.push(polyline);
        }
      }
    });

    vessels.forEach((vessel) => {
      const isSelected = vessel.vessel_id === selectedVesselId;
      const history = movementByVessel.get(vessel.vessel_id) ?? [];
      const firstAnimationPoint = showAnimation && history.length > 1 ? history[0] : null;

      const markerPosition: [number, number] = firstAnimationPoint
        ? [firstAnimationPoint.latitude, firstAnimationPoint.longitude]
        : [vessel.latitude, vessel.longitude];

      boundsPoints.push(markerPosition);

      const marker = L.marker(markerPosition, {
        icon: buildVesselIcon(vessel, firstAnimationPoint?.heading ?? vessel.heading),
      }).addTo(map);

      if (firstAnimationPoint) {
        animationCursorRef.current[vessel.vessel_id] = 1;
      }

      const isHighRisk = vessel.risk_level === 'High';

      const popupContent = document.createElement('div');
      popupContent.className =
        'p-3 font-sans w-72 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg shadow-2xl relative';

      popupContent.innerHTML = `
        <button
          id="btn-close-${vessel.vessel_id}"
          type="button"
          class="absolute top-2 right-2 w-6 h-6 rounded-full border border-slate-700 bg-slate-900/90 text-slate-400 hover:text-rose-300 hover:border-rose-500/50 flex items-center justify-center text-sm leading-none cursor-pointer z-10"
          title="Close popup"
        >
          ×
        </button>

        <div class="flex items-center justify-between gap-8 mb-2 pr-5">
          <h4 class="font-bold text-sm tracking-tight text-slate-200 truncate">${vessel.vessel_name}</h4>
          <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border shrink-0 ${
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
          <div><span class="text-slate-500">MMSI Hash:</span> <span class="font-mono text-[11px]">${vessel.mmsi_hash ? vessel.mmsi_hash.slice(-7) : 'N/A'}</span></div>
          <div><span class="text-slate-500">Hull Type:</span> <span class="font-medium">${vessel.vessel_type}</span></div>
          <div><span class="text-slate-500">Speed:</span> <span class="font-mono text-cyan-400 font-semibold">${vessel.speed} kn (${Math.round(vessel.speed * 1.852)} km/h)</span></div>
          <div><span class="text-slate-500">Heading:</span> <span class="font-mono">${vessel.heading}° (${getCardinalDirection(vessel.heading)})</span></div>
          <div class="col-span-2"><span class="text-slate-500">Flag:</span> <span>${vessel.flag_state || 'N/A'}</span></div>
          <div class="col-span-2"><span class="text-slate-500">Status:</span> <span class="${isHighRisk ? 'text-rose-400' : 'text-slate-200'}">${vessel.status}</span></div>
          <div class="col-span-2"><span class="text-slate-500">Demo Data Source:</span> <span class="text-slate-300">${vessel.source_dataset || 'BigQuery maritime tables / controlled mock AIS data'}</span></div>
        </div>
        
        <div class="text-[10px] text-slate-500 italic mb-2">
          Last Contact: ${new Date(vessel.last_ais_time).toLocaleString()}
        </div>
        
        <div class="grid ${showProfileButton ? 'grid-cols-2' : 'grid-cols-1'} gap-2">
          ${
            showProfileButton
              ? `<button 
                  id="btn-profile-${vessel.vessel_id}"
                  type="button"
                  class="text-center py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded border border-slate-700 hover:border-slate-500 text-[11px] font-semibold tracking-wider transition duration-150 active:scale-95 shadow cursor-pointer"
                >
                  PROFILE
                </button>`
              : ''
          }
          <button 
            id="btn-intel-${vessel.vessel_id}"
            type="button"
            class="text-center py-1.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-cyan-950 hover:to-slate-900 text-cyan-400 hover:text-cyan-300 rounded border border-cyan-500/30 hover:border-cyan-500/50 text-[11px] font-semibold tracking-wider transition duration-150 active:scale-95 shadow cursor-pointer"
          >
            INTEL REPORT
          </button>
        </div>
      `;

      L.DomEvent.disableClickPropagation(popupContent);
      L.DomEvent.disableScrollPropagation(popupContent);

      marker.bindPopup(popupContent, {
        maxWidth: 310,
        className: 'custom-tactical-popup',
        closeButton: false,
        closeOnClick: false,
        autoPan: true,
        keepInView: true,
      });

      marker.on('popupopen', () => {
        popupOpenVesselIdRef.current = vessel.vessel_id;

        const closeBtn = popupContent.querySelector<HTMLButtonElement>(
          `#btn-close-${vessel.vessel_id}`
        );

        if (closeBtn) {
          closeBtn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            marker.closePopup();
          };
        }

        const profileBtn = popupContent.querySelector<HTMLButtonElement>(
          `#btn-profile-${vessel.vessel_id}`
        );

        if (profileBtn) {
          profileBtn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelectVesselRef.current?.(vessel.vessel_id);
            onOpenVesselProfileRef.current?.(vessel.vessel_id);
          };
        }

        const intelBtn = popupContent.querySelector<HTMLButtonElement>(
          `#btn-intel-${vessel.vessel_id}`
        );

        if (intelBtn) {
          intelBtn.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            onSelectVesselRef.current?.(vessel.vessel_id);
            onOpenIntelReportRef.current?.(vessel.vessel_id);
          };
        }
      });

      marker.on('popupclose', () => {
        if (popupOpenVesselIdRef.current === vessel.vessel_id) {
          popupOpenVesselIdRef.current = null;
        }
      });

      markersRef.current[vessel.vessel_id] = marker;

      if (isSelected) {
        setTimeout(() => {
          const selectedChanged = lastSelectedVesselIdRef.current !== vessel.vessel_id;

          if (selectedChanged && !compact) {
            programmaticMoveRef.current = true;

            map.setView([vessel.latitude, vessel.longitude], Math.max(map.getZoom(), 13), {
              animate: true,
            });

            window.setTimeout(() => {
              programmaticMoveRef.current = false;
            }, 500);
          }

          lastSelectedVesselIdRef.current = vessel.vessel_id;
          marker.openPopup();
        }, 100);
      }
    });

    boundsPointsRef.current = boundsPoints;

    const fitSignature = `${vessels.map((vessel) => vessel.vessel_id).join('|')}::${zones
      .map((zone) => zone.zone_id)
      .join('|')}::${selectedVesselId ?? 'none'}::${compact ? 'compact' : 'full'}`;

    const shouldAutoFit =
      boundsPoints.length > 0 &&
      !userHasMovedMapRef.current &&
      lastFitSignatureRef.current !== fitSignature;

    if (shouldAutoFit) {
      setTimeout(() => {
        const bounds = L.latLngBounds(boundsPoints);

        if (bounds.isValid()) {
          programmaticMoveRef.current = true;

          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            const point = bounds.getCenter();
            map.setView(point, compact ? 10 : 12, { animate: false });
          } else {
            map.fitBounds(bounds, {
              padding: compact ? [18, 18] : [44, 44],
              maxZoom: compact ? 10 : 10,
            });
          }

          lastFitSignatureRef.current = fitSignature;

          window.setTimeout(() => {
            programmaticMoveRef.current = false;
          }, 500);
        }
      }, 120);
    }

    if (showAnimation) {
      animationTimerRef.current = setInterval(() => {
        vessels.forEach((vessel) => {
          const marker = markersRef.current[vessel.vessel_id];
          const history = movementByVessel.get(vessel.vessel_id) ?? [];

          if (!marker || history.length < 2) {
            return;
          }

          if (popupOpenVesselIdRef.current === vessel.vessel_id) {
            return;
          }

          const cursor = animationCursorRef.current[vessel.vessel_id] ?? 0;
          const point = history[cursor % history.length];

          marker.setLatLng([point.latitude, point.longitude]);
          marker.setIcon(buildVesselIcon(vessel, point.heading));
          animationCursorRef.current[vessel.vessel_id] = (cursor + 1) % history.length;
        });
      }, 1100);
    }

    return () => {
      clearTimeout(sizeTimer);

      if (animationTimerRef.current) {
        clearInterval(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [
    mapReady,
    vessels,
    zones,
    alerts,
    movements,
    selectedVesselId,
    showAllTrails,
    showAnimation,
    compact,
    showProfileButton,
  ]);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 shadow-2xl shadow-slate-950/40 group"
      style={{ height, width: '100%' }}
    >
      <button
        type="button"
        onClick={() => {
          userHasMovedMapRef.current = false;
          lastFitSignatureRef.current = null;
          fitMapToCurrentData(true);
        }}
        className={`absolute z-[1000] rounded-lg border border-slate-700/80 bg-slate-950/90 font-extrabold uppercase tracking-wider text-slate-300 shadow-lg shadow-slate-950/40 backdrop-blur-md transition hover:border-cyan-500/60 hover:text-cyan-300 ${
          compact
            ? 'top-2 left-2 px-2 py-1.5 text-[9px]'
            : 'top-3 left-14 px-3 py-2 text-[10px]'
        }`}
        title="Zoom out to the current vessel and zone overview"
      >
        Fit overview
      </button>

      {!compact && (
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-slate-950/90 backdrop-blur-md px-3.5 py-3 rounded-xl border border-slate-700/70 max-w-[240px] pointer-events-none shadow-xl shadow-slate-950/50">
          <h5 className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-300">
            Map Legend
          </h5>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow shadow-rose-500/50 shrink-0"></span>
            <span className="text-[11px] text-slate-300">High risk vessel</span>
          </div>

          <div className="flex items-center gap-2 flex-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow shadow-orange-500/50 shrink-0"></span>
            <span className="text-[11px] text-slate-300">Medium risk vessel</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow shadow-cyan-500/50 shrink-0"></span>
            <span className="text-[11px] text-slate-300">Low risk vessel</span>
          </div>

          <div className="border-t border-slate-800/80 pt-1 mt-1 flex items-center gap-2">
            <span className="w-5 h-0.5 border-t border-dashed border-rose-500 shrink-0"></span>
            <span className="text-[9px] text-slate-400">Restricted zone boundary</span>
          </div>

          <div className="border-t border-slate-800/80 pt-1 mt-1 text-[9px] text-slate-500 leading-snug">
            Source: <span className="text-slate-400">{sourceLabel}</span>
          </div>
        </div>
      )}

      {!compact && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-700/70 rounded-xl px-3 py-2 pointer-events-none shadow-lg shadow-slate-950/40">
          <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-slate-400">
            {zones.length} zones • {vessels.length} vessels • animated AIS replay
          </span>
        </div>
      )}

      <div
        id="map-container"
        ref={mapContainerRef}
        className="absolute inset-0 z-10 focus:outline-none"
      />
    </div>
  );
}