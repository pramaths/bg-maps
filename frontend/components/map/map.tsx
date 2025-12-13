'use client';

import 'leaflet/dist/leaflet.css';

import L, { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, Circle, CircleMarker, Polyline, GeoJSON, Polygon } from 'react-leaflet';
import React, { useState, useRef, useEffect } from 'react';
import { Circle as LeafletCircle } from 'react-leaflet';
import { PathOptions } from 'leaflet';
import { crimeData } from '@/utils/data'
import 'leaflet.markercluster/dist/leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const circleRadius = 1000;
interface ExtendedCircleProps {
  center: [number, number];
  pathOptions?: PathOptions;
  radius: number;
}
interface CrimeLocation {
  latitude: number;
  longitude: number;
}

interface CrimeGroup {
  crimeCategory: string;
  Locations: CrimeLocation[];
}

interface CrimeMarkersProps {
  crimeData: CrimeGroup[];
}

const ExtendedCircle: React.FC<ExtendedCircleProps> = (props) => {
  return <LeafletCircle {...props} />;
};

const markersByColor = {
  'red': new Icon({ iconUrl: '/pin-blue.svg', iconSize: [24, 32] }),
  'blue': new Icon({ iconUrl: '/pin-red.svg', iconSize: [24, 32] })
}


export interface MapProps {
  zoomLevel?: number;
  center: [number, number];
  markers: {
    label: string;
    position: [number, number];
    color: string;
  }[];
  kmlFiles: string[];
  iconMapping: { [key: string]: string };
}

const stringToHashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const character = str.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash &= hash; // Convert to 32bit integer
  }
  return hash;
};

const getMarkerColor = (crimeType) => {
  const hash = stringToHashCode(crimeType);
  const color = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
  return color;
};

const useCrimeClusters = (crimeData: CrimeGroup[]) => {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);


  useEffect(() => {
    if (!clusterRef.current && map) {
      clusterRef.current = L.markerClusterGroup();
      map.addLayer(clusterRef.current);
    }
    // remove on unmount
    return () => {
      if (clusterRef.current) map.removeLayer(clusterRef.current);
    };
  }, [map]);


  useEffect(() => {
    if (!clusterRef.current) return;
    const cluster = clusterRef.current;
    cluster.clearLayers();
    let added = 0;
    crimeData.forEach((crimeCategory) => {
      const icon = L.divIcon({
        className: 'crime-marker',
        html: `<div style="background-color: ${getMarkerColor(crimeCategory.crimeCategory)}; 
        width: auto; 
        padding: 2px 4px; 
        border-radius: 5px; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        color: black;
        white-space: nowrap;
        font-size: 12px;">${crimeCategory}</div>`,
      });

      crimeCategory.Locations.forEach(({ latitude, longitude }) => {
        const marker = L.marker([latitude, longitude], { icon });
        cluster.addLayer(marker);
        added++;
      });
    });
    if (cluster.getLayers().length) {
      map.fitBounds(cluster.getBounds(), { padding: [40, 40] });
    }
  }, [crimeData]);

  useEffect(() => {
    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
      }
    };
  }, [map]);
}

const CrimeMarkers: React.FC<CrimeMarkersProps> = ({ crimeData }) => {
  useCrimeClusters(crimeData);
  return null;
};

// Web Worker for KML parsing
const kmlWorkerCode = `
self.onmessage = async (e) => {
  const { kmlFiles } = e.data;
  console.log('Worker received files:', kmlFiles);
  const features = [];

  for (const fileUrl of kmlFiles) {
    try {
      console.log('Worker fetching:', fileUrl);
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error(\`Failed to fetch \${fileUrl}: \${response.statusText}\`);
      const text = await response.text();
      const fileName = fileUrl.split('/').pop().split('.')[0];
      
      console.log('Worker parsing:', fileName, 'Length:', text.length);

      // Simple regex parser for Placemarks
      const placemarkRegex = /<Placemark>([\\s\\S]*?)<\\/Placemark>/g;
      let match;
      let count = 0;
      
      while ((match = placemarkRegex.exec(text)) !== null) {
        const content = match[1];
        const nameRegex = /<name>([\\s\\S]*?)<\\/name>/;
        const nameMatch = content.match(nameRegex);
        const name = nameMatch ? nameMatch[1].trim() : '';

        // Helper to extract coordinates
        const parseCoords = (coordStr) => {
            return coordStr.trim().split(/\\s+/).map(c => {
                const parts = c.split(',');
                if (parts.length >= 2) return [parseFloat(parts[0]), parseFloat(parts[1])]; // Lon, Lat
                return null;
            }).filter(c => c);
        };

        // 1. Find Points
        const pointRegex = /<Point>([\\s\\S]*?)<\\/Point>/g;
        let pMatch;
        while ((pMatch = pointRegex.exec(content)) !== null) {
             const coordRegex = /<coordinates>([\\s\\S]*?)<\\/coordinates>/;
             const cMatch = pMatch[1].match(coordRegex);
             if (cMatch) {
                 const coords = parseCoords(cMatch[1]);
                 if (coords.length > 0) {
                     features.push({
                         type: 'Feature',
                         properties: { name, fileName },
                         geometry: { type: 'Point', coordinates: coords[0] }
                     });
                     count++;
                 }
             }
        }

        // 2. Find LineStrings
        const lineRegex = /<LineString>([\\s\\S]*?)<\\/LineString>/g;
        let lMatch;
        while ((lMatch = lineRegex.exec(content)) !== null) {
             const coordRegex = /<coordinates>([\\s\\S]*?)<\\/coordinates>/;
             const cMatch = lMatch[1].match(coordRegex);
             if (cMatch) {
                 const coords = parseCoords(cMatch[1]);
                 if (coords.length > 0) {
                     features.push({
                         type: 'Feature',
                         properties: { name, fileName },
                         geometry: { type: 'LineString', coordinates: coords }
                     });
                     count++;
                 }
             }
        }

        // 3. Find Polygons
        const polyRegex = /<Polygon>([\\s\\S]*?)<\\/Polygon>/g;
        let pgMatch;
        while ((pgMatch = polyRegex.exec(content)) !== null) {
             // Usually OuterBoundaryIs -> LinearRing -> coordinates
             const coordRegex = /<coordinates>([\\s\\S]*?)<\\/coordinates>/;
             const cMatch = pgMatch[1].match(coordRegex); // Grab first coordinates which is usually outer
             if (cMatch) {
                 const coords = parseCoords(cMatch[1]);
                 if (coords.length > 0) {
                     features.push({
                         type: 'Feature',
                         properties: { name, fileName },
                         geometry: { type: 'Polygon', coordinates: [coords] }
                     });
                     count++;
                 }
             }
        }
      }
      console.log('Worker parsed features for', fileName, ':', count);
    } catch (err) {
      console.error('Error parsing KML in worker:', err);
    }
  }
  
  self.postMessage({ features });
};
`;

const KMLLayers = ({ kmlFiles, iconMapping }) => {
  const map = useMap();
  const [geoJsonData, setGeoJsonData] = useState<any[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize worker
    const blob = new Blob([kmlWorkerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));

    workerRef.current.onmessage = (e) => {
      const { features } = e.data;
      setGeoJsonData(features);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (workerRef.current && kmlFiles.length > 0) {
      // Convert to absolute URLs to ensure Worker can fetch them correctly
      const absoluteKmlFiles = kmlFiles.map(file => new URL(file, window.location.origin).toString());
      console.log('Sending KML files to worker:', absoluteKmlFiles);
      workerRef.current.postMessage({ kmlFiles: absoluteKmlFiles });
    }
  }, [kmlFiles]);

  return (
    <>
      {geoJsonData.map((feature, index) => {
        // Handle Point
        if (feature.geometry.type === 'Point') {
          const iconUrl = iconMapping[feature.properties.fileName];

          // If no icon mapping, skip or show default? Original code skipped.
          if (!iconUrl) return null;

          const icon = new Icon({ iconUrl, iconSize: [24, 32] });

          return (
            <Marker
              key={index}
              position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
              icon={icon}
              {...{} as any}
            />
          );
        }

        // Handle LineString
        if (feature.geometry.type === 'LineString') {
          const positions = feature.geometry.coordinates.map((c: any) => [c[1], c[0]]); // GeoJSON is Lon,Lat. Leaflet is Lat,Lon
          return <Polyline key={index} positions={positions} pathOptions={{ color: 'blue', weight: 2 }} />;
        }

        // Handle Polygon
        if (feature.geometry.type === 'Polygon') {
          // Polygon coordinates are [ [ [lon, lat], ... ] ] (rings)
          const positions = feature.geometry.coordinates[0].map((c: any) => [c[1], c[0]]);
          return <Polygon key={index} positions={positions} pathOptions={{ color: 'green', fillOpacity: 0.5 }} />;
        }

        return null;
      })}
    </>
  );
}

interface Marker {
  position: [number, number];
  label: string;
  color: string;
}

// Component to handle smooth map animations
const MapAnimationController = ({ center, markers, zoomLevel }) => {
  const map = useMap();
  const [animatedMarkers, setAnimatedMarkers] = useState<number[]>([]);

  useEffect(() => {
    if (center && map) {
      // Smooth fly-to animation with 10x zoom effect
      map.flyTo(center, zoomLevel, {
        duration: 2.5,
        easeLinearity: 0.25,
        animate: true
      });
      
      // Animate markers sequentially
      markers.forEach((_, index) => {
        setTimeout(() => {
          setAnimatedMarkers(prev => [...prev, index]);
        }, 1000 + (index * 300));
      });
    }
  }, [center, markers, zoomLevel, map]);

  return null;
};

export default function Map({ center, markers, kmlFiles = [], iconMapping, zoomLevel = 19 }: MapProps) {
  const mapRef = useRef()
  const [circleData, setCircleData] = useState([]);
  const [kmlData, setKmlData] = useState([]);
  const [markersVisible, setMarkersVisible] = useState<Set<number>>(new Set());
  console.log(center, "location of the center of the map")
  
  useEffect(() => {
    // Animate markers appearing one by one
    markers.forEach((_, index) => {
      setTimeout(() => {
        setMarkersVisible(prev => new Set([...prev, index]));
      }, 1500 + (index * 400));
    });
  }, [markers])

  const fetchKmlData = async () => {
    const response = await fetch('http://127.0.0.1:5000/riskanalysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        circles: markers.map(marker => ({
          center: {
            lat: marker.position[0],
            lng: marker.position[1]
          },
          radius: circleRadius,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        setKmlData(data.pointsInCircles);
        console.log('Points within circles:', data.pointsInCircles);
      } else {
        console.error('Error:', data.message);
      }
    } else {
      console.error('Failed to fetch data');
    }
  };
  useEffect(() => {
    fetchKmlData();
  }, [markers]);


  return (
    <div className="relative">
      {/* Loading overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-purple-900/20 pointer-events-none z-10 animate-pulse" 
           style={{ animation: 'fadeOut 2s ease-out forwards' }} />
      
      <MapContainer center={center} zoom={zoomLevel} maxZoom={19} style={{ height: '100vh' }}
        ref={mapRef}
        {...{} as any}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoicHJhbWF0aHMxMSIsImEiOiJjbWdwajU2NWcwb2FyMmpxNDAzN3AwdHF4In0.GL0MDtz32PYXGNfs571Luw"
          tileSize={512}
          zoomOffset={-1}
          {...{} as any}
        />
        
        {/* Animation controller */}
        <MapAnimationController center={center} markers={markers} zoomLevel={zoomLevel} />
        
        {markers.map((data, index) => {
          const isVisible = markersVisible.has(index);
          return (
            <div key={index} style={{ 
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.6s ease-in-out',
              transform: isVisible ? 'scale(1)' : 'scale(0.5)'
            }}>
              <Marker
                position={data.position}
                icon={markersByColor[data?.color] ?? markersByColor['red']}
                {...{} as any}
              >
                <Popup>
                  <div className="font-semibold text-gray-900">
                    {data.label}
                  </div>
                </Popup>
              </Marker>
              <ExtendedCircle
                center={data.position}
                pathOptions={{ 
                  color: 'red', 
                  fillColor: '#ef4444',
                  fillOpacity: isVisible ? 0.1 : 0,
                  weight: 2,
                  opacity: isVisible ? 0.6 : 0
                }}
                radius={circleRadius as any}
              />
            </div>
          );
        })}

        <KMLLayers kmlFiles={kmlFiles} iconMapping={iconMapping} />

        <CrimeMarkers crimeData={crimeData} />
      </MapContainer>
      
      <style jsx global>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        /* Marker drop animation */
        .leaflet-marker-icon {
          animation: markerDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @keyframes markerDrop {
          0% {
            transform: translateY(-100px) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        /* Pulse animation for markers */
        .leaflet-marker-icon:hover {
          animation: markerPulse 1s ease-in-out infinite;
        }
        
        @keyframes markerPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}