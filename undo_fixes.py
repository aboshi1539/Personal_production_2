import re

with open('frontend/src/Draw3D.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Revert min=-360 to min=1
content = content.replace('min="-360" max="360" step="1"', 'min="1" max="360" step="1"')

# 2. Revert AnimatedWrapper Component
wrapper_code_new = """function AnimatedWrapper({ obj, isPaused, children }) {
  const groupRef = useRef();
  const orbitRotRef = useRef();
  const spinRef = useRef();
  const orbitOffsetRef = useRef();
  
  const accumulatedTimeRef = useRef(0);
  
  useFrame((state, delta) => {"""

wrapper_code_old = """function AnimatedWrapper({ obj, isPaused, children }) {
  const groupRef = useRef();
  const spinRef = useRef();
  const orbitOffsetRef = useRef();
  
  const accumulatedTimeRef = useRef(0);
  
  useFrame((state, delta) => {"""

content = content.replace(wrapper_code_new, wrapper_code_old)

frame_new = """    const pos = obj?.position || [0, 0, 0];
    groupRef.current.position.set(pos[0] + dx, pos[1] + dy, pos[2] + dz);
    
    if (orbitRotRef.current) {
      orbitRotRef.current.rotation.set(rx, ry, rz);
    }
    
    if (orbitOffsetRef.current) {
      orbitOffsetRef.current.position.set(ox, oy, oz);
    }"""

frame_old = """    const pos = obj?.position || [0, 0, 0];
    groupRef.current.position.set(pos[0] + dx, pos[1] + dy, pos[2] + dz);
    groupRef.current.rotation.set(rx, ry, rz);
    
    if (orbitOffsetRef.current) {
      orbitOffsetRef.current.position.set(ox, oy, oz);
    }"""

content = content.replace(frame_new, frame_old)

return_new = """  const pos = obj?.position || [0, 0, 0];
  const rot = obj?.rotation || [0, 0, 0];
  return (
    <group ref={groupRef}>
      <group rotation={rot}>
        <group ref={orbitRotRef}>
          <group ref={orbitOffsetRef}>
            <group ref={spinRef}>
              {children}
            </group>
          </group>
        </group>
      </group>
    </group>
  );"""

return_old = """  const pos = obj?.position || [0, 0, 0];
  return (
    <group ref={groupRef} position={pos}>
      <group ref={orbitOffsetRef}>
        <group ref={spinRef}>
          <group position={[-pos[0], -pos[1], -pos[2]]}>
            {children}
          </group>
        </group>
      </group>
    </group>
  );"""

content = content.replace(return_new, return_old)


# 3. Revert generateCompoundOrbitPoints
orbit_new = """    const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
    const vec = new THREE.Vector3(ox, oy, oz);
    vec.applyEuler(euler);
    if (obj.rotation) {
      const baseEuler = new THREE.Euler(obj.rotation[0], obj.rotation[1], obj.rotation[2], 'XYZ');
      vec.applyEuler(baseEuler);
    }
    points.push([pos[0] + vec.x, pos[1] + vec.y, pos[2] + vec.z]);"""

orbit_old = """    const euler = new THREE.Euler(rx, ry, rz, 'XYZ');
    const vec = new THREE.Vector3(ox, oy, oz);
    vec.applyEuler(euler);
    points.push([pos[0] + vec.x, pos[1] + vec.y, pos[2] + vec.z]);"""

content = content.replace(orbit_new, orbit_old)


# 4. Re-add rotation={b.rotation} from children of AnimatedWrapper
content = content.replace(
    "<mesh scale={b.scale || 1} onClick={(e) => handleObjectClick(e, 'box', index)}>",
    "<mesh position={b.position} rotation={b.rotation || [0, 0, 0]} scale={b.scale || 1} onClick={(e) => handleObjectClick(e, 'box', index)}>"
)
content = content.replace(
    "<Text\n                    key={`t-${index}`}\n                    scale={t.scale || 1}",
    "<Text\n                    key={`t-${index}`}\n                    position={t.position}\n                    rotation={t.rotation || [0, 0, 0]}\n                    scale={t.scale || 1}"
)

content = content.replace(
    "<VirtualCanvasMesh data={{...b, position: [0,0,0], rotation: [0,0,0]}} isSelected={isSelected} onClick={(e) => handleObjectClick(e, 'box', index)} />",
    "<VirtualCanvasMesh data={b} isSelected={isSelected} onClick={(e) => handleObjectClick(e, 'box', index)} />"
)
content = content.replace(
    "<VirtualCanvasCubeMesh data={{...b, position: [0,0,0], rotation: [0,0,0]}} isSelected={isSelected} onClick={(e) => handleObjectClick(e, 'box', index)} />",
    "<VirtualCanvasCubeMesh data={b} isSelected={isSelected} onClick={(e) => handleObjectClick(e, 'box', index)} />"
)

with open('frontend/src/Draw3D.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
