import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export const WORLD_BOUNDS = [[-85, -180], [85, 180]];

// Keeps a single copy of the world on screen: no panning past the edges and no zooming out
// far enough to show empty bands beside or above the map.
export const WorldBounds = () => {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      const { x, y } = map.getSize();
      if (!x || !y) return;
      const minZoom = Math.ceil(Math.log2(Math.max(x, y) / 256));
      map.setMinZoom(minZoom);
      if (map.getZoom() < minZoom) map.setZoom(minZoom);
    };
    map.setMaxBounds(WORLD_BOUNDS);
    map.options.maxBoundsViscosity = 1.0;
    fit();
    map.on('resize', fit);
    return () => map.off('resize', fit);
  }, [map]);

  return null;
};
