from PIL import Image
import os
SRC = r'C:\Code\immobf-africa\store-assets\play-store-screenshots'
DST = r'C:\Code\immobf-africa\store-assets\ipad-screenshots'
os.makedirs(DST, exist_ok=True)
W, H = 2048, 2732
BG = (14, 124, 102)
for fn in sorted(os.listdir(SRC)):
    if not fn.endswith('.png'):
        continue
    img = Image.open(os.path.join(SRC, fn)).convert('RGB')
    scale = W / img.width
    new_h = int(img.height * scale)
    img = img.resize((W, new_h), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), BG)
    y_off = (H - new_h) // 2
    canvas.paste(img, (0, y_off))
    canvas.save(os.path.join(DST, fn), 'PNG')
    print('OK:', fn)
print('Done -> store-assets/ipad-screenshots/')
