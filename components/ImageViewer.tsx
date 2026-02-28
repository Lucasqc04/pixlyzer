'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface ImageViewerProps {
  readonly src?: string;
  readonly imageData?: string;
  readonly alt: string;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onDownload?: () => void;
}

export default function ImageViewer({ src, imageData, alt, isOpen, onClose, onDownload }: ImageViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    globalThis.addEventListener('mouseup', handleMouseUp);
    return () => globalThis.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const applyZoomAtPoint = useCallback((nextZoom: number, cx: number, cy: number) => {
    nextZoom = clamp(nextZoom, 0.5, 5);
    setZoomLevel(prevZoom => {
      if (!imageRef.current) return nextZoom;
      if (prevZoom === nextZoom) return prevZoom;
      const rect = imageRef.current.getBoundingClientRect();
      const rx = (cx - rect.left) / rect.width;
      const ry = (cy - rect.top) / rect.height;
      setPosition(prevPos => {
        if (nextZoom <= 1) return { x: 0, y: 0 };
        const scaleDelta = nextZoom / prevZoom;
        const newX = (prevPos.x - (rx - 0.5) * rect.width) * scaleDelta + (rx - 0.5) * rect.width;
        const newY = (prevPos.y - (ry - 0.5) * rect.height) * scaleDelta + (ry - 0.5) * rect.height;
        return { x: newX, y: newY };
      });
      return nextZoom;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      applyZoomAtPoint(zoomLevel + 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      setZoomLevel(prev => Math.min(prev + 0.5, 5));
    }
  }, [zoomLevel, applyZoomAtPoint]);

  const handleZoomOut = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      applyZoomAtPoint(zoomLevel - 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2);
    } else {
      setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
    }
  }, [zoomLevel, applyZoomAtPoint]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!imageRef.current) return;
    const next = zoomLevel <= 1 ? 2 : 1;
    applyZoomAtPoint(next, e.clientX, e.clientY);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchRef.current = { distance: dist, zoom: zoomLevel };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2 && initialPinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const { distance, zoom } = initialPinchRef.current;
      if (distance > 0) {
        const scale = dist / distance;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        applyZoomAtPoint(zoom * scale, midX, midY);
      }
    } else if (isDragging) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      initialPinchRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    if (e.touches.length === 1 && now - lastTapRef.current < 300) {
      const t = e.touches[0];
      if (imageRef.current) {
        applyZoomAtPoint(zoomLevel <= 1 ? 2 : 1, t.clientX, t.clientY);
      }
      e.preventDefault();
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { clientX, clientY, deltaY, deltaMode } = e;
      let delta = deltaY;
      if (deltaMode === 1) delta *= 15;
      else if (deltaMode === 2) delta *= 100;
      const sensitivity = 300;
      const factor = 1 - delta / sensitivity;
      let targetZoom = zoomLevel * factor;
      applyZoomAtPoint(targetZoom, clientX, clientY);
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoomLevel, applyZoomAtPoint, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetView();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    globalThis.addEventListener('keydown', handleKey, { passive: false });
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, [isOpen, handleZoomIn, handleZoomOut, onClose]);

  const getImageUrl = () => {
    const imageSource = imageData || src;
    if (!imageSource) return '';
    if (imageSource.startsWith('http') || imageSource.startsWith('data:')) {
      return imageSource;
    }
    return `data:image/jpeg;base64,${imageSource}`;
  };

  const handleDirectDownload = () => {
    if (!src) return;

    try {
      const imageUrl = getImageUrl();
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `comprovante_${new Date().toISOString().split('T')[0]}.jpg`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }, 0);
    } catch (error) {
      console.error('Falha ao baixar imagem:', error);
    }
  };

  const handleDownloadClick = () => {
    if (onDownload) {
      onDownload();
    } else {
      handleDirectDownload();
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen) return null;

  const cursorStyle = isDragging || pointersRef.current.size === 2 ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'default';

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-black/90 pointer-events-none" />

      <div className="relative z-10 flex flex-col w-full h-full">
        <div className="w-full flex flex-wrap items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-black/80">
          <div className="text-white text-base sm:text-xl font-medium truncate max-w-[50%] sm:max-w-[60%]">
            {alt}
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 bg-black/40 px-3 py-2 rounded-full">
              <Button variant="ghost" size="sm" onClick={handleZoomOut} className="text-white hover:bg-black/40 p-2">
                <ZoomOut className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <span className="text-white text-sm sm:text-base font-medium">{(zoomLevel * 100).toFixed(0)}%</span>
              <Button variant="ghost" size="sm" onClick={handleZoomIn} className="text-white hover:bg-black/40 p-2">
                <ZoomIn className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRotate} className="text-white hover:bg-black/40 p-2 rounded-full">
              <RotateCw className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetView} className="text-white hover:bg-black/40 p-2 rounded-full">
              <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadClick}
              className="text-white hover:bg-black/40 p-2 rounded-full"
            >
              <Download className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-black/40 p-2 rounded-full">
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>
        </div>

        <div
          role="presentation"
          ref={containerRef}
          className="flex-1 w-full flex items-center justify-center overflow-hidden select-none"
          onPointerDown={(e) => { onPointerDown(e); handleMouseDown(e as any); }}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => { onPointerUp(e); handleMouseUp(); }}
          onPointerCancel={onPointerUp}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          style={{
            cursor: cursorStyle,
            touchAction: 'none'
          }}
        >
          <div
            className="p-4 bg-black/20 rounded-lg"
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`,
              transition: isDragging || pointersRef.current.size === 2 ? 'none' : 'transform 0.1s ease-out',
              maxWidth: '90%',
              maxHeight: '80vh'
            }}
          >
            <img
              ref={imageRef}
              src={getImageUrl()}
              alt={alt}
              className="max-h-[calc(80vh-120px)] max-w-full object-contain select-none shadow-xl"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                transition: (isDragging || pointersRef.current.size === 2) ? 'none' : 'transform 0.15s ease-out'
              }}
              draggable="false"
              onDragStart={e => e.preventDefault()}
            />
          </div>
        </div>

        <div className="py-3 sm:py-4 px-3 sm:px-6 text-white text-xs sm:text-sm bg-black/80 w-full text-center">
          <span className="hidden sm:inline">Use a roda do mouse para zoom • {zoomLevel > 1 ? 'Arraste para mover •' : ''} Botões no topo para mais opções</span>
          <span className="sm:hidden">Pinch para zoom • {zoomLevel > 1 ? 'Arraste para mover •' : ''} Toque nos ícones para mais opções</span>
        </div>
      </div>
    </div>
  );
}
