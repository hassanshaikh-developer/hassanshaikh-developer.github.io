import os
from pathlib import Path
try:
    from PIL import Image, ImageDraw
except ImportError:
    Image = None

icons_dir = Path('icons')
icons_dir.mkdir(exist_ok=True)

if Image is None:
    import base64
    fallback_png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABM0lEQVR4nO3aPYrCMBQF0G/JAjtKoaKSo4ChqGT3EL3HemfBSDLg8nKdCtwnMSJ5l7Hx61+OK8LAAAAAAAAAHg79rnQF90AWNf7AEc9y4NlXnj1+Qm5EJny+u/V0XqYji/U0kgKrv8snJjTT2H35PwHhtslz18kKwD9JviR5u8u7lFM+Ko7dFcN2cji3E7RjI/6RvmbwR6e47Su3i32Z07IDXtS+EetuD40xP6H5m/FeXjjuB9j3d0vZGu+KevbA9bTuCs+y7L0v5mifix5nLbxvVv0Z4/huuGJ8HvmL8sZ9ox3j7RkAAAAAAAAA8CErwwAAbqxS0wAAAABJRU5ErkJggg==')
    for size in (192, 512):
        (icons_dir / f'icon-{size}.png').write_bytes(fallback_png)
else:
    colors = {192: (59, 130, 246, 255), 512: (37, 99, 235, 255)}
    for size, color in colors.items():
        img = Image.new('RGBA', (size, size), (15, 76, 129, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([(size*0.15, size*0.15), (size*0.85, size*0.85)], fill=color)
        img.save(icons_dir / f'icon-{size}.png')
