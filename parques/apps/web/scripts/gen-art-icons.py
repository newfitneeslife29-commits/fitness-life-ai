"""
Íconos y pantallas de inicio desde el arte ilustrado (resources/icon-art.png, resources/splash-bg.png, public/art/logo.webp).
Sobrescribe los PNG que ya existen en los proyectos nativos y la PWA, con su mismo tamaño.
Uso (desde apps/web):  python3 scripts/gen-art-icons.py
"""
import os
import re
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
icon = Image.open(os.path.join(ROOT, 'resources/icon-art.png')).convert('RGBA')
splash_bg = Image.open(os.path.join(ROOT, 'resources/splash-bg.png')).convert('RGB')
logo = Image.open(os.path.join(ROOT, 'public/art/logo.webp')).convert('RGBA')
BG = (74, 22, 140, 255)  # morado del fondo del ícono


def rounded(img, radius):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    out = img.copy()
    out.putalpha(m)
    return out


def square(size, inset=1.0, round_r=0.0, bg=None):
    s = int(size * inset)
    im = icon.resize((s, s), Image.LANCZOS)
    if round_r:
        im = rounded(im, int(s * round_r))
    canvas = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size - s) // 2, (size - s) // 2))
    return canvas


def circle(size):
    im = icon.resize((size, size), Image.LANCZOS)
    m = Image.new('L', (size, size), 0)
    ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
    im.putalpha(m)
    return im


def splash(w, h):
    # fondo ilustrado recortado tipo "cover" + logo centrado
    r = max(w / splash_bg.width, h / splash_bg.height)
    bg = splash_bg.resize((int(splash_bg.width * r) + 1, int(splash_bg.height * r) + 1), Image.LANCZOS)
    x, y = (bg.width - w) // 2, (bg.height - h) // 2
    canvas = bg.crop((x, y, x + w, y + h)).convert('RGBA')
    veil = Image.new('RGBA', (w, h), (20, 6, 40, 90))
    canvas.alpha_composite(veil)
    lw = int(min(w, h) * 0.72)
    lh = int(logo.height * lw / logo.width)
    canvas.alpha_composite(logo.resize((lw, lh), Image.LANCZOS), ((w - lw) // 2, int(h * 0.42 - lh / 2)))
    return canvas.convert('RGB')


def walk(d):
    for base, _, files in os.walk(d):
        for f in files:
            if f.endswith('.png'):
                yield os.path.join(base, f)


done = 0
for f in list(walk(os.path.join(ROOT, 'android/app/src/main/res'))) + list(walk(os.path.join(ROOT, 'ios/App/App/Assets.xcassets'))):
    w, h = Image.open(f).size
    if 'Splash.imageset' in f or f.endswith('splash.png'):
        out = splash(w, h)
    elif 'AppIcon' in f:
        out = square(w).convert('RGB')  # iOS: sin transparencia, el sistema redondea
    elif f.endswith('ic_launcher_foreground.png'):
        out = square(w, inset=0.62, round_r=0.18)
    elif f.endswith('ic_launcher_round.png'):
        out = circle(w)
    else:
        out = square(w, round_r=0.18)
    out.save(f)
    done += 1

icons = os.path.join(ROOT, 'public/icons')
os.makedirs(icons, exist_ok=True)
square(192, round_r=0.18).save(os.path.join(icons, 'icon-192.png'))
square(512, round_r=0.18).save(os.path.join(icons, 'icon-512.png'))
square(512).convert('RGB').save(os.path.join(icons, 'icon-maskable-512.png'))
square(180).convert('RGB').save(os.path.join(icons, 'apple-touch-icon.png'))

xml = os.path.join(ROOT, 'android/app/src/main/res/values/ic_launcher_background.xml')
if os.path.exists(xml):
    s = open(xml).read()
    s = re.sub(r'#[0-9A-Fa-f]{6}', '#4A168C', s)
    open(xml, 'w').write(s)
print(f'{done} imágenes nativas + 4 de la PWA')
