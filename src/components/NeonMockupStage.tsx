import React, { useEffect, useMemo, useRef, useState } from "react";

type NeonMockupStageProps = {
  lengthCm: number;       // reale längste Seite in cm
  waterproof: boolean;    // Outdoor (erzwingt outdoor_30% + Rain)
  neonOn: boolean;        // NEON-Glow an/aus (von deinem UI)
  uvOn: boolean;          // UV-Druck an/aus (von deinem UI)
  bgBrightness?: number;  // 0.30–1.60 (optional extern gesteuert)
  neonIntensity?: number; // 0.40–2.00 (optional extern gesteuert)
  selectedBackground?: string; // Manuell gewählter Hintergrund
  customMockupUrl?: string; // Кастомный MockUp URL из Monday.com
  onBackgroundChange?: (background: string) => void; // Callback für Hintergrundwechsel
  onWaterproofChange?: (isWaterproof: boolean) => void; // Callback für Wasserdicht-Änderungen
  onSvgUpload?: (svgContent: string | null) => void; // Callback für SVG Upload
  currentSvgContent?: string | null; // Aktueller SVG Content für diesen Design
  svgImageUrl?: string; // SVG URL как изображение (fallback для mockup)
  hideSettingsButton?: boolean; // Скрыть кнопку настроек (шестеренку)
};

// Reale Wandbreiten für jede Szene in cm
const SCENE_REAL_WIDTHS_CM: Record<string, number> = {
  "ab_20cm_50%": 250,    // 2,5 Meter Wandbreite
  "ab_100cm_50%": 400,   // 4 Meter Wandbreite  
  "ab_200cm_50%": 500,   // 5 Meter Wandbreite
  "outdoor_30%": 2000,   // 20 Meter Außenbereich
};

// Verfügbare Hintergründe mit Labels
const AVAILABLE_BACKGROUNDS = [
  { key: "ab_20cm_50%", label: "Klein (2,5m)", description: "Kleiner Raum" },
  { key: "ab_100cm_50%", label: "Mittel (4m)", description: "Mittlerer Raum" },
  { key: "ab_200cm_50%", label: "Groß (5m)", description: "Großer Raum" },
  { key: "outdoor_30%", label: "Outdoor (20m)", description: "Außenbereich" },
];

// Referenz-Viewport-Breite für Skalierung (Pixel)
const VIEWPORT_WIDTH_FOR_SCALING_PX = 400;

const INDOOR_BASE = 0.50;     // „50% kleiner"
const OUTDOOR_BASE = 0.30;    // „70% kleiner"
const GLOW_RADII_BASE = [1.9, 3.8, 6.6, 9.8];
const GLOW_ALPHA_BASE = [0.54, 0.40, 0.26, 0.15];

// % im Dateinamen müssen in der URL als %25 stehen
const encPct = (s:string) => s.replace(/%/g, '%25');

function pickSet(cm:number, outdoor:boolean){
  if(outdoor) return "outdoor_30%";
  if(cm < 100) return "ab_20cm_50%";
  if(cm < 200) return "ab_100cm_50%";
  return "ab_200cm_50%";
}
function parseColor(col?:string){
  if(!col || col==="none") return {r:255,g:255,b:255,a:1};
  col = String(col).trim();
  if(/^#([0-9a-f]{3})$/i.test(col)){const h=col.slice(1);return{r:parseInt(h[0]+h[0],16),g:parseInt(h[1]+h[1],16),b:parseInt(h[2]+h[2],16),a:1};}
  if(/^#([0-9a-f]{6})$/i.test(col)){const h=col.slice(1);return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:1};}
  const m = col.match(/^rgba?\(([^)]+)\)$/i);
  if(m){const p=m[1].split(",").map(s=>s.trim()); const [r,g,b]=p.slice(0,3).map(x=>x.endsWith("%")?2.55*parseFloat(x):parseFloat(x)); const a=p[3]!=null?parseFloat(p[3]):1; return {r,g,b,a:isNaN(a)?1:a};}
  const tmp=document.createElement("span"); tmp.style.color=col; document.body.appendChild(tmp);
  const cs=getComputedStyle(tmp).color; document.body.removeChild(tmp);
  return parseColor(cs||"#fff");
}
function mixWithWhite(color:string, whiteRatio=0.80){
  const c=parseColor(color); const r=Math.max(0,Math.min(1,whiteRatio));
  return `rgba(${Math.round(255*r + c.r*(1-r))},${Math.round(255*r + c.g*(1-r))},${Math.round(255*r + c.b*(1-r))},1)`;
}
function getStroke(el:Element){
  const a = (el as HTMLElement).getAttribute("stroke");
  if(a && a!=="none") return a;
  return (getComputedStyle(el as any).stroke || "#fff");
}
function getSW(el:Element){
  const a = (el as HTMLElement).getAttribute("stroke-width");
  if(a!=null && !isNaN(parseFloat(a))) return parseFloat(a);
  const s = getComputedStyle(el as any).strokeWidth;
  const n = parseFloat(s);
  return isNaN(n)?10:n;
}
function ensureViewBox(svg:SVGSVGElement){
  if(svg.hasAttribute("viewBox")) return;
  const w = parseFloat(svg.getAttribute("width")||"0") || 1000;
  const h = parseFloat(svg.getAttribute("height")||"0") || 1000;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
}
function sanitize(svg:SVGSVGElement){
  svg.querySelectorAll("script, link[rel=stylesheet]").forEach(n=>n.remove());
}

const NeonMockupStage: React.FC<NeonMockupStageProps> = ({
  lengthCm, waterproof, neonOn, uvOn,
  bgBrightness, neonIntensity,
  selectedBackground, customMockupUrl, onBackgroundChange, onWaterproofChange, onSvgUpload, currentSvgContent, svgImageUrl,
  hideSettingsButton = false
}) => {
  const planeRef = useRef<HTMLDivElement>(null);
  const svgRef   = useRef<SVGSVGElement|null>(null);
  const originalSvgRef = useRef<string>(''); // Store original SVG content

  // Debug logging для CRM проектов
  useEffect(() => {
    console.log('🎨 NeonMockupStage Props:', {
      hasCustomMockupUrl: !!customMockupUrl,
      hasSvgContent: !!currentSvgContent,
      hasSvgImageUrl: !!svgImageUrl,
      lengthCm,
      mockupUrl: customMockupUrl || 'none',
      svgUrl: svgImageUrl || 'none'
    });
  }, [customMockupUrl, currentSvgContent, svgImageUrl, lengthCm]);

  // State für manuell gewählten Hintergrund
  const [currentBackground, setCurrentBackground] = useState(selectedBackground || "ab_100cm_50%");

  // Fallback-States (falls Props nicht gesetzt sind)
  const [localBg, setLocalBg]       = useState(bgBrightness ?? 1.0);
  const [localNeon, setLocalNeon]   = useState(neonIntensity ?? 1.50);
  const [localNeonOn, setLocalNeonOn] = useState(neonOn);
  
  // Neon-Intensität Slider Animation (Hover + Timer)
  const [showNeonSlider, setShowNeonSlider] = useState(false);
  const neonSliderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Technische Ansicht und Vollbild States
  const [showTechnicalView, setShowTechnicalView] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [modalZoom, setModalZoom] = useState(1.0);
  const [modalDrag, setModalDrag] = useState({dx: 0, dy: 0});
  
  useEffect(()=>{ 
    console.log('🔄 NeonMockupStage: External neonOn changed to:', neonOn);
    setLocalNeonOn(neonOn); 
    // Если SVG уже загружен, обновляем неон сразу
    if (svgRef.current) {
      console.log('💡 Updating neon effect on existing SVG:', neonOn);
      toggleNeon(svgRef.current, neonOn, neonIntensity ?? localNeon);
    }
  }, [neonOn]);

  // Effect для загрузки SVG при смене дизайна
  useEffect(() => {
    if (currentSvgContent && currentSvgContent !== originalSvgRef.current) {
      console.log('🔄 Loading new SVG content. Length:', currentSvgContent.length);
      console.log('🔄 Current neon state - external neonOn:', neonOn, 'localNeonOn:', localNeonOn);
      
      // Очищаем URL reference если загружаем содержимое
      if (originalSvgRef.current && originalSvgRef.current.startsWith('http')) {
        console.log('🗑️ Clearing URL reference since we have SVG content');
        originalSvgRef.current = '';
      }
      
      originalSvgRef.current = currentSvgContent;
      
      const doc = new DOMParser().parseFromString(currentSvgContent, "image/svg+xml");
      const svg = doc.querySelector("svg") as SVGSVGElement | null;
      if (svg && planeRef.current) {
        console.log('✅ SVG parsed successfully');
        sanitize(svg); 
        ensureViewBox(svg);
        
        // Apply responsive sizing
        applyResponsiveSizing(svg);
        svg.setAttribute("preserveAspectRatio","xMidYMid meet");
        planeRef.current.innerHTML = ""; 
        planeRef.current.appendChild(svg);
        svgRef.current = svg;

        console.log('🔧 Processing SVG effects...');
        processAcrylic(svg);
        processUV(svg, uvOn);
        
        // Используем внешний neonOn для новой загрузки SVG
        const shouldEnableNeon = neonOn;
        console.log('⚡ Processing neon with state:', shouldEnableNeon, 'intensity:', neonIntensity ?? localNeon);
        processNeon(svg, shouldEnableNeon, neonIntensity ?? localNeon);
        
        setPlaneSizeByCm(lengthCm);
        
        // Обновляем локальное состояние неона
        setLocalNeonOn(shouldEnableNeon);
        
        console.log('✅ SVG fully processed and added to DOM');
      } else {
        console.error('❌ Failed to parse SVG or missing container');
      }
    } else if (!currentSvgContent && originalSvgRef.current) {
      // Очищаем SVG если currentSvgContent стал null
      console.log('🗑️ Clearing SVG content');
      originalSvgRef.current = '';
      if (planeRef.current) {
        planeRef.current.innerHTML = '';
      }
      svgRef.current = null;
    }
  }, [currentSvgContent, uvOn, neonOn, neonIntensity, localNeon, lengthCm]);

  // Effect для загрузки SVG по URL если нет содержимого
  useEffect(() => {
    // Загружаем SVG по URL только если нет SVG содержимого и есть URL
    if (!currentSvgContent && svgImageUrl && svgImageUrl !== 'undefined' && svgImageUrl !== originalSvgRef.current) {
      console.log('🔄 Attempting to load SVG content from URL:', svgImageUrl);
      console.log('🔍 SVG loading conditions: no content =', !currentSvgContent, ', has URL =', !!svgImageUrl);
      originalSvgRef.current = svgImageUrl;
      
      const loadSvgContent = async () => {
        try {
          // Метод 1: Прямая загрузка
          let response = await fetch(svgImageUrl, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'image/svg+xml,text/plain,*/*'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Direct fetch failed: HTTP ${response.status}`);
          }
          
          let svgText = await response.text();
          
          if (!svgText.includes('<svg')) {
            throw new Error('Response does not contain valid SVG');
          }
          
          console.log('✅ Successfully loaded SVG via direct fetch, length:', svgText.length);
          
          // Процессинг SVG
          const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
          const svg = doc.querySelector("svg") as SVGSVGElement | null;
          if (svg && planeRef.current) {
            console.log('✅ SVG parsed successfully from URL');
            sanitize(svg); 
            ensureViewBox(svg);
            
            // Apply responsive sizing
            applyResponsiveSizing(svg);
            svg.setAttribute("preserveAspectRatio","xMidYMid meet");
            planeRef.current.innerHTML = ""; 
            planeRef.current.appendChild(svg);
            svgRef.current = svg;

            console.log('🔧 Processing SVG effects from URL...');
            processAcrylic(svg);
            processUV(svg, uvOn);
            
            const shouldEnableNeon = neonOn;
            console.log('⚡ Processing neon from URL with state:', shouldEnableNeon, 'intensity:', neonIntensity ?? localNeon);
            processNeon(svg, shouldEnableNeon, neonIntensity ?? localNeon);
            
            setPlaneSizeByCm(lengthCm);
            setLocalNeonOn(shouldEnableNeon);
            
            console.log('✅ SVG from URL fully processed and added to DOM');
          }
          
        } catch (directError) {
          console.log('⚠️ Direct fetch failed, trying proxy method:', directError instanceof Error ? directError.message : 'Unknown error');
          
          try {
            // Метод 2: Загрузка через proxy сервер
            const proxyUrl = `http://localhost:3001/proxy-svg?url=${encodeURIComponent(svgImageUrl)}`;
            console.log('🌐 Trying proxy URL:', proxyUrl);
            
            const response = await fetch(proxyUrl, {
              method: 'GET',
              headers: {
                'Accept': 'image/svg+xml,text/plain,*/*'
              }
            });
            
            if (!response.ok) {
              throw new Error(`Proxy fetch failed: HTTP ${response.status}`);
            }
            
            const svgText = await response.text();
            
            if (!svgText.includes('<svg')) {
              throw new Error('Proxy response does not contain valid SVG');
            }
            
            console.log('✅ Successfully loaded SVG via proxy, length:', svgText.length);
            
            // Процессинг SVG
            const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
            const svg = doc.querySelector("svg") as SVGSVGElement | null;
            if (svg && planeRef.current) {
              console.log('✅ SVG parsed successfully from proxy');
              sanitize(svg); 
              ensureViewBox(svg);
              
              // Apply responsive sizing
              applyResponsiveSizing(svg);
              svg.setAttribute("preserveAspectRatio","xMidYMid meet");
              planeRef.current.innerHTML = ""; 
              planeRef.current.appendChild(svg);
              svgRef.current = svg;

              console.log('🔧 Processing SVG effects from proxy...');
              processAcrylic(svg);
              processUV(svg, uvOn);
              
              const shouldEnableNeon = neonOn;
              console.log('⚡ Processing neon from proxy with state:', shouldEnableNeon, 'intensity:', neonIntensity ?? localNeon);
              processNeon(svg, shouldEnableNeon, neonIntensity ?? localNeon);
              
              setPlaneSizeByCm(lengthCm);
              setLocalNeonOn(shouldEnableNeon);
              
              console.log('✅ SVG from proxy fully processed and added to DOM');
            }
            
          } catch (proxyError) {
            console.warn('⚠️ Both direct and proxy methods failed:', proxyError instanceof Error ? proxyError.message : 'Unknown error');
          }
        }
      };
      
      loadSvgContent();
    }
  }, [svgImageUrl, currentSvgContent, uvOn, neonOn, neonIntensity, localNeon, lengthCm]);

  // Function to apply responsive sizing to existing SVG
  const applyResponsiveSizing = (svg: SVGSVGElement) => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
    
    if (isMobile) {
      svg.setAttribute("width", "60%");
      svg.setAttribute("height", "60%");
      svg.style.maxWidth = "250px";
      svg.style.maxHeight = "180px";
    } else if (isTablet) {
      svg.setAttribute("width", "80%");
      svg.setAttribute("height", "80%");
      svg.style.maxWidth = "350px";
      svg.style.maxHeight = "250px";
    } else {
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.maxWidth = "none";
      svg.style.maxHeight = "none";
    }
  };

  // Handle window resize for responsive SVG
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        applyResponsiveSizing(svgRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [drag, setDrag] = useState({dx:0, dy:0});
  const [isDragging, setIsDragging] = useState(false);

  // Neon-Intensität Slider Auto-Hide (2 Sekunden)
  const showNeonSliderFor2Seconds = () => {
    setShowNeonSlider(true);
    
    // Clear existing timeout
    if (neonSliderTimeoutRef.current) {
      clearTimeout(neonSliderTimeoutRef.current);
    }
    
    // Set new timeout for 2 seconds
    neonSliderTimeoutRef.current = setTimeout(() => {
      setShowNeonSlider(false);
    }, 2000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (neonSliderTimeoutRef.current) {
        clearTimeout(neonSliderTimeoutRef.current);
      }
    };
  }, []);

  // Verwende manuell gewählten Hintergrund statt automatischer Auswahl
  const setName = currentBackground;
  const baseScale = setName==="outdoor_30%" ? OUTDOOR_BASE : INDOOR_BASE;
  
  // Dynamische Pixel-pro-Zentimeter Berechnung basierend auf realer Szenenbreite
  const dynamicPxPerCm = useMemo(() => {
    const realSceneWidthCm = SCENE_REAL_WIDTHS_CM[setName] || 300;
    // Berechne Pixel pro cm: Viewport-Breite / reale Szenenbreite * baseScale * Vergrößerungsfaktor
    // Alle Szenen bekommen Vergrößerung für bessere Sichtbarkeit
    const enlargementFactor = setName === "outdoor_30%" ? 15.0 : 4.0;
    const pxPerCm = (VIEWPORT_WIDTH_FOR_SCALING_PX / realSceneWidthCm) * baseScale * enlargementFactor;
    console.log(`📏 Dynamische Skalierung für ${setName}:`, {
      realSceneWidthCm,
      viewportWidth: VIEWPORT_WIDTH_FOR_SCALING_PX,
      baseScale,
      enlargementFactor,
      calculatedPxPerCm: pxPerCm
    });
    return pxPerCm;
  }, [setName, baseScale]);

  // Hintergrund wechseln
  const handleBackgroundChange = (newBackground: string) => {
    setCurrentBackground(newBackground);
    onBackgroundChange?.(newBackground);
    
    // Automatische Wasserdicht-Aktivierung bei Outdoor
    if (newBackground === "outdoor_30%") {
      // Aktiviere Wasserdicht bei Outdoor
      if (onWaterproofChange) {
        onWaterproofChange(true);
      } else {
        console.warn('⚠️ onWaterproofChange nicht verfügbar - Wasserdicht kann nicht automatisch aktiviert werden');
      }
    } else {
      // Deaktiviere Wasserdicht bei Indoor (S/M/L)
      if (onWaterproofChange) {
        onWaterproofChange(false);
      } else {
        console.warn('⚠️ onWaterproofChange nicht verfügbar - Wasserdicht kann nicht automatisch deaktiviert werden');
      }
    }
    
    // Reset drag position when changing background
    setDrag({dx: 0, dy: 0});
    // Auto-close options menu
    setOpen(false);
  };

  const S: Record<string, React.CSSProperties> = {
    scene:{position:"relative", inset:0, width:"100%", height:"100%", background:"#000", overflow:"hidden", borderRadius:12},
    layer:{position:"absolute", inset:0, backgroundPosition:"center", backgroundSize:"cover", backgroundRepeat:"no-repeat", pointerEvents:"none"},
    rain:{position:"absolute", inset:0, pointerEvents:"none", opacity:0.15, zIndex:4, overflow:"hidden"},
    planeWrap:{position:"absolute", inset:0, zIndex:2, pointerEvents:"none"},
    plane:{
      position:"absolute", left:"50%", top:"50%",
      transform:`translate(-50%,-130%) translate(${drag.dx.toFixed(2)}px, ${drag.dy.toFixed(2)}px) scale(1)`,
      width:"600px", height:"600px", display:"grid", placeItems:"center",
      filter:"drop-shadow(0 6px 14px rgba(0,0,0,.35))", cursor:"grab", pointerEvents:"auto", userSelect:"none", touchAction:"none"
    },
    gear:{position:"absolute", top:10, right:10, zIndex:7, background:"rgba(12,16,22,.55)", border:"1px solid #2a3342", backdropFilter:"blur(4px)", borderRadius:10, color:"#e8eef8"},
    gearBtn:{display:"inline-flex", alignItems:"center", gap:6, padding:"6px 8px", cursor:"pointer"},
    gearPanel:{padding:"10px 12px", display:"grid", gap:8, minWidth:220}
  };

  const baseUrl  = `/assets/${encPct(setName)}.png`;
  const mobelUrl = `/assets/${encPct(setName)}_mobel.png`;

  // Acrylic
  function firstShapeWithin(root:Element|null){ if(!root) return null; return root.querySelector("path, polygon, rect, ellipse, circle") as any; }
  function qRole(root:Element, id:string, data:string){ return (root.querySelector(`#${id}, [data-role="${data}"]`) as SVGGElement|null); }
  function addAcrylicOverlays(svg:SVGSVGElement, acrylicGroup:SVGGElement){
    try{
      const defs = svg.querySelector("defs") || svg.insertBefore(document.createElementNS(svg.namespaceURI,"defs"), svg.firstChild);
      const shape = firstShapeWithin(acrylicGroup); if(!shape) return;
      const cpId = `cp-${Math.random().toString(36).slice(2,7)}`;
      const clip = document.createElementNS(svg.namespaceURI,"clipPath");
      clip.setAttribute("id", cpId);
      clip.setAttribute("clipPathUnits","userSpaceOnUse");
      clip.appendChild(shape.cloneNode(true));
      defs.appendChild(clip);

      const bb = (acrylicGroup as any).getBBox();
      const x=bb.x, y=bb.y, w=bb.width, h=bb.height;

      const g = document.createElementNS(svg.namespaceURI,"g") as SVGGElement;
      g.setAttribute("clip-path", `url(#${cpId})`);
      g.setAttribute("pointer-events","none");
      (g.style as any).mixBlendMode = "screen";

      const base = document.createElementNS(svg.namespaceURI,"rect");
      base.setAttribute("x",`${x}`); base.setAttribute("y",`${y}`);
      base.setAttribute("width",`${w}`); base.setAttribute("height",`${h}`);
      base.setAttribute("fill","rgba(255,255,255,0.08)");
      g.appendChild(base);

      const right = document.createElementNS(svg.namespaceURI,"rect");
      right.setAttribute("x",`${x + w*0.80}`); right.setAttribute("y",`${y - h*0.30}`);
      right.setAttribute("width",`${w*0.40}`); right.setAttribute("height",`${h*1.60}`);
      right.setAttribute("fill","rgba(255,255,255,0.12)");
      right.setAttribute("transform",`rotate(-30 ${x + w*0.90} ${y + h/2})`);
      g.appendChild(right);

      const left = document.createElementNS(svg.namespaceURI,"rect");
      left.setAttribute("x",`${x - w*0.05}`); left.setAttribute("y",`${y - h*0.30}`);
      left.setAttribute("width",`${w*0.14}`); left.setAttribute("height",`${h*1.60}`);
      left.setAttribute("fill","rgba(255,255,255,0.08)");
      left.setAttribute("transform",`rotate(-30 ${x + w*0.10} ${y + h/2})`);
      g.appendChild(left);

      acrylicGroup.after(g);
    }catch(e){ console.error(e); }
  }
  function processAcrylic(svg:SVGSVGElement){
    const g = qRole(svg,"acrylic","acrylic");
    if(!g) return;
    g.querySelectorAll("path, polygon, rect, ellipse, circle").forEach((el:any)=>{
      el.removeAttribute("fill"); el.removeAttribute("fill-opacity");
      el.style.fill="none"; el.setAttribute("fill","none");
      el.setAttribute("stroke","rgba(255,255,255,0.30)");
      el.setAttribute("stroke-width","1.6");
      el.setAttribute("stroke-linecap","round");
      el.setAttribute("stroke-linejoin","round");
    });
    addAcrylicOverlays(svg, g);
  }
  
  // Technische Ansicht für Acryl (schwarz, 60% transparent)
  function processTechnicalAcrylic(svg:SVGSVGElement){
    const g = qRole(svg,"acrylic","acrylic");
    if(!g) return;
    g.querySelectorAll("path, polygon, rect, ellipse, circle").forEach((el:any)=>{
      el.removeAttribute("fill"); el.removeAttribute("fill-opacity");
      el.style.fill="rgba(0,0,0,0.6)"; // Schwarz, 60% transparent
      el.setAttribute("fill","rgba(0,0,0,0.6)");
      el.setAttribute("stroke","rgba(0,0,0,0.8)"); // Schwarzer Rand
      el.setAttribute("stroke-width","1");
      el.setAttribute("stroke-linecap","round");
      el.setAttribute("stroke-linejoin","round");
    });
    // Entferne Acryl-Overlays in technischer Ansicht
    g.parentElement?.querySelectorAll('g[clip-path]').forEach(overlay => {
      if (overlay !== g) overlay.remove();
    });
  }

  // Neon
  function isNeonCandidate(el:Element){
    const tag=el.tagName.toLowerCase();
    if(!["path","polyline","line","circle","ellipse"].includes(tag)) return false;
    const fill=((el as any).getAttribute("fill")||"").trim().toLowerCase();
    if(fill && fill!=="none" && fill!=="transparent") return false;
    return getSW(el) > 0 && !!getStroke(el);
  }
  function applyNeonGlow(el:HTMLElement, colStr:string, enabled:boolean, intensity:number){
    const w = getSW(el);
    const c = parseColor(colStr);
    if(enabled){
      const coreAlpha = Math.min(0.70, 0.24*intensity);
      const core = `drop-shadow(0 0 ${(w*0.7).toFixed(1)}px rgba(255,255,255,${coreAlpha}))`;
      const layers = GLOW_RADII_BASE.map((k,i)=>{
        const a = Math.min(0.95, GLOW_ALPHA_BASE[i]*intensity);
        return `drop-shadow(0 0 ${(w*k).toFixed(1)}px rgba(${c.r},${c.g},${c.b},${a}))`;
      }).join(" ");
      (el.style as any).filter = `${core} ${layers}`;
    } else (el.style as any).filter = "none";
  }
  function processNeon(svg:SVGSVGElement, enabled:boolean, intensity:number){
    const root = (svg.querySelector("#neon, [data-role='neon']") as SVGGElement) || svg;
    const cand = Array.from(root.querySelectorAll("path, polyline, line, circle, ellipse")).filter(isNeonCandidate) as HTMLElement[];
    cand.forEach(el=>{
      const orig = getStroke(el);
      const tube = mixWithWhite(orig,0.80);
      const col = parseColor(orig);
      el.classList.add("neon-line");
      el.setAttribute("data-neoncolor", `rgb(${Math.round(col.r)},${Math.round(col.g)},${Math.round(col.b)})`);
      el.setAttribute("fill","none"); (el.style as any).fill="none";
      el.setAttribute("stroke", tube);
      el.setAttribute("stroke-linecap","round"); el.setAttribute("stroke-linejoin","round");
      applyNeonGlow(el, el.getAttribute("data-neoncolor")||"#fff", enabled, intensity);
    });
  }
  
  // Technische Ansicht für Neon (originale Farben, keine Effekte)
  function processTechnicalNeon(svg:SVGSVGElement){
    const root = (svg.querySelector("#neon, [data-role='neon']") as SVGGElement) || svg;
    const cand = Array.from(root.querySelectorAll("path, polyline, line, circle, ellipse")).filter(isNeonCandidate) as HTMLElement[];
    cand.forEach(el=>{
      const originalColor = el.getAttribute("data-neoncolor") || getStroke(el);
      el.setAttribute("fill","none"); 
      el.style.fill="none";
      el.setAttribute("stroke", originalColor); // Originale Farbe
      el.setAttribute("stroke-width", "2"); // Standard Strichstärke
      el.setAttribute("stroke-linecap","round"); 
      el.setAttribute("stroke-linejoin","round");
      el.style.filter = "none"; // Keine Neon-Effekte
    });
  }
  function toggleNeon(svg:SVGSVGElement|null, enabled:boolean, intensity:number){
    if(!svg) return;
    svg.querySelectorAll(".neon-line").forEach((el:any)=>{
      const col = el.getAttribute("data-neoncolor") || "#fff";
      applyNeonGlow(el, col, enabled, intensity);
    });
  }
  function processUV(svg:SVGSVGElement, show:boolean){
    const uv = (svg.querySelector("#uv_print, [data-role='uv-print']") as SVGGElement);
    if(uv) uv.style.display = show ? "" : "none";
  }

  // Größen nach cm
  function setPlaneSizeByCm(cm:number){
    if(!svgRef.current || !planeRef.current) return;
    const vb = svgRef.current.getAttribute("viewBox")!.split(/\s+/).map(Number);
    const asp = (vb[2]>0 && vb[3]>0) ? (vb[2]/vb[3]) : 1;
    const pxLong = cm * dynamicPxPerCm;
    let w:number,h:number;
    if(asp>=1){ w = pxLong; h = w/asp; } else { h = pxLong; w = h*asp; }
    console.log(`📐 SVG Größe gesetzt:`, {
      lengthCm: cm,
      dynamicPxPerCm,
      calculatedPxLong: pxLong,
      finalWidth: w,
      finalHeight: h,
      aspectRatio: asp
    });
    planeRef.current.style.width  = `${w.toFixed(2)}px`;
    planeRef.current.style.height = `${h.toFixed(2)}px`;
  }

  // Ограничение движения для изображений Monday.com - разные ограничения для мокапов и SVG
  function clampToSceneForMockup(nextDX: number, nextDY: number) {
    const sceneRect = (planeRef.current!.parentElement as HTMLElement).getBoundingClientRect();
    
    if (customMockupUrl) {
      // Для мокапов (занимают весь контейнер) - более ограниченное движение
      const maxDX = sceneRect.width * 0.3;
      const minDX = -sceneRect.width * 0.3;
      const maxDY = sceneRect.height * 0.3;
      const minDY = -sceneRect.height * 0.3;
      
      const clampedDX = Math.max(minDX, Math.min(maxDX, nextDX));
      const clampedDY = Math.max(minDY, Math.min(maxDY, nextDY));
      
      console.log('🔧 Mockup clamp result:', { nextDX, nextDY, clampedDX, clampedDY, sceneSize: { width: sceneRect.width, height: sceneRect.height } });
      return { dx: clampedDX, dy: clampedDY };
    } else {
      // Для SVG (маленькие) - более свободное движение как раньше
      const maxDX = sceneRect.width * 2;
      const minDX = -sceneRect.width * 2;
      const maxDY = sceneRect.height * 2;
      const minDY = -sceneRect.height * 2;
      
      const clampedDX = Math.max(minDX, Math.min(maxDX, nextDX));
      const clampedDY = Math.max(minDY, Math.min(maxDY, nextDY));
      
      console.log('🔧 SVG clamp result:', { nextDX, nextDY, clampedDX, clampedDY, sceneSize: { width: sceneRect.width, height: sceneRect.height } });
      return { dx: clampedDX, dy: clampedDY };
    }
  }

  // Drag ohne Boden-Grenze (nur Randclamp)
  function clampToScene(nextDX:number, nextDY:number){
    const s = 1; // Feste Skalierung, da dynamicPxPerCm bereits die Größe steuert
    const sceneRect = (planeRef.current!.parentElement as HTMLElement).getBoundingClientRect();
    const pw = parseFloat(planeRef.current!.style.width)  || planeRef.current!.clientWidth;
    const ph = parseFloat(planeRef.current!.style.height) || planeRef.current!.clientHeight;
    const w = pw*s, h = ph*s;
    const cx = sceneRect.width/2, cy = sceneRect.height/2;
    const left = cx-w/2, right = cx+w/2, top = cy-h/2, bottom = cy+h/2;

    let L = left + nextDX, R = right + nextDX, T = top + nextDY, B = bottom + nextDY;
    if(L<0) nextDX += -L;
    if(R>sceneRect.width) nextDX -= (R - sceneRect.width);
    if(T<0) nextDY += -T;
    if(B>sceneRect.height) nextDY -= (B - sceneRect.height);
    return {dx: nextDX, dy: nextDY};
  }

  const dd = useRef({dragging:false, startX:0, startY:0, baseDX:0, baseDY:0, neonWasOn:false});

  // Обработчики событий для изображения Monday.com
  function onMockupPointerDown(e: React.PointerEvent) {
    console.log('🖱️ Pointer down on image:', e.type);
    if (showTechnicalView) return;
    e.preventDefault();
    e.stopPropagation();
    dd.current.dragging = true;
    setIsDragging(true);
    dd.current.startX = e.clientX;
    dd.current.startY = e.clientY;
    dd.current.baseDX = drag.dx;
    dd.current.baseDY = drag.dy;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dd.current.neonWasOn = localNeonOn;
    if(localNeonOn) toggleNeon(svgRef.current, false, neonIntensity ?? localNeon);
  }
  
  function onMockupPointerMove(e: React.PointerEvent) {
    if (showTechnicalView) return;
    if (!dd.current.dragging) return;
    e.preventDefault();
    e.stopPropagation();
    const tryDX = dd.current.baseDX + (e.clientX - dd.current.startX);
    const tryDY = dd.current.baseDY + (e.clientY - dd.current.startY);
    const cl = clampToSceneForMockup(tryDX, tryDY);
    console.log('🖱️ Moving image:', { tryDX, tryDY, clamped: cl });
    setDrag({ dx: cl.dx, dy: cl.dy });
  }
  
  function onMockupPointerUp(e: React.PointerEvent) {
    console.log('🖱️ Pointer up on image:', e.type);
    if (showTechnicalView) return;
    if (!dd.current.dragging) return;
    e.preventDefault();
    e.stopPropagation();
    dd.current.dragging = false;
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (dd.current.neonWasOn) setTimeout(() => toggleNeon(svgRef.current, true, neonIntensity ?? localNeon), 40);
  }

  function onPointerDown(e:React.PointerEvent){
    if (showTechnicalView) return; // Disable dragging in technical view
    dd.current.dragging = true;
    dd.current.startX = e.clientX; dd.current.startY = e.clientY;
    dd.current.baseDX = drag.dx;   dd.current.baseDY = drag.dy;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dd.current.neonWasOn = localNeonOn;
    if(localNeonOn) toggleNeon(svgRef.current, false, neonIntensity ?? localNeon); // Auto-Off
  }
  function onPointerMove(e:React.PointerEvent){
    if (showTechnicalView) return; // Disable dragging in technical view
    if(!dd.current.dragging) return;
    const tryDX = dd.current.baseDX + (e.clientX - dd.current.startX);
    const tryDY = dd.current.baseDY + (e.clientY - dd.current.startY);
    const cl = clampToScene(tryDX, tryDY);
    setDrag({dx:cl.dx, dy:cl.dy});
  }
  function onPointerUp(e:React.PointerEvent){
    if (showTechnicalView) return; // Disable dragging in technical view
    if(!dd.current.dragging) return;
    dd.current.dragging=false;
    try{ (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); }catch{}
    if(dd.current.neonWasOn) setTimeout(()=>toggleNeon(svgRef.current, true, neonIntensity ?? localNeon), 40); // Auto-On
  }

  // SVG-Loader im Overlay
  async function handlePickSvg(){
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".svg,image/svg+xml";
    inp.onchange = async () => {
      const f = inp.files?.[0]; if(!f) return;
      const txt = await f.text();
      originalSvgRef.current = txt; // Store original SVG content
      
      // Call the callback to save SVG in App state
      onSvgUpload?.(txt);
      
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const svg = doc.querySelector("svg") as SVGSVGElement | null;
      if(!svg) { alert("SVG nicht gefunden."); return; }
      sanitize(svg); ensureViewBox(svg);
      
      // Apply responsive sizing
      applyResponsiveSizing(svg);
      svg.setAttribute("preserveAspectRatio","xMidYMid meet");
      planeRef.current!.innerHTML = ""; planeRef.current!.appendChild(svg);
      svgRef.current = svg;

      processAcrylic(svg);
      processUV(svg, uvOn);
      processNeon(svg, localNeonOn, neonIntensity ?? localNeon);
      setPlaneSizeByCm(lengthCm);
    };
    inp.click();
  }

  useEffect(()=>{ if(svgRef.current) setPlaneSizeByCm(lengthCm); }, [lengthCm]);
  useEffect(()=>{ if(svgRef.current) setPlaneSizeByCm(lengthCm); }, [dynamicPxPerCm]); // Re-scale when scene changes
  useEffect(()=>{ if(svgRef.current) processUV(svgRef.current, uvOn); }, [uvOn]);
  useEffect(()=>{ 
    console.log('⚡ NeonMockupStage: Applying neon effect, localNeonOn:', localNeonOn, 'intensity:', neonIntensity ?? localNeon);
    toggleNeon(svgRef.current, localNeonOn, neonIntensity ?? localNeon); 
  }, [localNeonOn, neonIntensity, localNeon, setName]);
  useEffect(()=>{ // Drag → Transform anpassen
    planeRef.current && (planeRef.current.style.transform =
      `translate(-50%,-130%) translate(${drag.dx.toFixed(2)}px, ${drag.dy.toFixed(2)}px) scale(1)`);
  }, [drag.dx, drag.dy]);

  const [open, setOpen] = useState(false);

  // Modal Zoom-Funktionen (nur im Vollbild)
  const handleModalZoomIn = () => {
    setModalZoom(prev => Math.min(5.0, prev + 0.3));
  };

  const handleModalZoomOut = () => {
    setModalZoom(prev => Math.max(0.3, prev - 0.3));
  };

  const resetModalZoom = () => {
    setModalZoom(1.0);
    setModalDrag({dx: 0, dy: 0});
  };

  // Technische Ansicht umschalten
  const toggleTechnicalView = () => {
    setShowTechnicalView(prev => {
      const newValue = !prev;
      if (newValue) {
        // In technischer Ansicht: Nur Neon ausschalten, Acryl-Effekte bleiben
        if (svgRef.current) {
          toggleNeon(svgRef.current, false, neonIntensity ?? localNeon);
          processTechnicalAcrylic(svgRef.current);
        }
        setDrag({dx: 0, dy: 0});
      } else {
        // Zurück zur normalen Ansicht: Neon wieder einschalten, Acryl wiederherstellen
        if (svgRef.current) {
          processAcrylic(svgRef.current);
          toggleNeon(svgRef.current, localNeonOn, neonIntensity ?? localNeon);
        }
      }
      return newValue;
    });
  };

  // Original SVG für Download vorbereiten
  const downloadTechnicalSVG = () => {
    if (!originalSvgRef.current) {
      alert('Kein SVG geladen. Bitte laden Sie zuerst ein SVG hoch.');
      return;
    }
    
    // Use original unmodified SVG content
    const blob = new Blob([originalSvgRef.current], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'neon-design-original.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Modal drag functionality
  const modalDragRef = useRef({dragging: false, startX: 0, startY: 0, baseDX: 0, baseDY: 0});

  const handleModalPointerDown = (e: React.PointerEvent) => {
    modalDragRef.current.dragging = true;
    modalDragRef.current.startX = e.clientX;
    modalDragRef.current.startY = e.clientY;
    modalDragRef.current.baseDX = modalDrag.dx;
    modalDragRef.current.baseDY = modalDrag.dy;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleModalPointerMove = (e: React.PointerEvent) => {
    if (!modalDragRef.current.dragging) return;
    const newDX = modalDragRef.current.baseDX + (e.clientX - modalDragRef.current.startX);
    const newDY = modalDragRef.current.baseDY + (e.clientY - modalDragRef.current.startY);
    setModalDrag({dx: newDX, dy: newDY});
  };

  const handleModalPointerUp = (e: React.PointerEvent) => {
    if (!modalDragRef.current.dragging) return;
    modalDragRef.current.dragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Vollbild Modal öffnen
  const openZoomModal = () => {
    setShowZoomModal(true);
    setModalZoom(1.0);
    setModalDrag({dx: 0, dy: 0});
  };

  return (
    <>
    <div style={S.scene} className={showTechnicalView ? 'bg-gray-200' : ''}>
      {/* Показываем фоновые элементы только если нет мокапа */}
      {!customMockupUrl && (
        <>
          {/* Base */}
          <div style={{
            ...S.layer, zIndex:0,
            filter: showTechnicalView ? 'none' : `brightness(${(bgBrightness ?? localBg)})`,
            backgroundImage: showTechnicalView ? 'none' : `url(${baseUrl})`,
            backgroundColor: showTechnicalView ? '#4b5563' : 'transparent'
          }}/>
          {/* Möbel (oberhalb SVG) */}
          {!showTechnicalView && <div style={{
            ...S.layer, zIndex:3,
            backgroundImage:`url(${mobelUrl})`
          }}/>}
          {/* Rain (12%) */}
          {(setName==="outdoor_30%" && waterproof && !showTechnicalView) && (
            <div style={S.rain}>
              {/* CSS Rain Effect */}
              {Array.from({ length: 120 }).map((_, i) => (
                <div
                  key={i}
                  className="raindrop"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${0.3 + Math.random() * 0.8}s`
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* SVG-Plane - показываем только если нет мокапа */}
      {!customMockupUrl && (
        <div style={S.planeWrap}>
          <div
            data-mockup-stage
            ref={planeRef}
            style={{
              ...S.plane,
              transform: `translate(-50%,-130%) translate(${drag.dx.toFixed(2)}px, ${drag.dy.toFixed(2)}px) scale(1)`,
              cursor: showTechnicalView ? 'default' : 'grab'
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={openZoomModal}
          />
        </div>
      )}
        
      {/* Monday.com MockUp/SVG Image */}
      {(customMockupUrl || svgImageUrl) && !showTechnicalView && (
        <div
          style={{
            position: 'absolute',
            left: customMockupUrl ? '0' : '50%', // Мокап на весь контейнер, SVG по центру
            top: customMockupUrl ? '0' : '50%',
            width: customMockupUrl ? '100%' : `${Math.min(lengthCm * 2, 300)}px`, // Мокап на весь контейнер, SVG фиксированный размер
            height: customMockupUrl ? '100%' : `${Math.min(lengthCm * 1, 200)}px`,
            transform: customMockupUrl 
              ? 'none' // Мокап неподвижен
              : `translate(-50%,-50%) translate(${drag.dx.toFixed(2)}px, ${drag.dy.toFixed(2)}px) scale(1)`, // SVG подвижен
            backgroundImage: `url(${customMockupUrl || svgImageUrl})`,
            backgroundSize: customMockupUrl ? 'cover' : 'contain', // Мокап заполняет, SVG сохраняет пропорции
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            cursor: customMockupUrl ? 'default' : (isDragging ? 'grabbing' : 'grab'), // Мокап без курсора захвата
            zIndex: customMockupUrl ? 0 : 1, // Мокап под всем, SVG над фоном
            pointerEvents: customMockupUrl ? 'none' : 'auto', // Мокап нельзя захватывать
            userSelect: 'none',
            touchAction: 'none',
          }}
          onPointerDown={customMockupUrl ? undefined : onMockupPointerDown} // Мокап не реагирует на события
          onPointerMove={customMockupUrl ? undefined : onMockupPointerMove}
          onPointerUp={customMockupUrl ? undefined : onMockupPointerUp}
          onPointerCancel={customMockupUrl ? undefined : onMockupPointerUp}
          onDoubleClick={openZoomModal}
          title={customMockupUrl ? "MockUp изображение" : "SVG изображение (перетащите для перемещения)"}
        />
      )}

      {/* Technische Ansicht Button */}
      {/* Neon An/Aus Toggle - Floating Button */}
      {!showTechnicalView && (
        <div 
          className="absolute top-4 left-4 z-10"
          onMouseEnter={showNeonSliderFor2Seconds}
          onMouseLeave={() => {
            // Clear timeout when mouse leaves the area
            if (neonSliderTimeoutRef.current) {
              clearTimeout(neonSliderTimeoutRef.current);
            }
            // Hide after short delay
            neonSliderTimeoutRef.current = setTimeout(() => {
              setShowNeonSlider(false);
            }, 300);
          }}
        >
          <button
            onClick={() => {
              const newValue = !localNeonOn;
              setLocalNeonOn(newValue);
              toggleNeon(svgRef.current, newValue, neonIntensity ?? localNeon);
              // Show intensity slider for 2 seconds when toggling neon
              showNeonSliderFor2Seconds();
            }}
            className={`w-12 h-12 rounded-full backdrop-blur-sm border transition-all duration-300 flex items-center justify-center shadow-lg ${
              localNeonOn
                ? 'bg-yellow-500/90 text-white border-yellow-400 hover:bg-yellow-600/90'
                : 'bg-gray-800/90 text-gray-300 border-gray-600 hover:bg-gray-700/90'
            }`}
            title={localNeonOn ? 'Neon ausschalten' : 'Neon einschalten'}
          >
            {localNeonOn ? (
              // Lampe AN - Gefüllte Glühbirne
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z"/>
              </svg>
            ) : (
              // Lampe AUS - Outline Glühbirne
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            )}
          </button>

          {/* Neon-Intensität Slider - Versteckt mit Animation */}
          <div 
            className={`mt-2 transition-all duration-500 ease-in-out ${
              showNeonSlider 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg min-w-[140px]">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.2 3-3.3 3-5.7 0-3.9-3.1-7-7-7z"/>
                </svg>
                <span className="text-xs font-medium text-gray-700">Intensität</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">💫</span>
                <input 
                  type="range" 
                  min={0.40} 
                  max={2.00} 
                  step={0.05}
                  value={localNeon}
                  className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  onChange={(e) => {
                    const newIntensity = parseFloat(e.target.value);
                    setLocalNeon(newIntensity);
                    toggleNeon(svgRef.current, localNeonOn, newIntensity);
                    // Extend visibility when using slider
                    showNeonSliderFor2Seconds();
                  }}
                  title={`Neon-Intensität: ${(localNeon * 100).toFixed(0)}%`}
                />
                <span className="text-xs text-gray-500">🔥</span>
              </div>
              <div className="text-center mt-1">
                <span className="text-xs font-medium text-blue-600">{(localNeon * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kompakte Button-Leiste */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <button
          onClick={toggleTechnicalView}
          className={`w-10 h-10 rounded-lg transition-all duration-300 border backdrop-blur-sm flex items-center justify-center shadow-lg ${
            showTechnicalView
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white'
          }`}
          title={showTechnicalView ? 'Zurück zur Neon-Ansicht' : 'Technische Skizze anzeigen'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        
        {showTechnicalView && (
          <button
            onClick={downloadTechnicalSVG}
            className="w-10 h-10 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all duration-300 shadow-lg flex items-center justify-center"
            title="Original SVG-Datei herunterladen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}

        <button 
          onClick={()=>setOpen(v=>!v)}
          className={`w-10 h-10 rounded-lg transition-all duration-300 border backdrop-blur-sm flex items-center justify-center shadow-lg ${
            open 
              ? 'bg-blue-600 text-white border-blue-500' 
              : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white'
          }`}
          title="Weitere Optionen"
          style={{ display: hideSettingsButton ? 'none' : 'flex' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Technical View Indicator */}
      {showTechnicalView && (
        <div className="absolute bottom-4 left-4 z-10 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Original SVG</span>
        </div>
      )}

      {/* Zoom Controls für technische Ansicht */}
      {showTechnicalView && (
        <div className="absolute top-20 right-4 z-10 flex flex-col space-y-2">
          <button
            onClick={() => {
              // Zoom In für technische Ansicht
              const plane = planeRef.current;
              if (plane) {
                const currentScale = parseFloat(plane.style.transform.match(/scale\(([^)]+)\)/)?.[1] || '1');
                const newScale = Math.min(3.0, currentScale + 0.2);
                plane.style.transform = plane.style.transform.replace(/scale\([^)]+\)/, `scale(${newScale})`);
              }
            }}
            className="w-10 h-10 bg-white/90 hover:bg-white text-gray-700 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
            title="Vergrößern"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={() => {
              // Zoom Out für technische Ansicht
              const plane = planeRef.current;
              if (plane) {
                const currentScale = parseFloat(plane.style.transform.match(/scale\(([^)]+)\)/)?.[1] || '1');
                const newScale = Math.max(0.3, currentScale - 0.2);
                plane.style.transform = plane.style.transform.replace(/scale\([^)]+\)/, `scale(${newScale})`);
              }
            }}
            className="w-10 h-10 bg-white/90 hover:bg-white text-gray-700 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
            title="Verkleinern"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => {
              // Reset Zoom für technische Ansicht
              const plane = planeRef.current;
              if (plane) {
                plane.style.transform = plane.style.transform.replace(/scale\([^)]+\)/, 'scale(1)');
                setDrag({dx: 0, dy: 0});
              }
            }}
            className="w-10 h-10 bg-white/90 hover:bg-white text-gray-700 rounded-lg flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
            title="Zurücksetzen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {/* Vollbild hint */}
      {!showTechnicalView && (
        <div 
          className="absolute bottom-4 right-4 z-10 bg-black/50 text-white px-2 py-1 rounded-lg text-xs backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-all duration-300 hover:scale-105 active:scale-95"
          onClick={openZoomModal}
          title="Vollbild-Ansicht öffnen"
        >
          💡 Vollbild für Details
        </div>
      )}

      {/* Optionen Panel */}
      <div className="absolute top-16 right-4 z-10">
        
        {open && (
          <div className="absolute top-full right-0 mt-2 bg-white/95 rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px] backdrop-blur-sm">
            <div className="space-y-3">
              <button 
                onClick={()=> setDrag({dx:0,dy:0})} 
                className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Zentrieren
              </button>
              <button 
                onClick={() => {
                  handlePickSvg();
                  setOpen(false);
                }}
                className="w-full px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm font-medium transition-colors"
              >
                SVG laden…
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Neon-Intensität Slider - Vertikal unter Neon-Button */}
    </div>

    {/* Hintergrund-Auswahl - Unten links, klein und kompakt */}
    {!showTechnicalView && (
      <div className="absolute bottom-4 left-4 z-10 flex space-x-1">
      {AVAILABLE_BACKGROUNDS.map((bg) => (
        <button
          key={bg.key}
          onClick={() => handleBackgroundChange(bg.key)}
          className={`w-8 h-8 rounded-md text-xs font-bold transition-all duration-300 shadow-sm border ${
            currentBackground === bg.key
              ? 'bg-blue-600 text-white border-blue-500 scale-110'
              : 'bg-white/90 text-gray-700 border-gray-200 hover:bg-white hover:scale-105'
          }`}
          title={`${bg.label} - ${bg.description}`}
        >
          {bg.key === "ab_20cm_50%" ? "S" :
           bg.key === "ab_100cm_50%" ? "M" :
           bg.key === "ab_200cm_50%" ? "L" : "O"}
        </button>
      ))}
      </div>
    )}

    {/* Zoom Modal */}
    {showZoomModal && (
      <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50">
        <div className="relative w-full h-full bg-black overflow-hidden">
          {/* Modal Header */}
          <div className="absolute top-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-b border-gray-600 p-4 z-20 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Design-Detailansicht</h3>
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <button
                onClick={handleModalZoomIn}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-colors"
                title="Vergrößern"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button
                onClick={handleModalZoomOut}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-colors"
                title="Verkleinern"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <button
                onClick={resetModalZoom}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center justify-center transition-colors"
                title="Zurücksetzen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {/* Zoom Level Display */}
              <div className="bg-white/20 text-white px-3 py-1 rounded-lg text-sm font-medium">
                {(modalZoom * 100).toFixed(0)}%
              </div>
              
              <button
                onClick={downloadTechnicalSVG}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Original SVG</span>
              </button>
              <button
                onClick={() => setShowZoomModal(false)}
                className="text-white hover:text-gray-300 hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="pt-16 w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {(customMockupUrl || svgImageUrl) && !currentSvgContent ? (
              // Monday.com изображение в полном размере
              <div 
                style={{
                  transform: `translate(${modalDrag.dx}px, ${modalDrag.dy}px) scale(${modalZoom})`,
                  transformOrigin: 'center center',
                  cursor: modalZoom > 1 ? 'grab' : 'default',
                  width: `${lengthCm * 4}px`,
                  height: `${lengthCm * 2}px`,
                  backgroundImage: `url(${customMockupUrl || svgImageUrl})`,
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                }}
                onPointerDown={modalZoom > 1 ? handleModalPointerDown : undefined}
                onPointerMove={modalZoom > 1 ? handleModalPointerMove : undefined}
                onPointerUp={modalZoom > 1 ? handleModalPointerUp : undefined}
                onPointerCancel={modalZoom > 1 ? handleModalPointerUp : undefined}
              />
            ) : showTechnicalView ? (
              // Technische Ansicht: Original SVG
              originalSvgRef.current ? (
                <div 
                  className="bg-white rounded-lg p-6 shadow-2xl border border-gray-300"
                  style={{
                    transform: `translate(${modalDrag.dx}px, ${modalDrag.dy}px) scale(${modalZoom})`,
                    transformOrigin: 'center center',
                    cursor: modalZoom > 1 ? 'grab' : 'default',
                    maxWidth: '90vw',
                    maxHeight: '80vh'
                  }}
                  onPointerDown={modalZoom > 1 ? handleModalPointerDown : undefined}
                  onPointerMove={modalZoom > 1 ? handleModalPointerMove : undefined}
                  onPointerUp={modalZoom > 1 ? handleModalPointerUp : undefined}
                  onPointerCancel={modalZoom > 1 ? handleModalPointerUp : undefined}
                  dangerouslySetInnerHTML={{ 
                    __html: (() => {
                      // Parse original SVG und wende technische Darstellung an
                      const doc = new DOMParser().parseFromString(originalSvgRef.current, "image/svg+xml");
                      const svg = doc.querySelector("svg") as SVGSVGElement | null;
                      if (!svg) return '<p>SVG konnte nicht geladen werden</p>';
                      
                      // Technische Darstellung anwenden
                      sanitize(svg);
                      ensureViewBox(svg);
                      processTechnicalAcrylic(svg);
                      processTechnicalNeon(svg);
                      processUV(svg, uvOn);
                      
                      svg.setAttribute('width', '100%');
                      svg.setAttribute('height', '100%');
                      svg.style.maxWidth = '100%';
                      svg.style.maxHeight = '100%';
                      
                      return svg.outerHTML;
                    })()
                  }}
                />
              ) : (
                <div className="text-center text-white">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Kein SVG geladen</p>
                  <p className="text-sm mt-2 text-gray-400">Laden Sie zuerst ein SVG-Design</p>
                </div>
              )
            ) : (
              // Normale Ansicht: Bearbeitetes SVG mit Neon-Effekten
              svgRef.current ? (
                <div 
                  style={{
                    transform: `translate(${modalDrag.dx}px, ${modalDrag.dy}px) scale(${modalZoom})`,
                    transformOrigin: 'center center',
                    cursor: modalZoom > 1 ? 'grab' : 'default',
                    width: `${lengthCm * 4}px`, // Größe basierend auf lengthCm
                    height: `${lengthCm * 4 / (svgRef.current.viewBox?.baseVal?.width / svgRef.current.viewBox?.baseVal?.height || 1)}px`
                  }}
                  onPointerDown={modalZoom > 1 ? handleModalPointerDown : undefined}
                  onPointerMove={modalZoom > 1 ? handleModalPointerMove : undefined}
                  onPointerUp={modalZoom > 1 ? handleModalPointerUp : undefined}
                  onPointerCancel={modalZoom > 1 ? handleModalPointerUp : undefined}
                  dangerouslySetInnerHTML={{ 
                    __html: svgRef.current.outerHTML
                  }}
                />
              ) : (
                <div className="text-center text-white">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                  </svg>
                  <p>Kein Design geladen</p>
                  <p className="text-sm mt-2 text-gray-400">Laden Sie zuerst ein SVG-Design</p>
                </div>
              )
            )}
          </div>
          
          {/* Modal Zoom Level Indicator */}
          {modalZoom !== 1.0 && (
            <div className="absolute bottom-4 left-4 z-20 bg-white/20 text-white px-3 py-1 rounded-lg text-sm font-medium backdrop-blur-sm">
              Zoom: {(modalZoom * 100).toFixed(0)}%
            </div>
          )}
          
          {/* Drag Hint */}
          {modalZoom > 1 && (
            <div className="absolute bottom-4 right-4 z-20 bg-white/20 text-white px-3 py-1 rounded-lg text-xs backdrop-blur-sm">
              Ziehen zum Verschieben
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
};

export default NeonMockupStage;