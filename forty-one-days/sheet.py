import sys, glob
from PIL import Image, ImageDraw
files = sys.argv[2:]; out = sys.argv[1]
ims = [Image.open(f) for f in files]
cols = 7; w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
c = Image.new('RGB', (cols * w, rows * h), 'black'); d = ImageDraw.Draw(c)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * h; c.paste(im, (x, y)); d.rectangle([x, y, x + 70, y + 22], fill='black'); d.text((x + 4, y + 4), f.split('/')[-1][1:-4], fill='yellow')
c.save(out, quality=90)
