'use client';

import 'leaflet/dist/leaflet.css';

import L, { Icon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, Circle, CircleMarker, Polyline } from 'react-leaflet';
import omnivore from "@mapbox/leaflet-omnivore";
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
    crimeData.forEach(( crimeCategory) => {
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

const KMLLayer = ({ kmlFile, iconUrl, circleCenter, circleRadius }) => {
  const map = useMap();

  useEffect(() => {
    const kmlLayer = omnivore.kml(kmlFile)
      .on('ready', () => {
        kmlLayer.eachLayer((layer: any) => {
          const featureType = layer.feature.geometry.type;
          if (featureType === 'Point' && iconUrl) {
            const icon = getIcon(iconUrl);
            layer.setIcon(icon);
          }
        });

        // Fit bounds to all points
        if (kmlLayer.getLayers().length > 0) {
          map.fitBounds(kmlLayer.getBounds());
        }
      })
      .addTo(map);

    return () => {
      map.removeLayer(kmlLayer);
    };
  }, [kmlFile, map, iconUrl]);

  return null;
};

interface Marker {
  position: [number, number];
  label: string;
  color: string;
}

const iconCache = {};
const getIcon = (url) => {
  if (!iconCache[url]) {
    iconCache[url] = new Icon({ iconUrl: url, iconSize: [24, 32] });
  }
  return iconCache[url];
};

export default function Map({ center, markers, kmlFiles = [], iconMapping, zoomLevel = 19 }: MapProps) {
  const mapRef = useRef()
  const [circleData, setCircleData] = useState([]);
  const [kmlData, setKmlData] = useState([]);
  console.log(center, "location of the center of the map")

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
  return <div>
    <MapContainer center={center} zoom={zoomLevel} maxZoom={19} style={{ height: '100vh' }}
      ref={mapRef}
      {...{} as any}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        {...{} as any}
      />
      {markers.map((data, index) => {
        return (
          <div key={index}>
            <Marker
              position={data.position}
              icon={markersByColor[data?.color] ?? markersByColor['red']}
              {...{} as any}
            >
              <Popup>{data.label}</Popup>
            </Marker>
            <ExtendedCircle
              center={data.position}
              pathOptions={{ color: 'red' }}
              radius={circleRadius as any}
            />
          </div>
        );
      })}
      {kmlFiles.map((kmlFile, index) => {
        const fileName = kmlFile.split('/').pop()?.split('.')[0] ?? '';
        const iconUrl = iconMapping[fileName] ?? '';

        return <KMLLayer key={index} kmlFile={kmlFile} iconUrl={iconUrl} circleCenter={center}
          circleRadius={circleRadius} />
      })}
      <CrimeMarkers crimeData={crimeData} />
    </MapContainer>
  </div>;
}