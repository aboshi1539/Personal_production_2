import re

with open('frontend/src/Draw3D.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'min="1" max="360" step="1" value=\{obj\.(anim(?:Rot|Spin)[A-Za-z]+LimitAngle)',
    r'min="-360" max="360" step="1" value={obj.\1',
    content
)

with open('frontend/src/Draw3D.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
