import React from 'react';
import lottie from 'lottie-web';
// Static fallback JSON bundled into app (works on Vercel even if rewrites interfere)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - importing JSON as any
import builtinAnim from '../assets/lottie/AeqdDC7l8q.json';

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
  // Initialize with built-in JSON so animation shows instantly even if fetch fails on Vercel
  const [animationData, setAnimationData] = React.useState<any | null>(builtinAnim as any);
  // no error flag needed: builtin animation prevents fallback spinner

  React.useEffect(() => {
    // Skip on SSR/Edge prerender — run only in browser
    if (typeof window === 'undefined') return;
    // fetch animation json from public
    let cancelled = false;
    const load = async () => {
      try {
        // Race: try network first with short timeout, then fallback to builtin JSON
        const timeoutMs = 1500;
        const withTimeout = (p: Promise<Response>) => {
          return Promise.race([
            p,
            new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)) as any
          ]);
        };
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const tryPaths = [
          src,
          '/AeqdDC7l8q.json',
          '/assets/AeqdDC7l8q.json',
          origin ? `${origin}/AeqdDC7l8q.json` : undefined,
        ].filter(Boolean) as string[];
        let loaded: any | null = null;
        for (const p of tryPaths) {
          try {
            const res = await withTimeout(fetch(p, { cache: 'force-cache' }));
            if (!res.ok) continue;
            // Guard: ensure content-type is JSON, not HTML from SPA rewrite
            const ct = res.headers.get('content-type') || '';
            const text = await res.text();
            if (!/json/i.test(ct)) {
              // Some hosts may not set JSON type correctly; detect by content
              if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
                continue;
              }
            }
            const json = JSON.parse(text);
            loaded = json;
            break;
          } catch {}
        }
        // If nothing loaded from network, we already have builtin displayed
        if (!loaded) loaded = builtinAnim as any;
        if (!cancelled) setAnimationData(loaded);
      } catch (e) {
        // Network failed — we already show builtin animation, ignore
        console.warn('Lottie JSON network load failed; using builtin animation');
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
        className={!animationData ? 'relative' : undefined}
      >
        {(!animationData) && (
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
