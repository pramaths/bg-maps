'use client';

import mapboxgl from 'mapbox-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { crimeData } from '@/utils/data'

const circleRadius = 1000;
interface CrimeLocation {
  latitude: number;
  longitude: number;
}

interface CrimeGroup {
  crimeCategory: string;
  Locations: CrimeLocation[];
}

const markersByColor: Record<string, string> = {
  red: '/pin-blue.svg',
  blue: '/pin-red.svg',
};


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
  riskData?: any;
}

const stringToHashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const character = str.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash &= hash; // Convert to 32bit integer
  }
  return hash;
};

const getMarkerColor = (crimeType: string) => {
  const hash = stringToHashCode(crimeType);
  const color = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
  return color;
};

const toLngLat = (latLng: [number, number]) => {
  return [latLng[1], latLng[0]] as [number, number];
};

const haversineMeters = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const createCirclePolygon = (centerLngLat: [number, number], radiusMeters: number, steps = 64) => {
  const [lng, lat] = centerLngLat;
  const coords: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDistance = radiusMeters / earthRadius;

  for (let i = 0; i <= steps; i++) {
    const bearing = (i * 2 * Math.PI) / steps;
    const sinLat = Math.sin(latRad);
    const cosLat = Math.cos(latRad);
    const sinAd = Math.sin(angularDistance);
    const cosAd = Math.cos(angularDistance);

    const lat2 = Math.asin(sinLat * cosAd + cosLat * sinAd * Math.cos(bearing));
    const lng2 = lngRad + Math.atan2(
      Math.sin(bearing) * sinAd * cosLat,
      cosAd - sinLat * Math.sin(lat2)
    );

    coords.push([
      (lng2 * 180) / Math.PI,
      (lat2 * 180) / Math.PI,
    ]);
  }

  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
  };
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

interface KmlFeature {
  type: 'Feature';
  properties: { name?: string; fileName?: string };
  geometry:
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'Polygon'; coordinates: [number, number][][] };
}

type KmlPointFeature = KmlFeature & { geometry: { type: 'Point'; coordinates: [number, number] } };
type KmlLineFeature = KmlFeature & { geometry: { type: 'LineString'; coordinates: [number, number][] } };
type KmlPolygonFeature = KmlFeature & { geometry: { type: 'Polygon'; coordinates: [number, number][][] } };

interface Marker {
  position: [number, number];
  label: string;
  color: string;
}

export default function Map({ center, markers, kmlFiles = [], iconMapping, zoomLevel = 14, riskData }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const kmlPointMarkerRefs = useRef<mapboxgl.Marker[]>([]);
  const riskMarkerRefs = useRef<mapboxgl.Marker[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<KmlFeature[]>([]);
  const workerRef = useRef<Worker | null>(null);
  console.log(center, "location of the center of the map")


  useEffect(() => {
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
      const absoluteKmlFiles = kmlFiles.map(file => new URL(file, window.location.origin).toString());
      console.log('Sending KML files to worker:', absoluteKmlFiles);
      workerRef.current.postMessage({ kmlFiles: absoluteKmlFiles });
    }
  }, [kmlFiles]);

  const crimeFeatureCollection = useMemo(() => {
    const features: any[] = [];
    crimeData.forEach((group) => {
      const color = getMarkerColor(group.crimeCategory);
      group.Locations.forEach((loc) => {
        features.push({
          type: 'Feature',
          properties: {
            crimeCategory: group.crimeCategory,
            color,
          },
          geometry: {
            type: 'Point',
            coordinates: [loc.longitude, loc.latitude],
          },
        });
      });
    });
    return {
      type: 'FeatureCollection',
      features,
    } as const;
  }, []);

  useEffect(() => {
    const token = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string | undefined)
      ?? 'pk.eyJ1IjoicHJhbWF0aHMxMSIsImEiOiJjbWdwajU2NWcwb2FyMmpxNDAzN3AwdHF4In0.GL0MDtz32PYXGNfs571Luw';
    mapboxgl.accessToken = token;

    if (mapRef.current || !mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: toLngLat(center),
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      attributionControl: true,
    });

    mapRef.current.on('style.load', () => {
      mapRef.current?.setFog({
        color: 'rgb(18, 20, 26)',
        'high-color': 'rgb(32, 36, 46)',
        'horizon-blend': 0.06,
        'space-color': 'rgb(18, 20, 26)',
        'star-intensity': 0.2,
      } as any);
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    return () => {
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      kmlPointMarkerRefs.current.forEach((m) => m.remove());
      kmlPointMarkerRefs.current = [];
      riskMarkerRefs.current.forEach((m) => m.remove());
      riskMarkerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    riskMarkerRefs.current.forEach((m) => m.remove());
    riskMarkerRefs.current = [];

    if (!riskData) return;

    const floodIcon = iconMapping?.flood;
    const waterDepthIcon = iconMapping?.waterdepth;

    (riskData?.flood ?? []).forEach((p: any) => {
      if (!floodIcon || typeof p?.longitude !== 'number' || typeof p?.latitude !== 'number') return;

      const el = document.createElement('img');
      el.src = floodIcon;
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.objectFit = 'contain';

      const popupText = p?.LocationName ? `Flood: ${p.LocationName}` : 'Flood';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(popupText))
        .addTo(map);

      riskMarkerRefs.current.push(marker);
    });

    (riskData?.waterdepth ?? []).forEach((p: any) => {
      if (!waterDepthIcon || typeof p?.longitude !== 'number' || typeof p?.latitude !== 'number') return;

      const el = document.createElement('img');
      el.src = waterDepthIcon;
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.objectFit = 'contain';

      const depth = typeof p?.depth_in_m === 'number' ? `${p.depth_in_m.toFixed(1)}m` : '';
      const popupText = depth ? `Water depth: ${depth}` : 'Water depth';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.longitude, p.latitude])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(popupText))
        .addTo(map);

      riskMarkerRefs.current.push(marker);
    });
  }, [riskData, iconMapping]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: toLngLat(center),
      zoom: zoomLevel,
      duration: 6000,
      essential: true,
    });
  }, [center, zoomLevel]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    markers.forEach((data) => {
      const iconUrl = markersByColor[data?.color] ?? markersByColor.red;
      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '32px';
      el.style.backgroundImage = `url(${iconUrl})`;
      el.style.backgroundSize = 'contain';
      el.style.backgroundRepeat = 'no-repeat';
      el.style.cursor = 'pointer';

      const popup = new mapboxgl.Popup({ offset: 16 }).setText(data.label);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(toLngLat(data.position))
        .setPopup(popup)
        .addTo(map);

      markerRefs.current.push(marker);
    });
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const circles = {
      type: 'FeatureCollection',
      features: markers.map((m) => createCirclePolygon(toLngLat(m.position), circleRadius)),
    } as const;

    const sourceId = 'marker-circles';
    const fillLayerId = 'marker-circles-fill';
    const lineLayerId = 'marker-circles-line';

    const apply = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(circles as any);
      } else {
        map.addSource(sourceId, { type: 'geojson', data: circles as any });
        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.12,
          },
        });
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ef4444',
            'line-width': 2,
            'line-opacity': 0.6,
          },
        });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const lineFeatures = geoJsonData.filter((f): f is KmlLineFeature => f.geometry.type === 'LineString');
    const polygonFeatures = geoJsonData.filter((f): f is KmlPolygonFeature => f.geometry.type === 'Polygon');
    const pointFeatures = geoJsonData.filter((f): f is KmlPointFeature => f.geometry.type === 'Point');

    const linesFc = { type: 'FeatureCollection', features: lineFeatures } as const;
    const polygonsFc = { type: 'FeatureCollection', features: polygonFeatures } as const;

    const apply = () => {
      const linesSourceId = 'kml-lines';
      const polygonsSourceId = 'kml-polygons';

      if (map.getSource(linesSourceId)) {
        (map.getSource(linesSourceId) as mapboxgl.GeoJSONSource).setData(linesFc as any);
      } else {
        map.addSource(linesSourceId, { type: 'geojson', data: linesFc as any });
        map.addLayer({
          id: 'kml-lines-layer',
          type: 'line',
          source: linesSourceId,
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2,
          },
        });
      }

      if (map.getSource(polygonsSourceId)) {
        (map.getSource(polygonsSourceId) as mapboxgl.GeoJSONSource).setData(polygonsFc as any);
      } else {
        map.addSource(polygonsSourceId, { type: 'geojson', data: polygonsFc as any });
        map.addLayer({
          id: 'kml-polygons-fill',
          type: 'fill',
          source: polygonsSourceId,
          paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.35,
          },
        });
        map.addLayer({
          id: 'kml-polygons-outline',
          type: 'line',
          source: polygonsSourceId,
          paint: {
            'line-color': '#16a34a',
            'line-width': 2,
          },
        });
      }

      kmlPointMarkerRefs.current.forEach((m) => m.remove());
      kmlPointMarkerRefs.current = [];

      pointFeatures.forEach((feature) => {
        const iconUrl = feature.properties?.fileName ? iconMapping[feature.properties.fileName] : undefined;
        if (!iconUrl) return;

        const [lon, lat] = feature.geometry.coordinates;

        const el = document.createElement('img');
        el.src = iconUrl;
        el.style.width = '18px';
        el.style.height = '18px';
        el.style.objectFit = 'contain';

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(feature.geometry.coordinates)
          .addTo(map);
        kmlPointMarkerRefs.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [geoJsonData, iconMapping, markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const sourceId = 'crime';

    const apply = () => {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(crimeFeatureCollection as any);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: crimeFeatureCollection as any,
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 14,
        });

        map.addLayer({
          id: 'crime-clusters',
          type: 'circle',
          source: sourceId,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#60a5fa',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              14,
              50,
              18,
              200,
              22,
            ],
            'circle-opacity': 0.75,
          },
        });

        map.addLayer({
          id: 'crime-cluster-count',
          type: 'symbol',
          source: sourceId,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
          },
          paint: {
            'text-color': '#0b1220',
          },
        });

        map.addLayer({
          id: 'crime-unclustered',
          type: 'circle',
          source: sourceId,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 10,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#0b1220',
          },
        });

        map.on('click', 'crime-clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['crime-clusters'] });
          const clusterId = features?.[0]?.properties?.cluster_id;
          if (clusterId === undefined) return;

          (map.getSource(sourceId) as mapboxgl.GeoJSONSource).getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            const geometry = features[0].geometry as any;
            const coordinates = geometry?.coordinates;
            if (!coordinates) return;
            map.easeTo({ center: coordinates, zoom });
          });
        });

        map.on('mouseenter', 'crime-clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'crime-clusters', () => {
          map.getCanvas().style.cursor = '';
        });

        map.on('click', 'crime-unclustered', (e) => {
          const coordinates = (e.features?.[0].geometry as any).coordinates.slice();
          const crimeCategory = e.features?.[0].properties?.crimeCategory;

          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<strong>${crimeCategory}</strong>`)
            .addTo(map);
        });

        map.on('mouseenter', 'crime-unclustered', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'crime-unclustered', () => {
          map.getCanvas().style.cursor = '';
        });
      }

    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [crimeFeatureCollection]);


  return (
    <div>
      <div ref={mapContainerRef} style={{ height: '100vh' }} />
    </div>
  );
}