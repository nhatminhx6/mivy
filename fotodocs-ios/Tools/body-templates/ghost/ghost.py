# ghost.py garment.png model_raw.png model.json out.png [drop]
# headless (ghost) suit + the template model's head and neck -> a body template prep_body can measure
import sys, json
import numpy as np
from PIL import Image
gp, mp, mj, out = sys.argv[1:5]
drop = float(sys.argv[5]) if len(sys.argv) > 5 else 0.18
G = Image.open(gp).convert('RGBA'); G = G.crop(G.getbbox())
MA = np.asarray(Image.open(mp).convert('RGBA')).astype(float); M = MA[..., :3].copy(); Ma = MA[..., 3].copy()
j = json.load(open(mj)); chin, cx, jaw = j['chin'], j['cx'], j['jawW']
def ycc(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return 0.299*r+0.587*g+0.114*b, 128-0.1687*r-0.3313*g+0.5*b, 128+0.5*r-0.4187*g-0.0813*b
_, cb, cr = ycc(M)
skin = (cr > 135) & (cr < 175) & (cb > 81) & (cb < 129)
H, W = skin.shape
def run(y, x0):
    x0 = int(x0); l = r = x0
    while l > 0 and skin[y, l-1]: l -= 1
    while r < W-1 and skin[y, r+1]: r += 1
    return l, r
# model neck: width under the chin, and where its skin stops (its own collar)
yn = int(chin + 0.05*jaw); nl, nr = run(yn, cx); neckW = nr - nl
ymc = int(chin + 0.08*jaw) + 4
pass
# garment hole (transparent, open at the top)
A = np.asarray(G)[..., 3] > 128
gh, gw = A.shape; mid = gw // 2
rows = []
for y in range(gh // 2):
    if A[y, mid]: break
    l = r = mid
    while l > 0 and not A[y, l]: l -= 1
    while r < gw-1 and not A[y, r]: r += 1
    if A[y, l] and A[y, r] and r - l < 0.6*gw: rows.append((y, l, r))
ht = rows[0][0]; holeBottom = rows[-1][0]
top = [r - l for (y, l, r) in rows if ht + 0.03*gw <= y <= ht + 0.07*gw]
wTop = float(np.median(top)); hc = float(np.median([(l + r)/2 for (y, l, r) in rows[:20]]))
g = (neckW / 1.06) / wTop
G2 = G.resize((int(gw*g), int(gh*g)), Image.LANCZOS)
ox = int(round(cx - hc*g)); oy = int(round(chin + drop*jaw - ht*g))
# model layer: everything above the chin, only neck skin below; neck continued down the hole
L = M.copy(); La = Ma.copy()
below = np.zeros_like(skin); below[int(chin):, :] = True
L[below & ~skin] = 255; La[below & ~skin] = 0
xx = np.arange(W)[None, :]; yy = np.arange(H)[:, None]
La[(yy >= chin - 0.2*jaw) & (np.abs(xx - cx) > 0.5*jaw)] = 0   # the model's own collar tips beside the jaw
La[(yy >= chin - 0.2*jaw) & (np.abs(xx - cx) > 0.3*jaw) & ~skin] = 0   # ...and right beside the chin
ysrc = ymc - 4; bottom = int(oy + holeBottom*g) + 10
l0, r0 = run(ysrc, cx)
# the neck continued down the hole: a smooth base (rows averaged, smoothed sideways, shaded) plus the skin's own
# fine texture from the bare neck band under the chin (high-pass, mirrored) — one row repeated was a flat, streaky
# block, and mirroring the band itself repeated the chin's shadow as stripes
from PIL import ImageFilter
y0b = int(chin + 0.01*jaw); n = max(4, ysrc - y0b)
srow = M[ysrc-6:ysrc+1].mean(axis=0)
kk = np.exp(-0.5*(np.arange(-12, 13)/5.0)**2); kk /= kk.sum()
srow = np.stack([np.convolve(np.pad(srow[:, c], 12, mode='edge'), kk, mode='valid') for c in range(3)], axis=1)
band = Image.fromarray(M[y0b:ysrc].clip(0, 255).astype(np.uint8))
detail = M[y0b:ysrc] - np.asarray(band.filter(ImageFilter.GaussianBlur(3))).astype(float)
cxm = (l0 + r0) / 2
for y in range(ysrc, min(H, bottom)):
    q = (y - ysrc) % (2*n); dy = n - 1 - q if q < n else q - n
    t = (y - ysrc) / max(1, bottom - ysrc)
    L[y, :] = 255; La[y, :] = 0; La[y, l0:r0+1] = 255
    xs = np.arange(l0, r0+1)
    side = 1 - 0.18*((xs - cxm) / max(1, (r0 - l0)/2))**4     # rounded neck: darker at the sides
    L[y, l0:r0+1] = srow[l0:r0+1] * ((1 - 0.2*t) * side)[:, None] + detail[dy, l0:r0+1]
# no collar shadow on this stand-in neck: the app only measures it (json "ghost": 1) and draws the user's own
# neck there; darkened skin at the bottom of the V read as "not skin" and stayed on the suit as a grey patch
canvas = Image.fromarray(np.dstack([L, La]).clip(0, 255).astype(np.uint8), 'RGBA')
# the suit's soft edge round the neck hole: over the stand-in neck it blended into a pink rim the app keeps as
# part of the suit (a red line at the bottom of the V) — inside the hole the edge keeps its own colour instead
Ga = np.asarray(G2).astype(float)
edge = (Ga[..., 3] > 0) & (Ga[..., 3] < 255)
Ga[edge, 3] = 255
G2 = Image.fromarray(Ga.clip(0, 255).astype(np.uint8), 'RGBA')
canvas.alpha_composite(G2, (max(0, ox), max(0, oy))) if ox >= 0 and oy >= 0 else canvas.paste(G2, (ox, oy), G2)
canvas.save(out)
print(f'neckW {neckW} wTop {wTop:.0f} scale {g:.3f} hole top {ht} bottom {holeBottom} model collar {ymc}')
