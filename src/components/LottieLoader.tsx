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
const LottieLoader: React.FC<LottieLoaderProps> = ({
  className = '',
  size = 80,
  loop = true,
  autoplay = true,
  label = 'Loading...',
  // IMPORTANT: On Vercel, assets must be inside /public. Keep the default path there.
  src = '/AeqdDC7l8q.json'
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const animRef = React.useRef<any>(null);
  const [animationData, setAnimationData] = React.useState<any | null>(null);
  const [hadError, setHadError] = React.useState(false);

  React.useEffect(() => {
    // Skip on SSR/Edge prerender — run only in browser
    if (typeof window === 'undefined') return;
    // fetch animation json from public
    let cancelled = false;
    const load = async () => {
      try {
        const tryPaths = [
          src,
          '/AeqdDC7l8q.json',
          '/assets/AeqdDC7l8q.json'
        ];
        let loaded: any | null = null;
        for (const p of tryPaths) {
          try {
            const res = await fetch(p, { cache: 'force-cache' });
            if (!res.ok) continue;
            const json = await res.json();
            loaded = json;
            break;
          } catch {}
        }
        if (!loaded) throw new Error('Lottie JSON not found in public paths');
        if (!cancelled) setAnimationData(loaded);
      } catch (e) {
        console.warn('Lottie JSON load failed, using CSS spinner fallback:', e);
        if (!cancelled) setHadError(true);
      } finally {
        // no-op
      }
    };
    load();
    return () => { cancelled = true };
  }, [src, size]);

  React.useEffect(() => {
    if (!ref.current) return;
    // If we have JSON, render through Lottie; otherwise leave to CSS fallback
    if (animationData) {
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
    }
  }, [animationData, loop, autoplay]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Lottie container or CSS fallback */}
      <div
        ref={ref}
        style={{ width: size, height: size }}
        className={!animationData || hadError ? 'relative' : undefined}
      >
        {(!animationData || hadError) && (
          <div
            aria-label={label || 'Loading'}
            className="absolute inset-0 grid place-items-center"
          >
            {/* Tailwind CSS spinner fallback to avoid blue square */}
            <div
              className="h-3/5 w-3/5 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"
              style={{ borderTopColor: '#1E90FF' }}
            />
          </div>
        )}
      </div>
      {label && <p className="mt-2 text-gray-600 text-sm">{label}</p>}
    </div>
  );
};

export default LottieLoader;
