import os

file_2d = r"c:\Personal_production_2\frontend\src\Draw2D.jsx"
with open(file_2d, "r", encoding="utf-8") as f:
    content_2d = f.read()

# Add PaintBucket import
content_2d = content_2d.replace(
    "import { Home as HomeIcon, Trash2, PenTool, Eraser, Undo2, Redo2, MousePointer2, Copy, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff } from 'lucide-react';",
    "import { Home as HomeIcon, Trash2, PenTool, Eraser, Undo2, Redo2, MousePointer2, Copy, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff, PaintBucket } from 'lucide-react';"
)

# Add floodFill function
flood_fill_code = """
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

  const getCoordinates = (e) => {"""
content_2d = content_2d.replace("  const getCoordinates = (e) => {", flood_fill_code)

# Add fill tool in startDrawing
fill_start_drawing = """
    if (tool === 'fill') {
      const ctx = contextRef.current;
      const startX = Math.floor(x * 2);
      const startY = Math.floor(y * 2);
      floodFill(ctx, startX, startY, hexToRgb(brushColor));
      saveHistory();
      return;
    }

    if (tool === 'eyedropper') {"""
content_2d = content_2d.replace("    if (tool === 'eyedropper') {", fill_start_drawing)

# Add fill button in UI
ui_buttons_2d_old = """          <button 
            onClick={() => handleToolChange('text')}
            style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <Type size={16} /> テキスト
          </button>
        </div>"""
ui_buttons_2d_new = """          <button 
            onClick={() => handleToolChange('text')}
            style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <Type size={16} /> テキスト
          </button>
          <button 
            onClick={() => handleToolChange('fill')}
            style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'fill' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <PaintBucket size={16} /> 塗りつぶし
          </button>
        </div>"""
content_2d = content_2d.replace(ui_buttons_2d_old, ui_buttons_2d_new)

# Add Fill to hidden tool checks
content_2d = content_2d.replace("tool !== 'lasso' && tool !== 'eyedropper'", "tool !== 'lasso' && tool !== 'eyedropper' && tool !== 'fill'")

# Add fill to tooltip
content_2d = content_2d.replace(
    "tool === 'text' ? 'クリックした場所にテキストを配置します' :",
    "tool === 'text' ? 'クリックした場所にテキストを配置します' :\n           tool === 'fill' ? 'クリックした領域を塗りつぶします' :"
)

with open(file_2d, "w", encoding="utf-8") as f:
    f.write(content_2d)


# -------- 3D PAINT ---------
file_3d = r"c:\Personal_production_2\frontend\src\Draw3D.jsx"
with open(file_3d, "r", encoding="utf-8") as f:
    content_3d = f.read()

# Add PaintBucket import
content_3d = content_3d.replace(
    "import { Home as HomeIcon, Trash2, Move3d, PenTool, Square, Copy, Eraser, MousePointer2, Undo2, Redo2, Paintbrush, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff } from 'lucide-react';",
    "import { Home as HomeIcon, Trash2, Move3d, PenTool, Square, Copy, Eraser, MousePointer2, Undo2, Redo2, Paintbrush, FlipHorizontal, FlipVertical, Pipette, Type, Eye, EyeOff, PaintBucket } from 'lucide-react';"
)

# Tool onPointerDown3D Add
pointer_down_3d_old = """    if (tool === 'pen') {
      setCurrentStroke({ color: brushColor, lineWidth: brushSizeMap[brushSize], points: [pos3D] });
    } else if (tool === 'text') {"""
pointer_down_3d_new = """    if (tool === 'pen') {
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
    } else if (tool === 'text') {"""
content_3d = content_3d.replace(pointer_down_3d_old, pointer_down_3d_new)

# Update paint tool to also update fill color
paint_update_old = """          if (tool === 'paint' && s.color !== brushColor) {
            changed = true;
            return { ...s, color: brushColor };
          }"""
paint_update_new = """          if (tool === 'paint') {
            if (s.color !== brushColor || (s.fillColor && s.fillColor !== brushColor)) {
              changed = true;
              return { ...s, color: brushColor, ...(s.fillColor ? {fillColor: brushColor} : {}) };
            }
          }"""
content_3d = content_3d.replace(paint_update_old, paint_update_new)

# Rendering the fill
render_strokes_old = """          {/* Strokes */}
          {strokes.map((stroke, index) => {
            const isSelected = selection?.strokeIndices.includes(index);
            return (
              <group key={`s-${index}`}>
                {isSelected && <Line points={stroke.points} color="#ffffff" lineWidth={((stroke.lineWidth || 5) + 3) / 100} worldUnits={true} transparent opacity={0.5} depthWrite={false} />}
                <Line
                  points={stroke.points}
                  color={stroke.color}
                  lineWidth={(stroke.lineWidth || 5) / 100}
                  worldUnits={true}
                />
              </group>
            );
          })}"""
render_strokes_new = """          {/* Strokes */}
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
          })}"""
content_3d = content_3d.replace(render_strokes_old, render_strokes_new)

# Add UI button 3D
ui_buttons_3d_old = """            <button 
              onClick={() => setTool('text')}
              style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Type size={16} /> テキスト
            </button>
            <button 
              onClick={handleCopy}"""
ui_buttons_3d_new = """            <button 
              onClick={() => setTool('text')}
              style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'text' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <Type size={16} /> テキスト
            </button>
            <button 
              onClick={() => setTool('fill')}
              style={{ flex: '1 1 30%', padding: '0.4rem', background: tool === 'fill' ? '#e2e8f0' : '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              <PaintBucket size={16} /> 塗りつぶし
            </button>
            <button 
              onClick={handleCopy}"""
content_3d = content_3d.replace(ui_buttons_3d_old, ui_buttons_3d_new)

# Tooltip 3D
content_3d = content_3d.replace(
    "tool === 'text' ? 'クリックした場所にテキストを配置します'",
    "tool === 'text' ? 'クリックした場所にテキストを配置します'\n            : tool === 'fill' ? '描いた線の内側をクリックして塗りつぶします（ひと筆書き用）'"
)

with open(file_3d, "w", encoding="utf-8") as f:
    f.write(content_3d)

print("Done writing modifications.")
