"""Cover for itch.io (630 x 500): title type, the Mistel 3C silhouette (Greg Goebel, public domain)
and a strip of the file of 7 February 1945.  Run from the repository root:  python itch/make-cover.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "itch" / "cover-630x500.png"
W, H = 630, 500
PAPER, INK, RED, GREY = (238, 235, 227), (31, 31, 28), (122, 43, 31), (93, 91, 85)


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


SERIF = ["C:/Windows/Fonts/pala.ttf", "C:/Windows/Fonts/georgia.ttf"]
SERIF_B = ["C:/Windows/Fonts/palab.ttf", "C:/Windows/Fonts/georgiab.ttf"]
SERIF_I = ["C:/Windows/Fonts/palai.ttf", "C:/Windows/Fonts/georgiai.ttf"]
MONO = ["C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf"]


def main():
    im = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(im)
    # the file: the '18 combinations' passage as a strip
    strip = Image.open(ROOT / "assets" / "file" / "b2-eighteen.jpg").convert("L")
    strip = strip.crop((int(strip.width * 0.12), int(strip.height * 0.42), int(strip.width * 0.98), int(strip.height * 0.98)))
    strip = strip.resize((W, round(W * strip.height / strip.width)))
    strip = ImageOps.autocontrast(strip).point(lambda v: 150 + v * 105 // 255)
    im.paste(Image.merge("RGB", (strip, strip, strip)), (0, H - strip.height - 40))
    # the Mistel 3C silhouette, side view
    sil = Image.open(ROOT / "assets" / "plates" / "threeview.jpg").convert("L")
    side = sil.crop((int(sil.width * 0.52), int(sil.height * 0.08), int(sil.width * 0.99), int(sil.height * 0.40)))
    side = side.resize((360, round(360 * side.height / side.width)))
    mask = side.point(lambda v: 255 if v < 90 else 0)
    im.paste(Image.new("RGB", side.size, INK), (W - 380, 150), mask)
    d.rectangle([0, 0, W, 6], fill=RED)
    d.text((32, 40), "IRON HAMMER, 1945", font=font(SERIF_B, 44), fill=INK)
    d.text((32, 98), "A hypothetical campaign study", font=font(SERIF_I, 23), fill=INK)
    d.text((32, 128), "from the Luftwaffe's own file", font=font(SERIF_I, 23), fill=INK)
    d.text((32, 190), "Read the dossier,", font=font(SERIF, 19), fill=GREY)
    d.text((32, 214), "or take the staff's seat.", font=font(SERIF, 19), fill=GREY)
    d.rectangle([0, H - 40, W, H], fill=INK)
    d.text((W / 2, H - 20), "\u201eBisher sind 18 Gespanne an die Truppe ausgeliefert.\u201c  OKL, 7 February 1945",
           font=font(MONO, 14), fill=PAPER, anchor="mm")
    im.save(OUT)
    print(OUT.name, im.size)


if __name__ == "__main__":
    main()
