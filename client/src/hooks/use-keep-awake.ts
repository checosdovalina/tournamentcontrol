import { useEffect, useRef } from 'react';

export function useKeepAwake() {
  const wakeLockRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isActive = true;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('Wake Lock activated');

          wakeLockRef.current.addEventListener('release', () => {
            console.log('Wake Lock released');
          });
        } else {
          console.log('Wake Lock API not supported, using fallback');
          useFallbackKeepAwake();
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
        useFallbackKeepAwake();
      }
    };

    const useFallbackKeepAwake = () => {
      const video = document.createElement('video');
      video.setAttribute('loop', 'true');
      video.setAttribute('muted', 'true');
      video.setAttribute('playsinline', 'true');
      video.style.position = 'fixed';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.zIndex = '-9999';

      const source = document.createElement('source');
      source.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAu1tZGF0AAACrQYF//+p3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE1MiByMjg1NCBlOWE1OTAzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNyAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTMgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAA8mWIhAAV//72rvzLK0cLlS4dWXuzUfLoSXL9iDB9aAAAAwAAAwAAJuKiZ0WFMeJsgAAALmAIWElDyDzETFWKgSUJAQAAAQAAAwAAAgC4vhwAAAMAAAH0A7MZAAAAkQYBQCCAQyGQgTAwAlgCXAAAH0QAGIIAABlB6AAA0WIDDACgDCDCgYQwCEAQgoAAAHJ5PBjEAA/AA////wICBAgQIECBAgQIECBAgQIECBAgQIEABAgQIECBAgQIECBAgQIECBAgQIECBAgQAAEBAgQIECBAgQIECBAgQIECBAgQIECBAgQAAECBAgQIECBAgQIECBAgQIECBAgQIECAAABgAAACE2QAAAAWQ';
      source.type = 'video/mp4';
      video.appendChild(source);
      document.body.appendChild(video);

      video.play().catch(err => {
        console.warn('Fallback video play failed:', err);
      });

      videoRef.current = video;
    };

    const handleVisibilityChange = async () => {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    requestWakeLock();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, []);

  return null;
}
