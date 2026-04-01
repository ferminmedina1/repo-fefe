// MapWidget - Display geographic data on a map

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { MapPin, AlertCircle } from 'lucide-react';

export interface MapWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

interface MapMarker {
  lat: number;
  lng: number;
  label?: string;
  value?: any;
}

const MapWidget: React.FC<MapWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const latField = config.latitude as string || 'latitude';
  const lngField = config.longitude as string || 'longitude';
  const zoom = config.zoom as number || 10;

  // Parse map markers from data
  const markers = useMemo(() => {
    const result: MapMarker[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item && typeof item === 'object') {
          const lat = Number(item[latField]);
          const lng = Number(item[lngField]);

          if (!isNaN(lat) && !isNaN(lng)) {
            result.push({
              lat,
              lng,
              label: item.label || item.name,
              value: item.value || item
            });
          }
        }
      }
    } else if (data && typeof data === 'object') {
      const values = Object.values(data);
      for (const item of values) {
        if (item && typeof item === 'object') {
          const lat = Number((item as any)[latField]);
          const lng = Number((item as any)[lngField]);

          if (!isNaN(lat) && !isNaN(lng)) {
            result.push({
              lat,
              lng,
              label: (item as any).label || (item as any).name,
              value: item
            });
          }
        }
      }
    }

    return result;
  }, [data, latField, lngField]);

  if (markers.length === 0) {
    return (
      <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900">{widget.name}</h3>
          {widget.description && (
            <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm">No location data available</p>
            <p className="text-xs text-gray-600 mt-1">
              Ensure data contains '{latField}' and '{lngField}' fields
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate bounds
  const lats = markers.map(m => m.lat);
  const lngs = markers.map(m => m.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">{widget.name}</h3>
        {widget.description && (
          <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
        )}
      </div>

      {/* Map Container - Placeholder */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 rounded border border-blue-200 relative overflow-hidden">
        {/* Simple SVG representation */}
        <svg
          className="w-full h-full"
          viewBox={`${minLng - 1} ${minLat - 1} ${maxLng - minLng + 2} ${maxLat - minLat + 2}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
              <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#cbd5e1" strokeWidth="0.01" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Markers */}
          {markers.map((marker, idx) => (
            <g key={idx}>
              {/* Pin circle */}
              <circle
                cx={marker.lng}
                cy={marker.lat}
                r="0.1"
                fill="#3b82f6"
                opacity="0.8"
              />

              {/* Pin label */}
              {marker.label && (
                <text
                  x={marker.lng}
                  y={marker.lat - 0.15}
                  fontSize="0.08"
                  textAnchor="middle"
                  fill="#1f2937"
                  className="font-bold pointer-events-none"
                >
                  {marker.label.substring(0, 3)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Info overlay */}
        <div className="absolute bottom-4 right-4 bg-white rounded shadow-md p-2 text-xs text-gray-600 max-w-xs">
          <div className="font-medium mb-1">{markers.length} locations</div>
          <div className="text-gray-500">
            Center: {centerLat.toFixed(2)}, {centerLng.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 p-2 bg-gray-50 rounded border border-gray-100 max-h-32 overflow-auto">
        <div className="text-xs font-medium text-gray-700 mb-2">Locations:</div>
        <div className="space-y-1">
          {markers.slice(0, 5).map((marker, idx) => (
            <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
              <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span>
                {marker.label || `Location ${idx + 1}`} ({marker.lat.toFixed(2)}, {marker.lng.toFixed(2)})
              </span>
            </div>
          ))}
          {markers.length > 5 && (
            <div className="text-xs text-gray-500">
              +{markers.length - 5} more locations
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapWidget;
