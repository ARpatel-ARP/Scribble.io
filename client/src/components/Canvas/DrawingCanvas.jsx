import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import './Canvas.css'

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
]

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
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const isDrawingRef = useRef(false)
  const currentStrokeRef = useRef(null)
  const strokesRef = useRef([])
  const ctxRef = useRef(null)
  const lastPosRef = useRef(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current && canvasRef.current) {
      ctxRef.current = canvasRef.current.getContext('2d')
    }
    return ctxRef.current
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'

    const ctx = getCtx()
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    redrawAll()
  }, [getCtx])

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    strokesRef.current.forEach((stroke) => {
      drawStroke(ctx, stroke)
    })
  }, [getCtx])

  const drawStroke = (ctx, stroke) => {
    if (!stroke || !stroke.points || stroke.points.length === 0) return

    ctx.save()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over'

    const points = stroke.points
    if (points.length === 1) {
      ctx.beginPath()
      ctx.arc(points[0].x, points[0].y, stroke.size / 2, 0, Math.PI * 2)
      ctx.fillStyle = stroke.color
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const midX = (points[i - 1].x + points[i].x) / 2
        const midY = (points[i - 1].y + points[i].y) / 2
        ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, midX, midY)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  const getPos = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const handleStart = useCallback(
    (e) => {
      if (!canDraw) return
      e.preventDefault()
      const pos = getPos(e)
      isDrawingRef.current = true
      lastPosRef.current = pos

      const stroke = {
        color: tool === 'eraser' ? '#FAF9F5' : brushColor,
        size: tool === 'eraser' ? brushSize * 2.5 : brushSize,
        tool,
        points: [pos],
      }
      currentStrokeRef.current = stroke

      if (onStrokeStart) onStrokeStart(stroke)
    },
    [canDraw, brushColor, brushSize, tool, onStrokeStart],
  )

  const handleMove = useCallback(
    (e) => {
      if (!isDrawingRef.current || !canDraw) return
      e.preventDefault()
      const pos = getPos(e)
      const ctx = getCtx()
      if (!ctx) return

      const stroke = currentStrokeRef.current
      if (!stroke) return

      stroke.points.push(pos)

      ctx.save()
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = stroke.size
      ctx.globalCompositeOperation =
        stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      const midX = (lastPosRef.current.x + pos.x) / 2
      const midY = (lastPosRef.current.y + pos.y) / 2
      ctx.quadraticCurveTo(lastPosRef.current.x, lastPosRef.current.y, midX, midY)
      ctx.stroke()
      ctx.restore()

      lastPosRef.current = pos

      if (onStrokeMove) onStrokeMove(stroke)
    },
    [canDraw, getCtx, onStrokeMove],
  )

  const handleEnd = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false

    const stroke = currentStrokeRef.current
    if (stroke && stroke.points.length > 0) {
      strokesRef.current.push(stroke)
      if (onStrokeEnd) onStrokeEnd(stroke)
    }
    currentStrokeRef.current = null
    lastPosRef.current = null
  }, [onStrokeEnd])

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        strokesRef.current = []
        redrawAll()
      },
      undo: () => {
        strokesRef.current.pop()
        redrawAll()
      },
      getStrokes: () => strokesRef.current,
      loadStrokes: (newStrokes) => {
        strokesRef.current = [...newStrokes]
        redrawAll()
      },
    }),
    [redrawAll],
  )

  useEffect(() => {
    resizeCanvas()
    const handleResize = () => resizeCanvas()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [resizeCanvas])

  useEffect(() => {
    if (clearSignal > 0) {
      strokesRef.current = []
      redrawAll()
      if (onCanvasCleared) onCanvasCleared()
    }
  }, [clearSignal, redrawAll, onCanvasCleared])

  useEffect(() => {
    if (undoSignal > 0) {
      strokesRef.current.pop()
      redrawAll()
    }
  }, [undoSignal, redrawAll])

  useEffect(() => {
    if (remoteStrokes && remoteStrokes.length > 0) {
      const newStrokes = [...strokesRef.current, ...remoteStrokes]
      strokesRef.current = newStrokes
      redrawAll()
    }
  }, [remoteStrokes, redrawAll])

  return (
    <div className="canvas-wrapper" ref={containerRef}>
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
  )
})

export default DrawingCanvas
export { BRUSH_COLORS }
