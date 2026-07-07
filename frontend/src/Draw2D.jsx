import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Trash2, PenTool, Eraser, Undo2, Redo2, MousePointer2, Copy, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff, PaintBucket, Circle, Square, Shapes, Triangle, Pentagon, Minus, RotateCw, Download, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import './index.css';

function CustomCursor({ tool, brushColor }) {
  const cursorRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (cursorRef.current) {
        const style = window.getComputedStyle(e.target);
        if (style.cursor !== 'auto' && style.cursor !== 'none' && style.cursor !== 'crosshair') {
          cursorRef.current.style.opacity = 0;
        } else {
          cursorRef.current.style.opacity = 1;
          cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getIcon = () => {
    switch (tool) {
      case 'pen': return <PenTool size={24} color={brushColor} />;
      case 'eraser': return <Eraser size={24} color="#000" />;
      case 'fill': return <PaintBucket size={24} color={brushColor} />;
      case 'shape': return <Shapes size={24} color={brushColor} />;
      default: return null;
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  return (
    <div
      ref={cursorRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        transform: 'translate3d(-100px, -100px, 0)',
        marginLeft: tool === 'pen' ? '-2px' : '-12px',
        marginTop: tool === 'pen' ? '-22px' : '-12px',
        transition: 'opacity 0.1s ease-in-out'
      }}
    >
      {icon}
    </div>
  );
}

export default function Draw2D({ isVirtualCanvas = false, virtualCanvasShape = 'plane', onVirtualCanvasComplete, onVirtualCanvasCancel }) {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'lasso'
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(4);
  const [penShape, setPenShape] = useState('round');
  const [textInput, setTextInput] = useState('');
  const [textSize, setTextSize] = useState(24);
  const [showUI, setShowUI] = useState(true);
  
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastSavedIndex, setLastSavedIndex] = useState(0);
  const [showConfirmHome, setShowConfirmHome] = useState(false);
  const [showVirtualCompleteConfirm, setShowVirtualCompleteConfirm] = useState(false);
  const [showVirtualCancelConfirm, setShowVirtualCancelConfirm] = useState(false);
  const [globalZoom, setGlobalZoom] = useState(1);

  const [cubeFaceIndex, setCubeFaceIndex] = useState(4); // 4 = Front
  const [cubeFacesState, setCubeFacesState] = useState(
    Array(6).fill(null).map(() => ({ history: [], historyIndex: -1 }))
  );

  const [shapeType, setShapeType] = useState('circle');
  const [shapeStart, setShapeStart] = useState(null);
  const [shapeCurrent, setShapeCurrent] = useState(null);

  const [lassoPoints, setLassoPoints] = useState([]);
  const [selection, setSelection] = useState(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, selX: 0, selY: 0 });
  const [showSubMenu, setShowSubMenu] = useState(true);

  const baseColors = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7'];
  const [savedColors, setSavedColors] = useState([]);
  const brushSizeMap = { 1: 2, 2: 5, 3: 8, 4: 12, 5: 18 };
  const eraserSizeMap = { 1: 5, 2: 12, 3: 24, 4: 40, 5: 60 };

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    setHistory(prev => {
      let newHistory = prev.slice(0, historyIndex + 1);
      if (newHistory[newHistory.length - 1] === dataUrl) return newHistory;
      newHistory.push(dataUrl);
      if (newHistory.length > 19) {
        newHistory = newHistory.slice(newHistory.length - 19);
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const updateSize = () => {
      if (!container) return;
      const dataUrl = canvas.toDataURL();
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      
      contextRef.current = context;
      
      if (dataUrl !== 'data:,') {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          context.drawImage(img, 0, 0, width, height);
        };
      }
    };
    
    updateSize();
    saveHistory();

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFaceSwitch = (newIndex) => {
    if (newIndex === cubeFaceIndex) return;

    const nextFaces = [...cubeFacesState];
    nextFaces[cubeFaceIndex] = { history: [...history], historyIndex };
    setCubeFacesState(nextFaces);

    const loadFace = nextFaces[newIndex];
    setHistory(loadFace.history);
    setHistoryIndex(loadFace.historyIndex);

    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (loadFace.historyIndex >= 0 && loadFace.history.length > 0) {
      const img = new Image();
      img.src = loadFace.history[loadFace.historyIndex];
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
      };
    }

    setCubeFaceIndex(newIndex);
  };

  const commitSelectionToCanvas = (sel) => {
    const ctx = contextRef.current;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(sel.x + sel.width / 2, sel.y + sel.height / 2);
    ctx.scale((sel.scaleX || 1) * (sel.zoom || 1), (sel.scaleY || 1) * (sel.zoom || 1));
    if (sel.rotation) {
      ctx.rotate(sel.rotation * Math.PI / 180);
    }
    ctx.drawImage(
      sel.canvas,
      -sel.width / 2, -sel.height / 2,
      sel.width, sel.height
    );
    ctx.restore();
  };

  const commitSelection = () => {
    if (selection) {
      commitSelectionToCanvas(selection);
      setSelection(null);
      saveHistory();
    }
  };

  const handleToolChange = (newTool) => {
    if (selection) commitSelection();

    if (tool === newTool) {
      if (newTool === 'shape' || newTool === 'text') {
        setShowSubMenu(!showSubMenu);
      }
    } else {
      setTool(newTool);
      if (newTool === 'shape' || newTool === 'text') {
        setShowSubMenu(true);
      } else {
        setShowSubMenu(false);
      }
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      if (selection) setSelection(null);
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      img.src = history[newIndex];
      img.onload = () => {
        context.globalCompositeOperation = 'source-over';
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
      };
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      if (selection) setSelection(null);
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      const img = new Image();
      img.src = history[newIndex];
      img.onload = () => {
        context.globalCompositeOperation = 'source-over';
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width / 2, canvas.height / 2);
      };
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (selection) setSelection(null);
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };


  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
      a: 255
    } : { r: 0, g: 0, b: 0, a: 255 };
  };

  const floodFill = (ctx, startX, startY, fillColorRgb) => {
    const canvas = canvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    if (startR === fillColorRgb.r && startG === fillColorRgb.g && startB === fillColorRgb.b && Math.abs(startA - fillColorRgb.a) < 5) {
      return;
    }

    const matchStartColor = (pos) => {
      return data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA;
    };

    const colorPixel = (pos) => {
      data[pos] = fillColorRgb.r;
      data[pos + 1] = fillColorRgb.g;
      data[pos + 2] = fillColorRgb.b;
      data[pos + 3] = 255;
    };

    const pixelStack = [[startX, startY]];

    while (pixelStack.length) {
      const newPos = pixelStack.pop();
      const x = newPos[0];
      let y = newPos[1];

      let pixelPos = (y * width + x) * 4;
      while (y-- >= 0 && matchStartColor(pixelPos)) {
        pixelPos -= width * 4;
      }
      pixelPos += width * 4;
      ++y;

      let reachLeft = false;
      let reachRight = false;

      while (y++ < height - 1 && matchStartColor(pixelPos)) {
        colorPixel(pixelPos);

        if (x > 0) {
          if (matchStartColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, y]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < width - 1) {
          if (matchStartColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([x + 1, y]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }

        pixelPos += width * 4;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const getCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    if (e.nativeEvent.touches && e.nativeEvent.touches.length > 0) {
      return {
        x: (e.nativeEvent.touches[0].clientX - rect.left) / globalZoom,
        y: (e.nativeEvent.touches[0].clientY - rect.top) / globalZoom
      };
    }
    return {
      x: (e.clientX - rect.left) / globalZoom,
      y: (e.clientY - rect.top) / globalZoom
    };
  };

  const createSelection = (points) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    
    minX = Math.floor(Math.max(0, minX - 2));
    minY = Math.floor(Math.max(0, minY - 2));
    maxX = Math.ceil(Math.min(canvasRef.current.width / 2, maxX + 2));
    maxY = Math.ceil(Math.min(canvasRef.current.height / 2, maxY + 2));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    if (width <= 0 || height <= 0) return null;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width * 2;
    tempCanvas.height = height * 2;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.scale(2, 2);
    
    tempCtx.beginPath();
    tempCtx.moveTo(points[0].x - minX, points[0].y - minY);
    for (let i = 1; i < points.length; i++) {
      tempCtx.lineTo(points[i].x - minX, points[i].y - minY);
    }
    tempCtx.closePath();
    tempCtx.fill();
    
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.drawImage(
      canvasRef.current,
      minX * 2, minY * 2, width * 2, height * 2,
      0, 0, width, height
    );

    const imageData = tempCtx.getImageData(0, 0, width * 2, height * 2);
    const data = imageData.data;
    const imgWidth = imageData.width;
    const imgHeight = imageData.height;
    let tightMinX = imgWidth, tightMinY = imgHeight, tightMaxX = 0, tightMaxY = 0;
    let hasPixels = false;

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        const alpha = data[(y * imgWidth + x) * 4 + 3];
        if (alpha > 0) {
          hasPixels = true;
          if (x < tightMinX) tightMinX = x;
          if (x > tightMaxX) tightMaxX = x;
          if (y < tightMinY) tightMinY = y;
          if (y > tightMaxY) tightMaxY = y;
        }
      }
    }

    if (!hasPixels) return null;

    tightMinX = Math.max(0, tightMinX - 2);
    tightMinY = Math.max(0, tightMinY - 2);
    tightMaxX = Math.min(width * 2, tightMaxX + 2);
    tightMaxY = Math.min(height * 2, tightMaxY + 2);

    tightMinX = tightMinX / 2;
    tightMaxX = tightMaxX / 2;
    tightMinY = tightMinY / 2;
    tightMaxY = tightMaxY / 2;

    const tightWidth = tightMaxX - tightMinX;
    const tightHeight = tightMaxY - tightMinY;

    if (tightWidth <= 0 || tightHeight <= 0) return null;

    const tightCanvas = document.createElement('canvas');
    tightCanvas.width = tightWidth * 2;
    tightCanvas.height = tightHeight * 2;
    const tightCtx = tightCanvas.getContext('2d');
    tightCtx.drawImage(
      tempCanvas,
      tightMinX * 2, tightMinY * 2, tightWidth * 2, tightHeight * 2,
      0, 0, tightWidth * 2, tightHeight * 2
    );

    return {
      canvas: tightCanvas,
      dataUrl: tightCanvas.toDataURL(),
      x: minX + tightMinX,
      y: minY + tightMinY,
      width: tightWidth,
      height: tightHeight,
      scaleX: 1,
      scaleY: 1,
      zoom: 1,
      rotation: 0
    };
  };

  const eraseSelectionFromMain = (points) => {
    const ctx = contextRef.current;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const startDrawing = (e) => {
    if (e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }
    const { x, y } = getCoordinates(e);




    if (tool === 'fill') {
      const ctx = contextRef.current;
      const startX = Math.floor(x * 2);
      const startY = Math.floor(y * 2);
      floodFill(ctx, startX, startY, hexToRgb(brushColor));
      saveHistory();
      return;
    }

    if (tool === 'eyedropper') {
      const ctx = contextRef.current;
      const pixel = ctx.getImageData(x * 2, y * 2, 1, 1).data;
      if (pixel[3] > 0) {
        const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        setBrushColor(hex);
        setSavedColors(prev => {
          if (prev.includes(hex)) return prev;
          const newSaved = [...prev, hex];
          if (newSaved.length > 5) return newSaved.slice(newSaved.length - 5);
          return newSaved;
        });
        setTool('pen');
      }
      return;
    }

    if (tool === 'text') {
      if (!textInput) return;
      const ctx = contextRef.current;
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `${textSize}px sans-serif`;
      ctx.fillStyle = brushColor;
      ctx.fillText(textInput, x, y);
      saveHistory();
      return;
    }

    if (tool === 'lasso' && selection) {
      const cx = selection.x + selection.width / 2;
      const cy = selection.y + selection.height / 2;
      let dx = x - cx;
      let dy = y - cy;
      const angle = -(selection.rotation || 0) * Math.PI / 180;
      const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
      const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
      const scaleX = (selection.scaleX || 1) * (selection.zoom || 1);
      const scaleY = (selection.scaleY || 1) * (selection.zoom || 1);
      const sx = rx / scaleX;
      const sy = ry / scaleY;

      if (
        sx >= -selection.width / 2 && sx <= selection.width / 2 &&
        sy >= -selection.height / 2 && sy <= selection.height / 2
      ) {
        setIsDraggingSelection(true);
        setDragStart({ x, y, selX: selection.x, selY: selection.y });
        return;
      }
      commitSelection();
      return;
    }

    if (tool === 'shape') {
      setShapeStart({ x, y });
      setShapeCurrent({ x, y });
      setIsDrawing(true);
      return;
    }

    if (tool === 'lasso') {
      setLassoPoints([{x, y}]);
      setIsDrawing(true);
      return;
    }

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    
    if (tool === 'eraser') {
      contextRef.current.globalCompositeOperation = 'destination-out';
      contextRef.current.strokeStyle = 'rgba(0,0,0,1)';
      contextRef.current.lineWidth = eraserSizeMap[eraserSize];
    } else {
      contextRef.current.globalCompositeOperation = 'source-over';
      contextRef.current.strokeStyle = brushColor;
      contextRef.current.lineWidth = brushSizeMap[brushSize];
    }
    contextRef.current.lineCap = penShape === 'round' ? 'round' : 'square';
    contextRef.current.lineJoin = penShape === 'round' ? 'round' : 'miter';
    
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (tool === 'lasso' && isDraggingSelection && selection) {
      const { x, y } = getCoordinates(e);
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      setSelection(prev => ({
        ...prev,
        x: dragStart.selX + dx,
        y: dragStart.selY + dy
      }));
      return;
    }

    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);

    if (tool === 'shape' && isDrawing) {
      setShapeCurrent({ x, y });
      return;
    }

    if (tool === 'lasso') {
      setLassoPoints(prev => [...prev, {x, y}]);
      return;
    }

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const finishDrawing = (e) => {
    if (e && e.target && e.target.releasePointerCapture && e.target.hasPointerCapture && e.target.hasPointerCapture(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
    if (tool === 'lasso' && isDraggingSelection) {
      setIsDraggingSelection(false);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'shape') {
      if (isDrawing && shapeStart && shapeCurrent) {
        const ctx = contextRef.current;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSizeMap[brushSize];
        ctx.lineCap = penShape === 'round' ? 'round' : 'square';
        ctx.lineJoin = penShape === 'round' ? 'round' : 'miter';
        
        ctx.beginPath();
        if (shapeType === 'circle') {
          const radius = Math.sqrt(Math.pow(shapeCurrent.x - shapeStart.x, 2) + Math.pow(shapeCurrent.y - shapeStart.y, 2));
          ctx.arc(shapeStart.x, shapeStart.y, radius, 0, 2 * Math.PI);
        } else if (shapeType === 'square') {
          const width = shapeCurrent.x - shapeStart.x;
          const height = shapeCurrent.y - shapeStart.y;
          ctx.rect(shapeStart.x, shapeStart.y, width, height);
        } else if (shapeType === 'line') {
          ctx.moveTo(shapeStart.x, shapeStart.y);
          ctx.lineTo(shapeCurrent.x, shapeCurrent.y);
        } else if (shapeType === 'triangle') {
          ctx.moveTo(shapeStart.x + (shapeCurrent.x - shapeStart.x) / 2, shapeStart.y);
          ctx.lineTo(shapeCurrent.x, shapeCurrent.y);
          ctx.lineTo(shapeStart.x, shapeCurrent.y);
          ctx.closePath();
        } else if (shapeType === 'pentagon') {
          const radius = Math.sqrt(Math.pow(shapeCurrent.x - shapeStart.x, 2) + Math.pow(shapeCurrent.y - shapeStart.y, 2));
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
            const px = shapeStart.x + radius * Math.cos(angle);
            const py = shapeStart.y + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
        ctx.stroke();
        saveHistory();
      }
      setShapeStart(null);
      setShapeCurrent(null);
      setIsDrawing(false);
      return;
    }

    if (tool === 'lasso') {
      if (lassoPoints.length > 2) {
        const sel = createSelection(lassoPoints);
        if (sel) {
          eraseSelectionFromMain(lassoPoints);
          setSelection(sel);
        }
      }
      setLassoPoints([]);
      return;
    }

    contextRef.current.closePath();
    saveHistory();
  };

  const handleCopy = () => {
    if (selection) {
      commitSelectionToCanvas(selection);
      setSelection(prev => ({
        ...prev,
        x: prev.x + 20,
        y: prev.y + 20
      }));
    }
  };

  const handleFlip = (axis) => {
    if (selection) {
      setSelection(prev => ({
        ...prev,
        scaleX: axis === 'x' ? prev.scaleX * -1 : prev.scaleX,
        scaleY: axis === 'y' ? prev.scaleY * -1 : prev.scaleY
      }));
    }
  };

  const handleDeleteSelection = () => {
    setSelection(null);
    saveHistory();
  };

  const handleSave = () => {
    if (selection) commitSelection();
    if (!canvasRef.current) return;

    const filename = window.prompt("保存するファイル名を入力してください", "drawing");
    if (!filename) return;

    const canvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') || filename.endsWith('.jpeg') || filename.endsWith('.jpg') ? filename : `${filename}.png`;
    link.href = dataUrl;
    link.click();
    
    setLastSavedIndex(selection ? historyIndex + 1 : historyIndex);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        let tightMinX = img.width, tightMinY = img.height, tightMaxX = 0, tightMaxY = 0;
        let hasPixels = false;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
          const isBackground = a < 10 || (r > 250 && g > 250 && b > 250);
          if (isBackground) {
            data[i+3] = 0;
          } else {
            hasPixels = true;
            const x = (i / 4) % img.width;
            const y = Math.floor((i / 4) / img.width);
            if (x < tightMinX) tightMinX = x;
            if (x > tightMaxX) tightMaxX = x;
            if (y < tightMinY) tightMinY = y;
            if (y > tightMaxY) tightMaxY = y;
          }
        }
        
        if (!hasPixels) return;

        tightMinX = Math.max(0, tightMinX - 2);
        tightMinY = Math.max(0, tightMinY - 2);
        tightMaxX = Math.min(img.width, tightMaxX + 2);
        tightMaxY = Math.min(img.height, tightMaxY + 2);
        
        const tightWidth = tightMaxX - tightMinX;
        const tightHeight = tightMaxY - tightMinY;
        
        tempCtx.putImageData(imageData, 0, 0);
        
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = tightWidth;
        finalCanvas.height = tightHeight;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.drawImage(
          tempCanvas,
          tightMinX, tightMinY, tightWidth, tightHeight,
          0, 0, tightWidth, tightHeight
        );

        const cssWidthBounds = canvas.width / 2;
        const cssHeightBounds = canvas.height / 2;
        
        let selCssWidth = tightWidth / 2;
        let selCssHeight = tightHeight / 2;
        
        const maxWidth = cssWidthBounds * 0.8;
        const maxHeight = cssHeightBounds * 0.8;
        
        if (selCssWidth > maxWidth || selCssHeight > maxHeight) {
          const ratio = Math.min(maxWidth / selCssWidth, maxHeight / selCssHeight);
          selCssWidth *= ratio;
          selCssHeight *= ratio;
        }
        
        const x = (cssWidthBounds - selCssWidth) / 2;
        const y = (cssHeightBounds - selCssHeight) / 2;

        if (selection) {
          commitSelection();
        }

        setTool('lasso');
        setSelection({
          canvas: finalCanvas,
          dataUrl: finalCanvas.toDataURL(),
          x: x,
          y: y,
          width: selCssWidth,
          height: selCssHeight,
          scaleX: 1,
          scaleY: 1,
          zoom: 1,
          rotation: 0
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isCanvasEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = contextRef.current;
    if (!ctx) return true;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = new Uint32Array(imageData.data.buffer);
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) return false;
    }
    return true;
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#f1f5f9' }}>
      <CustomCursor tool={tool} brushColor={brushColor} />
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {showUI ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
              {!isVirtualCanvas && (
                <button className="start-button inverted" title="ホームに戻る" onClick={() => {
                  if (historyIndex > lastSavedIndex && !isCanvasEmpty()) {
                    setShowConfirmHome(true);
                  } else {
                    navigate('/');
                  }
                }} style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HomeIcon size={28} />
                </button>
              )}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="start-button" 
                  title="元に戻す (Undo)"
                  onClick={undo} 
                  disabled={historyIndex <= 0}
                  style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: historyIndex <= 0 ? 0.5 : 1, cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer' }}
                >
                  <Undo2 size={28} /> 
                </button>
                <button 
                  className="start-button" 
                  title="やり直す (Redo)"
                  onClick={redo} 
                  disabled={historyIndex >= history.length - 1}
                  style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: historyIndex >= history.length - 1 ? 0.5 : 1, cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer' }}
                >
                  <Redo2 size={28} /> 
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="start-button"
                onClick={handleClear}
                title="全消去"
                style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={28} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="start-button"
                onClick={() => setGlobalZoom(prev => Math.min(prev * 1.2, 5))}
                title="ズームイン"
                style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ZoomIn size={28} />
              </button>
              <button
                className="start-button"
                onClick={() => setGlobalZoom(prev => Math.max(prev / 1.2, 0.2))}
                title="ズームアウト"
                style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ZoomOut size={28} />
              </button>
            </div>

            {isVirtualCanvas && (
              <>
                <button 
                  onClick={() => setShowVirtualCompleteConfirm(true)} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.8rem 1.2rem', background: '#ecfdf5', color: '#047857', border: '1px solid #10b981', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '1rem', marginTop: '0.5rem' }}
                >
                  <Square size={18} /> 完了
                </button>
                <button 
                  onClick={() => setShowVirtualCancelConfirm(true)} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.8rem 1.2rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #ef4444', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '1rem' }}
                >
                  キャンセル
                </button>
              </>
            )}
          </>
        ) : (
          <div style={{ height: 'calc(176px + 2.5rem)', width: '44px' }} />
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            className="start-button"
            onClick={() => setShowUI(!showUI)}
            title={showUI ? "メニューを非表示" : "メニューを表示"}
            style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {showUI ? <EyeOff size={28} /> : <Eye size={28} />}
          </button>
        </div>
      </div>

      {/* 1. ツール選択 (上部中央) */}
      {showUI && (
        <div style={{ position: 'absolute', top: '20px', left: isVirtualCanvas ? 'calc(50% + 100px)' : '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }}>
            {/* 描画カテゴリ */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>描画</span>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button onClick={() => handleToolChange('pen')} title="ペン" style={{ padding: '0.5rem 1rem', background: tool === 'pen' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PenTool size={28} /> 
                </button>
                <button onClick={() => handleToolChange('eraser')} title="消しゴム" style={{ padding: '0.5rem 1rem', background: tool === 'eraser' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eraser size={28} /> 
                </button>
                <button onClick={() => { handleToolChange('text'); setShowSubMenu(true); }} title="テキスト" style={{ padding: '0.5rem 1rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Type size={28} /> 
                </button>
                <button onClick={() => { handleToolChange('shape'); setShowSubMenu(true); }} title="図形" style={{ padding: '0.5rem 1rem', background: tool === 'shape' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shapes size={28} /> 
                </button>
              </div>
            </div>

            <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

            {/* 編集カテゴリ */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>編集</span>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button onClick={() => handleToolChange('lasso')} title="選択・移動" style={{ padding: '0.5rem 1rem', background: tool === 'lasso' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MousePointer2 size={28} /> 
                </button>
                <button onClick={() => handleToolChange('eyedropper')} title="スポイト" style={{ padding: '0.5rem 1rem', background: tool === 'eyedropper' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pipette size={28} /> 
                </button>
                <button onClick={() => handleToolChange('fill')} title="塗りつぶし" style={{ padding: '0.5rem 1rem', background: tool === 'fill' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PaintBucket size={28} /> 
                </button>
              </div>
            </div>
          </div>

          {tool === 'shape' && showSubMenu && (
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { id: 'line', icon: <Minus size={16} />, label: '線' },
                { id: 'circle', icon: <Circle size={16} />, label: '丸' },
                { id: 'square', icon: <Square size={16} />, label: '四角' },
                { id: 'triangle', icon: <Triangle size={16} />, label: '三角' },
                { id: 'pentagon', icon: <Pentagon size={16} />, label: '五角' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setShapeType(s.id);
                    setShowSubMenu(false);
                  }}
                  style={{
                    padding: '0.4rem 0.8rem', borderRadius: '6px', background: shapeType === s.id ? '#e2e8f0' : '#fff', border: shapeType === s.id ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', outline: 'none'
                  }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          )}

          {(tool === 'lasso' && selection) && (
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', padding: '0 0.5rem' }}>選択中:</span>
              <button onClick={handleCopy} style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Copy size={14} /> コピー</button>
              <button onClick={() => handleFlip('x')} style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipHorizontal size={14} /> 左右反転</button>
              <button onClick={() => handleFlip('y')} style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipVertical size={14} /> 上下反転</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '0.4rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}>
                <RotateCw size={14} />
                <input 
                  type="range" 
                  min="0" 
                  max="360" 
                  value={selection.rotation || 0} 
                  onChange={(e) => setSelection(prev => ({ ...prev, rotation: parseInt(e.target.value) }))}
                  style={{ width: '60px', cursor: 'pointer' }}
                  title={`${selection.rotation || 0}°`}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '0.4rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 'bold' }}>大きさ</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3" 
                  step="0.1"
                  value={selection.zoom || 1} 
                  onChange={(e) => setSelection(prev => ({ ...prev, zoom: parseFloat(e.target.value) }))}
                  style={{ width: '60px', cursor: 'pointer' }}
                  title={`x${selection.zoom || 1}`}
                />
              </div>
              <button onClick={handleDeleteSelection} style={{ padding: '0.4rem 0.8rem', background: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Trash2 size={14} /> 削除</button>
            </div>
          )}

          {tool === 'text' && showSubMenu && (
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>テキスト:</label>
                <input 
                  type="text" 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '150px' }}
                  placeholder="文字を入力"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>サイズ:</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[12, 16, 24, 32, 48, 64].map(size => (
                    <button
                      key={size}
                      onClick={() => {
                        setTextSize(size);
                        setShowSubMenu(false);
                      }}
                      style={{
                        padding: '0.3rem 0.5rem', borderRadius: '4px', background: textSize === size ? '#e2e8f0' : '#fff', border: textSize === size ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', outline: 'none'
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(tool === 'pen' || tool === 'eraser') && (
            <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                {tool === 'eraser' ? '消しゴムの太さ:' : 'ペンの太さ:'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map(size => {
                  const currentSize = tool === 'eraser' ? eraserSize : brushSize;
                  const setSize = tool === 'eraser' ? setEraserSize : setBrushSize;
                  return (
                    <button
                      key={size}
                      onClick={() => setSize(size)}
                      style={{
                        width: '36px', height: '36px', borderRadius: '8px', background: currentSize === size ? '#e2e8f0' : '#fff', border: currentSize === size ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
                      }}
                    >
                      <div style={{ width: `${size * 4}px`, height: `${size * 4}px`, borderRadius: penShape === 'round' ? '50%' : '2px', background: '#334155' }} />
                    </button>
                  );
                })}
              </div>

              <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 4px' }} />

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPenShape('round')}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px', background: penShape === 'round' ? '#e2e8f0' : '#fff', border: penShape === 'round' ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
                  }}
                  title="丸ペン"
                >
                  <Circle size={18} />
                </button>
                <button
                  onClick={() => setPenShape('square')}
                  style={{
                    width: '36px', height: '36px', borderRadius: '8px', background: penShape === 'square' ? '#e2e8f0' : '#fff', border: penShape === 'square' ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
                  }}
                  title="四角ペン"
                >
                  <Square size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. カラーパレット (右側縦並び) */}
      {showUI && tool !== 'lasso' && tool !== 'eyedropper' && (
        <div style={{ position: 'absolute', top: '130px', right: '20px', transform: 'none', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '-0.5rem' }}>カラー</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {baseColors.map((c) => (
              <button
                key={c}
                onClick={() => setBrushColor(c)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: c, border: brushColor === c ? '3px solid #334155' : '1px solid #ccc', cursor: 'pointer', outline: 'none'
                }}
              />
            ))}
            {[0, 1, 2, 3, 4].map(i => {
              const c = savedColors[i];
              return c ? (
                <button
                  key={`saved-${i}`}
                  onClick={() => setBrushColor(c)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: c, border: brushColor === c ? '3px solid #334155' : '1px solid #ccc', cursor: 'pointer', outline: 'none'
                  }}
                />
              ) : (
                <div
                  key={`empty-${i}`}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', background: 'transparent', border: '1px dashed #cbd5e1'
                  }}
                />
              );
            })}
            <label 
              title="詳細なカラー設定"
              style={{ 
                width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', 
                border: (!baseColors.includes(brushColor) && !savedColors.includes(brushColor)) ? '3px solid #334155' : '1px solid #ccc', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                background: (!baseColors.includes(brushColor) && !savedColors.includes(brushColor)) ? brushColor : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
              }}
            >
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value;
                  setSavedColors(prev => {
                    if (prev.includes(val)) return prev;
                    const newSaved = [...prev, val];
                    if (newSaved.length > 5) return newSaved.slice(newSaved.length - 5);
                    return newSaved;
                  });
                }}
                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
            </label>
          </div>
        </div>
      )}


      {/* 4. 保存＆読み込みボタン (右上) */}
      {showUI && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button title="保存" onClick={handleSave} style={{ padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Download size={24} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>保存</span>
          </button>
          <label title="読み込み" style={{ padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Upload size={24} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>読み込み</span>
            <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
        </div>
      )}

      {showUI && isVirtualCanvas && virtualCanvasShape === 'cube' && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem', color: '#475569' }}>描画する面を選択</div>
          {['右面(Right)', '左面(Left)', '上面(Top)', '下面(Bottom)', '前面(Front)', '背面(Back)'].map((label, idx) => (
            <button
              key={idx}
              onClick={() => handleFaceSwitch(idx)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                background: cubeFaceIndex === idx ? '#3b82f6' : '#fff',
                color: cubeFaceIndex === idx ? '#fff' : '#334155',
                border: cubeFaceIndex === idx ? 'none' : '1px solid #cbd5e1',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: cubeFaceIndex === idx ? '0 2px 8px rgba(59,130,246,0.4)' : 'none'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div 
        ref={containerRef}
        style={{ 
          position: 'absolute', 
          top: '120px', 
          bottom: '20px', 
          left: '90px', 
          right: '120px', 
          borderRadius: '12px', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          cursor: ['pen', 'eraser', 'fill', 'shape'].includes(tool) ? 'none' : (tool === 'text' ? 'text' : 'crosshair')
        }}
      >
        {tool === 'lasso' && lassoPoints.length > 0 && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            <polyline 
              points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="3" 
            />
            {lassoPoints.length > 1 && (
              <line 
                x1={lassoPoints[0].x} 
                y1={lassoPoints[0].y} 
                x2={lassoPoints[lassoPoints.length - 1].x} 
                y2={lassoPoints[lassoPoints.length - 1].y} 
                stroke="#3b82f6" 
                strokeWidth="2" 
                strokeDasharray="5,5" 
              />
            )}
          </svg>
        )}

        {tool === 'shape' && isDrawing && shapeStart && shapeCurrent && (
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            {shapeType === 'circle' ? (
              <circle 
                cx={shapeStart.x} 
                cy={shapeStart.y} 
                r={Math.sqrt(Math.pow(shapeCurrent.x - shapeStart.x, 2) + Math.pow(shapeCurrent.y - shapeStart.y, 2))} 
                fill="none" 
                stroke={brushColor} 
                strokeWidth={brushSizeMap[brushSize]} 
              />
            ) : shapeType === 'square' ? (
              <rect 
                x={Math.min(shapeStart.x, shapeCurrent.x)} 
                y={Math.min(shapeStart.y, shapeCurrent.y)} 
                width={Math.abs(shapeCurrent.x - shapeStart.x)} 
                height={Math.abs(shapeCurrent.y - shapeStart.y)} 
                fill="none" 
                stroke={brushColor} 
                strokeWidth={brushSizeMap[brushSize]} 
              />
            ) : shapeType === 'line' ? (
              <line 
                x1={shapeStart.x} 
                y1={shapeStart.y} 
                x2={shapeCurrent.x} 
                y2={shapeCurrent.y} 
                fill="none" 
                stroke={brushColor} 
                strokeWidth={brushSizeMap[brushSize]} 
              />
            ) : shapeType === 'triangle' ? (
              <polygon 
                points={`${shapeStart.x + (shapeCurrent.x - shapeStart.x) / 2},${shapeStart.y} ${shapeCurrent.x},${shapeCurrent.y} ${shapeStart.x},${shapeCurrent.y}`}
                fill="none" 
                stroke={brushColor} 
                strokeWidth={brushSizeMap[brushSize]} 
              />
            ) : (
              <polygon 
                points={Array.from({ length: 5 }).map((_, i) => {
                  const radius = Math.sqrt(Math.pow(shapeCurrent.x - shapeStart.x, 2) + Math.pow(shapeCurrent.y - shapeStart.y, 2));
                  const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                  return `${shapeStart.x + radius * Math.cos(angle)},${shapeStart.y + radius * Math.sin(angle)}`;
                }).join(' ')}
                fill="none" 
                stroke={brushColor} 
                strokeWidth={brushSizeMap[brushSize]} 
              />
            )}
          </svg>
        )}

        {selection && (
          <img 
            src={selection.dataUrl} 
            alt="selection"
            style={{
              position: 'absolute',
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              width: `${selection.width}px`,
              height: `${selection.height}px`,
              transform: `scale(${(selection.scaleX || 1) * (selection.zoom || 1)}, ${(selection.scaleY || 1) * (selection.zoom || 1)}) rotate(${selection.rotation || 0}deg)`,
              transformOrigin: 'center center',
              pointerEvents: 'none',
              zIndex: 6,
              filter: 'drop-shadow(0 0 4px #3b82f6) drop-shadow(0 0 4px #3b82f6)'
            }}
          />
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          style={{ display: 'block', cursor: ['pen', 'eraser', 'fill', 'shape'].includes(tool) ? 'none' : 'crosshair', touchAction: 'none', transform: `scale(${globalZoom})`, transformOrigin: 'center' }}
        />
      </div>

      {showConfirmHome && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#e11d48', fontSize: '1.2rem' }}>保存されていません</h3>
            <p style={{ margin: '1rem 0 2rem 0', color: '#334155', lineHeight: '1.5', fontSize: '0.95rem' }}>
              このままホームにもどるとデータが消えてしまいますが<br />ホームに戻ってもよろしいですか？
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => navigate('/')}
                style={{ flex: 1, padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#e11d48', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
              >
                はい
              </button>
              <button 
                onClick={() => setShowConfirmHome(false)}
                style={{ flex: 1, padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      {showVirtualCompleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#047857', fontSize: '1.2rem' }}>確認</h3>
            <p style={{ margin: '1rem 0 2rem 0', color: '#334155', lineHeight: '1.5', fontSize: '0.95rem' }}>
              完了してもよろしいでしょうか？
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  setShowVirtualCompleteConfirm(false);
                  if (onVirtualCanvasComplete) {
                    if (virtualCanvasShape === 'cube') {
                      const canvas = canvasRef.current;
                      const currentDataUrl = canvas.toDataURL();
                      const nextFaces = [...cubeFacesState];
                      nextFaces[cubeFaceIndex] = { history: [...history], historyIndex };
                      
                      const urls = nextFaces.map((f, i) => {
                        if (i === cubeFaceIndex) return currentDataUrl;
                        if (f.historyIndex >= 0 && f.history.length > 0) {
                           return f.history[f.historyIndex];
                        }
                        return '';
                      });
                      onVirtualCanvasComplete(urls, 1, 1, 'cube');
                    } else {
                      const canvas = canvasRef.current;
                      const ctx = canvas.getContext('2d');
                      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const data = imgData.data;
                      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                      let hasPixels = false;
                      for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                          const alpha = data[(y * canvas.width + x) * 4 + 3];
                          if (alpha > 0) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                            hasPixels = true;
                          }
                        }
                      }
                      if (!hasPixels) {
                        onVirtualCanvasComplete(canvas.toDataURL(), canvas.width / canvas.height, 1, 'plane');
                      } else {
                        const padding = 2; // small padding to prevent edge clipping
                        minX = Math.max(0, minX - padding);
                        minY = Math.max(0, minY - padding);
                        maxX = Math.min(canvas.width - 1, maxX + padding);
                        maxY = Math.min(canvas.height - 1, maxY + padding);
                        
                        const cropWidth = maxX - minX + 1;
                        const cropHeight = maxY - minY + 1;
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = cropWidth;
                        tempCanvas.height = cropHeight;
                        const tempCtx = tempCanvas.getContext('2d');
                        tempCtx.putImageData(ctx.getImageData(minX, minY, cropWidth, cropHeight), 0, 0);
                        const scaleFactor = cropWidth / canvas.width;
                        onVirtualCanvasComplete(tempCanvas.toDataURL(), cropWidth / cropHeight, scaleFactor, 'plane');
                      }
                    }
                  }
                }}
                style={{ flex: 1, padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#10b981', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
              >
                はい
              </button>
              <button 
                onClick={() => setShowVirtualCompleteConfirm(false)}
                style={{ flex: 1, padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}

      {showVirtualCancelConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: '#e11d48', fontSize: '1.2rem' }}>確認</h3>
            <p style={{ margin: '1rem 0 2rem 0', color: '#334155', lineHeight: '1.5', fontSize: '0.95rem' }}>
              キャンセルしてもよろしいでしょうか？
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => {
                  setShowVirtualCancelConfirm(false);
                  if (onVirtualCanvasCancel) {
                    onVirtualCanvasCancel();
                  }
                }}
                style={{ flex: 1, padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: '#e11d48', cursor: 'pointer', fontWeight: 'bold', color: '#fff' }}
              >
                はい
              </button>
              <button 
                onClick={() => setShowVirtualCancelConfirm(false)}
                style={{ flex: 1, padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
