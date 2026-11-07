import sys, os
from psd_tools import PSDImage
from PIL import Image
out = sys.argv[1]
for f in sys.argv[2:]:
    p = PSDImage.open(f)
    n = os.path.basename(f)[:-4]
    for l in p.descendants():
        if l.kind == 'smartobject':
            im = l.composite(viewport=p.bbox).convert('RGBA')
            im.save(f'{out}/{n}.png'); print(n, im.size, im.getbbox(), im.getchannel('A').getextrema())
