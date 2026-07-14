import sys, re

with open('frontend/src/Draw3D.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

def inject_ui(match):
    full_block = match.group(0)
    name = match.group(1)
    
    inject_str = f'''
                      <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                        <input type="checkbox" checked={{obj.{name}LimitEnabled || false}} onChange={{(e) => updateObjectProperty('{name}LimitEnabled', e.target.checked)}} style={{ transform: 'scale(1.2)' }} /> 角度制限
                      </label>
                      {{obj.{name}LimitEnabled && (
                        <>
                          <label style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>度数: <input type="number" min="1" max="360" step="1" value={{obj.{name}LimitAngle ?? 45}} onChange={{(e) => updateObjectProperty('{name}LimitAngle', Number(e.target.value))}} style={{ width: '50px', padding: '2px', textAlign: 'right', border: '1px solid #cbd5e1', borderRadius: '4px' }} /></label>
                          <input type="range" min="1" max="360" step="1" value={{obj.{name}LimitAngle ?? 45}} onChange={{(e) => updateObjectProperty('{name}LimitAngle', Number(e.target.value))}} />
                        </>
                      )}}'''
                      
    return full_block.replace('</div>\n                  )', inject_str + '\n                    </div>\n                  )')

# Find the block ending for rotation and spin speeds
pattern = re.compile(r'<input type="range"[^>]+onChange={\(e\) => updateObjectProperty\(\'(anim(?:Rot|Spin)[A-Za-z]+)Speed\', Number\(e\.target\.value\)\)} />\s*</div>\s*\)', re.MULTILINE)

content = pattern.sub(inject_ui, content)

with open('frontend/src/Draw3D.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
