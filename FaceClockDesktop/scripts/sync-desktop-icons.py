from pathlib import Path
from PIL import Image
import shutil

base = Path(__file__).resolve().parents[1]
assets = base / 'assets'
public = base / 'public'
build = base / 'build'

source = assets / 'NEW-RESIZED-ICON.png'
if not source.exists():
    raise SystemExit('Missing NEW-RESIZED-ICON.png in assets folder')

for folder in (assets, public, build):
    folder.mkdir(parents=True, exist_ok=True)

img = Image.open(source).convert('RGBA')

def pad_square(image, size):
    ratio = size / max(image.width, image.height)
    new_width = max(1, int(image.width * ratio))
    new_height = max(1, int(image.height * ratio))
    resized = image.resize((new_width, new_height), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - new_width) // 2, (size - new_height) // 2), resized)
    return canvas

for folder in (assets, public, build):
    pad_square(img, 1024).save(folder / 'NEW-RESIZED-ICON.png')

icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
ico_img = pad_square(img, 512)
ico_img.save(build / 'app-icon.ico', sizes=icon_sizes)
shutil.copy(build / 'app-icon.ico', assets / 'app-icon.ico')

pad_square(img, 1024).save(build / 'icon.png')
pad_square(img, 1024).save(build / 'icon.icns')
print('Desktop icons synced using NEW-RESIZED-ICON.png')
