import React from 'react';
import lottie from 'lottie-web';

interface LottieLoaderProps {
  className?: string;
  size?: number; // px
  loop?: boolean;
  autoplay?: boolean;
  label?: string;
  src?: string; // optional path to lottie json, defaults to '/AeqdDC7l8q.json'
}

// Centralized Lottie loader using the project animation AeqdDC7l8q.json
const LottieLoader: React.FC<LottieLoaderProps> = ({ className = '', size = 80, loop = true, autoplay = true, label = 'Loading...', src = '/AeqdDC7l8q.json' }) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const animRef = React.useRef<any>(null);
  const [animationData, setAnimationData] = React.useState<any | null>(null);

  React.useEffect(() => {
    // fetch animation json from public
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(src, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setAnimationData(json);
      } catch (e) {
        // Use a tiny inline pulse as fallback
        if (!cancelled) setAnimationData({
          v: '5.7.4', fr: 30, ip: 0, op: 60, w: size, h: size, nm: 'fallback', ddd: 0, assets: [], layers: [
            { ddd: 0, ind: 1, ty: 4, nm: 'pulse', sr: 1, ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [size/2, size/2, 0] }, a: { a: 0, k: [0,0,0] }, s: { a: 1, k: [ { t: 0, s: [80,80,100] }, { t: 30, s: [100,100,100] }, { t: 60, s: [80,80,100] } ] } }, shapes: [ { ty: 'el', p: { a: 0, k: [0,0] }, s: { a: 0, k: [size*0.5, size*0.5] }, nm: 'ellipse' }, { ty: 'fl', c: { a: 0, k: [0.1,0.5,1,1] }, o: { a: 0, k: 100 }, nm: 'fill' } ], ip: 0, op: 60, st: 0, bm: 0 }
          ]});
      } finally {
        // no-op
      }
    };
    load();
    return () => { cancelled = true };
  }, [src, size]);

  React.useEffect(() => {
    if (!ref.current || !animationData) return;
    animRef.current = lottie.loadAnimation({
      container: ref.current,
      renderer: 'svg',
      loop,
      autoplay,
      animationData,
    });
    return () => {
      animRef.current?.destroy?.();
    };
  }, [animationData, loop, autoplay]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div ref={ref} style={{ width: size, height: size }} />
      {label && <p className="mt-2 text-gray-600 text-sm">{label}</p>}
    </div>
  );
};

export default LottieLoader;
