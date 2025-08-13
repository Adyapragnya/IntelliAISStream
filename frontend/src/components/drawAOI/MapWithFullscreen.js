import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-fullscreen';
import 'leaflet-fullscreen/dist/leaflet.fullscreen.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const MapWithFullscreen = () => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Store defaults so we can restore them
    const defaultCenter = [0, 0];
    const defaultZoom = 4;
    const fsMinZoom = 3;
    const fsMaxZoom = 20;
    const defaultMinZoom = map.getMinZoom();
    const defaultMaxZoom = map.getMaxZoom();

    // 1) Fullscreen control (singleton via forceSeparateButton)
    const fsControl = new L.Control.Fullscreen({
      position: 'topright',
      title: 'Enter Fullscreen',
      titleCancel: 'Exit Fullscreen',
      forceSeparateButton: true,
    });
    fsControl.addTo(map);

    // 2) Reset-view control
    const ResetViewControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd: () => {
        const container = L.DomUtil.create('div', 'leaflet-bar');
        const btn = L.DomUtil.create('a', 'leaflet-bar-part leaflet-reset-view', container);
        btn.href = '#';
        btn.title = 'Reset View';
        btn.innerHTML = '<i class="fas fa-sync-alt"></i>';

        L.DomEvent.disableClickPropagation(btn);
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.preventDefault(e);
          map.setMinZoom(defaultMinZoom);
          map.setMaxZoom(defaultMaxZoom);
          map.setView(defaultCenter, defaultZoom);
          map.invalidateSize();
        });

        return container;
      },
    });
    const resetControl = new ResetViewControl();
    resetControl.addTo(map);

    // Handlers for entering/exiting fullscreen
    const onEnterFs = () => {
      map.setMinZoom(fsMinZoom);
      map.setMaxZoom(fsMaxZoom);
      map.setView(defaultCenter, fsMinZoom);
      setTimeout(() => map.invalidateSize(), 100);
    };
    const onExitFs = () => {
      map.setMinZoom(defaultMinZoom);
      map.setMaxZoom(defaultMaxZoom);
      map.setView(defaultCenter, defaultZoom);
      setTimeout(() => map.invalidateSize(), 100);
    };

    // Listen to plugin’s events
    map.on('enterFullscreen', onEnterFs);
    map.on('exitFullscreen', onExitFs);

    // Handle browser resize
    const handleResize = () => {
      // Debounce-ish: give it a moment, then recalc
      setTimeout(() => {
        map.invalidateSize();
        map.setView(defaultCenter, defaultZoom);
      }, 100);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      fsControl.remove();
      resetControl.remove();
      map.off('enterFullscreen', onEnterFs);
      map.off('exitFullscreen', onExitFs);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};

export default MapWithFullscreen;
