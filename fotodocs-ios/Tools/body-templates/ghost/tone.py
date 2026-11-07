# tone.py in.png out.png navy|black : dark cloth (jacket, tie) to a true navy / neutral black; shirt and skin untouched
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert('RGBA')).astype(float)
rgb, a = im[..., :3], im[..., 3]
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
Y = 0.299*r + 0.587*g + 0.114*b; Cb = 128 - 0.1687*r - 0.3313*g + 0.5*b; Cr = 128 + 0.5*r - 0.4187*g - 0.0813*b
dark = np.clip((120 - Y) / 30, 0, 1) * (a > 0)          # cloth, faded out toward light (shirt, skin)
print('cloth mean Y/Cb/Cr', [round(float(v[dark > 0.9].mean()), 1) for v in (Y, Cb, Cr)])
if sys.argv[3] == 'navy':
    tY, tCb, tCr, kY = None, 146.0, 120.0, 1.0           # navy: blue, no red (it read plum)
else:
    tY, tCb, tCr, kY = None, 129.0, 127.0, 0.72          # black: neutral, darker
k = 0.85
Cb2 = Cb + dark*k*(tCb - Cb); Cr2 = Cr + dark*k*(tCr - Cr); Y2 = Y * (1 - dark*(1 - kY))
R = Y2 + 1.402*(Cr2-128); G = Y2 - 0.344136*(Cb2-128) - 0.714136*(Cr2-128); B = Y2 + 1.772*(Cb2-128)
out = np.dstack([R, G, B, a]).clip(0, 255).astype(np.uint8)
Image.fromarray(out, 'RGBA').save(sys.argv[2])
