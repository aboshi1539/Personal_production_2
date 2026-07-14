import re

with open('frontend/src/Draw3D.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('min="1" max="360" step="1"', 'min="-360" max="360" step="1"')

with open('frontend/src/Draw3D.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
