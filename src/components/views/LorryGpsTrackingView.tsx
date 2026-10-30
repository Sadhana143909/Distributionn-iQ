import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Navigation,
  Truck,
  AlertTriangle,
  Clock,
  MapPin,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Play,
  Square,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Phone,
  Gauge,
  Thermometer,
  Fuel,
  BatteryCharging,
  Radio,
  Layers,
  ChevronRight,
  Info,
  X,
  Sliders,
  PlayCircle,
  StopCircle,
  ArrowRightCircle,
  Check,
  AlertCircle,
  RotateCcw,
  Flag,
  Calendar,
  Compass,
  Milestone,
  Edit3,
  Save,
  Crosshair,
  Send,
  FileText,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api';
import {
  Lorry,
  LorryGPSStats,
  BreakdownAlert,
  BreakdownType,
  BreakdownWorkflowStatus,
  LocationSource,
  SeverityLevel,
  LorryMovementStatus,
} from '../../types';

interface LorryGpsTrackingViewProps {
  onNavigate: (viewId: string) => void;
}

// Haversine formula for straight-line spherical distance in km
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Cumulative distance travelled from historical GPS route waypoints
export function calculateRouteDistanceTravelled(waypoints?: Array<{ latitude: number; longitude: number }>): number {
  if (!waypoints || waypoints.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += calculateHaversineKm(
      waypoints[i - 1].latitude,
      waypoints[i - 1].longitude,
      waypoints[i].latitude,
      waypoints[i].longitude
    );
  }
  return Math.round(total * 10) / 10;
}

export interface JourneyEvaluation {
  hasDestination: boolean;
  hasSchedule: boolean;
  distanceTravelledKm: number;
  straightLineRemainingKm: number | null;
  estimatedRoadRemainingKm: number | null;
  estimatedArrivalDate: Date | null;
  delayStatus: 'On Time' | 'At Risk' | 'Delayed' | 'Unscheduled' | 'Destination Not Provided';
  delayReason?: string;
}

export function evaluateJourney(lorry: Lorry): JourneyEvaluation {
  if (!lorry) {
    return {
      hasDestination: false,
      hasSchedule: false,
      distanceTravelledKm: 0,
      straightLineRemainingKm: null,
      estimatedRoadRemainingKm: null,
      estimatedArrivalDate: null,
      delayStatus: 'Destination Not Provided',
      delayReason: 'No lorry details provided',
    };
  }

  const currentLat = lorry.lastTelemetry?.latitude;
  const currentLng = lorry.lastTelemetry?.longitude;
  const destLat = lorry.destinationLatitude;
  const destLng = lorry.destinationLongitude;

  const distanceTravelledKm = calculateRouteDistanceTravelled(lorry.recentWaypoints || []);

  const hasDestination =
    typeof destLat === 'number' &&
    typeof destLng === 'number' &&
    !isNaN(destLat) &&
    !isNaN(destLng) &&
    typeof currentLat === 'number' &&
    typeof currentLng === 'number' &&
    !isNaN(currentLat) &&
    !isNaN(currentLng);

  const hasSchedule = Boolean(lorry.expectedDeliveryDate);

  if (!hasDestination) {
    return {
      hasDestination: false,
      hasSchedule,
      distanceTravelledKm,
      straightLineRemainingKm: null,
      estimatedRoadRemainingKm: null,
      estimatedArrivalDate: null,
      delayStatus: 'Destination Not Provided',
      delayReason: 'No destination coordinates supplied for this consignment',
    };
  }

  const straightLine = calculateHaversineKm(currentLat!, currentLng!, destLat!, destLng!);
  const roadEstimated = Math.round(straightLine * 1.25 * 10) / 10;

  // Real-time speed from GPS or 55 km/h highway corridor fallback
  const effectiveSpeed =
    lorry.lastTelemetry?.speed && lorry.lastTelemetry.speed > 10 ? lorry.lastTelemetry.speed : 55;
  const transitHours = roadEstimated / effectiveSpeed;
  const estimatedArrival = new Date(Date.now() + transitHours * 3600 * 1000);

  if (!hasSchedule) {
    return {
      hasDestination: true,
      hasSchedule: false,
      distanceTravelledKm,
      straightLineRemainingKm: straightLine,
      estimatedRoadRemainingKm: roadEstimated,
      estimatedArrivalDate: estimatedArrival,
      delayStatus: 'Unscheduled',
      delayReason: 'Delivery date/time schedule not specified',
    };
  }

  // Parse expected deadline
  let deadlineDate = new Date(lorry.expectedDeliveryDate!);
  if (lorry.expectedDeliveryTime) {
    const [hh, mm] = lorry.expectedDeliveryTime.split(':').map(Number);
    if (!isNaN(hh) && !isNaN(mm)) {
      deadlineDate.setHours(hh, mm, 0, 0);
    }
  } else {
    deadlineDate.setHours(23, 59, 59, 999);
  }

  const now = new Date();
  const isBreakdown =
    lorry.status === 'Breakdown' ||
    lorry.workflowStatus === 'Breakdown Confirmed' ||
    lorry.workflowStatus === 'Breakdown Reported' ||
    lorry.workflowStatus === 'Possible Stoppage';

  let delayStatus: 'On Time' | 'At Risk' | 'Delayed' = 'On Time';
  let delayReason = 'Transit progress is on schedule';

  if (now > deadlineDate) {
    delayStatus = 'Delayed';
    delayReason = 'Target delivery schedule deadline has elapsed';
  } else if (estimatedArrival > deadlineDate) {
    delayStatus = 'Delayed';
    delayReason = `Calculated ETA (${estimatedArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) exceeds scheduled deadline`;
  } else if (isBreakdown || estimatedArrival.getTime() + 2 * 3600 * 1000 > deadlineDate.getTime()) {
    delayStatus = 'At Risk';
    delayReason = isBreakdown ? 'Vehicle breakdown active on transit corridor' : 'ETA tight within 2 hours of schedule deadline';
  }

  return {
    hasDestination: true,
    hasSchedule: true,
    distanceTravelledKm,
    straightLineRemainingKm: straightLine,
    estimatedRoadRemainingKm: roadEstimated,
    estimatedArrivalDate: estimatedArrival,
    delayStatus,
    delayReason,
  };
}

export const LorryGpsTrackingView: React.FC<LorryGpsTrackingViewProps> = ({ onNavigate }) => {
  const [lorries, setLorries] = useState<Lorry[]>([]);
  const [stats, setStats] = useState<LorryGPSStats>({
    totalLorries: 0,
    movingLorries: 0,
    stoppedLorries: 0,
    offlineLorries: 0,
    possibleStoppages: 0,
    confirmedBreakdowns: 0,
    delayedShipments: 0,
    recoveredLorries: 0,
    onTimeShipments: 0,
    atRiskShipments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [breakdownStatusFilter, setBreakdownStatusFilter] = useState<string>('ALL');
  const [destinationCityFilter, setDestinationCityFilter] = useState<string>('ALL');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('ALL');
  const [selectedLorry, setSelectedLorry] = useState<Lorry | null>(null);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isDriverBreakdownModalOpen, setIsDriverBreakdownModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isApiInfoOpen, setIsApiInfoOpen] = useState(false);
  const [isSimulationPanelOpen, setIsSimulationPanelOpen] = useState(true);

  // Simulation controls
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [simInterval, setSimInterval] = useState<NodeJS.Timeout | null>(null);
  const [simMessage, setSimMessage] = useState<string | null>(null);
  const [simStartingLat, setSimStartingLat] = useState<number>(39.8283);
  const [simStartingLng, setSimStartingLng] = useState<number>(-98.5795);
  const [simManualSpeed, setSimManualSpeed] = useState<number>(65);

  // Form states
  const [newLorryForm, setNewLorryForm] = useState({
    lorryNumber: '',
    model: 'Volvo FH16 540',
    capacityTons: 28,
    carrierName: 'SwiftLogistics Global',
    driverName: '',
    driverPhone: '',
    originLocation: '',
    destinationLocation: '',
    currentShipmentCode: '',
    latitude: 39.8283,
    longitude: -98.5795,
    speed: 65,
    locationSource: 'GPS_DEVICE' as LocationSource,
  });

  // Driver Breakdown Form (with 7 specified breakdown types)
  const [driverBreakdownForm, setDriverBreakdownForm] = useState<{
    shipmentId: string;
    lorryId: string;
    breakdownType: BreakdownType;
    description: string;
    latitude: number;
    longitude: number;
    breakdownTime: string;
  }>({
    shipmentId: '',
    lorryId: '',
    breakdownType: 'Engine Failure',
    description: 'Sudden loss of propulsion power on highway. Vehicle immobilized on shoulder.',
    latitude: 39.8283,
    longitude: -98.5795,
    breakdownTime: new Date().toISOString().slice(0, 16),
  });

  const [dispatchForm, setDispatchForm] = useState({
    serviceProvider: 'FleetRescue Highway Commercial Support',
    etaMinutes: 20,
    mechanicName: 'Marcus Miller',
    contactPhone: '+1 (800) 555-ROAD',
  });

  const [resolveNotes, setResolveNotes] = useState('Field maintenance completed. Vehicle inspected, engine tested, and cleared for travel.');

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  // Initial Leaflet Map Setup
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [38.5, -92.0],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const polylineGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    polylinesLayerRef.current = polylineGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync markers when lorries or selected lorry changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !polylinesLayerRef.current) return;

    const markersGroup = markersLayerRef.current;
    const polylineGroup = polylinesLayerRef.current;
    markersGroup.clearLayers();
    polylineGroup.clearLayers();

    const filtered = filterLorries(lorries);

    filtered.forEach((lorry) => {
      if (!lorry || !lorry.lastTelemetry) return;
      const { latitude, longitude, speed } = lorry.lastTelemetry;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

      // Color mapping:
      // Green: Moving lorry
      // Yellow: Stopped lorry
      // Red: Breakdown detected / reported / confirmed / assistance
      // Cyan: Recovered
      // Blue: Normal / Scheduled
      let color = '#3b82f6'; // Blue default
      let pulseRing = '';

      const isBreakdown =
        lorry.status === 'Breakdown' ||
        lorry.workflowStatus === 'Breakdown Confirmed' ||
        lorry.workflowStatus === 'Breakdown Reported' ||
        lorry.workflowStatus === 'Assistance Requested' ||
        lorry.workflowStatus === 'Repairing' ||
        lorry.activeBreakdown?.status !== 'Resolved';

      if (isBreakdown) {
        color = '#ef4444'; // Red
        pulseRing = '<div class="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping"></div>';
      } else if (lorry.workflowStatus === 'Possible Stoppage') {
        color = '#f59e0b'; // Yellow / Amber
        pulseRing = '<div class="absolute -inset-1.5 rounded-full bg-amber-500/30 animate-pulse"></div>';
      } else if (lorry.movementStatus === 'Moving' || lorry.status === 'Moving') {
        color = '#10b981'; // Green
      } else if (lorry.movementStatus === 'Stopped' || lorry.status === 'Stopped') {
        color = '#f59e0b'; // Yellow
      } else if (lorry.status === 'Recovered' || lorry.workflowStatus === 'Recovered') {
        color = '#06b6d4'; // Cyan
      }

      const isSelected = selectedLorry?.id === lorry.id;
      const borderClass = isSelected
        ? 'border-2 border-white ring-4 ring-cyan-500/50 scale-125'
        : 'border border-slate-900';

      const customIconHtml = `
        <div class="relative flex items-center justify-center transition-all duration-300">
          ${pulseRing}
          <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-2xl ${borderClass}" style="background-color: ${color};">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
              <path d="M15 18H9"/>
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
              <circle cx="17" cy="18" r="2"/>
              <circle cx="7" cy="18" r="2"/>
            </svg>
          </div>
          <div class="absolute -bottom-6 px-1.5 py-0.5 rounded bg-slate-950/90 text-slate-200 text-[10px] font-mono border border-slate-700 whitespace-nowrap shadow-md pointer-events-none">
            ${lorry.lorryNumber}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: customIconHtml,
        className: 'custom-lorry-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -25],
      });

      const marker = L.marker([latitude, longitude], { icon });

      // Precise details with strict missing destination fallbacks
      const destText = lorry.destinationAddress || lorry.destinationLocation || 'Destination Not Provided';
      const schedText = lorry.expectedDeliveryDate
        ? `${lorry.expectedDeliveryDate}${lorry.expectedDeliveryTime ? ` at ${lorry.expectedDeliveryTime}` : ''}`
        : 'Delivery Schedule Not Provided';

      const isSimulatedLorry = lorry.locationSource === 'SIMULATED' || lorry.lastTelemetry.isSimulated;

      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 260px; color: #0f172a;" class="p-1">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <strong style="font-size: 14px; font-weight: 700; color: #0f172a;">${lorry.lorryNumber}</strong>
            <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 600; background-color: ${
              isBreakdown ? '#fee2e2; color: #991b1b;' :
              lorry.movementStatus === 'Moving' ? '#d1fae5; color: #065f46;' :
              lorry.movementStatus === 'Stopped' ? '#fef3c7; color: #92400e;' : '#e0f2fe; color: #0369a1;'
            }">${lorry.workflowStatus || lorry.status}</span>
          </div>
          ${isSimulatedLorry ? `<div style="font-size: 10px; font-weight: bold; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; margin-bottom: 6px;">⚠️ SIMULATED GPS DATA – NOT A REAL VEHICLE LOCATION</div>` : ''}
          <div style="font-size: 11px; line-height: 1.55; color: #334155;">
            <div><strong>Lorry ID:</strong> ${lorry.lorryNumber}</div>
            <div><strong>Shipment ID:</strong> ${lorry.currentShipmentCode || lorry.currentShipmentId || 'None (Unassigned)'}</div>
            <div><strong>Driver Name:</strong> ${lorry.driverName || 'Not Assigned'}</div>
            <div><strong>Current Speed:</strong> ${speed} km/h</div>
            <div><strong>Current Coordinates:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}</div>
            <div><strong>Destination Address:</strong> ${destText}</div>
            <div><strong>Expected Delivery:</strong> ${schedText}</div>
            <div><strong>Last GPS Fix:</strong> ${new Date(lorry.lastTelemetry?.timestamp || Date.now()).toLocaleTimeString()}</div>
            ${lorry.activeBreakdown ? `<div style="margin-top: 6px; padding: 4px 6px; background: #fee2e2; border-radius: 4px; color: #b91c1c; font-weight: 600; font-size: 11px;">⚠️ Alert: ${lorry.activeBreakdown.breakdownType} (${lorry.activeBreakdown.workflowStatus})</div>` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => setSelectedLorry(lorry));
      markersGroup.addLayer(marker);

      // Destination Marker & Corridor Polyline (rendered only if valid destination coordinates exist)
      if (
        typeof lorry.destinationLatitude === 'number' &&
        typeof lorry.destinationLongitude === 'number' &&
        !isNaN(lorry.destinationLatitude) &&
        !isNaN(lorry.destinationLongitude)
      ) {
        const destIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
              </div>
              <div class="absolute -bottom-5 px-1.5 py-0.2 rounded bg-slate-950/90 text-emerald-300 text-[9px] font-mono border border-emerald-700 whitespace-nowrap shadow-md pointer-events-none">
                DEST: ${lorry.lorryNumber}
              </div>
            </div>
          `,
          className: 'custom-dest-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        });

        const destMarker = L.marker([lorry.destinationLatitude, lorry.destinationLongitude], { icon: destIcon });
        const destPopupHtml = `
          <div style="font-family: sans-serif; min-width: 250px; color: #0f172a;" class="p-1">
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
              <strong style="font-size: 13px; color: #065f46;">🏁 Destination Pin</strong>
            </div>
            <div style="font-size: 11px; line-height: 1.5; color: #334155;">
              <div><strong>Destination Address:</strong> ${destText}</div>
              <div><strong>Destination Coordinates:</strong> ${lorry.destinationLatitude.toFixed(5)}, ${lorry.destinationLongitude.toFixed(5)}</div>
              <div><strong>Expected Delivery Schedule:</strong> ${schedText}</div>
              <div><strong>Associated Lorry:</strong> ${lorry.lorryNumber} (${lorry.driverName || 'Driver N/A'})</div>
              <div><strong>Shipment ID:</strong> ${lorry.currentShipmentCode || lorry.currentShipmentId || 'None'}</div>
            </div>
          </div>
        `;
        destMarker.bindPopup(destPopupHtml);
        markersGroup.addLayer(destMarker);

        // Corridor route line between current lorry location and destination
        const corridorLine = L.polyline(
          [
            [latitude, longitude],
            [lorry.destinationLatitude, lorry.destinationLongitude],
          ],
          {
            color: isBreakdown ? '#f43f5e' : isSelected ? '#10b981' : '#059669',
            weight: isSelected ? 3.5 : 2,
            opacity: isSelected ? 0.9 : 0.6,
            dashArray: '6, 8',
          }
        );
        corridorLine.bindPopup(`Direct Corridor Route to Destination (${destText})`);
        polylineGroup.addLayer(corridorLine);
      }

      // Breakdown Warning Marker (rendered at breakdown location)
      if (isBreakdown) {
        const brkIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center animate-bounce">
              <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </div>
          `,
          className: 'custom-breakdown-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });

        const brkMarker = L.marker([latitude, longitude], { icon: brkIcon, zIndexOffset: 1000 });
        brkMarker.bindPopup(`
          <div style="font-family: sans-serif; color: #991b1b; padding: 4px;">
            <strong>⚠️ Breakdown Location: ${lorry.lorryNumber}</strong>
            <div style="font-size: 11px; margin-top: 4px; color: #334155;">
              Type: <strong>${lorry.activeBreakdown?.breakdownType || 'Malfunction'}</strong><br/>
              Status: <strong>${lorry.workflowStatus || 'Breakdown Active'}</strong><br/>
              Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
            </div>
          </div>
        `);
        markersGroup.addLayer(brkMarker);
      }

      // Historical GPS route polyline (connecting previous waypoints)
      if (lorry.recentWaypoints && lorry.recentWaypoints.length > 1) {
        const latlngs: L.LatLngExpression[] = lorry.recentWaypoints.map((w) => [w.latitude, w.longitude]);
        const histPolyline = L.polyline(latlngs, {
          color: '#38bdf8',
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 0.85 : 0.45,
          dashArray: '4, 6',
        });
        polylineGroup.addLayer(histPolyline);
      }
    });
  }, [
    lorries,
    selectedLorry,
    searchQuery,
    statusFilter,
    driverFilter,
    breakdownStatusFilter,
    destinationCityFilter,
    deliveryStatusFilter,
  ]);

  // Auto-simulation ticker
  useEffect(() => {
    if (isAutoSimulating) {
      const interval = setInterval(() => {
        simulateRandomLorryStep();
      }, 4000);
      setSimInterval(interval);
      return () => clearInterval(interval);
    } else if (simInterval) {
      clearInterval(simInterval);
      setSimInterval(null);
    }
  }, [isAutoSimulating, lorries]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lorriesData, statsData] = await Promise.all([
        api.getLorries(),
        api.getLorryGpsStats(),
      ]);
      setLorries(lorriesData);
      setStats(statsData);

      if (lorriesData.length > 0 && !selectedLorry) {
        setSelectedLorry(lorriesData[0]);
      }
    } catch (err) {
      console.error('Failed to load GPS lorries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchData();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
    }
  };

  // Seed Section 9 Example Test Shipment (SHIP-001 • TRUCK-101 Chennai to Bengaluru)
  const handleSeedExample = async () => {
    try {
      const res = await api.seedExampleShipment();
      setSimMessage('[Section 9 Example Loaded] SHIP-001 (TRUCK-101 Chennai -> Bengaluru) ready for live GPS tracking.');
      setTimeout(() => setSimMessage(null), 8000);
      await fetchData();

      const freshLorries = await api.getLorries();
      const lorry101 = freshLorries.find((l) => l.lorryNumber === 'TRUCK-101');
      if (lorry101) {
        setSelectedLorry(lorry101);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(
            [lorry101.lastTelemetry.latitude, lorry101.lastTelemetry.longitude],
            9,
            { duration: 1.5 }
          );
        }
      }
    } catch (err: any) {
      alert(`Failed to seed example test: ${err.message}`);
    }
  };

  const filterLorries = (list: Lorry[]) => {
    if (!Array.isArray(list)) return [];
    return list.filter((l) => {
      if (!l) return false;

      const lStatus = (l.status || '').toLowerCase();
      const lMovement = (l.movementStatus || '').toLowerCase();
      const filterStatusLower = (statusFilter || 'ALL').toLowerCase();

      // Movement Status Filter
      const matchStatus =
        statusFilter === 'ALL' ||
        lStatus === filterStatusLower ||
        lMovement === filterStatusLower;

      // Breakdown Status Filter
      const lWorkflow = (l.workflowStatus || '').toLowerCase();
      const filterBreakdownLower = (breakdownStatusFilter || 'ALL').toLowerCase();
      const matchBreakdown =
        breakdownStatusFilter === 'ALL' ||
        (lWorkflow && lWorkflow === filterBreakdownLower) ||
        (!l.workflowStatus && breakdownStatusFilter === 'Normal');

      // Driver Filter
      const filterDriverLower = (driverFilter || 'ALL').toLowerCase();
      const lDriver = (l.driverName || '').toLowerCase();
      const matchDriver =
        driverFilter === 'ALL' ||
        lDriver.includes(filterDriverLower);

      // Destination City Filter
      const destText = (l.destinationAddress || l.destinationLocation || '').toLowerCase();
      const filterCityLower = (destinationCityFilter || 'ALL').toLowerCase();
      const matchCity =
        destinationCityFilter === 'ALL' ||
        destText.includes(filterCityLower);

      // Delivery Status Filter
      const journey = evaluateJourney(l);
      const journeyDelay = (journey?.delayStatus || '').toLowerCase();
      const filterDeliveryLower = (deliveryStatusFilter || 'ALL').toLowerCase();
      const matchDelivery =
        deliveryStatusFilter === 'ALL' ||
        journeyDelay === filterDeliveryLower;

      // Search Query (Shipment ID, Lorry ID, Driver Name, Corridor Address)
      const q = (searchQuery || '').toLowerCase().trim();
      const lNumber = (l.lorryNumber || '').toLowerCase();
      const lShipCode = (l.currentShipmentCode || '').toLowerCase();
      const lShipId = (l.currentShipmentId || '').toLowerCase();
      const lDest = (l.destinationAddress || '').toLowerCase();
      const lLoc = (l.destinationLocation || '').toLowerCase();

      const matchQuery =
        !q ||
        lNumber.includes(q) ||
        lShipCode.includes(q) ||
        lShipId.includes(q) ||
        lDriver.includes(q) ||
        lDest.includes(q) ||
        lLoc.includes(q);

      return matchStatus && matchBreakdown && matchDriver && matchCity && matchDelivery && matchQuery;
    });
  };

  const fitAllLorriesOnMap = () => {
    if (!mapInstanceRef.current || lorries.length === 0) return;
    const validCoords = lorries
      .filter((l) => typeof l.lastTelemetry?.latitude === 'number')
      .map((l) => [l.lastTelemetry.latitude, l.lastTelemetry.longitude] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  };

  const focusLorryOnMap = (lorry: Lorry) => {
    setSelectedLorry(lorry);
    if (mapInstanceRef.current && lorry.lastTelemetry) {
      mapInstanceRef.current.flyTo([lorry.lastTelemetry.latitude, lorry.lastTelemetry.longitude], 10, {
        duration: 1.2,
      });
    }
  };

  // Check Stoppages (duration >= 10m threshold)
  const handleCheckStoppages = async () => {
    try {
      const res = await api.checkStoppages(10);
      setSimMessage(`[Stoppage Detection Checked] ${res.detectedCount} potential stoppage(s) flagged for dispatch verification.`);
      setTimeout(() => setSimMessage(null), 6000);
      await fetchData();
    } catch (err: any) {
      alert(`Stoppage check error: ${err.message}`);
    }
  };

  // Open Driver Breakdown Reporting Modal
  const openDriverBreakdownModal = (lorry?: Lorry) => {
    const target = lorry || selectedLorry || lorries[0];
    if (target) {
      setDriverBreakdownForm({
        lorryId: target.lorryNumber,
        shipmentId: target.currentShipmentCode || target.currentShipmentId || '',
        breakdownType: 'Engine Failure',
        description: 'Driver reported critical malfunction on route corridor. Vehicle cannot proceed safely.',
        latitude: target.lastTelemetry.latitude,
        longitude: target.lastTelemetry.longitude,
        breakdownTime: new Date().toISOString().slice(0, 16),
      });
    }
    setIsDriverBreakdownModalOpen(true);
  };

  // Submit Driver Breakdown
  const handleSubmitDriverBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverBreakdownForm.lorryId) {
      return alert('Lorry ID is required');
    }

    try {
      await api.reportDriverBreakdown({
        lorryId: driverBreakdownForm.lorryId,
        shipmentId: driverBreakdownForm.shipmentId || undefined,
        breakdownType: driverBreakdownForm.breakdownType,
        description: driverBreakdownForm.description,
        latitude: Number(driverBreakdownForm.latitude),
        longitude: Number(driverBreakdownForm.longitude),
        breakdownTime: driverBreakdownForm.breakdownTime,
      });

      setIsDriverBreakdownModalOpen(false);
      setSimMessage(`[Breakdown Reported] Incident registered for ${driverBreakdownForm.lorryId} (${driverBreakdownForm.breakdownType}).`);
      setTimeout(() => setSimMessage(null), 6000);
      await fetchData();
      if (selectedLorry) {
        const updated = await api.getLorryById(selectedLorry.id);
        if (updated) setSelectedLorry(updated);
      }
    } catch (err: any) {
      alert(`Failed to report breakdown: ${err.message}`);
    }
  };

  // Confirm Breakdown & ChainPulse AI Ripple Impact Integration
  const handleConfirmBreakdown = async (lorryId: string) => {
    try {
      const res = await api.confirmBreakdown(lorryId);
      setSimMessage(`[Breakdown Confirmed] Ripple disruption logged (${res.disruption?.disruptionCode}). Supply chain order risks recalculated!`);
      setTimeout(() => setSimMessage(null), 8000);
      await fetchData();
      const updated = await api.getLorryById(lorryId);
      if (updated) setSelectedLorry(updated);
    } catch (err: any) {
      alert(`Failed to confirm breakdown: ${err.message}`);
    }
  };

  // Workflow status transition
  const handleTransitionWorkflow = async (lorryId: string, targetStatus: BreakdownWorkflowStatus, payload?: any) => {
    try {
      await api.transitionBreakdownWorkflow(lorryId, targetStatus, payload);
      setSimMessage(`[Workflow Transition] Status changed to "${targetStatus}".`);
      setTimeout(() => setSimMessage(null), 5000);
      await fetchData();
      const updated = await api.getLorryById(lorryId);
      if (updated) setSelectedLorry(updated);
    } catch (err: any) {
      alert(`Workflow transition failed: ${err.message}`);
    }
  };

  // Register New Lorry
  const handleCreateLorry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLorryForm.lorryNumber.trim()) return;

    try {
      const created = await api.createLorry({
        lorryNumber: newLorryForm.lorryNumber,
        model: newLorryForm.model,
        capacityTons: Number(newLorryForm.capacityTons),
        carrierName: newLorryForm.carrierName,
        driverName: newLorryForm.driverName || 'Designated Driver',
        driverPhone: newLorryForm.driverPhone || '+1 (555) 012-3456',
        originLocation: newLorryForm.originLocation || 'Hub Origin',
        destinationLocation: newLorryForm.destinationLocation || undefined,
        currentShipmentCode: newLorryForm.currentShipmentCode || undefined,
        status: 'Moving',
        movementStatus: 'Moving',
        workflowStatus: 'Normal',
        locationSource: newLorryForm.locationSource,
        lastTelemetry: {
          latitude: Number(newLorryForm.latitude),
          longitude: Number(newLorryForm.longitude),
          speed: Number(newLorryForm.speed),
          speed_kmh: Number(newLorryForm.speed),
          heading: 90,
          engineStatus: 'Running',
          engineTemp: 88,
          fuelLevel: 85,
          batteryVoltage: 24.2,
          locationName: newLorryForm.originLocation || 'Logistics Corridor',
          timestamp: new Date().toISOString(),
          locationSource: newLorryForm.locationSource,
          movement_status: 'Moving',
          isSimulated: newLorryForm.locationSource === 'SIMULATED',
        },
      });

      setIsRegisterModalOpen(false);
      await fetchData();
      focusLorryOnMap(created);
    } catch (err: any) {
      alert(`Failed to register lorry: ${err.message}`);
    }
  };

  const handleDeleteLorry = async (id: string) => {
    if (!window.confirm('Delete this lorry from the fleet tracking system?')) return;
    try {
      await api.deleteLorry(id);
      if (selectedLorry?.id === id) {
        setSelectedLorry(null);
      }
      await fetchData();
    } catch (err: any) {
      alert(`Failed to delete lorry: ${err.message}`);
    }
  };

  // Dispatch Assistance
  const handleDispatchAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLorry?.activeBreakdown) return;

    try {
      await api.dispatchAssistance({
        breakdownId: selectedLorry.activeBreakdown.id,
        serviceProvider: dispatchForm.serviceProvider,
        etaMinutes: Number(dispatchForm.etaMinutes),
        mechanicName: dispatchForm.mechanicName,
        contactPhone: dispatchForm.contactPhone,
      });

      setIsDispatchModalOpen(false);
      await fetchData();
      const updated = await api.getLorryById(selectedLorry.id);
      if (updated) setSelectedLorry(updated);
    } catch (err: any) {
      alert(`Failed to dispatch assistance: ${err.message}`);
    }
  };

  // Resolve Breakdown
  const handleResolveBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLorry?.activeBreakdown) return;

    try {
      await api.resolveBreakdown(selectedLorry.activeBreakdown.id, resolveNotes);
      setIsResolveModalOpen(false);
      await fetchData();
      const updated = await api.getLorryById(selectedLorry.id);
      if (updated) setSelectedLorry(updated);
    } catch (err: any) {
      alert(`Failed to resolve breakdown: ${err.message}`);
    }
  };

  // Single Ping Simulation
  const handleSimulateSinglePing = async (lorryId: string) => {
    try {
      const res = await api.simulateLorryPing(lorryId);
      setSimMessage(`[Telemetry Ping Simulated] Lorry ${res.lorry.lorryNumber} pinged at ${res.lorry.lastTelemetry.speed} km/h (${res.lorry.lastTelemetry.locationName}).`);
      setTimeout(() => setSimMessage(null), 5000);

      setLorries((prev) => prev.map((l) => (l.id === lorryId ? res.lorry : l)));
      if (selectedLorry?.id === lorryId) {
        setSelectedLorry(res.lorry);
      }
      const newStats = await api.getLorryGpsStats();
      setStats(newStats);
    } catch (err: any) {
      console.error('Simulation ping failed:', err);
    }
  };

  const simulateRandomLorryStep = async () => {
    if (lorries.length === 0) return;
    const target = lorries[Math.floor(Math.random() * lorries.length)];
    if (target) {
      await handleSimulateSinglePing(target.id);
    }
  };

  // Apply manual simulation parameters to selected lorry
  const handleApplySimParameters = async () => {
    if (!selectedLorry) return;
    try {
      const res = await api.sendLorryTelemetry({
        lorryId: selectedLorry.id,
        latitude: Number(simStartingLat),
        longitude: Number(simStartingLng),
        speed: Number(simManualSpeed),
        speed_kmh: Number(simManualSpeed),
        locationSource: 'SIMULATED',
        isSimulated: true,
      });
      setSimMessage(`[Simulated Telemetry Applied] Lorry ${selectedLorry.lorryNumber} moved to [${simStartingLat}, ${simStartingLng}] @ ${simManualSpeed} km/h.`);
      setTimeout(() => setSimMessage(null), 5000);
      await fetchData();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([simStartingLat, simStartingLng], 9);
      }
    } catch (err: any) {
      alert(`Error applying simulation: ${err.message}`);
    }
  };

  // Trigger stoppage simulation
  const handleSimulateStoppage = async () => {
    if (!selectedLorry) return;
    try {
      await api.sendLorryTelemetry({
        lorryId: selectedLorry.id,
        speed: 0,
        speed_kmh: 0,
        locationSource: 'SIMULATED',
        isSimulated: true,
      });
      await api.transitionBreakdownWorkflow(selectedLorry.id, 'Possible Stoppage');
      setSimMessage(`[Simulated Stoppage] Lorry ${selectedLorry.lorryNumber} stationary (0 km/h) — Possible Stoppage flagged.`);
      setTimeout(() => setSimMessage(null), 5000);
      await fetchData();
      const updated = await api.getLorryById(selectedLorry.id);
      if (updated) setSelectedLorry(updated);
    } catch (err: any) {
      alert(`Error simulating stoppage: ${err.message}`);
    }
  };

  const handleResetFleet = async () => {
    if (!window.confirm('Reset lorry fleet to default benchmark locations and live tracking state?')) return;
    try {
      const res = await api.resetLorryFleet();
      setLorries(res.lorries);
      if (res.lorries.length > 0) setSelectedLorry(res.lorries[0]);
      const newStats = await api.getLorryGpsStats();
      setStats(newStats);
      fitAllLorriesOnMap();
    } catch (err: any) {
      alert(`Failed to reset fleet: ${err.message}`);
    }
  };

  const filteredLorries = filterLorries(lorries);

  // Workflow state order
  const workflowSteps: BreakdownWorkflowStatus[] = [
    'Normal',
    'Possible Stoppage',
    'Breakdown Reported',
    'Breakdown Confirmed',
    'Assistance Requested',
    'Repairing',
    'Recovered',
    'Journey Resumed',
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <span>Core & Monitoring</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-cyan-400 font-medium">GPS Lorry Tracking & Breakdown Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Navigation className="w-7 h-7 text-cyan-400" />
            GPS Lorry Tracking & Breakdown Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time GPS telematics, destination-independent tracking, automated stoppage detection, and autonomous disruption recovery.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Section 9 Example Quick Seed */}
          <button
            onClick={handleSeedExample}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-900/70 to-blue-900/70 hover:from-cyan-800 hover:to-blue-800 text-cyan-200 border border-cyan-500/40 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Loads Section 9 Test: SHIP-001, TRUCK-101 (Chennai to Bengaluru, Expected: 2026-10-30 18:00)"
          >
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Example Test (SHIP-001 • TRUCK-101)</span>
          </button>

          {/* Stoppage Detection Engine Trigger */}
          <button
            onClick={handleCheckStoppages}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Scan fleet for vehicles stationary at 0 km/h for >= 10 mins"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Check Stoppages (10m+)</span>
          </button>

          {/* Driver Breakdown Reporting Button */}
          <button
            onClick={() => openDriverBreakdownModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-rose-900/30"
            title="Report breakdown incident directly from vehicle"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report Breakdown (Driver)</span>
          </button>

          <button
            onClick={() => setIsApiInfoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium transition-all"
            title="Physical GPS device & REST API specification"
          >
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>GPS API</span>
          </button>

          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh GPS</span>
          </button>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Lorry</span>
          </button>
        </div>
      </div>

      {/* Prominent Simulated Data Warning Banner */}
      <div className="bg-amber-950/40 border border-amber-600/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>GPS Integrity Status:</strong> Supported location sources include <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">GPS_DEVICE</code>, <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300 font-mono">GPS_API</code>, and <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono">SIMULATED</code>. Simulated information is clearly identified with prominent warning labels.
          </span>
        </div>
        <button
          onClick={() => setIsSimulationPanelOpen(!isSimulationPanelOpen)}
          className="text-[11px] font-semibold text-amber-300 hover:text-white underline ml-3 whitespace-nowrap"
        >
          {isSimulationPanelOpen ? 'Hide Sim Controls' : 'Show Sim Controls'}
        </button>
      </div>

      {/* Simulation Info Notification */}
      {simMessage && (
        <div className="bg-cyan-950/80 border border-cyan-700/60 rounded-xl px-4 py-2.5 text-xs text-cyan-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{simMessage}</span>
          </div>
          <span className="text-[10px] text-cyan-400/80 font-mono">SIMULATION DISPATCH EVENT</span>
        </div>
      )}

      {/* Dedicated GPS Simulation Control Mode Panel */}
      {isSimulationPanelOpen && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
                SIMULATED GPS DATA – NOT A REAL VEHICLE LOCATION
              </span>
              <span className="text-xs text-slate-400">
                Interactive demonstration controls for testing vehicle coordinates, stoppage detection, and breakdown transitions.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isAutoSimulating
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isAutoSimulating ? (
                  <>
                    <Square className="w-3 h-3 fill-current" /> Auto-Ping Active
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" /> Auto-Ping Ticker
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Selected Lorry</label>
              <select
                value={selectedLorry?.id || ''}
                onChange={(e) => {
                  const l = lorries.find((x) => x.id === e.target.value);
                  if (l) {
                    setSelectedLorry(l);
                    setSimStartingLat(l.lastTelemetry.latitude);
                    setSimStartingLng(l.lastTelemetry.longitude);
                    setSimManualSpeed(l.lastTelemetry.speed);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
              >
                {lorries.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lorryNumber} ({l.movementStatus} • {l.lastTelemetry.speed} km/h)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Starting Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={simStartingLat}
                onChange={(e) => setSimStartingLat(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Starting Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={simStartingLng}
                onChange={(e) => setSimStartingLng(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Speed: {simManualSpeed} km/h</label>
              <input
                type="range"
                min="0"
                max="120"
                value={simManualSpeed}
                onChange={(e) => setSimManualSpeed(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-end gap-1.5">
              <button
                onClick={handleApplySimParameters}
                disabled={!selectedLorry}
                className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-colors text-xs"
              >
                Apply Coords & Speed
              </button>
            </div>
          </div>

          {/* Quick Simulation Workflow Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mr-1">Direct Simulation Triggers:</span>

            <button
              onClick={handleSimulateStoppage}
              disabled={!selectedLorry}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <StopCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Stationary Stoppage (0 km/h)</span>
            </button>

            <button
              onClick={() => {
                if (selectedLorry) {
                  openDriverBreakdownModal(selectedLorry);
                }
              }}
              disabled={!selectedLorry}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Trigger Simulated Breakdown</span>
            </button>

            <button
              onClick={() => {
                if (selectedLorry) {
                  handleTransitionWorkflow(selectedLorry.id, 'Recovered');
                }
              }}
              disabled={!selectedLorry}
              className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Confirm Recovery</span>
            </button>

            <button
              onClick={() => {
                if (selectedLorry) {
                  handleTransitionWorkflow(selectedLorry.id, 'Journey Resumed');
                }
              }}
              disabled={!selectedLorry}
              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Resume Movement</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Summary Cards (Total Active, Moving, Stopped, Breakdown Alerts, On-Time, At-Risk, Delayed, Recovered) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Active Lorries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Active Lorries</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white">{stats.totalLorries}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total registered fleet</div>
        </div>

        {/* 2. Moving Lorries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Moving Lorries</span>
            <Navigation className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.movingLorries}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> In highway transit
          </div>
        </div>

        {/* 3. Stopped Lorries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Stopped Lorries</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">{stats.stoppedLorries}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Speed = 0 km/h</div>
        </div>

        {/* 4. Breakdown Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Breakdown Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400">
            {(stats.confirmedBreakdowns ?? 0) + (stats.possibleStoppages ?? 0)}
          </div>
          <div className="text-[10px] text-rose-500/80 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span> Incident active
          </div>
        </div>

        {/* 5. On-Time Shipments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">On-Time</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{stats.onTimeShipments ?? 0}</div>
          <div className="text-[10px] text-emerald-500/80 mt-0.5">Ahead / Within ETA</div>
        </div>

        {/* 6. At-Risk Shipments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">At-Risk</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400">{stats.atRiskShipments ?? 0}</div>
          <div className="text-[10px] text-amber-500/80 mt-0.5">Tight ETA / Stoppage</div>
        </div>

        {/* 7. Delayed Shipments */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-orange-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Delayed</span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-bold text-orange-400">{stats.delayedShipments}</div>
          <div className="text-[10px] text-orange-500/80 mt-0.5">Schedule elapsed</div>
        </div>

        {/* 8. Recovered Lorries */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm hover:border-cyan-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Recovered</span>
            <RotateCcw className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">{stats.recoveredLorries}</div>
          <div className="text-[10px] text-cyan-500/80 mt-0.5">Repairs completed</div>
        </div>
      </div>

      {/* Main Map + Side Details Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Leaflet Map + Controls */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Map Filters & Search Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-3 shadow-md">
            {/* Row 1: Search + Dropdowns (Driver, City, Delivery Status) */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search inputs */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Shipment ID, Lorry ID, Driver, Address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filter by Driver */}
              <div className="min-w-[130px]">
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Drivers</option>
                  {Array.from(new Set(lorries.map((l) => l.driverName).filter(Boolean))).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Destination City */}
              <div className="min-w-[140px]">
                <select
                  value={destinationCityFilter}
                  onChange={(e) => setDestinationCityFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Destinations</option>
                  {Array.from(
                    new Set(
                      lorries
                        .map((l) => {
                          const dest = l.destinationAddress || l.destinationLocation || '';
                          if (!dest) return '';
                          const parts = dest.split(',').map((s) => s.trim());
                          return parts[0] || dest;
                        })
                        .filter(Boolean)
                    )
                  ).map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Delivery Status */}
              <div className="min-w-[130px]">
                <select
                  value={deliveryStatusFilter}
                  onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">All Deliv Status</option>
                  <option value="On Time">On Time</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Unscheduled">Unscheduled</option>
                  <option value="Destination Not Provided">No Destination</option>
                </select>
              </div>

              {/* Reset / Show All Button */}
              <button
                onClick={() => {
                  setStatusFilter('ALL');
                  setBreakdownStatusFilter('ALL');
                  setDriverFilter('ALL');
                  setDestinationCityFilter('ALL');
                  setDeliveryStatusFilter('ALL');
                  setSearchQuery('');
                  fitAllLorriesOnMap();
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                title="Reset all filters and fit map to fleet"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Show All</span>
              </button>
            </div>

            {/* Row 2: Movement Status & Breakdown Status Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Movement:</span>
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'Moving', label: 'Moving (Green)', dot: 'bg-emerald-500' },
                  { id: 'Stopped', label: 'Stopped (Yellow)', dot: 'bg-amber-500' },
                  { id: 'Breakdown', label: 'Breakdown (Red)', dot: 'bg-rose-500' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all flex items-center gap-1 whitespace-nowrap ${
                      statusFilter === f.id
                        ? 'bg-cyan-500 text-white shadow-sm'
                        : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {f.dot && <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`}></span>}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mr-1">Breakdown:</span>
                {[
                  { id: 'ALL', label: 'All Incidents' },
                  { id: 'Normal', label: 'Normal' },
                  { id: 'Possible Stoppage', label: 'Stoppage Alert' },
                  { id: 'Breakdown Confirmed', label: 'Confirmed' },
                  { id: 'Recovered', label: 'Recovered' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBreakdownStatusFilter(b.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all whitespace-nowrap ${
                      breakdownStatusFilter === b.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[480px] h-[520px]">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-lg text-xs shadow-lg space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fleet Status Legend</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>Moving Lorry</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>Stopped / Stoppage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span>Breakdown Detected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block"></span>
                  <span>Recovered Vehicle</span>
                </div>
              </div>
            </div>

            {/* Map Overlay Summary */}
            <div className="absolute top-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-300 shadow-lg flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span>Showing <strong>{filteredLorries.length}</strong> of {lorries.length} lorries</span>
            </div>
          </div>

          {/* Lorry Quick Table / Stream */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>Active Fleet Telemetry Stream (Works Without Destination)</span>
              </h3>
              <button
                onClick={handleResetFleet}
                className="text-xs text-slate-400 hover:text-cyan-400 underline transition-colors"
              >
                Reset fleet benchmark
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Lorry / Registration</th>
                    <th className="py-2.5 px-3">Shipment ID</th>
                    <th className="py-2.5 px-3">Workflow State</th>
                    <th className="py-2.5 px-3">Driver</th>
                    <th className="py-2.5 px-3">Speed</th>
                    <th className="py-2.5 px-3">Destination</th>
                    <th className="py-2.5 px-3">Location Source</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLorries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-500">
                        No lorries matching filter criteria. Click "Register Lorry" or clear search.
                      </td>
                    </tr>
                  ) : (
                    filteredLorries.map((l) => {
                      const isSel = selectedLorry?.id === l.id;
                      const isBreakdown =
                        l.status === 'Breakdown' ||
                        l.workflowStatus === 'Breakdown Confirmed' ||
                        l.workflowStatus === 'Breakdown Reported' ||
                        l.workflowStatus === 'Assistance Requested' ||
                        l.workflowStatus === 'Repairing';

                      return (
                        <tr
                          key={l.id}
                          onClick={() => focusLorryOnMap(l)}
                          className={`cursor-pointer transition-colors ${
                            isSel ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-semibold text-white font-mono flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isBreakdown
                                  ? 'bg-rose-500 animate-ping'
                                  : l.workflowStatus === 'Possible Stoppage'
                                  ? 'bg-amber-400'
                                  : l.movementStatus === 'Moving'
                                  ? 'bg-emerald-500'
                                  : l.movementStatus === 'Stopped'
                                  ? 'bg-amber-500'
                                  : 'bg-blue-500'
                              }`}
                            ></span>
                            <span>{l.lorryNumber}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px] border border-slate-700">
                              {l.currentShipmentCode || l.currentShipmentId || 'None'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                isBreakdown
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : l.workflowStatus === 'Possible Stoppage'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : l.movementStatus === 'Moving'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {l.workflowStatus || l.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{l.driverName || 'N/A'}</td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                            {l.lastTelemetry.speed} km/h
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 max-w-[150px] truncate">
                            {l.destinationLocation || <span className="text-slate-600 italic">Optional (None)</span>}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                l.locationSource === 'SIMULATED' || l.lastTelemetry.isSimulated
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {l.locationSource || 'GPS_DEVICE'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleSimulateSinglePing(l.id)}
                                title="Send GPS telemetry ping"
                                className="p-1 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-300"
                              >
                                <Radio className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLorry(l.id)}
                                title="Delete lorry"
                                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Lorry Details & 8-Stage Breakdown Workflow */}
        <div className="lg:col-span-4 space-y-4">
          {selectedLorry ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white font-mono">{selectedLorry.lorryNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        selectedLorry.status === 'Breakdown' || selectedLorry.workflowStatus === 'Breakdown Confirmed'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : selectedLorry.workflowStatus === 'Possible Stoppage'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : selectedLorry.movementStatus === 'Moving'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}
                    >
                      {selectedLorry.movementStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedLorry.model} • {selectedLorry.capacityTons}t • Source: <span className="text-cyan-300 font-mono">{selectedLorry.locationSource || 'GPS_DEVICE'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSimulateSinglePing(selectedLorry.id)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs"
                    title="Simulate GPS Ping"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLorry(selectedLorry.id)}
                    className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded-lg text-xs"
                    title="Delete Lorry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 8-Stage Breakdown Workflow Tracker */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Breakdown Management Workflow</span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{selectedLorry.workflowStatus || 'Normal'}</span>
                </div>

                {/* Stepper Dots */}
                <div className="grid grid-cols-4 gap-1.5 text-[9px] text-center">
                  {workflowSteps.map((step, idx) => {
                    const currentIdx = workflowSteps.indexOf(selectedLorry.workflowStatus || 'Normal');
                    const isDone = idx < currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div
                        key={step}
                        className={`p-1 rounded border text-[9px] leading-tight font-medium ${
                          isCurrent
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                            : isDone
                            ? 'bg-slate-900 text-emerald-400 border-slate-800'
                            : 'bg-slate-950/60 text-slate-500 border-slate-800/40'
                        }`}
                      >
                        {idx + 1}. {step.split(' ')[0]}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Breakdown Alert / Incident Card */}
              {selectedLorry.activeBreakdown && (
                <div className="bg-rose-950/40 border border-rose-700/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      {selectedLorry.activeBreakdown.workflowStatus === 'Possible Stoppage'
                        ? 'POSSIBLE STOPPAGE DETECTED'
                        : 'BREAKDOWN ALERT ACTIVE'}
                    </span>
                    <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded">
                      {selectedLorry.activeBreakdown.severity}
                    </span>
                  </div>

                  <div className="text-xs text-rose-200">
                    <div className="font-semibold text-rose-100 flex items-center gap-1.5">
                      <span>Type:</span>
                      <span className="text-amber-300">{selectedLorry.activeBreakdown.breakdownType}</span>
                    </div>
                    <div className="text-[11px] text-rose-300/80 mt-1 leading-relaxed">
                      {selectedLorry.activeBreakdown.description}
                    </div>
                  </div>

                  {selectedLorry.activeBreakdown.dispatchedAssistance ? (
                    <div className="bg-slate-900/80 rounded-lg p-2.5 text-[11px] text-slate-300 border border-rose-800/40 space-y-1">
                      <div className="text-cyan-400 font-semibold flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5" /> Assistance Dispatched:
                      </div>
                      <div>Provider: {selectedLorry.activeBreakdown.dispatchedAssistance.serviceProvider}</div>
                      <div>Mechanic: {selectedLorry.activeBreakdown.dispatchedAssistance.mechanicName} ({selectedLorry.activeBreakdown.dispatchedAssistance.contactPhone})</div>
                      <div className="font-bold text-amber-400">ETA: ~{selectedLorry.activeBreakdown.dispatchedAssistance.etaMinutes} mins</div>
                    </div>
                  ) : null}

                  {/* Workflow Action Buttons for Active Alert */}
                  <div className="space-y-2 pt-1">
                    {/* If Possible Stoppage: Allow confirming breakdown or clearing */}
                    {selectedLorry.workflowStatus === 'Possible Stoppage' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleConfirmBreakdown(selectedLorry.id)}
                          className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                        >
                          Confirm Breakdown (Trigger Ripple)
                        </button>
                        <button
                          onClick={() => handleTransitionWorkflow(selectedLorry.id, 'Normal')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                        >
                          False Alarm
                        </button>
                      </div>
                    )}

                    {/* If Breakdown Reported: Confirm Breakdown & Disruption Ripple */}
                    {selectedLorry.workflowStatus === 'Breakdown Reported' && (
                      <button
                        onClick={() => handleConfirmBreakdown(selectedLorry.id)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow transition-colors"
                      >
                        Confirm Breakdown & Trigger ChainPulse AI Disruption
                      </button>
                    )}

                    {/* If Breakdown Confirmed: Dispatch Assistance */}
                    {selectedLorry.workflowStatus === 'Breakdown Confirmed' && (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => setIsDispatchModalOpen(true)}
                          className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow"
                        >
                          Dispatch Roadside Assistance
                        </button>
                        <button
                          onClick={() => onNavigate('disruptions')}
                          className="w-full py-1 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded-lg text-[11px] flex items-center justify-center gap-1"
                        >
                          View Disruption in Control Tower <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* If Assistance Requested: Mark Repairing */}
                    {selectedLorry.workflowStatus === 'Assistance Requested' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTransitionWorkflow(selectedLorry.id, 'Repairing')}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                        >
                          Tech On-Site: Mark Repairing
                        </button>
                      </div>
                    )}

                    {/* If Repairing: Complete Repair */}
                    {selectedLorry.workflowStatus === 'Repairing' && (
                      <button
                        onClick={() => setIsResolveModalOpen(true)}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                      >
                        Complete Field Repair & Mark Recovered
                      </button>
                    )}

                    {/* If Recovered: Resume Journey */}
                    {selectedLorry.workflowStatus === 'Recovered' && (
                      <button
                        onClick={() => handleTransitionWorkflow(selectedLorry.id, 'Journey Resumed')}
                        className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
                      >
                        Resume Journey & Set Moving
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* If Normal (No active breakdown): Quick Action to Report Breakdown */}
              {(!selectedLorry.activeBreakdown || selectedLorry.workflowStatus === 'Normal') && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openDriverBreakdownModal(selectedLorry)}
                    className="flex-1 py-2 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-700/50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Report Vehicle Breakdown</span>
                  </button>
                </div>
              )}

              {/* Telemetry Gauge Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Current Speed</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {selectedLorry.lastTelemetry.speed} <span className="text-xs font-normal text-slate-400">km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Heading: {selectedLorry.lastTelemetry.heading}°</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                    <span>Engine Temp</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {selectedLorry.lastTelemetry.engineTemp ?? 85}°C
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Status: {selectedLorry.lastTelemetry.engineStatus}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fuel Level</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {selectedLorry.lastTelemetry.fuelLevel ?? 75}%
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Range ~420 km</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Battery Voltage</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    {(selectedLorry.lastTelemetry.batteryVoltage ?? 24.2).toFixed(1)} <span className="text-xs font-normal text-slate-400">V</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Alternator Normal</div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* SECTION A: LORRY INFORMATION */}
              {/* ================================================================= */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Section A: Lorry Information</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold">ASSET PROFILE</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Lorry ID:</span>
                    <p className="font-mono text-cyan-300 font-bold">{selectedLorry.lorryNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Registration No:</span>
                    <p className="font-mono text-white font-semibold">{selectedLorry.lorryNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Driver Name:</span>
                    <p className="font-semibold text-slate-200">{selectedLorry.driverName || 'Not Assigned'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Driver Contact:</span>
                    <p className="font-mono text-slate-300">
                      {selectedLorry.driverContactNumber || selectedLorry.driverPhone ? (
                        <a
                          href={`tel:${selectedLorry.driverContactNumber || selectedLorry.driverPhone}`}
                          className="text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{selectedLorry.driverContactNumber || selectedLorry.driverPhone}</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">Not Available</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/50 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-medium">Active Shipment ID:</span>
                      <p className="font-mono text-cyan-300 font-bold">
                        {selectedLorry.currentShipmentCode || selectedLorry.currentShipmentId || 'None (Unassigned)'}
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigate('shipments')}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 font-medium hover:underline"
                    >
                      <span>Shipments</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* SECTION B: CURRENT GPS INFORMATION */}
              {/* ================================================================= */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Section B: Current GPS Information</span>
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono">LIVE TELEMETRY</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Current Latitude:</span>
                    <p className="font-mono text-cyan-200 font-semibold">
                      {selectedLorry.lastTelemetry.latitude.toFixed(5)}°
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Current Longitude:</span>
                    <p className="font-mono text-cyan-200 font-semibold">
                      {selectedLorry.lastTelemetry.longitude.toFixed(5)}°
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Current Location Address:</span>
                    <p className="font-medium text-slate-200 flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>
                        {selectedLorry.currentLocationAddress ||
                          selectedLorry.lastTelemetry.locationName ||
                          `Lat: ${selectedLorry.lastTelemetry.latitude.toFixed(4)}, Lng: ${selectedLorry.lastTelemetry.longitude.toFixed(4)}`}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Current Speed:</span>
                    <p className="font-mono text-white font-bold text-sm">
                      {selectedLorry.lastTelemetry.speed} <span className="text-xs font-normal text-slate-400">km/h</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Movement Status:</span>
                    <p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedLorry.movementStatus === 'Moving'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : selectedLorry.movementStatus === 'Stopped'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {selectedLorry.movementStatus}
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-800/50">
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Last GPS Update Time:</span>
                    <p className="font-mono text-slate-300 text-[11px] mt-0.5">
                      {new Date(selectedLorry.lastTelemetry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* SECTION C: DESTINATION INFORMATION */}
              {/* ================================================================= */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-emerald-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Section C: Destination Information</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">CONSIGNMENT ENDPOINT</span>
                </div>

                <div className="space-y-2 text-slate-300">
                  {/* Destination Address */}
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-medium">Destination Address:</span>
                    {selectedLorry.destinationAddress || selectedLorry.destinationLocation ? (
                      <p className="font-semibold text-emerald-300 mt-0.5">
                        {selectedLorry.destinationAddress || selectedLorry.destinationLocation}
                      </p>
                    ) : (
                      <div className="mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400 italic text-[11px]">
                        Destination Not Provided
                      </div>
                    )}
                  </div>

                  {/* Destination Latitude & Longitude (Separated from Current GPS) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/50">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-medium">Destination Latitude:</span>
                      <p className="font-mono text-emerald-200 mt-0.5">
                        {typeof selectedLorry.destinationLatitude === 'number' && !isNaN(selectedLorry.destinationLatitude)
                          ? `${selectedLorry.destinationLatitude.toFixed(5)}°`
                          : <span className="text-slate-500 italic">Not Provided</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-medium">Destination Longitude:</span>
                      <p className="font-mono text-emerald-200 mt-0.5">
                        {typeof selectedLorry.destinationLongitude === 'number' && !isNaN(selectedLorry.destinationLongitude)
                          ? `${selectedLorry.destinationLongitude.toFixed(5)}°`
                          : <span className="text-slate-500 italic">Not Provided</span>}
                      </p>
                    </div>
                  </div>

                  {/* Expected Delivery Schedule */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/50">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-medium">Expected Delivery Date:</span>
                      <p className="font-semibold text-slate-200 mt-0.5">
                        {selectedLorry.expectedDeliveryDate ? (
                          selectedLorry.expectedDeliveryDate
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Delivery Schedule Not Provided</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-medium">Expected Delivery Time:</span>
                      <p className="font-mono text-slate-200 mt-0.5">
                        {selectedLorry.expectedDeliveryTime ? (
                          selectedLorry.expectedDeliveryTime
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Delivery Schedule Not Provided</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* SECTION D: JOURNEY INFORMATION */}
              {/* ================================================================= */}
              {(() => {
                const journey = evaluateJourney(selectedLorry);
                return (
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Milestone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Section D: Journey Information</span>
                      </span>
                      <span className="text-[10px] text-cyan-300 font-mono">CORRIDOR METRICS</span>
                    </div>

                    <div className="space-y-2.5 text-slate-300">
                      {/* Distance Travelled */}
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-medium">Distance Travelled:</span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="font-mono text-white font-bold text-sm">
                            {journey.distanceTravelledKm} km
                          </span>
                          <span className="text-[10px] text-slate-500">
                            (Cumulative from GPS telemetry route history)
                          </span>
                        </div>
                      </div>

                      {/* Remaining Distance */}
                      <div className="pt-1.5 border-t border-slate-800/50">
                        <span className="text-slate-500 text-[10px] uppercase font-medium">Remaining Distance:</span>
                        {journey.hasDestination && journey.straightLineRemainingKm !== null ? (
                          <div className="space-y-1 mt-1 bg-slate-900/80 p-2 rounded border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-300 font-medium">Straight-Line Distance:</span>
                              <span className="font-mono text-emerald-300 font-bold">
                                {journey.straightLineRemainingKm} km
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">Estimated Road Corridor:</span>
                              <span className="font-mono text-cyan-300 font-semibold">
                                ~{journey.estimatedRoadRemainingKm} km
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-500 italic mt-0.5">
                              * Straight-line computed via spherical Haversine formula; road distance incorporates 1.25x routing corridor factor.
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 italic text-[11px]">
                            Destination Not Provided
                          </div>
                        )}
                      </div>

                      {/* Estimated Arrival Time (ETA) */}
                      <div className="pt-1.5 border-t border-slate-800/50">
                        <span className="text-slate-500 text-[10px] uppercase font-medium">Estimated Arrival Time (ETA):</span>
                        {journey.hasDestination && journey.estimatedArrivalDate ? (
                          <div className="mt-1">
                            <p className="font-mono text-white font-bold text-xs flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{journey.estimatedArrivalDate.toLocaleDateString()} {journey.estimatedArrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Computed from remaining distance and current speed ({selectedLorry.lastTelemetry.speed > 10 ? `${selectedLorry.lastTelemetry.speed} km/h GPS` : '55 km/h highway corridor average'}).
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 italic text-[11px]">
                            Destination Not Provided
                          </div>
                        )}
                      </div>

                      {/* Delivery Delay Status */}
                      <div className="pt-1.5 border-t border-slate-800/50">
                        <span className="text-slate-500 text-[10px] uppercase font-medium">Delivery Delay Status:</span>
                        {!journey.hasDestination ? (
                          <div className="mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 italic text-[11px]">
                            Destination Not Provided
                          </div>
                        ) : !journey.hasSchedule ? (
                          <div className="mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 italic text-[11px]">
                            Delivery Schedule Not Provided
                          </div>
                        ) : (
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                                  journey.delayStatus === 'On Time'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : journey.delayStatus === 'At Risk'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {journey.delayStatus === 'On Time' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {journey.delayStatus === 'At Risk' && <AlertCircle className="w-3.5 h-3.5" />}
                                {journey.delayStatus === 'Delayed' && <ShieldAlert className="w-3.5 h-3.5" />}
                                <span>{journey.delayStatus}</span>
                              </span>
                            </div>
                            {journey.delayReason && (
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                Reason: <span className="text-slate-300">{journey.delayReason}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 space-y-3">
              <Truck className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm">Click any lorry marker on the map or select from the fleet list to view real-time diagnostics and workflow progression.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DRIVER BREAKDOWN REPORTING MODAL */}
      {/* ========================================================================= */}
      {isDriverBreakdownModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Driver Vehicle Breakdown Report</span>
              </h3>
              <button
                onClick={() => setIsDriverBreakdownModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Submit driver on-road incident report. Immediately immobilizes speed, creates high-priority alarm, and flags for dispatch verification.
            </p>

            <form onSubmit={handleSubmitDriverBreakdown} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Lorry Registration ID *</label>
                  <select
                    value={driverBreakdownForm.lorryId}
                    onChange={(e) => {
                      const l = lorries.find((x) => x.lorryNumber === e.target.value || x.id === e.target.value);
                      setDriverBreakdownForm({
                        ...driverBreakdownForm,
                        lorryId: e.target.value,
                        shipmentId: l?.currentShipmentCode || l?.currentShipmentId || '',
                        latitude: l?.lastTelemetry.latitude || driverBreakdownForm.latitude,
                        longitude: l?.lastTelemetry.longitude || driverBreakdownForm.longitude,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                  >
                    {lorries.map((l) => (
                      <option key={l.id} value={l.lorryNumber}>
                        {l.lorryNumber} ({l.driverName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Shipment ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. SHIP-001 or None"
                    value={driverBreakdownForm.shipmentId}
                    onChange={(e) => setDriverBreakdownForm({ ...driverBreakdownForm, shipmentId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Breakdown Type * (Select from 7 categories)</label>
                <select
                  value={driverBreakdownForm.breakdownType}
                  onChange={(e) => setDriverBreakdownForm({ ...driverBreakdownForm, breakdownType: e.target.value as BreakdownType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-medium"
                >
                  <option value="Engine Failure">Engine Failure</option>
                  <option value="Tyre Puncture">Tyre Puncture</option>
                  <option value="Battery Failure">Battery Failure</option>
                  <option value="Fuel Problem">Fuel Problem</option>
                  <option value="Accident">Accident</option>
                  <option value="Mechanical Failure">Mechanical Failure</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Incident Description *</label>
                <textarea
                  rows={3}
                  required
                  value={driverBreakdownForm.description}
                  onChange={(e) => setDriverBreakdownForm({ ...driverBreakdownForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                  placeholder="Describe failure symptoms, odometer warning codes, or road conditions..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">GPS Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={driverBreakdownForm.latitude}
                    onChange={(e) => setDriverBreakdownForm({ ...driverBreakdownForm, latitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">GPS Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={driverBreakdownForm.longitude}
                    onChange={(e) => setDriverBreakdownForm({ ...driverBreakdownForm, longitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Breakdown Time</label>
                  <input
                    type="datetime-local"
                    value={driverBreakdownForm.breakdownTime}
                    onChange={(e) => setDriverBreakdownForm({ ...driverBreakdownForm, breakdownTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-rose-500 text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDriverBreakdownModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-md shadow-rose-900/40"
                >
                  Submit Breakdown Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTER NEW LORRY */}
      {/* ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <span>Register New Lorry to Fleet</span>
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLorry} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Lorry Registration Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LOR-6281-TX"
                    value={newLorryForm.lorryNumber}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, lorryNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Vehicle Model</label>
                  <input
                    type="text"
                    value={newLorryForm.model}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, model: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Carrier Operator</label>
                  <input
                    type="text"
                    value={newLorryForm.carrierName}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, carrierName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Payload Capacity (Tons)</label>
                  <input
                    type="number"
                    value={newLorryForm.capacityTons}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, capacityTons: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Driver Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Michael Ross"
                    value={newLorryForm.driverName}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, driverName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Driver Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 012-3456"
                    value={newLorryForm.driverPhone}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, driverPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Origin Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Chicago Freight Terminal"
                    value={newLorryForm.originLocation}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, originLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Destination (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dallas Distribution or leave blank"
                    value={newLorryForm.destinationLocation}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, destinationLocation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Initial Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLorryForm.latitude}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, latitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Initial Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newLorryForm.longitude}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, longitude: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Location Source</label>
                  <select
                    value={newLorryForm.locationSource}
                    onChange={(e) => setNewLorryForm({ ...newLorryForm, locationSource: e.target.value as LocationSource })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="GPS_DEVICE">GPS_DEVICE</option>
                    <option value="GPS_API">GPS_API</option>
                    <option value="SIMULATED">SIMULATED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg shadow-md"
                >
                  Save & Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DISPATCH ASSISTANCE */}
      {/* ========================================================================= */}
      {isDispatchModalOpen && selectedLorry?.activeBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <span>Dispatch Roadside Assistance</span>
              </h3>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchAssistance} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Emergency Service Provider</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.serviceProvider}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, serviceProvider: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Assigned Technician</label>
                  <input
                    type="text"
                    required
                    value={dispatchForm.mechanicName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, mechanicName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">ETA (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={dispatchForm.etaMinutes}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, etaMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Technician Contact Phone</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.contactPhone}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, contactPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-md"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESOLVE BREAKDOWN */}
      {/* ========================================================================= */}
      {isResolveModalOpen && selectedLorry?.activeBreakdown && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Clear Breakdown & Recover Lorry</span>
              </h3>
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Restores vehicle <strong className="text-white">{selectedLorry.lorryNumber}</strong> to <span className="text-emerald-400 font-bold">Recovered</span> status, clears active alerts, and prepares for journey resumption.
            </p>

            <form onSubmit={handleResolveBreakdown} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Field Repair Notes & Clearance</label>
                <textarea
                  rows={3}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md shadow-emerald-900/40"
                >
                  Approve Clearance & Recover
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REST API TELEMETRY INGESTION SPECIFICATION */}
      {/* ========================================================================= */}
      {isApiInfoOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-cyan-400" />
                <span>Physical GPS Device & Telemetry Ingestion API</span>
              </h3>
              <button
                onClick={() => setIsApiInfoOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300">
              Hardware GPS transponders (Teltonika, CalAmp, Queclink) or third-party fleet APIs (Samsara, Geotab) can stream live pings to ChainPulse AI via this endpoint:
            </p>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-cyan-300 select-all">
              POST /api/gps/telemetry
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 font-semibold text-[11px]">Payload Specification (JSON):</span>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400 overflow-x-auto select-all">
{`{
  "lorryId": "${selectedLorry?.id || 'lor_1'}",
  "latitude": 40.4173,
  "longitude": -86.8752,
  "speed": 72.5,
  "speed_kmh": 72.5,
  "locationSource": "GPS_DEVICE",
  "engineStatus": "Running",
  "engineTemp": 88,
  "fuelLevel": 78,
  "batteryVoltage": 24.2,
  "locationName": "I-65 Southbound, Mile 142 near Lafayette, IN"
}`}
              </pre>
            </div>

            <div className="text-slate-400 text-[11px] space-y-1">
              <div>• Destination and expected delivery date are completely <strong className="text-emerald-400">optional</strong>.</div>
              <div>• Speed {'>'} 5 km/h automatically marks vehicle as <strong className="text-emerald-400">Moving</strong>.</div>
              <div>• Speed = 0 km/h for {'>'}=10 mins flags an automated <strong className="text-amber-400">Possible Stoppage</strong>.</div>
              <div>• Confirmed breakdowns automatically generate a <strong className="text-rose-400">ChainPulse AI Disruption</strong> and order risk recalculations.</div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsApiInfoOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
