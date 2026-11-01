"""Fotowork app icon (1024×1024): navy field, white ID-photo card with a person and a navy suit."""
import sys
from PIL import Image, ImageDraw, ImageFilter

S = 1024 * 4  # supersample, downscale at the end
NAVY, NAVY_DK, TINT, WHITE = (30, 58, 138), (21, 48, 111), (234, 240, 251), (255, 255, 255)

img = Image.new("RGB", (S, S), NAVY)
d = ImageDraw.Draw(img)
# soft diagonal light
for i in range(S):
    t = i / S
    c = tuple(int(NAVY[k] * (1 - 0.18 * t) + NAVY_DK[k] * 0.18 * t) for k in range(3))
    d.line([(0, i), (S, i)], fill=c)

# card with shadow
cw, ch = int(S * 0.50), int(S * 0.64)
cx0, cy0 = (S - cw) // 2, int(S * 0.17)
shadow = Image.new("L", (S, S), 0)
ImageDraw.Draw(shadow).rounded_rectangle([cx0, cy0 + S * 0.025, cx0 + cw, cy0 + ch + S * 0.025], radius=S * 0.05, fill=110)
shadow = shadow.filter(ImageFilter.GaussianBlur(S * 0.025))
img.paste((10, 20, 60), (0, 0), shadow)
d = ImageDraw.Draw(img)
d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + ch], radius=S * 0.05, fill=WHITE)

# photo area inside the card
pad = int(cw * 0.1)
px0, py0, px1, py1 = cx0 + pad, cy0 + pad, cx0 + cw - pad, cy0 + int(ch * 0.78)
d.rounded_rectangle([px0, py0, px1, py1], radius=S * 0.025, fill=TINT)
mask = Image.new("L", (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([px0, py0, px1, py1], radius=S * 0.025, fill=255)
person = Image.new("RGB", (S, S), TINT)
pd = ImageDraw.Draw(person)
mx = (px0 + px1) // 2
pw = px1 - px0
# suit shoulders
pd.ellipse([mx - pw * 0.48, py1 - pw * 0.42, mx + pw * 0.48, py1 + pw * 0.5], fill=NAVY)
# shirt V + tie
pd.polygon([(mx - pw * 0.13, py1 - pw * 0.40), (mx + pw * 0.13, py1 - pw * 0.40), (mx, py1 - pw * 0.05)], fill=WHITE)
pd.polygon([(mx - pw * 0.035, py1 - pw * 0.34), (mx + pw * 0.035, py1 - pw * 0.34), (mx + pw * 0.05, py1 - pw * 0.12),
            (mx, py1 - pw * 0.06), (mx - pw * 0.05, py1 - pw * 0.12)], fill=NAVY_DK)
# neck + head
pd.rounded_rectangle([mx - pw * 0.08, py1 - pw * 0.52, mx + pw * 0.08, py1 - pw * 0.36], radius=pw * 0.04, fill=(214, 168, 140))
pd.ellipse([mx - pw * 0.19, py0 + pw * 0.14, mx + pw * 0.19, py0 + pw * 0.62], fill=(232, 190, 160))
pd.pieslice([mx - pw * 0.205, py0 + pw * 0.10, mx + pw * 0.205, py0 + pw * 0.52], 180, 360, fill=(35, 35, 45))
img.paste(person, (0, 0), mask)

# caption bars under the photo
by = cy0 + int(ch * 0.85)
d.rounded_rectangle([cx0 + pad, by, cx0 + cw * 0.62, by + S * 0.022], radius=S * 0.011, fill=NAVY)
d.rounded_rectangle([cx0 + pad, by + S * 0.04, cx0 + cw * 0.45, by + S * 0.058], radius=S * 0.009, fill=(200, 208, 225))

img.resize((1024, 1024), Image.LANCZOS).save(sys.argv[1])
