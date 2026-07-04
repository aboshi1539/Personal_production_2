import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Environment, Grid, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Trash2, Move3d, PenTool, Square, Copy, Eraser, MousePointer2, Undo2, Redo2, Paintbrush, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff, PaintBucket, Circle, Shapes, Triangle, Minus, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, Upload, Camera, Video, X, Settings, Maximize, Palette, Play, Pause, Link, Unlink } from 'lucide-react';
import './index.css';
import Draw2D from './Draw2D';

function VirtualCanvasMesh({ data, isSelected, onClick }) {
  const texture = useMemo(() => {
    const img = new Image();
    img.src = data.textureUrl;
    const tex = new THREE.Texture(img);
    img.onload = () => tex.needsUpdate = true;
    return tex;
  }, [data.textureUrl]);

  return (
    <mesh position={data.position} rotation={data.rotation || [0, 0, 0]} scale={data.scale || 1} onClick={onClick}>
      <planeGeometry args={[data.size[0], data.size[1]]} />
      <meshStandardMaterial map={texture} transparent opacity={data.opacity ?? 1.0} side={THREE.DoubleSide} emissive={isSelected ? '#ffffff' : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} alphaTest={0.01} />
    </mesh>
  );
}

function VirtualCanvasCubeMesh({ data, isSelected, onClick }) {
  const materials = useMemo(() => {
    return (data.textureUrls || Array(6).fill('')).map((url) => {
      const img = new Image();
      img.src = url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const tex = new THREE.Texture(img);
      img.onload = () => tex.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: tex,
        transparent: true,
        opacity: data.opacity ?? 1.0,
        emissive: isSelected ? '#ffffff' : '#000000',
        emissiveIntensity: isSelected ? 0.4 : 0,
        alphaTest: 0.01
      });
    });
  }, [data.textureUrls, isSelected, data.opacity]);

  return (
    <mesh position={data.position} rotation={data.rotation || [0, 0, 0]} scale={data.scale || 1} onClick={onClick} material={materials}>
      <boxGeometry args={data.size || [20, 20, 20]} />
    </mesh>
  );
}

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

function BrushPreview({ tool, brushColor, eraserSize, previewPosRef, eraserRadiusMap, isDrawingMode }) {
  const meshRef = useRef();
  useFrame(() => {
    if (meshRef.current && previewPosRef.current) {
      meshRef.current.position.set(...previewPosRef.current);
    }
  });

  if (!isDrawingMode || (tool !== 'eraser' && tool !== 'paint')) return null;

  return (
    <mesh ref={meshRef} position={[0,0,0]}>
      <sphereGeometry args={[eraserRadiusMap[eraserSize], 16, 16]} />
      <meshBasicMaterial color={tool === 'eraser' ? '#ff0000' : brushColor} transparent opacity={0.6} wireframe={true} />
    </mesh>
  );
}

function ActiveStampPreview({ tool, isDrawingMode, copiedArt, previewPosRef }) {
  const groupRef = useRef();
  useFrame(() => {
    if (groupRef.current && previewPosRef.current && copiedArt) {
      const dx = previewPosRef.current[0] - copiedArt.centroid[0];
      const dy = previewPosRef.current[1] - copiedArt.centroid[1];
      const dz = 0;
      groupRef.current.position.set(dx, dy, dz);
    }
  });

  if (tool !== 'stamp' || !isDrawingMode || !copiedArt) return null;

  return (
    <group ref={groupRef} position={[0,0,0]}>
      {copiedArt.strokes.map((stroke, i) => (
        <Line key={`prev-s-${i}`} points={stroke.points} color={stroke.color} lineWidth={(stroke.lineWidth || 5) / 100} worldUnits={true} transparent opacity={0.4} />
      ))}
      {copiedArt.boxes.map((b, i) => {
        const type = b.shapeType || 'box';
        if (type === 'virtualCanvas' || type === 'virtualCanvasCube') return null;
        return (
          <mesh key={`prev-b-${i}`} position={b.position} rotation={b.rotation || [0, 0, 0]} scale={b.scale || 1}>
            {type === 'box' && <boxGeometry args={b.size} />}
            {type === 'sphere' && <sphereGeometry args={[b.size[0] / 2, 32, 32]} />}
            {type === 'cone' && <coneGeometry args={[b.size[0] / 2, b.size[0], 3]} />}
            {type === 'cylinder' && <cylinderGeometry args={[(b.taper ?? 1) * b.size[0] / 2, b.size[0] / 2, b.size[0], 32]} />}
            {type === 'prism3' && <cylinderGeometry args={[(b.taper ?? 1) * b.size[0] / 2, b.size[0] / 2, b.size[0], 3]} />}
            {type === 'prism4' && <cylinderGeometry args={[(b.taper ?? 1) * b.size[0] / 2, b.size[0] / 2, b.size[0], 4]} />}
            <meshStandardMaterial color={b.color} transparent opacity={0.4} roughness={0.3} metalness={0.2} />
          </mesh>
        );
      })}
      {copiedArt.texts.map((t, i) => (
        <Text
          key={`prev-t-${i}`}
          position={t.position}
          rotation={t.rotation || [0, 0, 0]}
          scale={t.scale || 1}
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
}

function ActiveStrokePreview({ activeStrokeRef }) {
  const lineRef = useRef();
  const [strokeConfig, setStrokeConfig] = useState(null);

  useFrame(() => {
    const stroke = activeStrokeRef.current;
    if (stroke && stroke.points.length > 1) {
      if (!strokeConfig || stroke.points.length !== stroke.renderedLength) {
        stroke.renderedLength = stroke.points.length;
        setStrokeConfig({ color: stroke.color, lineWidth: stroke.lineWidth, points: [...stroke.points] });
      }
    } else if (!stroke && strokeConfig) {
      setStrokeConfig(null);
    }
  });

  if (!strokeConfig) return null;

  return (
    <Line
      ref={lineRef}
      points={strokeConfig.points}
      color={strokeConfig.color}
      lineWidth={(strokeConfig.lineWidth || 5) / 100}
      worldUnits={true}
    />
  );
}

function ActiveBoxPreview({ activeBoxRef }) {
  const meshRef = useRef();
  const [boxConfig, setBoxConfig] = useState(null);

  useFrame(() => {
    const box = activeBoxRef.current;
    if (box) {
      if (!boxConfig) {
        setBoxConfig({ color: box.color, shapeType: box.shapeType });
      }
      if (meshRef.current && box.startPos && box.endPos) {
        const dx = box.endPos[0] - box.startPos[0];
        const dy = box.endPos[1] - box.startPos[1];
        const dz = box.endPos[2] - box.startPos[2];
        const distance = Math.hypot(dx, dy, dz);
        const sizeVal = distance * 2 || 0.1;
        
        meshRef.current.position.set(...box.startPos);
        meshRef.current.scale.set(sizeVal, sizeVal, sizeVal);
      }
    } else if (!box && boxConfig) {
      setBoxConfig(null);
    }
  });

  if (!boxConfig) return null;

  return (
    <mesh ref={meshRef} position={[0,0,0]}>
      {boxConfig.shapeType === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {boxConfig.shapeType === 'sphere' && <sphereGeometry args={[0.5, 32, 32]} />}
      {boxConfig.shapeType === 'cone' && <coneGeometry args={[0.5, 1, 3]} />}
      {boxConfig.shapeType === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 32]} />}
      {boxConfig.shapeType === 'prism3' && <cylinderGeometry args={[0.5, 0.5, 1, 3]} />}
      {boxConfig.shapeType === 'prism4' && <cylinderGeometry args={[0.5, 0.5, 1, 4]} />}
      <meshStandardMaterial color={boxConfig.color} transparent opacity={0.5} roughness={0.3} wireframe />
    </mesh>
  );
}

function ActiveLassoPreview({ activeLassoRef }) {
  const lineRef = useRef();
  const [isActive, setIsActive] = useState(false);

  useFrame(() => {
    const lasso = activeLassoRef.current;
    if (lasso && lasso.points3D.length > 1) {
      if (!isActive || lasso.points3D.length !== lasso.renderedLength) {
        lasso.renderedLength = lasso.points3D.length;
        setIsActive([...lasso.points3D]);
      }
    } else if (!lasso && isActive) {
      setIsActive(false);
    }
  });

  if (!isActive || !activeLassoRef.current) return null;
  return (
    <Line
      ref={lineRef}
      points={isActive}
      color="#3b82f6"
      lineWidth={2}
    />
  );
}

function DrawingController({ isActive, tool, distance, setDistance, onPointerDown3D, onPointerMove3D, onPointerUp3D }) {
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
      if (e.pointerType === 'mouse' && e.button !== 0) return; // Only left click for mouse
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

    const handleWheel = (e) => {
      if (!isActive || !setDistance) return;
      const alwaysActiveTools = ['text', 'eraser', 'move', 'lasso', 'stamp'];
      const shouldChangeDepth = alwaysActiveTools.includes(tool) || isDragging.current;
      if (!shouldChangeDepth) return;
      
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      setDistance(prev => Math.max(3, Math.min(60, prev + delta)));
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [isActive, tool, camera, gl, distance, setDistance, onPointerDown3D, onPointerMove3D, onPointerUp3D]);

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
  const controlsRef = useRef(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { boxesRef.current = boxes; }, [boxes]);
  useEffect(() => { textsRef.current = texts; }, [texts]);

  const [history, setHistory] = useState([{ strokes: [], boxes: [], texts: [] }]);
  const historyRef = useRef([{ strokes: [], boxes: [], texts: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const [lastSavedIndex, setLastSavedIndex] = useState(0);
  const [showConfirmHome, setShowConfirmHome] = useState(false);

  const [showVirtualCanvas, setShowVirtualCanvas] = useState(false);
  const [showVirtualCanvasMenu, setShowVirtualCanvasMenu] = useState(false);
  const [virtualCanvasShape, setVirtualCanvasShape] = useState('plane');
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [showResizePanel, setShowResizePanel] = useState(false);
  const [showAppearancePanel, setShowAppearancePanel] = useState(false);
  const [showAnimationPanel, setShowAnimationPanel] = useState(false);
  const [animVertical, setAnimVertical] = useState(false);
  const [animVerticalDist, setAnimVerticalDist] = useState(10);
  const [animVerticalSpeed, setAnimVerticalSpeed] = useState(1);
  const [animHorizontal, setAnimHorizontal] = useState(false);
  const [animHorizontalDist, setAnimHorizontalDist] = useState(10);
  const [animHorizontalSpeed, setAnimHorizontalSpeed] = useState(1);
  const [animDepth, setAnimDepth] = useState(false);
  const [animDepthDist, setAnimDepthDist] = useState(10);
  const [animDepthSpeed, setAnimDepthSpeed] = useState(1);
  const handleVirtualCanvasComplete = (dataUrlOrUrls, aspect, scaleFactor = 1, shape = 'plane') => {
    setShowVirtualCanvas(false);
    setIsDrawingMode(true);
    setTool('lasso');
    const sizeY = 20 * scaleFactor;
    const sizeX = 20 * aspect * scaleFactor;
    const newBoard = {
      shapeType: shape === 'cube' ? 'virtualCanvasCube' : 'virtualCanvas',
      textureUrl: shape === 'cube' ? undefined : dataUrlOrUrls,
      textureUrls: shape === 'cube' ? dataUrlOrUrls : undefined,
      position: [cameraRef.current ? cameraRef.current.position.x : 0, 5, 0],
      rotation: [0, 0, 0],
      size: shape === 'cube' ? [20 * scaleFactor, 20 * scaleFactor, 20 * scaleFactor] : [sizeX, sizeY, 0],
      color: '#ffffff'
    };
    setBoxes(prev => {
      const next = [...prev, newBoard];
      setTimeout(() => saveHistory(strokes, next, texts), 0);
      return next;
    });
  };

  const saveHistory = useCallback((newStrokes, newBoxes, newTexts) => {
    const currIndex = historyIndexRef.current;
    let currHist = historyRef.current.slice(0, currIndex + 1);
    const lastState = currHist[currHist.length - 1];
    const newState = {
      strokes: newStrokes,
      boxes: newBoxes,
      texts: newTexts || textsRef.current
    };
    
    if (JSON.stringify(lastState) === JSON.stringify(newState)) {
      return;
    }
    
    currHist.push(JSON.parse(JSON.stringify(newState)));
    if (currHist.length > 19) {
      currHist = currHist.slice(currHist.length - 19);
    }
    historyRef.current = currHist;
    historyIndexRef.current = currHist.length - 1;
    
    setHistory(currHist);
    setHistoryIndex(currHist.length - 1);
  }, []);

  const undo = () => {
    const currIndex = historyIndexRef.current;
    if (currIndex > 0) {
      const newIndex = currIndex - 1;
      const prevState = historyRef.current[newIndex];
      setStrokes(JSON.parse(JSON.stringify(prevState.strokes)));
      setBoxes(JSON.parse(JSON.stringify(prevState.boxes)));
      setTexts(JSON.parse(JSON.stringify(prevState.texts || [])));
      
      historyIndexRef.current = newIndex;
      setHistoryIndex(newIndex);
      
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
      setCurrentStroke(null);
      setCurrentBox(null);
      setLassoPoints3D([]);
      setLassoPointsNDC([]);
      setShowPropertyPanel(false);
      setShowResizePanel(false);
      setShowAppearancePanel(false);
    }
  };

  const redo = () => {
    const currIndex = historyIndexRef.current;
    if (currIndex < historyRef.current.length - 1) {
      const newIndex = currIndex + 1;
      const nextState = historyRef.current[newIndex];
      setStrokes(JSON.parse(JSON.stringify(nextState.strokes)));
      setBoxes(JSON.parse(JSON.stringify(nextState.boxes)));
      setTexts(JSON.parse(JSON.stringify(nextState.texts || [])));
      
      historyIndexRef.current = newIndex;
      setHistoryIndex(newIndex);
      
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
      setCurrentStroke(null);
      setCurrentBox(null);
      setLassoPoints3D([]);
      setLassoPointsNDC([]);
      setShowPropertyPanel(false);
      setShowResizePanel(false);
      setShowAppearancePanel(false);
    }
  };

  const activeStrokeRef = useRef(null);
  const activeBoxRef = useRef(null);
  const activeLassoRef = useRef(null);

  const [selection, setSelection] = useState({ strokeIndices: [], boxIndices: [], textIndices: [] });

  const [isDrawingMode, setIsDrawingMode] = useState(true);
  const [tool, setTool] = useState('camera'); // 'pen', 'box', 'stamp', 'eraser', 'lasso', 'move', 'paint'

  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(3);
  const [distance, setDistance] = useState(15);
  const [textInput, setTextInput] = useState('');
  const [textSize, setTextSize] = useState(1);
  const [showUI, setShowUI] = useState(true);

  const handleToolChange = (newTool) => {
    setTool(newTool);
    if (newTool !== 'move' && newTool !== 'lasso') {
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    }
  };

  const handleObjectClick = (e, type, index) => {
    if (showPropertyPanel || showResizePanel || showAppearancePanel) {
      let targetObj;
      if (type === 'box') {
        targetObj = boxesRef.current[index];
      } else if (type === 'text') {
        targetObj = textsRef.current[index];
      }

      const sIds = [];
      const bIds = [];
      const tIds = [];

      if (targetObj && targetObj.groupId) {
        const gid = targetObj.groupId;
        strokesRef.current.forEach((s, i) => { if (s.groupId === gid) sIds.push(i); });
        boxesRef.current.forEach((b, i) => { if (b.groupId === gid) bIds.push(i); });
        textsRef.current.forEach((t, i) => { if (t.groupId === gid) tIds.push(i); });
      } else {
        if (type === 'box') bIds.push(index);
        if (type === 'text') tIds.push(index);
      }
      
      setSelection({ strokeIndices: sIds, boxIndices: bIds, textIndices: tIds });
    }
  };

  const propertyUpdateTimeoutRef = useRef(null);

  const updateObjectProperty = (key, value, vectorIndex = null) => {
    const applyUpdate = (obj) => {
      if (key === 'scaleAllProportional') {
        let currentVal = obj.scale;
        if (currentVal === undefined) currentVal = [1, 1, 1];
        if (typeof currentVal === 'number') currentVal = [currentVal, currentVal, currentVal];
        const oldBase = currentVal[0];
        const ratio = oldBase > 0 ? value / oldBase : 1;
        obj.scale = [currentVal[0] * ratio, currentVal[1] * ratio, currentVal[2] * ratio];
      } else if (vectorIndex !== null) {
        let currentVal = obj[key];
        if (currentVal === undefined) currentVal = (key === 'scale' ? [1, 1, 1] : [0, 0, 0]);
        if (typeof currentVal === 'number') currentVal = [currentVal, currentVal, currentVal];
        const arr = [...currentVal];
        arr[vectorIndex] = value;
        obj[key] = arr;
      } else {
        obj[key] = value;
      }
    };

    if (selection.boxIndices.length > 0) {
      const idx = selection.boxIndices[0];
      const newBoxes = [...boxes];
      const b = { ...newBoxes[idx] };
      applyUpdate(b);
      newBoxes[idx] = b;
      setBoxes(newBoxes);

      if (propertyUpdateTimeoutRef.current) clearTimeout(propertyUpdateTimeoutRef.current);
      propertyUpdateTimeoutRef.current = setTimeout(() => {
        saveHistory(strokesRef.current, newBoxes, textsRef.current);
      }, 500);
    } else if (selection.textIndices.length > 0) {
      const idx = selection.textIndices[0];
      const newTexts = [...texts];
      const t = { ...newTexts[idx] };
      applyUpdate(t);
      newTexts[idx] = t;
      setTexts(newTexts);

      if (propertyUpdateTimeoutRef.current) clearTimeout(propertyUpdateTimeoutRef.current);
      propertyUpdateTimeoutRef.current = setTimeout(() => {
        saveHistory(strokesRef.current, boxesRef.current, newTexts);
      }, 500);
    }
  };
  const [shapeType, setShapeType] = useState('box');
  const [showSubMenu, setShowSubMenu] = useState(true);

  const [copiedArt, setCopiedArt] = useState(null);
  const previewPosRef = useRef(null);
  const [savedColors, setSavedColors] = useState([]);


  const modifiedSomethingRef = useRef(false);
  const moveStartRef = useRef(null);
  const moveInitialStateRef = useRef(null);
  const cameraRef = useRef();

  const baseColors = ['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7'];
  const eraserRadiusMap = { 1: 0.5, 2: 1.0, 3: 1.5, 4: 2.5, 5: 4.0 };
  const brushSizeMap = { 1: 2, 2: 10, 3: 30, 4: 60, 5: 120 };

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

  const handleDeleteSelection = () => {
    if (selection.strokeIndices.length === 0 && selection.boxIndices.length === 0 && selection.textIndices.length === 0) return;

    const nextStrokes = strokesRef.current.filter((_, i) => !selection.strokeIndices.includes(i));
    const nextBoxes = boxesRef.current.filter((_, i) => !selection.boxIndices.includes(i));
    const nextTexts = textsRef.current.filter((_, i) => !selection.textIndices.includes(i));

    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    setTexts(nextTexts);
    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    setTool('lasso');
    setTimeout(() => saveHistory(nextStrokes, nextBoxes, nextTexts), 0);
  };

  const handleGroup = () => {
    if (selection.strokeIndices.length === 0 && selection.boxIndices.length === 0 && selection.textIndices.length === 0) return;
    
    const gid = Date.now().toString();
    const nextStrokes = [...strokesRef.current];
    selection.strokeIndices.forEach(idx => { nextStrokes[idx] = { ...nextStrokes[idx], groupId: gid }; });
    
    const nextBoxes = [...boxesRef.current];
    selection.boxIndices.forEach(idx => { nextBoxes[idx] = { ...nextBoxes[idx], groupId: gid }; });
    
    const nextTexts = [...textsRef.current];
    selection.textIndices.forEach(idx => { nextTexts[idx] = { ...nextTexts[idx], groupId: gid }; });
    
    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    setTexts(nextTexts);
    setTimeout(() => saveHistory(nextStrokes, nextBoxes, nextTexts), 0);
  };

  const handleUngroup = () => {
    if (selection.strokeIndices.length === 0 && selection.boxIndices.length === 0 && selection.textIndices.length === 0) return;
    
    const nextStrokes = [...strokesRef.current];
    selection.strokeIndices.forEach(idx => { 
      if (nextStrokes[idx].groupId) {
        const copy = { ...nextStrokes[idx] };
        delete copy.groupId;
        nextStrokes[idx] = copy;
      }
    });
    
    const nextBoxes = [...boxesRef.current];
    selection.boxIndices.forEach(idx => { 
      if (nextBoxes[idx].groupId) {
        const copy = { ...nextBoxes[idx] };
        delete copy.groupId;
        nextBoxes[idx] = copy;
      }
    });
    
    const nextTexts = [...textsRef.current];
    selection.textIndices.forEach(idx => { 
      if (nextTexts[idx].groupId) {
        const copy = { ...nextTexts[idx] };
        delete copy.groupId;
        nextTexts[idx] = copy;
      }
    });
    
    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    setTexts(nextTexts);
    setTimeout(() => saveHistory(nextStrokes, nextBoxes, nextTexts), 0);
  };

  const handleScale = (factor) => {
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
        points: nextStrokes[idx].points.map(p => [
          center.x + (p[0] - center.x) * factor,
          center.y + (p[1] - center.y) * factor,
          center.z + (p[2] - center.z) * factor
        ])
      };
    });

    const nextBoxes = [...boxesRef.current];
    selection.boxIndices.forEach(idx => {
      const b = nextBoxes[idx];
      nextBoxes[idx] = {
        ...b,
        position: [
          center.x + (b.position[0] - center.x) * factor,
          center.y + (b.position[1] - center.y) * factor,
          center.z + (b.position[2] - center.z) * factor
        ],
        size: b.size.map(s => s * factor)
      };
    });

    const nextTexts = [...textsRef.current];
    selection.textIndices.forEach(idx => {
      const t = nextTexts[idx];
      nextTexts[idx] = {
        ...t,
        position: [
          center.x + (t.position[0] - center.x) * factor,
          center.y + (t.position[1] - center.y) * factor,
          center.z + (t.position[2] - center.z) * factor
        ],
        size: t.size * factor
      };
    });

    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    setTexts(nextTexts);
    setTimeout(() => saveHistory(nextStrokes, nextBoxes, nextTexts), 0);
  };

  const handleRotate = (axis, angleDeg) => {
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

    const angle = angleDeg * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rotatePoint = (p) => {
      let dx = p[0] - center.x;
      let dy = p[1] - center.y;
      let dz = p[2] - center.z;
      let nx = dx, ny = dy, nz = dz;

      if (axis === 'x') {
        ny = dy * cos - dz * sin;
        nz = dy * sin + dz * cos;
      } else if (axis === 'y') {
        nx = dx * cos + dz * sin;
        nz = -dx * sin + dz * cos;
      } else if (axis === 'z') {
        nx = dx * cos - dy * sin;
        ny = dx * sin + dy * cos;
      }
      return [center.x + nx, center.y + ny, center.z + nz];
    };

    const nextStrokes = [...strokesRef.current];
    selection.strokeIndices.forEach(idx => {
      nextStrokes[idx] = {
        ...nextStrokes[idx],
        points: nextStrokes[idx].points.map(rotatePoint)
      };
    });

    const nextBoxes = [...boxesRef.current];
    selection.boxIndices.forEach(idx => {
      const b = nextBoxes[idx];
      const np = rotatePoint(b.position);
      const rot = b.rotation ? [...b.rotation] : [0, 0, 0];
      if (axis === 'x') rot[0] += angle;
      if (axis === 'y') rot[1] += angle;
      if (axis === 'z') rot[2] += angle;
      nextBoxes[idx] = { ...b, position: np, rotation: rot };
    });

    const nextTexts = [...textsRef.current];
    selection.textIndices.forEach(idx => {
      const t = nextTexts[idx];
      const np = rotatePoint(t.position);
      const rot = t.rotation ? [...t.rotation] : [0, 0, 0];
      if (axis === 'x') rot[0] += angle;
      if (axis === 'y') rot[1] += angle;
      if (axis === 'z') rot[2] += angle;
      nextTexts[idx] = { ...t, position: np, rotation: rot };
    });

    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    setTexts(nextTexts);
    setTimeout(() => saveHistory(nextStrokes, nextBoxes, nextTexts), 0);
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
    const dz = 0; // Maintain original depth

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
        setSavedColors(prev => {
          if (prev.includes(foundColor)) return prev;
          const newSaved = [...prev, foundColor];
          if (newSaved.length > 5) return newSaved.slice(newSaved.length - 5);
          return newSaved;
        });
        setTool('pen');
      }
      return;
    }

    if (tool === 'pen') {
      activeStrokeRef.current = { color: brushColor, lineWidth: brushSizeMap[brushSize], points: [pos3D], renderedLength: 1 };
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
              if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
              if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
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
      activeBoxRef.current = { color: brushColor, startPos: pos3D, endPos: pos3D, shapeType: shapeType };
    } else if (tool === 'stamp') {
      handleStamp(pos3D);
    } else if (tool === 'lasso') {
      activeLassoRef.current = { points3D: [pos3D], pointsNDC: [posNDC], renderedLength: 1 };
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    } else if (tool === 'move') {
      moveStartRef.current = pos3D;
      moveInitialStateRef.current = { strokes: JSON.parse(JSON.stringify(strokesRef.current)), boxes: JSON.parse(JSON.stringify(boxesRef.current)), texts: JSON.parse(JSON.stringify(textsRef.current)) };
    }
  }, [tool, brushColor, brushSize, handleStamp, shapeType, textInput, textSize]);

  const onPointerMove3D = useCallback((pos3D, isDragging, posNDC) => {
    previewPosRef.current = pos3D;
    if (!isDragging) return;

    if (tool === 'pen') {
      if (activeStrokeRef.current) {
        const prev = activeStrokeRef.current;
        const lastPoint = prev.points[prev.points.length - 1];
        if (lastPoint) {
          const dist = new THREE.Vector3(...lastPoint).distanceTo(new THREE.Vector3(...pos3D));
          // Filter out points that are too close to prevent Line2 spiky joint artifacts
          if (dist >= 0.05) {
            prev.points.push(pos3D);
          }
        }
      }
    } else if (tool === 'shape') {
      if (activeBoxRef.current) {
        activeBoxRef.current.endPos = pos3D;
      }
    } else if (tool === 'lasso') {
      if (activeLassoRef.current) {
        activeLassoRef.current.pointsNDC.push(posNDC);
        activeLassoRef.current.points3D.push(pos3D);
      }
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
              return { ...s, color: brushColor, ...(s.fillColor ? { fillColor: brushColor } : {}) };
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
              points: moveInitialStateRef.current.strokes[idx].points.map(pt => [pt[0] + dx, pt[1] + dy, pt[2] + dz])
            };
          }
        });
        setStrokes(nextStrokes);

        const nextBoxes = [...boxesRef.current];
        selection.boxIndices.forEach(idx => {
          if (moveInitialStateRef.current.boxes[idx]) {
            const b = moveInitialStateRef.current.boxes[idx];
            nextBoxes[idx] = { ...b, position: [b.position[0] + dx, b.position[1] + dy, b.position[2] + dz] };
          }
        });
        setBoxes(nextBoxes);

        const nextTexts = [...textsRef.current];
        selection.textIndices.forEach(idx => {
          if (moveInitialStateRef.current.texts[idx]) {
            const t = moveInitialStateRef.current.texts[idx];
            nextTexts[idx] = { ...t, position: [t.position[0] + dx, t.position[1] + dy, t.position[2] + dz] };
          }
        });
        setTexts(nextTexts);
      }
    }
  }, [tool, selection, brushColor, eraserSize]);

  const onPointerUp3D = useCallback(() => {
    if (tool === 'pen') {
      if (activeStrokeRef.current && activeStrokeRef.current.points.length > 1) {
        const newStrokes = [...strokesRef.current, activeStrokeRef.current];
        setStrokes(newStrokes);
        setTimeout(() => saveHistory(newStrokes, boxesRef.current, textsRef.current), 0);
      }
      activeStrokeRef.current = null;
    } else if (tool === 'shape') {
      if (activeBoxRef.current) {
        const prev = activeBoxRef.current;
        const size = new THREE.Vector3(...prev.endPos).distanceTo(new THREE.Vector3(...prev.startPos)) * 2;
        if (size > 0.1) {
          const newBoxes = [...boxesRef.current, { position: prev.startPos, size: [size, size, size], color: prev.color, shapeType: prev.shapeType }];
          setBoxes(newBoxes);
          setTimeout(() => saveHistory(strokesRef.current, newBoxes, textsRef.current), 0);
        }
        activeBoxRef.current = null;
      }
    } else if (tool === 'eraser' || tool === 'paint') {
      if (modifiedSomethingRef.current) {
        modifiedSomethingRef.current = false;
        setTimeout(() => saveHistory(strokesRef.current, boxesRef.current, textsRef.current), 0);
      }
    } else if (tool === 'lasso') {
      if (!cameraRef.current || !activeLassoRef.current) return;
      const lassoPointsNDCLocal = activeLassoRef.current.pointsNDC;
      const strokeIndices = [];
      strokesRef.current.forEach((s, i) => {
        let inLasso = false;
        for (let p of s.points) {
          const v = new THREE.Vector3(p[0], p[1], p[2]).project(cameraRef.current);
          if (pointInPolygon([v.x, v.y], lassoPointsNDCLocal)) {
            inLasso = true; break;
          }
        }
        if (inLasso) strokeIndices.push(i);
      });

      const boxIndices = [];
      boxesRef.current.forEach((b, i) => {
        const v = new THREE.Vector3(...b.position).project(cameraRef.current);
        if (pointInPolygon([v.x, v.y], lassoPointsNDCLocal)) {
          boxIndices.push(i);
        }
      });

      const textIndices = [];
      textsRef.current.forEach((t, i) => {
        const v = new THREE.Vector3(...t.position).project(cameraRef.current);
        if (pointInPolygon([v.x, v.y], lassoPointsNDCLocal)) {
          textIndices.push(i);
        }
      });

      const groupIdsToSelect = new Set();
      strokeIndices.forEach(i => { if (strokesRef.current[i].groupId) groupIdsToSelect.add(strokesRef.current[i].groupId); });
      boxIndices.forEach(i => { if (boxesRef.current[i].groupId) groupIdsToSelect.add(boxesRef.current[i].groupId); });
      textIndices.forEach(i => { if (textsRef.current[i].groupId) groupIdsToSelect.add(textsRef.current[i].groupId); });

      if (groupIdsToSelect.size > 0) {
        strokesRef.current.forEach((s, i) => { if (s.groupId && groupIdsToSelect.has(s.groupId) && !strokeIndices.includes(i)) strokeIndices.push(i); });
        boxesRef.current.forEach((b, i) => { if (b.groupId && groupIdsToSelect.has(b.groupId) && !boxIndices.includes(i)) boxIndices.push(i); });
        textsRef.current.forEach((t, i) => { if (t.groupId && groupIdsToSelect.has(t.groupId) && !textIndices.includes(i)) textIndices.push(i); });
      }

      setSelection({ strokeIndices, boxIndices, textIndices });
      if (strokeIndices.length > 0 || boxIndices.length > 0 || textIndices.length > 0) {
        setTool('move');
      }
      activeLassoRef.current = null;
    } else if (tool === 'move') {
      if (moveStartRef.current) {
        moveStartRef.current = null;
        setTimeout(() => saveHistory(strokesRef.current, boxesRef.current, textsRef.current), 0);
      }
    }
  }, [tool, saveHistory]);

  const handleClear = () => {
    setStrokes([]);
    setBoxes([]);
    setTexts([]);
    setCurrentStroke(null);
    setCurrentBox(null);
    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    setTimeout(() => saveHistory([], [], []), 0);
  };

  const handleZoomIn = () => {
    if (cameraRef.current) {
      cameraRef.current.zoom = Math.min(cameraRef.current.zoom * 1.2, 5);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      cameraRef.current.zoom = Math.max(cameraRef.current.zoom / 1.2, 0.2);
      cameraRef.current.updateProjectionMatrix();
    }
  };

  const handleSaveData = () => {
    const data = {
      strokes: strokesRef.current,
      boxes: boxesRef.current,
      texts: textsRef.current
    };
    const json = JSON.stringify(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.download = `3d-drawing-${timestamp}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    setLastSavedIndex(historyIndex);
  };

  const handleLoadData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.strokes) setStrokes(data.strokes);
        if (data.boxes) setBoxes(data.boxes);
        if (data.texts) setTexts(data.texts);
        setTimeout(() => saveHistory(data.strokes || [], data.boxes || [], data.texts || []), 0);
      } catch (err) {
        alert("データの読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {showUI ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
              <button className="start-button inverted" title="ホームに戻る" onClick={() => {
                const isEmpty = strokesRef.current.length === 0 && boxesRef.current.length === 0 && textsRef.current.length === 0;
                if (historyIndex > lastSavedIndex && !isEmpty) {
                  setShowConfirmHome(true);
                } else {
                  navigate('/');
                }
              }} style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HomeIcon size={28} />
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="start-button"
                  title="元に戻す (Undo)"
                  onClick={undo}
                  disabled={historyIndex === 0}
                  style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: historyIndex === 0 ? 0.5 : 1, cursor: historyIndex === 0 ? 'not-allowed' : 'pointer' }}
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
                onClick={handleZoomIn}
                title="ズームイン"
                style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ZoomIn size={28} />
              </button>
              <button
                className="start-button"
                onClick={handleZoomOut}
                title="ズームアウト"
                style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ZoomOut size={28} />
              </button>
            </div>
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

      {showUI && (
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button title="保存" onClick={handleSaveData} style={{ padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Download size={24} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>保存</span>
          </button>
          <label title="読み込み" style={{ padding: '0.5rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Upload size={24} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>読み込み</span>
            <input type="file" accept=".json" onChange={handleLoadData} style={{ display: 'none' }} />
          </label>
        </div>
      )}



      {/* 1. ツール選択 (上部中央) */}
      {showUI && (
        <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', pointerEvents: 'none' }}>

          {/* モード切替とツール */}
          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>モード</span>
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <button
                  onClick={() => {
                    setIsDrawingMode(true);
                    setShowPropertyPanel(false);
                    setShowResizePanel(false);
                    setShowAppearancePanel(false);
                    setShowAnimationPanel(false);
                    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                  }}
                  style={{ padding: '0.5rem 1rem', background: isDrawingMode ? 'var(--primary-glow)' : '#fff', color: isDrawingMode ? '#fff' : 'var(--text-main)', border: '1px solid var(--primary-glow)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="ペイントツール"
                >
                  <PenTool size={28} />
                </button>
                <button
                  onClick={() => {
                    setIsDrawingMode(false);
                    setShowPropertyPanel(false);
                    setShowResizePanel(false);
                    setShowAppearancePanel(false);
                    setShowAnimationPanel(false);
                    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                  }}
                  style={{ padding: '0.5rem 1rem', background: !isDrawingMode ? '#334155' : '#fff', color: !isDrawingMode ? '#fff' : 'var(--text-main)', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="設定ツール"
                >
                  <Settings size={28} />
                </button>
              </div>
            </div>

            {isDrawingMode && (
              <>
                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
                
                {/* 視点カテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>視点</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button onClick={() => handleToolChange('camera')} title="視点移動" style={{ padding: '0.5rem 1rem', background: tool === 'camera' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Move3d size={28} /></button>
                  </div>
                </div>

                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
                
                {/* 描画カテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>描画</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button onClick={() => handleToolChange('pen')} title="ペン" style={{ padding: '0.5rem 1rem', background: tool === 'pen' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><PenTool size={28} /></button>
                    <button onClick={() => handleToolChange('eraser')} title="消しゴム" style={{ padding: '0.5rem 1rem', background: tool === 'eraser' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Eraser size={28} /></button>
                    <button onClick={() => { handleToolChange('text'); setShowSubMenu(true); }} title="テキスト" style={{ padding: '0.5rem 1rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Type size={28} /></button>
                    <button onClick={() => { handleToolChange('shape'); setShowSubMenu(true); }} title="図形" style={{ padding: '0.5rem 1rem', background: tool === 'shape' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Shapes size={28} /></button>
                  </div>
                </div>

                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

                {/* 編集カテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>編集</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button onClick={() => handleToolChange('lasso')} title="選択・移動" style={{ padding: '0.5rem 1rem', background: (tool === 'lasso' || tool === 'move') ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><MousePointer2 size={28} /></button>
                    <button onClick={() => handleToolChange('eyedropper')} title="スポイト" style={{ padding: '0.5rem 1rem', background: tool === 'eyedropper' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Pipette size={28} /></button>
                    <button onClick={() => handleToolChange('paint')} title="ブラシ" style={{ padding: '0.5rem 1rem', background: tool === 'paint' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Paintbrush size={28} /></button>
                  </div>
                </div>
              </>
            )}
            {!isDrawingMode && (
              <>
                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
                
                {/* 視点カテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>視点</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button onClick={() => {
                        handleToolChange('camera');
                        setShowVirtualCanvasMenu(false);
                        setShowPropertyPanel(false);
                        setShowResizePanel(false);
                        setShowAppearancePanel(false);
                        setShowAnimationPanel(false);
                        setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                      }} title="視点移動" style={{ padding: '0.5rem 1rem', background: tool === 'camera' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Move3d size={28} /></button>
                  </div>
                </div>

                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />
                
                {/* キャンバスカテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>キャンバス</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      onClick={() => {
                        setShowVirtualCanvasMenu(prev => !prev);
                        setShowPropertyPanel(false);
                        setShowResizePanel(false);
                        setShowAppearancePanel(false);
                        setShowAnimationPanel(false);
                        setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                      }}
                      style={{ padding: '0.5rem 1rem', background: showVirtualCanvasMenu ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="仮想キャンバスを開く"
                    >
                      <Square size={28} />
                    </button>
                  </div>
                </div>

                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

                {/* 詳細設定カテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>詳細設定</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      onClick={() => {
                        setShowPropertyPanel(prev => !prev);
                        setShowResizePanel(false);
                        setShowAppearancePanel(false);
                        setShowVirtualCanvasMenu(false);
                        setShowAnimationPanel(false);
                        setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                      }}
                      style={{ padding: '0.5rem 1rem', background: showPropertyPanel ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="詳細設定パネル"
                    >
                      <Settings size={28} />
                    </button>
                    <button
                      onClick={() => {
                        setShowResizePanel(prev => !prev);
                        setShowPropertyPanel(false);
                        setShowAppearancePanel(false);
                        setShowVirtualCanvasMenu(false);
                        setShowAnimationPanel(false);
                        setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                      }}
                      style={{ padding: '0.5rem 1rem', background: showResizePanel ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="大きさを変更"
                    >
                      <Maximize size={28} />
                    </button>
                    <button
                      onClick={() => {
                        setShowAppearancePanel(prev => !prev);
                        setShowPropertyPanel(false);
                        setShowResizePanel(false);
                        setShowVirtualCanvasMenu(false);
                        setShowAnimationPanel(false);
                        setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
                      }}
                      style={{ padding: '0.5rem 1rem', background: showAppearancePanel ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="見た目設定"
                    >
                      <Palette size={28} />
                    </button>
                  </div>
                </div>

                <div style={{ width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

                {/* 動きカテゴリ */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', marginBottom: '2px' }}>動き</span>
                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                    <button
                      onClick={() => {
                        setShowAnimationPanel(prev => !prev);
                        setShowPropertyPanel(false);
                        setShowResizePanel(false);
                        setShowAppearancePanel(false);
                        setShowVirtualCanvasMenu(false);
                      }}
                      style={{ padding: '0.5rem 1rem', background: showAnimationPanel ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="再生"
                    >
                      <Play size={28} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {showVirtualCanvasMenu && !isDrawingMode && (
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center', position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' }}>
              <button
                onClick={() => { setVirtualCanvasShape('plane'); setShowVirtualCanvas(true); setShowVirtualCanvasMenu(false); }}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="平面キャンバス"
              >
                <Square size={28} /> 平面
              </button>
              <button
                onClick={() => { setVirtualCanvasShape('cube'); setShowVirtualCanvas(true); setShowVirtualCanvasMenu(false); }}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', background: '#fff', border: '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="サイコロキャンバス"
              >
                <Shapes size={28} /> サイコロ
              </button>
            </div>
          )}

          {isDrawingMode && tool === 'shape' && showSubMenu && (
            <div style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[
                { id: 'box', icon: <Square size={28} />, label: '四角' },
                { id: 'sphere', icon: <Circle size={28} />, label: '丸' },
                { id: 'cone', icon: <Triangle size={28} />, label: '三角' },
                { id: 'cylinder', icon: <Minus size={28} />, label: '円柱' },
                { id: 'prism3', icon: <Triangle size={28} />, label: '三角柱' },
                { id: 'prism4', icon: <Square size={28} />, label: '四角柱' }
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
            <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>選択中ツール</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button onClick={handleCopy} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Copy size={20} /> コピー</button>
                <button onClick={() => handleFlip('x')} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipHorizontal size={20} /> 左右反転</button>
                <button onClick={() => handleFlip('y')} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipVertical size={20} /> 上下反転</button>
                <button onClick={() => handleFlip('z')} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><FlipHorizontal size={20} style={{ transform: 'rotate(-45deg)' }} /> 前後反転</button>
                <button onClick={handleGroup} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Link size={20} /> グループ化</button>
                <button onClick={handleUngroup} style={{ padding: '0.3rem 0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><Unlink size={20} /> グループ解除</button>
                <button onClick={handleDeleteSelection} style={{ padding: '0.3rem 0.5rem', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}><Trash2 size={20} /> 削除</button>
                <button onClick={() => { setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] }); setTool('lasso'); }} style={{ padding: '0.3rem 0.5rem', background: '#fef2f2', color: '#e11d48', border: '1px solid #fecdd3', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}><X size={20} /> 選択解除</button>
              </div>
            </div>
          )}

          {isDrawingMode && (tool === 'pen' || tool === 'eraser' || tool === 'paint') && (
            <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                {tool === 'eraser' ? '消しゴムサイズ:' : tool === 'paint' ? 'ブラシの太さ:' : 'ペンの太さ:'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map(s => {
                  const isActive = (tool === 'eraser' || tool === 'paint') ? eraserSize === s : brushSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => (tool === 'eraser' || tool === 'paint') ? setEraserSize(s) : setBrushSize(s)}
                      style={{
                        width: '36px', height: '36px', borderRadius: '8px', background: isActive ? '#e2e8f0' : '#fff', border: isActive ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
                      }}
                    >
                      <div style={{ width: `${s * 4}px`, height: `${s * 4}px`, borderRadius: '50%', background: '#334155' }} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. カラーパレット (右側縦並び) */}
      {showUI && isDrawingMode && tool !== 'lasso' && tool !== 'eyedropper' && tool !== 'move' && (
        <div style={{ position: 'absolute', top: '130px', right: '20px', transform: 'none', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '-0.5rem' }}>カラー</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {baseColors.map(c => (
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



      {/* 4. 奥行き設定 (左下) */}
      {showUI && isDrawingMode && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '200px' }}>
          <button
            onClick={handleResetCamera}
            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.9rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Video size={28} /> 正面に戻る
          </button>
          <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '0.2rem 0' }} />
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

      {/* アニメーションパネル (右側) */}
      {showUI && showAnimationPanel && (
        <div style={{ position: 'absolute', top: '100px', right: '20px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.9)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', width: '250px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>動きを設定</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="checkbox" checked={animVertical} onChange={(e) => setAnimVertical(e.target.checked)} style={{ transform: 'scale(1.2)' }} /> 縦に動く
            </label>
            {animVertical && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>距離: <span>{animVerticalDist}</span></label>
                <input type="range" min="1" max="50" value={animVerticalDist} onChange={(e) => setAnimVerticalDist(Number(e.target.value))} />
                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>速さ: <span>{animVerticalSpeed}</span></label>
                <input type="range" min="0.1" max="5" step="0.1" value={animVerticalSpeed} onChange={(e) => setAnimVerticalSpeed(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="checkbox" checked={animHorizontal} onChange={(e) => setAnimHorizontal(e.target.checked)} style={{ transform: 'scale(1.2)' }} /> 横に動く
            </label>
            {animHorizontal && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>距離: <span>{animHorizontalDist}</span></label>
                <input type="range" min="1" max="50" value={animHorizontalDist} onChange={(e) => setAnimHorizontalDist(Number(e.target.value))} />
                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>速さ: <span>{animHorizontalSpeed}</span></label>
                <input type="range" min="0.1" max="5" step="0.1" value={animHorizontalSpeed} onChange={(e) => setAnimHorizontalSpeed(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
              <input type="checkbox" checked={animDepth} onChange={(e) => setAnimDepth(e.target.checked)} style={{ transform: 'scale(1.2)' }} /> 奥に動く
            </label>
            {animDepth && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>距離: <span>{animDepthDist}</span></label>
                <input type="range" min="1" max="50" value={animDepthDist} onChange={(e) => setAnimDepthDist(Number(e.target.value))} />
                <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>速さ: <span>{animDepthSpeed}</span></label>
                <input type="range" min="0.1" max="5" step="0.1" value={animDepthSpeed} onChange={(e) => setAnimDepthSpeed(Number(e.target.value))} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. プロパティパネル (右側) */}
      {showUI && showPropertyPanel && (() => {
        const obj = selection.boxIndices.length > 0 ? boxes[selection.boxIndices[0]]
          : selection.textIndices.length > 0 ? texts[selection.textIndices[0]]
            : null;

        const pos = obj?.position || [0, 0, 0];
        const rot = obj?.rotation || [0, 0, 0];
        const scale = obj?.scale || 1;
        const rotYDeg = Math.round(rot[1] * 180 / Math.PI);
        const rotXDeg = Math.round(rot[0] * 180 / Math.PI);

        return (
          <div style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.95)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', width: '260px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span>詳細設定</span>
            </div>

            {!obj ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                仮想キャンバスや図形を<br />クリックして選択してください
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>X座標</label>
                    <input type="number" step="0.1" value={Number(pos[0]).toFixed(1)} onChange={(e) => updateObjectProperty('position', parseFloat(e.target.value) || 0, 0)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Y座標</label>
                    <input type="number" step="0.1" value={Number(pos[1]).toFixed(1)} onChange={(e) => updateObjectProperty('position', parseFloat(e.target.value) || 0, 1)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Z座標</label>
                    <input type="number" step="0.1" value={Number(pos[2]).toFixed(1)} onChange={(e) => updateObjectProperty('position', parseFloat(e.target.value) || 0, 2)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>

                <div style={{ width: '100%', height: '1px', background: '#e2e8f0', margin: '0.2rem 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>横の角度 (Y軸)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" value={rotYDeg} onChange={(e) => updateObjectProperty('rotation', parseFloat(e.target.value) * Math.PI / 180, 1)} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>°</span>
                    </div>
                  </div>
                  <input type="range" min="-180" max="180" value={rotYDeg} onChange={(e) => updateObjectProperty('rotation', parseFloat(e.target.value) * Math.PI / 180, 1)} style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>縦の角度 (X軸)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" value={rotXDeg} onChange={(e) => updateObjectProperty('rotation', parseFloat(e.target.value) * Math.PI / 180, 0)} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>°</span>
                    </div>
                  </div>
                  <input type="range" min="-180" max="180" value={rotXDeg} onChange={(e) => updateObjectProperty('rotation', parseFloat(e.target.value) * Math.PI / 180, 0)} style={{ width: '100%' }} />
                </div>
              </>
            )}

            <button
              onClick={() => {
                setShowPropertyPanel(false);
                setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
              }}
              style={{ marginTop: '0.5rem', padding: '0.6rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}
            >
              設定終了
            </button>
          </div>
        );
      })()}

      {/* 6. リサイズパネル (右側、プロパティパネルの下) */}
      {showUI && showResizePanel && (() => {
        const obj = selection.boxIndices.length > 0 ? boxes[selection.boxIndices[0]]
          : selection.textIndices.length > 0 ? texts[selection.textIndices[0]]
            : null;

        const scaleVal = obj?.scale;
        const isArray = Array.isArray(scaleVal);
        const scaleAll = isArray ? scaleVal[0] : (scaleVal || 1);
        const scaleX = isArray ? scaleVal[0] : (scaleVal || 1);
        const scaleY = isArray ? scaleVal[1] : (scaleVal || 1);
        const scaleZ = isArray ? scaleVal[2] : (scaleVal || 1);

        return (
          <div style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.95)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', width: '260px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span>大きさ変更</span>
            </div>

            {!obj ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                仮想キャンバスや図形を<br />クリックして選択してください
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>全体スケール</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.1" value={Number(scaleAll).toFixed(1)} onChange={(e) => updateObjectProperty('scaleAllProportional', parseFloat(e.target.value))} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>x</span>
                    </div>
                  </div>
                  <input type="range" min="0.1" max="5" step="0.1" value={scaleAll} onChange={(e) => updateObjectProperty('scaleAllProportional', parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>

                <div style={{ width: '100%', height: '1px', background: '#e2e8f0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>横幅 (X)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.1" value={Number(scaleX).toFixed(1)} onChange={(e) => updateObjectProperty('scale', parseFloat(e.target.value), 0)} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>x</span>
                    </div>
                  </div>
                  <input type="range" min="0.1" max="5" step="0.1" value={scaleX} onChange={(e) => updateObjectProperty('scale', parseFloat(e.target.value), 0)} style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>高さ (Y)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.1" value={Number(scaleY).toFixed(1)} onChange={(e) => updateObjectProperty('scale', parseFloat(e.target.value), 1)} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>x</span>
                    </div>
                  </div>
                  <input type="range" min="0.1" max="5" step="0.1" value={scaleY} onChange={(e) => updateObjectProperty('scale', parseFloat(e.target.value), 1)} style={{ width: '100%' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>奥行き (Z)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.1" value={Number(scaleZ).toFixed(1)} onChange={(e) => updateObjectProperty('scale', parseFloat(e.target.value), 2)} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>x</span>
                    </div>
                  </div>
                  <input type="range" min="0.1" max="5" step="0.1" value={scaleZ} onChange={(e) => updateObjectProperty('scale', parseFloat(e.target.value), 2)} style={{ width: '100%' }} />
                </div>

                {['cylinder', 'prism3', 'prism4'].includes(obj.shapeType) && (
                  <>
                    <div style={{ width: '100%', height: '1px', background: '#e2e8f0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>上部の絞り (テーパー)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input type="number" step="0.1" value={Number(obj.taper ?? 1).toFixed(1)} onChange={(e) => updateObjectProperty('taper', parseFloat(e.target.value))} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                        </div>
                      </div>
                      <input type="range" min="0" max="2" step="0.1" value={obj.taper ?? 1} onChange={(e) => updateObjectProperty('taper', parseFloat(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowResizePanel(false);
                setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
              }}
              style={{ marginTop: '0.5rem', padding: '0.6rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}
            >
              完了
            </button>
          </div>
        );
      })()}

      {/* 7. 見た目設定パネル (右側、プロパティパネルの下) */}
      {showUI && showAppearancePanel && (() => {
        const obj = selection.boxIndices.length > 0 ? boxes[selection.boxIndices[0]]
          : selection.textIndices.length > 0 ? texts[selection.textIndices[0]]
            : null;

        return (
          <div style={{ position: 'absolute', top: '80px', right: '20px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.95)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', width: '260px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span>見た目設定</span>
            </div>

            {!obj ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                仮想キャンバスや図形を<br />クリックして選択してください
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>透明度</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.1" min="0" max="1" value={Number(obj.opacity ?? 1.0).toFixed(1)} onChange={(e) => updateObjectProperty('opacity', parseFloat(e.target.value))} style={{ width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                    </div>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={obj.opacity ?? 1.0} onChange={(e) => updateObjectProperty('opacity', parseFloat(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setShowAppearancePanel(false);
                setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
              }}
              style={{ marginTop: '0.5rem', padding: '0.6rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}
            >
              完了
            </button>
          </div>
        );
      })()}

      {showUI && (
        <div style={{ position: 'absolute', bottom: '20px', left: '0', width: '100%', textAlign: 'center', color: 'var(--text-main)', pointerEvents: 'none', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(255,255,255,0.8)', zIndex: 10 }}>
          {!isDrawingMode
            ? (showVirtualCanvasMenu ? '配置する仮想キャンバスの種類を選んでください'
               : showPropertyPanel ? '図形を選択して座標や角度を細かく設定できます'
               : showResizePanel ? '図形を選択して大きさを変更できます'
               : showAppearancePanel ? '図形を選択して透明度などを設定できます'
               : 'ドラッグしてカメラを回転・移動できます')
            : tool === 'pen' ? 'ドラッグして空間に絵を描けます'
              : tool === 'shape' ? 'ドラッグして図形を配置できます'
                : tool === 'paint' ? 'ドラッグして触れた絵の色を変更できます'
                  : tool === 'eyedropper' ? '描いたものをクリックして色を採取します'
                    : tool === 'eraser' ? 'ドラッグして触れたものを消去します'
                      : tool === 'lasso' ? 'ドラッグして囲んだものを選択します'
                        : tool === 'move' ? 'ドラッグして選択中のものを移動できます'
                          : tool === 'text' ? 'クリックした場所にテキストを配置します'
                            : tool === 'fill' ? '描いた線の内側をクリックして塗りつぶします（ひと筆書き用）'
                              : tool === 'camera' ? 'ドラッグしてカメラを回転・移動できます'
                                : 'ドラッグしてカメラを回転・移動できます'}
        </div>
      )}

      <Canvas onCreated={({ camera }) => { cameraRef.current = camera; }} camera={{ position: [0, 5, 20], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

        <DrawingController
          isActive={isDrawingMode && tool !== 'camera'}
          tool={tool}
          distance={distance}
          setDistance={setDistance}
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
              const centroid = [0, 0, 0];
              stroke.points.forEach(p => { centroid[0] += p[0]; centroid[1] += p[1]; centroid[2] += p[2]; });
              centroid[0] /= stroke.points.length; centroid[1] /= stroke.points.length; centroid[2] /= stroke.points.length;

              const posArray = [];
              for (let i = 0; i < stroke.points.length - 1; i++) {
                posArray.push(...centroid, ...stroke.points[i], ...stroke.points[i + 1]);
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
          <ActiveStrokePreview activeStrokeRef={activeStrokeRef} />

          {/* Shapes (Previously Boxes) */}
          {boxes.map((b, index) => {
            const isSelected = selection?.boxIndices.includes(index);
            const type = b.shapeType || 'box';
            if (type === 'virtualCanvas') {
              return <VirtualCanvasMesh key={`b-${index}`} data={b} isSelected={isSelected} onClick={(e) => handleObjectClick(e, 'box', index)} />;
            }
            if (type === 'virtualCanvasCube') {
              return <VirtualCanvasCubeMesh key={`b-${index}`} data={b} isSelected={isSelected} onClick={(e) => handleObjectClick(e, 'box', index)} />;
            }
            return (
              <mesh key={`b-${index}`} position={b.position} rotation={b.rotation || [0, 0, 0]} scale={b.scale || 1} onClick={(e) => handleObjectClick(e, 'box', index)}>
                {type === 'box' && <boxGeometry args={b.size} />}
                {type === 'sphere' && <sphereGeometry args={[b.size[0] / 2, 32, 32]} />}
                {type === 'cone' && <coneGeometry args={[b.size[0] / 2, b.size[0], 3]} />}
                {type === 'cylinder' && <cylinderGeometry args={[(b.taper ?? 1) * b.size[0] / 2, b.size[0] / 2, b.size[0], 32]} />}
                {type === 'prism3' && <cylinderGeometry args={[(b.taper ?? 1) * b.size[0] / 2, b.size[0] / 2, b.size[0], 3]} />}
                {type === 'prism4' && <cylinderGeometry args={[(b.taper ?? 1) * b.size[0] / 2, b.size[0] / 2, b.size[0], 4]} />}
                <meshStandardMaterial color={b.color} transparent opacity={b.opacity ?? 1.0} roughness={0.3} metalness={0.2} emissive={isSelected ? '#ffffff' : '#000000'} emissiveIntensity={isSelected ? 0.4 : 0} />
              </mesh>
            );
          })}
          <ActiveBoxPreview activeBoxRef={activeBoxRef} />

          {/* Texts */}
          {texts.map((t, index) => {
            const isSelected = selection?.textIndices.includes(index);
            return (
              <Text
                key={`t-${index}`}
                position={t.position}
                rotation={t.rotation || [0, 0, 0]}
                scale={t.scale || 1}
                color={isSelected ? '#ffffff' : t.color}
                fontSize={t.size}
                anchorX="center"
                anchorY="middle"
                onClick={(e) => handleObjectClick(e, 'text', index)}
              >
                {t.text}
              </Text>
            );
          })}

          {/* Lasso Preview */}
          <ActiveLassoPreview activeLassoRef={activeLassoRef} />

          {/* Eraser / Paint Preview */}
          <BrushPreview tool={tool} brushColor={brushColor} eraserSize={eraserSize} previewPosRef={previewPosRef} eraserRadiusMap={eraserRadiusMap} isDrawingMode={isDrawingMode} />

          {/* Stamp Preview */}
          <ActiveStampPreview tool={tool} isDrawingMode={isDrawingMode} copiedArt={copiedArt} previewPosRef={previewPosRef} />
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
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          enabled={!isDrawingMode || tool === 'camera'}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
      {showVirtualCanvas && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 100, background: '#fafafa' }}>
          <Draw2D isVirtualCanvas={true} virtualCanvasShape={virtualCanvasShape} onVirtualCanvasComplete={handleVirtualCanvasComplete} onVirtualCanvasCancel={() => setShowVirtualCanvas(false)} />
        </div>
      )}

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
    </div>
  );
}
