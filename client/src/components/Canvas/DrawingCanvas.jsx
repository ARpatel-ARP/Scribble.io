import {
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';

import './Canvas.css';

const BRUSH_COLORS = [
  '#292D25',
  '#B75C4C',
  '#75885B',
  '#626B4F',
  '#A5AC8A',
  '#E8EBDD',
  '#FAF9F5',
  '#C9A87C',
  '#5B7DA6',
  '#8B5CB5',
  '#D4A23A',
  '#3D8B8B',
];

const DrawingCanvas = forwardRef(function DrawingCanvas(
  {
    canDraw = false,
    brushColor = '#292D25',
    brushSize = 4,
    tool = 'pen',
    remoteStrokes = [],
    clearSignal = 0,
    undoSignal = 0,
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
    onCanvasCleared,
  },
  ref,
) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  // Strokes drawn locally.
  const strokesRef = useRef([]);

  // Strokes received from other players.
  const remoteStrokesRef = useRef(new Map());

  const ctxRef = useRef(null);
  const lastPosRef = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d');
    }


    return ctxRef.current;


  }, []);

  // Render one complete stroke.
  const drawStroke = useCallback((ctx, stroke) => {
    if (!stroke?.points?.length) return;


    ctx.save();

    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

    const points = stroke.points;

    // Draw a dot for a single-point stroke.
    if (points.length === 1) {
      ctx.beginPath();

      ctx.arc(
        points[0].x,
        points[0].y,
        stroke.size / 2,
        0,
        Math.PI * 2,
      );

      ctx.fill();
    } else {
      // Draw a smooth line through the stroke's points.
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        const midX = (points[i - 1].x + points[i].x) / 2;
        const midY = (points[i - 1].y + points[i].y) / 2;

        ctx.quadraticCurveTo(
          points[i - 1].x,
          points[i - 1].y,
          midX,
          midY,
        );
      }

      const lastPoint = points[points.length - 1];

      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
    }

    ctx.restore();


  }, []);

  // Clear and redraw the complete canvas.
  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();


    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Draw locally created strokes.
    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });

    // Draw strokes received from other players.
    remoteStrokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });


  }, [drawStroke, getCtx]);

  // Adjust canvas dimensions to its container.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;


    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = getCtx();

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    redrawAll();


  }, [getCtx, redrawAll]);

  // Convert mouse or touch coordinates into canvas coordinates.
  const getPos = useCallback((event) => {
    const canvas = canvasRef.current;


    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();

    const touch = event.touches?.[0] || event.changedTouches?.[0];

    const clientX = touch ? touch.clientX : event.clientX;
    const clientY = touch ? touch.clientY : event.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };


  }, []);

  // Begin a new stroke.
  const handleStart = useCallback(
    (event) => {
      if (!canDraw) return;


      event.preventDefault();

      const position = getPos(event);

      isDrawingRef.current = true;
      lastPosRef.current = position;

      const stroke = {
        id: crypto.randomUUID(),
        color: tool === 'eraser' ? '#FAF9F5' : brushColor,
        size: tool === 'eraser' ? brushSize * 2.5 : brushSize,
        tool,
        points: [position],
      };

      currentStrokeRef.current = stroke;

      const ctx = getCtx();

      if (ctx) {
        drawStroke(ctx, stroke);
      }

      onStrokeStart?.(stroke);
    },
    [
      canDraw,
      getPos,
      tool,
      brushColor,
      brushSize,
      getCtx,
      drawStroke,
      onStrokeStart,
    ],


  );

  // Update an active stroke.
  const handleMove = useCallback(
    (event) => {
      if (!isDrawingRef.current || !canDraw) return;


      event.preventDefault();

      const position = getPos(event);
      const ctx = getCtx();
      const stroke = currentStrokeRef.current;

      if (!ctx || !stroke || !lastPosRef.current) return;

      stroke.points.push(position);

      ctx.save();

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;

      ctx.globalCompositeOperation =
        stroke.tool === 'eraser' ? 'destination-out' : 'source-over';

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();

      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);

      const midX = (lastPosRef.current.x + position.x) / 2;
      const midY = (lastPosRef.current.y + position.y) / 2;

      ctx.quadraticCurveTo(
        lastPosRef.current.x,
        lastPosRef.current.y,
        midX,
        midY,
      );

      ctx.stroke();
      ctx.restore();

      lastPosRef.current = position;

      onStrokeMove?.(stroke);
    },
    [canDraw, getPos, getCtx, onStrokeMove],


  );

  // Finish the active stroke.
  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return;


    isDrawingRef.current = false;

    const stroke = currentStrokeRef.current;

    if (stroke?.points?.length) {
      strokesRef.current.push(stroke);
      onStrokeEnd?.(stroke);
    }

    currentStrokeRef.current = null;
    lastPosRef.current = null;


  }, [onStrokeEnd]);

  // Expose canvas operations to parent components.
  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        strokesRef.current = [];
        remoteStrokesRef.current.clear();


        currentStrokeRef.current = null;
        isDrawingRef.current = false;
        lastPosRef.current = null;

        redrawAll();
      },

      // Undo is synchronized through the server.
      // Do not independently pop a local stroke here.
      undo: () => { },

      getStrokes: () => strokesRef.current,

      loadStrokes: (newStrokes) => {
        strokesRef.current = [...newStrokes];
        redrawAll();
      },
    }),
    [redrawAll],


  );

  // Initialize and resize the canvas.
  useEffect(() => {
    resizeCanvas();


    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };


  }, [resizeCanvas]);

  // Apply a local clear request.
  useEffect(() => {
    if (clearSignal <= 0) return;


    strokesRef.current = [];
    remoteStrokesRef.current.clear();

    currentStrokeRef.current = null;
    isDrawingRef.current = false;
    lastPosRef.current = null;

    redrawAll();

    // Notify the parent so it can broadcast the clear to the server.
    onCanvasCleared?.();


  }, [clearSignal, redrawAll, onCanvasCleared]);

  // Undo requests are handled by the server.
  // This effect intentionally does not pop a local stroke.
  useEffect(() => {
    if (undoSignal <= 0) return;


    // The server's draw_undo event identifies the stroke to remove.


  }, [undoSignal]);

  // Apply server-authoritative undo and clear events.
  useEffect(() => {
    const handleUndo = (event) => {
      const { strokeId } = event.detail || {};


      if (!strokeId) return;

      strokesRef.current = strokesRef.current.filter(
        (stroke) => stroke.id !== strokeId,
      );

      remoteStrokesRef.current.delete(strokeId);

      if (currentStrokeRef.current?.id === strokeId) {
        currentStrokeRef.current = null;
        isDrawingRef.current = false;
        lastPosRef.current = null;
      }

      redrawAll();
    };

    const handleClear = () => {
      strokesRef.current = [];
      remoteStrokesRef.current.clear();

      currentStrokeRef.current = null;
      isDrawingRef.current = false;
      lastPosRef.current = null;

      redrawAll();
    };

    window.addEventListener('scribble:draw-undo', handleUndo);
    window.addEventListener('scribble:canvas-clear', handleClear);

    return () => {
      window.removeEventListener('scribble:draw-undo', handleUndo);
      window.removeEventListener('scribble:canvas-clear', handleClear);
    };


  }, [redrawAll]);

  // Synchronize the remote strokes received from App.jsx.
  useEffect(() => {
    if (!Array.isArray(remoteStrokes)) return;


    const remoteMap = remoteStrokesRef.current;

    remoteMap.clear();

    remoteStrokes.forEach((stroke) => {
      if (stroke?.id && Array.isArray(stroke.points)) {
        remoteMap.set(stroke.id, stroke);
      }
    });

    redrawAll();


  }, [remoteStrokes, redrawAll]);

  return (<div className="canvas-wrapper" ref={containerRef}>
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{ cursor: canDraw ? 'crosshair' : 'default' }}
    />


    {!canDraw && (
      <div className="canvas-overlay-badge">Viewing only</div>
    )}
  </div>


  );
});

export default DrawingCanvas;

export { BRUSH_COLORS };
