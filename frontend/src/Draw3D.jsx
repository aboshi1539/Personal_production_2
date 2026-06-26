import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Environment, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Trash2, Move3d, PenTool, Square, Copy, Eraser, MousePointer2, Undo2, Redo2, Paintbrush, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff, PaintBucket, Circle, Shapes, Triangle, Minus, ZoomIn, ZoomOut, RotateCw, RotateCcw } from 'lucide-react';
import './index.css';

function pointInPolygon(point, vs) {
  let x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function DrawingController({ isActive, distance, onPointerDown3D, onPointerMove3D, onPointerUp3D }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);

  useEffect(() => {
    const getPosition = (e) => {
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      const vec = new THREE.Vector3(x, y, 0.5);
      vec.unproject(camera);
      vec.sub(camera.position).normalize();
      return {
        pos3D: new THREE.Vector3().copy(camera.position).add(vec.multiplyScalar(distance)),
        posNDC: [x, y]
      };
    };

    const handlePointerDown = (e) => {
      if (!isActive) return;
      if (e.button !== 0) return; // Only left click
      isDragging.current = true;
      const { pos3D, posNDC } = getPosition(e);
      onPointerDown3D([pos3D.x, pos3D.y, pos3D.z], posNDC);
    };

    const handlePointerMove = (e) => {
      if (!isActive) return;
      const { pos3D, posNDC } = getPosition(e);
      onPointerMove3D([pos3D.x, pos3D.y, pos3D.z], isDragging.current, posNDC);
    };

    const handlePointerUp = (e) => {
      if (!isActive || !isDragging.current) return;
      isDragging.current = false;
      const { pos3D, posNDC } = getPosition(e);
      onPointerUp3D([pos3D.x, pos3D.y, pos3D.z], posNDC);
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isActive, camera, gl, distance, onPointerDown3D, onPointerMove3D, onPointerUp3D]);

  return null;
}

export default function Draw3D() {
  const navigate = useNavigate();
  const [strokes, setStrokes] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [texts, setTexts] = useState([]);
  
  const strokesRef = useRef([]);
  const boxesRef = useRef([]);
  const textsRef = useRef([]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { boxesRef.current = boxes; }, [boxes]);
  useEffect(() => { textsRef.current = texts; }, [texts]);

  const [history, setHistory] = useState([{ strokes: [], boxes: [], texts: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveHistory = useCallback((newStrokes, newBoxes, newTexts) => {
    setHistory(prev => {
      const newHist = prev.slice(0, historyIndex + 1);
      newHist.push({ 
        strokes: JSON.parse(JSON.stringify(newStrokes)), 
        boxes: JSON.parse(JSON.stringify(newBoxes)),
        texts: JSON.parse(JSON.stringify(newTexts || textsRef.current))
      });
      return newHist;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevState = history[newIndex];
      setStrokes(JSON.parse(JSON.stringify(prevState.strokes)));
      setBoxes(JSON.parse(JSON.stringify(prevState.boxes)));
      setTexts(JSON.parse(JSON.stringify(prevState.texts || [])));
      setHistoryIndex(newIndex);
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
      setCurrentStroke(null);
      setCurrentBox(null);
      setLassoPoints3D([]);
      setLassoPointsNDC([]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setStrokes(JSON.parse(JSON.stringify(nextState.strokes)));
      setBoxes(JSON.parse(JSON.stringify(nextState.boxes)));
      setTexts(JSON.parse(JSON.stringify(nextState.texts || [])));
      setHistoryIndex(newIndex);
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
      setCurrentStroke(null);
      setCurrentBox(null);
      setLassoPoints3D([]);
      setLassoPointsNDC([]);
    }
  };

  const [currentStroke, setCurrentStroke] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);
  const [lassoPoints3D, setLassoPoints3D] = useState([]);
  const [lassoPointsNDC, setLassoPointsNDC] = useState([]);
  
  const [selection, setSelection] = useState({ strokeIndices: [], boxIndices: [], textIndices: [] });
  
  const [isDrawingMode, setIsDrawingMode] = useState(true);
  const [tool, setTool] = useState('pen'); // 'pen', 'box', 'stamp', 'eraser', 'lasso', 'move', 'paint'
  
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(3);
  const [distance, setDistance] = useState(15);
  const [textInput, setTextInput] = useState('');
  const [textSize, setTextSize] = useState(1);
  const [showUI, setShowUI] = useState(true);
  const [shapeType, setShapeType] = useState('box');
  const [showSubMenu, setShowSubMenu] = useState(true);
  
  const [copiedArt, setCopiedArt] = useState(null);
  const [previewPos, setPreviewPos] = useState(null);
  const [savedColors, setSavedColors] = useState([]);

  const modifiedSomethingRef = useRef(false);
  const moveStartRef = useRef(null);
  const moveInitialStateRef = useRef(null);
  const cameraRef = useRef();

  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#ec4899', '#a855f7', '#f97316', '#8b4513', '#38bdf8', '#166534','#333333', '#9ca3af', '#ffffff'];
  const eraserRadiusMap = { 1: 0.5, 2: 1.0, 3: 1.5, 4: 2.5, 5: 4.0 };
  const brushSizeMap = { 1: 2, 2: 5, 3: 8, 4: 12, 5: 18 };

  const handleCopy = () => {
    let strokesToCopy;
    let boxesToCopy;
    let textsToCopy;
    
    if (selection.strokeIndices.length > 0 || selection.boxIndices.length > 0 || selection.textIndices.length > 0) {
      strokesToCopy = selection.strokeIndices.map(i => strokesRef.current[i]);
      boxesToCopy = selection.boxIndices.map(i => boxesRef.current[i]);
      textsToCopy = selection.textIndices.map(i => textsRef.current[i]);
    } else {
      strokesToCopy = strokesRef.current;
      boxesToCopy = boxesRef.current;
      textsToCopy = textsRef.current;
    }

    if (strokesToCopy.length === 0 && boxesToCopy.length === 0 && textsToCopy.length === 0) return;
    
    let count = 0;
    const center = new THREE.Vector3();
    strokesToCopy.forEach(s => s.points.forEach(p => {
      center.add(new THREE.Vector3(p[0], p[1], p[2]));
      count++;
    }));
    boxesToCopy.forEach(b => {
      center.add(new THREE.Vector3(...b.position));
      count++;
    });
    textsToCopy.forEach(t => {
      center.add(new THREE.Vector3(...t.position));
      count++;
    });
    if (count > 0) center.divideScalar(count);
    
    setCopiedArt({
      strokes: JSON.parse(JSON.stringify(strokesToCopy)),
      boxes: JSON.parse(JSON.stringify(boxesToCopy)),
      texts: JSON.parse(JSON.stringify(textsToCopy)),
      centroid: [center.x, center.y, center.z]
    });
    setTool('stamp');
    setIsDrawingMode(true);
    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
  };

  const handleFlip = (axis) => {
    if (selection.strokeIndices.length === 0 && selection.boxIndices.length === 0 && selection.textIndices.length === 0) return;
    
    let count = 0;
    const center = new THREE.Vector3();
    selection.strokeIndices.forEach(idx => {
      strokesRef.current[idx].points.forEach(p => { center.add(new THREE.Vector3(...p)); count++; });
    });
    selection.boxIndices.forEach(idx => {
      center.add(new THREE.Vector3(...boxesRef.current[idx].position)); count++;
    });
    selection.textIndices.forEach(idx => {
      center.add(new THREE.Vector3(...textsRef.current[idx].position)); count++;
    });
    if (count > 0) center.divideScalar(count);

    const nextStrokes = [...strokesRef.current];
    selection.strokeIndices.forEach(idx => {
      nextStrokes[idx] = {
        ...nextStrokes[idx],
        points: nextStrokes[idx].points.map(p => {
          const np = [...p];
          if (axis === 'x') np[0] = center.x - (np[0] - center.x);
          if (axis === 'y') np[1] = center.y - (np[1] - center.y);
          if (axis === 'z') np[2] = center.z - (np[2] - center.z);
          return np;
        })
      };
    });

    const nextBoxes = [...boxesRef.current];
    selection.boxIndices.forEach(idx => {
      const b = nextBoxes[idx];
      const np = [...b.position];
      if (axis === 'x') np[0] = center.x - (np[0] - center.x);
      if (axis === 'y') np[1] = center.y - (np[1] - center.y);
      if (axis === 'z') np[2] = center.z - (np[2] - center.z);
      nextBoxes[idx] = { ...b, position: np };
    });

    const nextTexts = [...textsRef.current];
    selection.textIndices.forEach(idx => {
      const t = nextTexts[idx];
      const np = [...t.position];
      if (axis === 'x') np[0] = center.x - (np[0] - center.x);
      if (axis === 'y') np[1] = center.y - (np[1] - center.y);
      if (axis === 'z') np[2] = center.z - (np[2] - center.z);
      nextTexts[idx] = { ...t, position: np };
    });

    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    setTexts(nextTexts);
    
    if (moveInitialStateRef.current) {
       moveInitialStateRef.current.strokes = JSON.parse(JSON.stringify(nextStrokes));
       moveInitialStateRef.current.boxes = JSON.parse(JSON.stringify(nextBoxes));
       moveInitialStateRef.current.texts = JSON.parse(JSON.stringify(nextTexts));
    }
    
    setTimeout(() => saveHistory(nextStrokes, nextBoxes, nextTexts), 0);
  };

  const handleStamp = useCallback((pos) => {
    if (!copiedArt) return;
    const dx = pos[0] - copiedArt.centroid[0];
    const dy = pos[1] - copiedArt.centroid[1];
    const dz = pos[2] - copiedArt.centroid[2];
    
    const newStrokes = copiedArt.strokes.map(s => ({
      ...s,
      points: s.points.map(p => [p[0] + dx, p[1] + dy, p[2] + dz])
    }));
    
    const newBoxes = copiedArt.boxes.map(b => ({
      ...b,
      position: [b.position[0] + dx, b.position[1] + dy, b.position[2] + dz]
    }));

    const newTexts = copiedArt.texts.map(t => ({
      ...t,
      position: [t.position[0] + dx, t.position[1] + dy, t.position[2] + dz]
    }));
    
    const finalStrokes = [...strokesRef.current, ...newStrokes];
    const finalBoxes = [...boxesRef.current, ...newBoxes];
    const finalTexts = [...textsRef.current, ...newTexts];
    setStrokes(finalStrokes);
    setBoxes(finalBoxes);
    setTexts(finalTexts);
    saveHistory(finalStrokes, finalBoxes, finalTexts);
  }, [copiedArt, saveHistory]);

  const onPointerDown3D = useCallback((pos3D, posNDC) => {
    if (tool === 'eyedropper') {
      let foundColor = null;
      let minDist = Infinity;
      const pickRadius = 2.0;
      const p = new THREE.Vector3(...pos3D);

      boxesRef.current.forEach(b => {
        const dist = new THREE.Vector3(...b.position).distanceTo(p);
        if (dist < minDist && dist < pickRadius) {
          minDist = dist;
          foundColor = b.color;
        }
      });

      strokesRef.current.forEach(s => {
        for (let pt of s.points) {
          const dist = new THREE.Vector3(...pt).distanceTo(p);
          if (dist < minDist && dist < pickRadius) {
            minDist = dist;
            foundColor = s.color;
          }
        }
      });
      textsRef.current.forEach(t => {
        const dist = new THREE.Vector3(...t.position).distanceTo(p);
        if (dist < minDist && dist < pickRadius) {
          minDist = dist;
          foundColor = t.color;
        }
      });

      if (foundColor) {
        setBrushColor(foundColor);
        setSavedColors(prev => prev.includes(foundColor) ? prev : [...prev, foundColor]);
        setTool('pen');
      }
      return;
    }

    if (tool === 'pen') {
      setCurrentStroke({ color: brushColor, lineWidth: brushSizeMap[brushSize], points: [pos3D] });
    } else if (tool === 'fill') {
      let foundStrokeIndex = -1;
      let minArea = Infinity;
      
      if (cameraRef.current) {
        strokesRef.current.forEach((s, i) => {
          if (s.points.length < 3) return;
          const projected = s.points.map(p => {
            const v = new THREE.Vector3(p[0], p[1], p[2]).project(cameraRef.current);
            return [v.x, v.y];
          });
          if (pointInPolygon(posNDC, projected)) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            projected.forEach(p => {
              if(p[0]<minX) minX=p[0]; if(p[0]>maxX) maxX=p[0];
              if(p[1]<minY) minY=p[1]; if(p[1]>maxY) maxY=p[1];
            });
            const area = (maxX - minX) * (maxY - minY);
            if (area < minArea) {
              minArea = area;
              foundStrokeIndex = i;
            }
          }
        });

        if (foundStrokeIndex !== -1) {
          const nextStrokes = [...strokesRef.current];
          nextStrokes[foundStrokeIndex] = { ...nextStrokes[foundStrokeIndex], fillColor: brushColor };
          setStrokes(nextStrokes);
          setTimeout(() => saveHistory(nextStrokes, boxesRef.current, textsRef.current), 0);
        }
      }
    } else if (tool === 'text') {
      if (!textInput) return;
      const newTexts = [...textsRef.current, { text: textInput, position: pos3D, color: brushColor, size: textSize }];
      setTexts(newTexts);
      setTimeout(() => saveHistory(strokesRef.current, boxesRef.current, newTexts), 0);
    } else if (tool === 'shape') {
      setCurrentBox({ color: brushColor, startPos: pos3D, endPos: pos3D, shapeType: shapeType });
    } else if (tool === 'stamp') {
      handleStamp(pos3D);
    } else if (tool === 'lasso') {
      setLassoPointsNDC([posNDC]);
      setLassoPoints3D([pos3D]);
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    } else if (tool === 'move') {
      moveStartRef.current = pos3D;
      moveInitialStateRef.current = { strokes: JSON.parse(JSON.stringify(strokesRef.current)), boxes: JSON.parse(JSON.stringify(boxesRef.current)), texts: JSON.parse(JSON.stringify(textsRef.current)) };
    }
  }, [tool, brushColor, handleStamp, shapeType, textInput, textSize]);

  const onPointerMove3D = useCallback((pos3D, isDragging, posNDC) => {
    setPreviewPos(pos3D);
    if (!isDragging) return;

    if (tool === 'pen') {
      setCurrentStroke(prev => {
        if (!prev) return null;
        const lastPoint = prev.points[prev.points.length - 1];
        if (lastPoint) {
          const dist = new THREE.Vector3(...lastPoint).distanceTo(new THREE.Vector3(...pos3D));
          // Filter out points that are too close to prevent Line2 spiky joint artifacts
          if (dist < 0.05) return prev; 
        }
        return { ...prev, points: [...prev.points, pos3D] };
      });
    } else if (tool === 'shape') {
      setCurrentBox(prev => prev ? { ...prev, endPos: pos3D } : null);
    } else if (tool === 'lasso') {
      setLassoPointsNDC(prev => [...prev, posNDC]);
      setLassoPoints3D(prev => [...prev, pos3D]);
    } else if (tool === 'eraser' || tool === 'paint') {
      const p = new THREE.Vector3(...pos3D);
      const currentBrushRadius = eraserRadiusMap[eraserSize];
      let changed = false;
      
      const nextStrokes = strokesRef.current.map(s => {
        const hit = s.points.some(pt => new THREE.Vector3(...pt).distanceTo(p) < currentBrushRadius);
        if (hit) {
          if (tool === 'eraser') return null;
          if (tool === 'paint') {
            if (s.color !== brushColor || (s.fillColor && s.fillColor !== brushColor)) {
              changed = true;
              return { ...s, color: brushColor, ...(s.fillColor ? {fillColor: brushColor} : {}) };
            }
          }
        }
        return s;
      }).filter(Boolean);
      
      if (tool === 'eraser' && nextStrokes.length !== strokesRef.current.length) changed = true;
      
      const nextBoxes = boxesRef.current.map(b => {
        const hit = new THREE.Vector3(...b.position).distanceTo(p) < (b.size[0] / 2 + currentBrushRadius);
        if (hit) {
          if (tool === 'eraser') return null;
          if (tool === 'paint' && b.color !== brushColor) {
            changed = true;
            return { ...b, color: brushColor };
          }
        }
        return b;
      }).filter(Boolean);
      
      if (tool === 'eraser' && nextBoxes.length !== boxesRef.current.length) changed = true;

      const nextTexts = textsRef.current.map(t => {
        const hit = new THREE.Vector3(...t.position).distanceTo(p) < (t.size / 2 + currentBrushRadius);
        if (hit) {
          if (tool === 'eraser') return null;
          if (tool === 'paint' && t.color !== brushColor) {
            changed = true;
            return { ...t, color: brushColor };
          }
        }
        return t;
      }).filter(Boolean);
      
      if (tool === 'eraser' && nextTexts.length !== textsRef.current.length) changed = true;
      
      if (changed) {
        modifiedSomethingRef.current = true;
        setStrokes(nextStrokes);
        setBoxes(nextBoxes);
        setTexts(nextTexts);
        
        // Clear selection if objects are erased or painted to avoid indices shifting issues
        if (tool === 'eraser') setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
      }
    } else if (tool === 'move') {
      if (moveStartRef.current && moveInitialStateRef.current) {
        const dx = pos3D[0] - moveStartRef.current[0];
        const dy = pos3D[1] - moveStartRef.current[1];
        const dz = pos3D[2] - moveStartRef.current[2];
        
        const nextStrokes = [...strokesRef.current];
        selection.strokeIndices.forEach(idx => {
           if (moveInitialStateRef.current.strokes[idx]) {
             nextStrokes[idx] = { 
               ...moveInitialStateRef.current.strokes[idx], 
               points: moveInitialStateRef.current.strokes[idx].points.map(pt => [pt[0]+dx, pt[1]+dy, pt[2]+dz]) 
             };
           }
        });
        setStrokes(nextStrokes);
        
        const nextBoxes = [...boxesRef.current];
        selection.boxIndices.forEach(idx => {
           if (moveInitialStateRef.current.boxes[idx]) {
             const b = moveInitialStateRef.current.boxes[idx];
             nextBoxes[idx] = { ...b, position: [b.position[0]+dx, b.position[1]+dy, b.position[2]+dz] };
           }
        });
        setBoxes(nextBoxes);

        const nextTexts = [...textsRef.current];
        selection.textIndices.forEach(idx => {
           if (moveInitialStateRef.current.texts[idx]) {
             const t = moveInitialStateRef.current.texts[idx];
             nextTexts[idx] = { ...t, position: [t.position[0]+dx, t.position[1]+dy, t.position[2]+dz] };
           }
        });
        setTexts(nextTexts);
      }
    }
  }, [tool, selection, brushColor]);

  const onPointerUp3D = useCallback(() => {
    if (tool === 'pen') {
      setCurrentStroke(prev => {
        if (prev && prev.points.length > 1) {
          const newStrokes = [...strokesRef.current, prev];
          setStrokes(newStrokes);
          setTimeout(() => saveHistory(newStrokes, boxesRef.current, textsRef.current), 0);
        }
        return null;
      });
    } else if (tool === 'shape') {
      setCurrentBox(prev => {
        if (prev) {
          const size = new THREE.Vector3(...prev.endPos).distanceTo(new THREE.Vector3(...prev.startPos)) * 2;
          if (size > 0.1) {
             const newBoxes = [...boxesRef.current, { position: prev.startPos, size: [size, size, size], color: prev.color, shapeType: prev.shapeType }];
             setBoxes(newBoxes);
             setTimeout(() => saveHistory(strokesRef.current, newBoxes, textsRef.current), 0);
          }
        }
        return null;
      });
    } else if (tool === 'eraser' || tool === 'paint') {
      if (modifiedSomethingRef.current) {
        modifiedSomethingRef.current = false;
        setTimeout(() => saveHistory(strokesRef.current, boxesRef.current, textsRef.current), 0);
      }
    } else if (tool === 'lasso') {
      if (!cameraRef.current) return;
      const strokeIndices = [];
      strokesRef.current.forEach((s, i) => {
        let inLasso = false;
        for (let p of s.points) {
          const v = new THREE.Vector3(p[0], p[1], p[2]).project(cameraRef.current);
          if (pointInPolygon([v.x, v.y], lassoPointsNDC)) {
            inLasso = true; break;
          }
        }
        if (inLasso) strokeIndices.push(i);
      });
      
      const boxIndices = [];
      boxesRef.current.forEach((b, i) => {
        const v = new THREE.Vector3(...b.position).project(cameraRef.current);
        if (pointInPolygon([v.x, v.y], lassoPointsNDC)) {
          boxIndices.push(i);
        }
      });

      const textIndices = [];
      textsRef.current.forEach((t, i) => {
        const v = new THREE.Vector3(...t.position).project(cameraRef.current);
        if (pointInPolygon([v.x, v.y], lassoPointsNDC)) {
          textIndices.push(i);
        }
      });
      
      setSelection({ strokeIndices, boxIndices, textIndices });
      if (strokeIndices.length > 0 || boxIndices.length > 0 || textIndices.length > 0) {
        setTool('move');
      }
      setLassoPointsNDC([]);
      setLassoPoints3D([]);
    } else if (tool === 'move') {
      if (moveStartRef.current) {
        moveStartRef.current = null;
        setTimeout(() => saveHistory(strokesRef.current, boxesRef.current, textsRef.current), 0);
      }
    }
  }, [tool, saveHistory, lassoPointsNDC]);

  const handleClear = () => {
    setStrokes([]);
    setBoxes([]);
    setTexts([]);
    setCurrentStroke(null);
    setCurrentBox(null);
    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    setTimeout(() => saveHistory([], [], []), 0);
  };

  return (
    <div className="app-container" style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
        <button 
          className="start-button" 
          onClick={() => setShowUI(!showUI)} 
          title={showUI ? "メニューを非表示" : "メニューを表示"}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0.8rem' }}
        >
          {showUI ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
        
        {showUI && (
          <>
            <button className="start-button" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem' }}>
              <HomeIcon size={20} /> 
            </button>
            <button 
              className="start-button" 
              onClick={undo} 
              disabled={historyIndex === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', opacity: historyIndex === 0 ? 0.5 : 1, cursor: historyIndex === 0 ? 'not-allowed' : 'pointer' }}
            >
              <Undo2 size={20} /> 
            </button>
            <button 
              className="start-button" 
              onClick={redo} 
              disabled={historyIndex >= history.length - 1}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', opacity: historyIndex >= history.length - 1 ? 0.5 : 1, cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer' }}
            >
              <Redo2 size={20} /> 
            </button>
          </>
        )}
      </div>

      {/* 1. ツール選択 (上部中央) */}
      {showUI && (
        <div style={{ position: 'absolute', top: '20px', left: 'calc(50% + 120px)', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          
          {/* モード切替とツール */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button 
              onClick={() => setIsDrawingMode(true)}
              style={{ padding: '0.5rem 1rem', background: isDrawingMode ? 'var(--primary-glow)' : '#fff', color: isDrawingMode ? '#fff' : 'var(--text-main)', border: '1px solid var(--primary-glow)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="ツール"
            >
              <PenTool size={18} /> 
            </button>
            <button 
              onClick={() => setIsDrawingMode(false)}
              style={{ padding: '0.5rem 1rem', background: !isDrawingMode ? '#334155' : '#fff', color: !isDrawingMode ? '#fff' : 'var(--text-main)', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="視点移動"
            >
              <Move3d size={18} /> 
            </button>

            {isDrawingMode && (
              <>
                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
                <button onClick={() => setTool('pen')} style={{ padding: '0.5rem 1rem', background: tool === 'pen' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><PenTool size={18} /></button>
                <button onClick={() => setTool('eraser')} style={{ padding: '0.5rem 1rem', background: tool === 'eraser' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Eraser size={18} /></button>
                <button onClick={() => setTool('lasso')} style={{ padding: '0.5rem 1rem', background: (tool === 'lasso' || tool === 'move') ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><MousePointer2 size={18} /></button>
                <button onClick={() => setTool('eyedropper')} style={{ padding: '0.5rem 1rem', background: tool === 'eyedropper' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Pipette size={18} /></button>
                <button onClick={() => { setTool('text'); setShowSubMenu(true); }} style={{ padding: '0.5rem 1rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Type size={18} /></button>
                <button onClick={() => setTool('fill')} style={{ padding: '0.5rem 1rem', background: tool === 'fill' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><PaintBucket size={18} /></button>
                <button onClick={() => { setTool('shape'); setShowSubMenu(true); }} style={{ padding: '0.5rem 1rem', background: tool === 'shape' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Shapes size={18} /></button>
                <button onClick={() => setTool('paint')} style={{ padding: '0.5rem 1rem', background: tool === 'paint' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Paintbrush size={18} /></button>
              </>
            )}
          </div>

          {isDrawingMode && tool === 'shape' && showSubMenu && (
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { id: 'box', icon: <Square size={16} />, label: '四角' },
                { id: 'sphere', icon: <Circle size={16} />, label: '丸' },
                { id: 'cone', icon: <Triangle size={16} />, label: '三角' },
                { id: 'cylinder', icon: <Minus size={16} />, label: '円柱' },
                { id: 'prism3', icon: <Triangle size={16} />, label: '三角柱' },
                { id: 'prism4', icon: <Square size={16} />, label: '四角柱' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setShapeType(s.id);
                    setShowSubMenu(false);
                  }}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: shapeType === s.id ? '#e2e8f0' : '#fff', border: shapeType === s.id ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', outline: 'none' }}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          )}

          {isDrawingMode && tool === 'text' && showSubMenu && (
            <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                  {[0.5, 1, 2, 4, 8].map(size => (
                    <button
                      key={size}
                      onClick={() => { setTextSize(size); setShowSubMenu(false); }}
                      style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', background: textSize === size ? '#e2e8f0' : '#fff', border: textSize === size ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', outline: 'none' }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isDrawingMode && tool === 'move' && (selection.strokeIndices.length > 0 || selection.boxIndices.length > 0 || selection.textIndices.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>選択中ツール</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleCopy} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Copy size={14} /> コピー</button>
                <button onClick={() => handleScale(1.1)} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><ZoomIn size={14} /> 拡大</button>
                <button onClick={() => handleScale(0.9)} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><ZoomOut size={14} /> 縮小</button>
                <button onClick={() => handleRotate('y', 15)} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><RotateCw size={14} /> 右回転(Y)</button>
                <button onClick={() => handleRotate('y', -15)} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><RotateCcw size={14} /> 左回転(Y)</button>
                <button onClick={() => handleRotate('x', 15)} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><RotateCw size={14} /> 縦回転(X)</button>
                <button onClick={() => handleRotate('z', 15)} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><RotateCw size={14} /> 傾き(Z)</button>
                <button onClick={() => handleFlip('x')} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipHorizontal size={14} /> 左右反転</button>
                <button onClick={() => handleFlip('y')} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipVertical size={14} /> 上下反転</button>
                <button onClick={() => handleFlip('z')} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipHorizontal size={14} style={{ transform: 'rotate(-45deg)' }} /> 前後反転</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. カラーパレット (右側縦並び) */}
      {showUI && isDrawingMode && tool !== 'lasso' && tool !== 'eyedropper' && tool !== 'move' && (
        <div style={{ position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '-0.5rem' }}>カラー</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setBrushColor(c)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: c, border: brushColor === c ? '3px solid #334155' : '1px solid #ccc', cursor: 'pointer', outline: 'none'
                }}
              />
            ))}
            <label 
              title="詳細なカラー設定"
              style={{ 
                width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', 
                border: !colors.includes(brushColor) ? '3px solid #334155' : '1px solid #ccc', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                background: !colors.includes(brushColor) ? brushColor : 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
              }}
            >
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              />
            </label>
          </div>

          {savedColors.length > 0 && (
            <>
              <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '0.5rem 0' }} />
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '-0.5rem', alignSelf: 'flex-start' }}>履歴</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {savedColors.map(c => (
                  <button
                    key={`saved-${c}`}
                    onClick={() => setBrushColor(c)}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: c, border: brushColor === c ? '3px solid #334155' : '1px solid #ccc', cursor: 'pointer', outline: 'none'
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. ブラシ/消しゴムサイズ (左側縦並び) */}
      {showUI && isDrawingMode && (tool === 'pen' || tool === 'eraser' || tool === 'paint') && (
        <div style={{ position: 'absolute', top: '50%', left: '20px', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
            {tool === 'eraser' ? '消しゴム\nサイズ' : tool === 'paint' ? 'ブラシの\n太さ' : 'ペンの\n太さ'}
          </div>
          {[1, 2, 3, 4, 5].map(s => {
            const isActive = (tool === 'eraser' || tool === 'paint') ? eraserSize === s : brushSize === s;
            return (
              <button
                key={s}
                onClick={() => (tool === 'eraser' || tool === 'paint') ? setEraserSize(s) : setBrushSize(s)}
                style={{
                  width: '40px', height: '40px', borderRadius: '8px', background: isActive ? '#e2e8f0' : '#fff', border: isActive ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
                }}
              >
                <div style={{ width: `${s * 4}px`, height: `${s * 4}px`, borderRadius: '50%', background: '#334155' }} />
              </button>
            )
          })}
        </div>
      )}

      {/* 4. 奥行き設定 (左下) */}
      {showUI && isDrawingMode && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '200px' }}>
           <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>描画の奥行き (Z: {distance})</label>
           <input 
             type="range" 
             min="3" max="30" 
             value={distance} 
             onChange={(e) => setDistance(parseFloat(e.target.value))}
             style={{ width: '100%' }}
           />
        </div>
      )}

      {/* 5. クリアボタン (右上) */}
      {showUI && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleClear} style={{ padding: '0.5rem 1rem', background: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <Trash2 size={18} /> 
          </button>
        </div>
      )}

      {showUI && (
        <div style={{ position: 'absolute', bottom: '20px', left: '0', width: '100%', textAlign: 'center', color: 'var(--text-main)', pointerEvents: 'none', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(255,255,255,0.8)', zIndex: 10 }}>
          {!isDrawingMode 
            ? 'ドラッグしてカメラを回転・移動できます' 
            : tool === 'pen' ? 'ドラッグして空間に絵を描けます' 
            : tool === 'box' ? 'ドラッグして3Dボックスを配置できます' 
            : tool === 'paint' ? 'ドラッグして触れた絵の色を変更できます'
            : tool === 'eyedropper' ? '描いたものをクリックして色を採取します'
            : tool === 'eraser' ? 'ドラッグして触れたものを消去します'
            : tool === 'lasso' ? 'ドラッグして囲んだものを選択します'
            : tool === 'move' ? 'ドラッグして選択中のものを移動できます'
            : tool === 'text' ? 'クリックした場所にテキストを配置します'
            : tool === 'fill' ? '描いた線の内側をクリックして塗りつぶします（ひと筆書き用）'
            : 'クリックしてコピーした絵をスタンプできます'}
        </div>
      )}

      <Canvas onCreated={({ camera }) => { cameraRef.current = camera; }} camera={{ position: [0, 5, 20], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        <DrawingController 
          isActive={isDrawingMode} 
          distance={distance}
          onPointerDown3D={onPointerDown3D}
          onPointerMove3D={onPointerMove3D}
          onPointerUp3D={onPointerUp3D}
        />

        <group>
          {/* Strokes */}
          {strokes.map((stroke, index) => {
            const isSelected = selection?.strokeIndices.includes(index);
            
            let fillPositions = null;
            if (stroke.fillColor && stroke.points.length > 2) {
              const centroid = [0,0,0];
              stroke.points.forEach(p => { centroid[0]+=p[0]; centroid[1]+=p[1]; centroid[2]+=p[2]; });
              centroid[0]/=stroke.points.length; centroid[1]/=stroke.points.length; centroid[2]/=stroke.points.length;
              
              const posArray = [];
              for(let i=0; i<stroke.points.length - 1; i++) {
                posArray.push(...centroid, ...stroke.points[i], ...stroke.points[i+1]);
              }
              posArray.push(...centroid, ...stroke.points[stroke.points.length - 1], ...stroke.points[0]);
              fillPositions = new Float32Array(posArray);
            }

            return (
              <group key={`s-${index}`}>
                {isSelected && <Line points={stroke.points} color="#ffffff" lineWidth={((stroke.lineWidth || 5) + 3) / 100} worldUnits={true} transparent opacity={0.5} depthWrite={false} />}
                <Line
                  points={stroke.points}
                  color={stroke.color}
                  lineWidth={(stroke.lineWidth || 5) / 100}
                  worldUnits={true}
                />
                {fillPositions && (
                  <mesh>
                    <bufferGeometry>
                      <bufferAttribute
                        attach="attributes-position"
                        count={fillPositions.length / 3}
                        array={fillPositions}
                        itemSize={3}
                      />
                    </bufferGeometry>
                    <meshStandardMaterial color={stroke.fillColor} side={THREE.DoubleSide} transparent opacity={0.9} roughness={0.3} />
                  </mesh>
                )}
              </group>
            );
          })}
          {currentStroke && currentStroke.points.length > 1 && (
            <Line
              points={currentStroke.points}
              color={currentStroke.color}
              lineWidth={(currentStroke.lineWidth || 5) / 100}
              worldUnits={true}
            />
          )}

          {/* Shapes (Previously Boxes) */}
          {boxes.map((b, index) => {
            const isSelected = selection?.boxIndices.includes(index);
            const type = b.shapeType || 'box';
            return (
              <mesh key={`b-${index}`} position={b.position} rotation={b.rotation || [0,0,0]}>
                {type === 'box' && <boxGeometry args={b.size} />}
                {type === 'sphere' && <sphereGeometry args={[b.size[0]/2, 32, 32]} />}
                {type === 'cone' && <coneGeometry args={[b.size[0]/2, b.size[0], 32]} />}
                {type === 'cylinder' && <cylinderGeometry args={[b.size[0]/2, b.size[0]/2, b.size[0], 32]} />}
                {type === 'prism3' && <cylinderGeometry args={[b.size[0]/2, b.size[0]/2, b.size[0], 3]} />}
                {type === 'prism4' && <cylinderGeometry args={[b.size[0]/2, b.size[0]/2, b.size[0], 4]} />}
                <meshStandardMaterial color={b.color} transparent opacity={0.9} roughness={0.3} metalness={0.2} emissive={isSelected ? '#ffffff' : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
              </mesh>
            );
          })}
          {currentBox && (() => {
            const sizeVal = new THREE.Vector3(...currentBox.endPos).distanceTo(new THREE.Vector3(...currentBox.startPos)) * 2;
            if (sizeVal < 0.1) return null;
            const type = currentBox.shapeType || 'box';
            return (
              <mesh position={currentBox.startPos}>
                {type === 'box' && <boxGeometry args={[sizeVal, sizeVal, sizeVal]} />}
                {type === 'sphere' && <sphereGeometry args={[sizeVal/2, 32, 32]} />}
                {type === 'cone' && <coneGeometry args={[sizeVal/2, sizeVal, 32]} />}
                {type === 'cylinder' && <cylinderGeometry args={[sizeVal/2, sizeVal/2, sizeVal, 32]} />}
                {type === 'prism3' && <cylinderGeometry args={[sizeVal/2, sizeVal/2, sizeVal, 3]} />}
                {type === 'prism4' && <cylinderGeometry args={[sizeVal/2, sizeVal/2, sizeVal, 4]} />}
                <meshStandardMaterial color={currentBox.color} transparent opacity={0.5} roughness={0.3} metalness={0.2} />
              </mesh>
            );
          })()}

          {/* Texts */}
          {texts.map((t, index) => {
            const isSelected = selection?.textIndices.includes(index);
            return (
              <Text 
                key={`t-${index}`} 
                position={t.position} 
                rotation={t.rotation || [0,0,0]}
                color={isSelected ? '#ffffff' : t.color} 
                fontSize={t.size} 
                anchorX="center" 
                anchorY="middle"
              >
                {t.text}
              </Text>
            );
          })}

          {/* Lasso Preview */}
          {tool === 'lasso' && lassoPoints3D.length > 1 && (
            <Line points={lassoPoints3D} color="#3b82f6" lineWidth={3} />
          )}

          {/* Eraser / Paint Preview */}
          {(tool === 'eraser' || tool === 'paint') && isDrawingMode && previewPos && (
            <mesh position={previewPos}>
              <sphereGeometry args={[eraserRadiusMap[eraserSize], 16, 16]} />
              <meshBasicMaterial color={tool === 'paint' ? brushColor : '#ef4444'} wireframe transparent opacity={0.6} />
            </mesh>
          )}

          {/* Stamp Preview */}
          {tool === 'stamp' && isDrawingMode && copiedArt && previewPos && (() => {
            const dx = previewPos[0] - copiedArt.centroid[0];
            const dy = previewPos[1] - copiedArt.centroid[1];
            const dz = previewPos[2] - copiedArt.centroid[2];
            return (
              <group position={[dx, dy, dz]}>
                 {copiedArt.strokes.map((stroke, i) => (
                    <Line key={`prev-s-${i}`} points={stroke.points} color={stroke.color} lineWidth={(stroke.lineWidth || 5) / 100} worldUnits={true} transparent opacity={0.4} />
                 ))}
                 {copiedArt.boxes.map((b, i) => (
                    <mesh key={`prev-b-${i}`} position={b.position}>
                       <boxGeometry args={b.size} />
                       <meshStandardMaterial color={b.color} transparent opacity={0.4} roughness={0.3} metalness={0.2} />
                    </mesh>
                 ))}
                 {copiedArt.texts.map((t, i) => (
                    <Text 
                      key={`prev-t-${i}`} 
                      position={t.position} 
                      color={t.color} 
                      fontSize={t.size} 
                      anchorX="center" 
                      anchorY="middle"
                      fillOpacity={0.4}
                    >
                      {t.text}
                    </Text>
                 ))}
              </group>
            );
          })()}
        </group>

        {/* 空間のガイドとなるグリッド */}
        <Grid 
          position={[0, -5, 0]} 
          args={[100, 100]} 
          cellSize={1} 
          cellThickness={1} 
          cellColor="#e2e8f0" 
          sectionSize={5} 
          sectionThickness={1.5} 
          sectionColor="#cbd5e1" 
          fadeDistance={50} 
        />
        
        <Environment preset="city" />
        <OrbitControls 
          enabled={!isDrawingMode} 
          enableDamping 
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}
