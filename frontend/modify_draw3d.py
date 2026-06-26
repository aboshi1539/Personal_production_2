import os
import re
import json

file_path = r"c:\Personal_production_2\frontend\src\Draw3D.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { OrbitControls, Line, Environment, Grid } from '@react-three/drei';",
    "import { OrbitControls, Line, Environment, Grid, Text } from '@react-three/drei';"
)
content = content.replace(
    "import { Home as HomeIcon, Trash2, Move3d, PenTool, Square, Copy, Eraser, MousePointer2, Undo2, Paintbrush, FlipHorizontal, FlipVertical, Pipette } from 'lucide-react';",
    "import { Home as HomeIcon, Trash2, Move3d, PenTool, Square, Copy, Eraser, MousePointer2, Undo2, Paintbrush, FlipHorizontal, FlipVertical, Pipette, Type } from 'lucide-react';"
)

# 2. States and history
state_block_old = """  const [strokes, setStrokes] = useState([]);
  const [boxes, setBoxes] = useState([]);
  
  const strokesRef = useRef([]);
  const boxesRef = useRef([]);
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { boxesRef.current = boxes; }, [boxes]);

  const [history, setHistory] = useState([{ strokes: [], boxes: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveHistory = useCallback((newStrokes, newBoxes) => {
    setHistory(prev => {
      const newHist = prev.slice(0, historyIndex + 1);
      newHist.push({ 
        strokes: JSON.parse(JSON.stringify(newStrokes)), 
        boxes: JSON.parse(JSON.stringify(newBoxes)) 
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
      setHistoryIndex(newIndex);
      setSelection({ strokeIndices: [], boxIndices: [] });
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
  
  const [selection, setSelection] = useState({ strokeIndices: [], boxIndices: [] });"""

state_block_new = """  const [strokes, setStrokes] = useState([]);
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

  const [currentStroke, setCurrentStroke] = useState(null);
  const [currentBox, setCurrentBox] = useState(null);
  const [lassoPoints3D, setLassoPoints3D] = useState([]);
  const [lassoPointsNDC, setLassoPointsNDC] = useState([]);
  
  const [selection, setSelection] = useState({ strokeIndices: [], boxIndices: [], textIndices: [] });"""

content = content.replace(state_block_old, state_block_new)

# 3. Tool and settings
content = content.replace(
    "const [distance, setDistance] = useState(8);",
    "const [distance, setDistance] = useState(8);\n  const [textInput, setTextInput] = useState('');\n  const [textSize, setTextSize] = useState(1);"
)

# 4. handleCopy
copy_old = """  const handleCopy = () => {
    let strokesToCopy;
    let boxesToCopy;
    
    if (selection.strokeIndices.length > 0 || selection.boxIndices.length > 0) {
      strokesToCopy = selection.strokeIndices.map(i => strokesRef.current[i]);
      boxesToCopy = selection.boxIndices.map(i => boxesRef.current[i]);
    } else {
      strokesToCopy = strokesRef.current;
      boxesToCopy = boxesRef.current;
    }

    if (strokesToCopy.length === 0 && boxesToCopy.length === 0) return;
    
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
    if (count > 0) center.divideScalar(count);
    
    setCopiedArt({
      strokes: JSON.parse(JSON.stringify(strokesToCopy)),
      boxes: JSON.parse(JSON.stringify(boxesToCopy)),
      centroid: [center.x, center.y, center.z]
    });
    setTool('stamp');
    setIsDrawingMode(true);
    setSelection({ strokeIndices: [], boxIndices: [] });
  };"""

copy_new = """  const handleCopy = () => {
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
  };"""

content = content.replace(copy_old, copy_new)

# 5. handleFlip
flip_old = """  const handleFlip = (axis) => {
    if (selection.strokeIndices.length === 0 && selection.boxIndices.length === 0) return;
    
    let count = 0;
    const center = new THREE.Vector3();
    selection.strokeIndices.forEach(idx => {
      strokesRef.current[idx].points.forEach(p => { center.add(new THREE.Vector3(...p)); count++; });
    });
    selection.boxIndices.forEach(idx => {
      center.add(new THREE.Vector3(...boxesRef.current[idx].position)); count++;
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

    setStrokes(nextStrokes);
    setBoxes(nextBoxes);
    
    if (moveInitialStateRef.current) {
       moveInitialStateRef.current.strokes = JSON.parse(JSON.stringify(nextStrokes));
       moveInitialStateRef.current.boxes = JSON.parse(JSON.stringify(nextBoxes));
    }
    
    setTimeout(() => saveHistory(nextStrokes, nextBoxes), 0);
  };"""

flip_new = """  const handleFlip = (axis) => {
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
  };"""

content = content.replace(flip_old, flip_new)

# 6. handleStamp
stamp_old = """  const handleStamp = useCallback((pos) => {
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
    
    const finalStrokes = [...strokesRef.current, ...newStrokes];
    const finalBoxes = [...boxesRef.current, ...newBoxes];
    setStrokes(finalStrokes);
    setBoxes(finalBoxes);
    saveHistory(finalStrokes, finalBoxes);
  }, [copiedArt, saveHistory]);"""

stamp_new = """  const handleStamp = useCallback((pos) => {
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
  }, [copiedArt, saveHistory]);"""

content = content.replace(stamp_old, stamp_new)

# 7. eyedropper
eye_old = """      strokesRef.current.forEach(s => {
        for (let pt of s.points) {
          const dist = new THREE.Vector3(...pt).distanceTo(p);
          if (dist < minDist && dist < pickRadius) {
            minDist = dist;
            foundColor = s.color;
          }
        }
      });"""

eye_new = """      strokesRef.current.forEach(s => {
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
      });"""
content = content.replace(eye_old, eye_new)

# 8. onPointerDown3D
pdown_old = """    if (tool === 'pen') {
      setCurrentStroke({ color: brushColor, lineWidth: brushSizeMap[brushSize], points: [pos3D] });
    } else if (tool === 'box') {
      setCurrentBox({ color: brushColor, startPos: pos3D, endPos: pos3D });
    } else if (tool === 'stamp') {"""

pdown_new = """    if (tool === 'pen') {
      setCurrentStroke({ color: brushColor, lineWidth: brushSizeMap[brushSize], points: [pos3D] });
    } else if (tool === 'text') {
      if (!textInput) return;
      const newTexts = [...textsRef.current, { text: textInput, position: pos3D, color: brushColor, size: textSize }];
      setTexts(newTexts);
      setTimeout(() => saveHistory(strokesRef.current, boxesRef.current, newTexts), 0);
    } else if (tool === 'box') {
      setCurrentBox({ color: brushColor, startPos: pos3D, endPos: pos3D });
    } else if (tool === 'stamp') {"""

content = content.replace(pdown_old, pdown_new)

pdown2_old = """      setLassoPointsNDC([posNDC]);
      setLassoPoints3D([pos3D]);
      setSelection({ strokeIndices: [], boxIndices: [] });
    } else if (tool === 'move') {
      moveStartRef.current = pos3D;
      moveInitialStateRef.current = { strokes: JSON.parse(JSON.stringify(strokesRef.current)), boxes: JSON.parse(JSON.stringify(boxesRef.current)) };
    }"""
pdown2_new = """      setLassoPointsNDC([posNDC]);
      setLassoPoints3D([pos3D]);
      setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    } else if (tool === 'move') {
      moveStartRef.current = pos3D;
      moveInitialStateRef.current = { strokes: JSON.parse(JSON.stringify(strokesRef.current)), boxes: JSON.parse(JSON.stringify(boxesRef.current)), texts: JSON.parse(JSON.stringify(textsRef.current)) };
    }"""
content = content.replace(pdown2_old, pdown2_new)

# 9. onPointerMove3D (eraser)
erase_old = """      if (tool === 'eraser' && nextBoxes.length !== boxesRef.current.length) changed = true;
      
      if (changed) {
        modifiedSomethingRef.current = true;
        setStrokes(nextStrokes);
        setBoxes(nextBoxes);
        
        // Clear selection if objects are erased or painted to avoid indices shifting issues
        if (tool === 'eraser') setSelection({ strokeIndices: [], boxIndices: [] });
      }"""
erase_new = """      if (tool === 'eraser' && nextBoxes.length !== boxesRef.current.length) changed = true;

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
      }"""

content = content.replace(erase_old, erase_new)

# 10. onPointerMove3D (move)
move_old = """        const nextBoxes = [...boxesRef.current];
        selection.boxIndices.forEach(idx => {
           if (moveInitialStateRef.current.boxes[idx]) {
             const b = moveInitialStateRef.current.boxes[idx];
             nextBoxes[idx] = { ...b, position: [b.position[0]+dx, b.position[1]+dy, b.position[2]+dz] };
           }
        });
        setBoxes(nextBoxes);"""
move_new = """        const nextBoxes = [...boxesRef.current];
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
        setTexts(nextTexts);"""
content = content.replace(move_old, move_new)

# 11. onPointerUp3D (history update)
pup_old = """        modifiedSomethingRef.current = false;
        setTimeout(() => saveHistory(strokesRef.current, boxesRef.current), 0);
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
      
      setSelection({ strokeIndices, boxIndices });
      if (strokeIndices.length > 0 || boxIndices.length > 0) {
        setTool('move');
      }
      setLassoPointsNDC([]);
      setLassoPoints3D([]);
    } else if (tool === 'move') {
      if (moveStartRef.current) {
        moveStartRef.current = null;
        setTimeout(() => saveHistory(strokesRef.current, boxesRef.current), 0);
      }"""
pup_new = """        modifiedSomethingRef.current = false;
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
      }"""
content = content.replace(pup_old, pup_new)

pup2_old = """      setCurrentStroke(prev => {
        if (prev && prev.points.length > 1) {
          const newStrokes = [...strokesRef.current, prev];
          setStrokes(newStrokes);
          setTimeout(() => saveHistory(newStrokes, boxesRef.current), 0);
        }
        return null;
      });"""
pup2_new = """      setCurrentStroke(prev => {
        if (prev && prev.points.length > 1) {
          const newStrokes = [...strokesRef.current, prev];
          setStrokes(newStrokes);
          setTimeout(() => saveHistory(newStrokes, boxesRef.current, textsRef.current), 0);
        }
        return null;
      });"""
content = content.replace(pup2_old, pup2_new)

pup3_old = """             const newBoxes = [...boxesRef.current, { position: prev.startPos, size: [size, size, size], color: prev.color }];
             setBoxes(newBoxes);
             setTimeout(() => saveHistory(strokesRef.current, newBoxes), 0);"""
pup3_new = """             const newBoxes = [...boxesRef.current, { position: prev.startPos, size: [size, size, size], color: prev.color }];
             setBoxes(newBoxes);
             setTimeout(() => saveHistory(strokesRef.current, newBoxes, textsRef.current), 0);"""
content = content.replace(pup3_old, pup3_new)

# 12. handleClear
clear_old = """  const handleClear = () => {
    setStrokes([]);
    setBoxes([]);
    setCurrentStroke(null);
    setCurrentBox(null);
    setSelection({ strokeIndices: [], boxIndices: [] });
    setTimeout(() => saveHistory([], []), 0);
  };"""
clear_new = """  const handleClear = () => {
    setStrokes([]);
    setBoxes([]);
    setTexts([]);
    setCurrentStroke(null);
    setCurrentBox(null);
    setSelection({ strokeIndices: [], boxIndices: [], textIndices: [] });
    setTimeout(() => saveHistory([], [], []), 0);
  };"""
content = content.replace(clear_old, clear_new)

# 13. UI - Toolbar buttons
toolbar_old = """            <button 
              onClick={() => setTool('eyedropper')}
              style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'eyedropper' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Pipette size={16} /> スポイト
            </button>
            <button 
              onClick={handleCopy}"""
toolbar_new = """            <button 
              onClick={() => setTool('eyedropper')}
              style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'eyedropper' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Pipette size={16} /> スポイト
            </button>
            <button 
              onClick={() => setTool('text')}
              style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Type size={16} /> テキスト
            </button>
            <button 
              onClick={handleCopy}"""
content = content.replace(toolbar_old, toolbar_new)

disable_copy_old = """disabled={strokes.length === 0 && boxes.length === 0}"""
disable_copy_new = """disabled={strokes.length === 0 && boxes.length === 0 && texts.length === 0}"""
content = content.replace(disable_copy_old, disable_copy_new)
content = content.replace(
    "cursor: (strokes.length === 0 && boxes.length === 0) ? 'not-allowed' : 'pointer'",
    "cursor: (strokes.length === 0 && boxes.length === 0 && texts.length === 0) ? 'not-allowed' : 'pointer'"
)
content = content.replace(
    "opacity: (strokes.length === 0 && boxes.length === 0) ? 0.5 : 1",
    "opacity: (strokes.length === 0 && boxes.length === 0 && texts.length === 0) ? 0.5 : 1"
)

# 14. move selection menu
move_sel_old = """{tool === 'move' && (selection.strokeIndices.length > 0 || selection.boxIndices.length > 0) && ("""
move_sel_new = """{tool === 'move' && (selection.strokeIndices.length > 0 || selection.boxIndices.length > 0 || selection.textIndices.length > 0) && ("""
content = content.replace(move_sel_old, move_sel_new)

# 15. text tool settings UI
color_picker_old = """        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>カラー</label>"""
text_settings_new = """        {tool === 'text' && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>テキスト内容</label>
            <input 
              type="text" 
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}
              placeholder="文字を入力"
            />
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>テキストの大きさ</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
              {[0.5, 1, 2, 4, 8].map(size => (
                <button
                  key={size}
                  onClick={() => setTextSize(size)}
                  style={{
                    flex: 1, height: '30px', borderRadius: '4px', background: textSize === size ? '#e2e8f0' : '#fff', border: textSize === size ? '2px solid #334155' : '1px solid #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none'
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>カラー</label>"""
content = content.replace(color_picker_old, text_settings_new)

# 16. Tooltip text
tooltip_old = """          : tool === 'move' ? 'ドラッグして選択中のものを移動できます'
          : 'クリックしてコピーした絵をスタンプできます'}"""
tooltip_new = """          : tool === 'move' ? 'ドラッグして選択中のものを移動できます'
          : tool === 'text' ? 'クリックした場所にテキストを配置します'
          : 'クリックしてコピーした絵をスタンプできます'}"""
content = content.replace(tooltip_old, tooltip_new)

# 17. Render texts
render_old = """          {/* Lasso Preview */}"""
render_new = """          {/* Texts */}
          {texts.map((t, index) => {
            const isSelected = selection?.textIndices.includes(index);
            return (
              <Text 
                key={`t-${index}`} 
                position={t.position} 
                color={isSelected ? '#ffffff' : t.color} 
                fontSize={t.size} 
                anchorX="center" 
                anchorY="middle"
              >
                {t.text}
              </Text>
            );
          })}

          {/* Lasso Preview */}"""
content = content.replace(render_old, render_new)

render_stamp_old = """                       <meshStandardMaterial color={b.color} transparent opacity={0.4} roughness={0.3} metalness={0.2} />
                    </mesh>
                 ))}
              </group>"""
render_stamp_new = """                       <meshStandardMaterial color={b.color} transparent opacity={0.4} roughness={0.3} metalness={0.2} />
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
              </group>"""
content = content.replace(render_stamp_old, render_stamp_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done modifying Draw3D.jsx")
