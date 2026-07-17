# -*- coding: utf-8 -*-
"""Generate 20 clean stick-man training illustrations for visual quiz batch 10."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(r"C:\Dipankar\slm_web\public\images\quizzes")
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 720
LINE = (40, 40, 45)
CREAM = (245, 240, 230)
SKY = (186, 220, 245)
NIGHT = (28, 36, 58)
GREEN = (90, 140, 80)
BROWN = (120, 80, 45)
YELLOW = (245, 200, 40)
ORANGE = (230, 120, 40)
RED = (200, 55, 45)
BLUE = (70, 130, 200)
GREY = (120, 125, 135)
WHITE = (250, 250, 250)
BLACK = (30, 30, 35)
CORE = (70, 75, 85)
COPPER = (180, 110, 55)
BURN = (60, 40, 35)


def new_img(bg=CREAM):
    im = Image.new("RGB", (SIZE, SIZE), bg)
    return im, ImageDraw.Draw(im)


def save(im, name):
    path = OUT / name
    im.save(path, "PNG", optimize=True)
    # also try webp
    try:
        wp = path.with_suffix(".webp")
        im.save(wp, "WEBP", quality=72, method=4)
        print("wrote", wp.name, wp.stat().st_size // 1024, "KB")
        return wp.name
    except Exception:
        print("wrote", path.name)
        return path.name


def stick_lineman(d, cx, cy, scale=1.0, helmet=True, arms="up"):
    """Simple stick lineman. cy = hip center."""
    s = scale
    # legs
    d.line([(cx - 14 * s, cy + 40 * s), (cx, cy), (cx + 14 * s, cy + 40 * s)], fill=LINE, width=max(3, int(4 * s)))
    # body
    d.line([(cx, cy), (cx, cy - 36 * s)], fill=LINE, width=max(3, int(4 * s)))
    # arms
    if arms == "up":
        d.line([(cx - 18 * s, cy - 18 * s), (cx, cy - 28 * s), (cx + 18 * s, cy - 50 * s)], fill=LINE, width=max(3, int(4 * s)))
    elif arms == "side":
        d.line([(cx - 22 * s, cy - 20 * s), (cx, cy - 28 * s), (cx + 22 * s, cy - 20 * s)], fill=LINE, width=max(3, int(4 * s)))
    else:
        d.line([(cx - 16 * s, cy - 10 * s), (cx, cy - 28 * s), (cx + 16 * s, cy - 10 * s)], fill=LINE, width=max(3, int(4 * s)))
    # head
    r = int(12 * s)
    d.ellipse([cx - r, cy - 36 * s - 2 * r, cx + r, cy - 36 * s], fill=WHITE, outline=LINE, width=2)
    if helmet:
        d.ellipse([cx - r - 2, cy - 36 * s - 2 * r - 4, cx + r + 2, cy - 36 * s - r], fill=YELLOW, outline=LINE, width=2)
        d.rectangle([cx - r - 4, cy - 36 * s - r - 2, cx + r + 4, cy - 36 * s - r + 4], fill=YELLOW, outline=LINE, width=1)


def pole(d, x, y0, y1, crossarm=True):
    d.line([(x, y0), (x, y1)], fill=BROWN, width=14)
    if crossarm:
        d.line([(x - 70, y0 + 40), (x + 70, y0 + 40)], fill=BROWN, width=10)
        # insulators
        for ox in (-40, 0, 40):
            d.ellipse([x + ox - 8, y0 + 28, x + ox + 8, y0 + 44], fill=WHITE, outline=LINE, width=2)
        # wires
        d.line([(x - 70, y0 + 32), (x + 70, y0 + 32)], fill=BLACK, width=3)


def ground(d, y=640, color=GREEN):
    d.rectangle([0, y, SIZE, SIZE], fill=color)


# ---------- Weather / night scenes ----------

def img_lightning():
    im, d = new_img((70, 85, 110))
    ground(d, 620, (55, 80, 50))
    pole(d, 360, 80, 620)
    # lightning
    pts = [(520, 40), (480, 140), (510, 160), (450, 320)]
    d.line(pts, fill=YELLOW, width=6)
    d.line(pts, fill=WHITE, width=2)
    stick_lineman(d, 360, 380, 1.1, arms="up")
    # rain dots
    for i in range(30):
        x = 40 + (i * 47) % 680
        y = 60 + (i * 73) % 500
        d.line([(x, y), (x - 2, y + 12)], fill=(160, 180, 200), width=2)
    return save(im, "vq_wx_lightning_pole.png")


def img_rain_climb():
    im, d = new_img((160, 185, 200))
    ground(d, 630, (70, 100, 70))
    # puddles
    d.ellipse([80, 640, 220, 700], fill=(100, 140, 170), outline=LINE, width=2)
    d.ellipse([480, 650, 650, 710], fill=(100, 140, 170), outline=LINE, width=2)
    pole(d, 340, 70, 630)
    stick_lineman(d, 340, 360, 1.1, arms="up")
    for i in range(40):
        x = 20 + (i * 53) % 700
        y = 40 + (i * 61) % 560
        d.line([(x, y), (x - 3, y + 16)], fill=(120, 150, 180), width=2)
    return save(im, "vq_wx_rain_climb.png")


def img_night_dark():
    im, d = new_img(NIGHT)
    ground(d, 640, (25, 40, 30))
    pole(d, 380, 90, 640)
    stick_lineman(d, 380, 400, 1.1, arms="up")
    # tiny phone glow only
    d.ellipse([410, 330, 440, 360], fill=(255, 240, 150))
    d.ellipse([415, 335, 435, 355], fill=(255, 255, 220))
    # moon faint
    d.ellipse([560, 50, 620, 110], fill=(200, 210, 230), outline=LINE, width=2)
    return save(im, "vq_wx_night_dark.png")


def img_fog_pole():
    im, d = new_img((200, 205, 210))
    ground(d, 640, (120, 140, 110))
    # two poles - lineman on left, tag blob on right
    pole(d, 220, 100, 640)
    pole(d, 500, 100, 640)
    stick_lineman(d, 220, 380, 1.0, arms="up")
    # blank tag shape on right pole (no letters)
    d.rounded_rectangle([520, 280, 580, 320], radius=6, fill=ORANGE, outline=LINE, width=2)
    # fog overlays
    for y in (150, 280, 420, 550):
        d.ellipse([-40, y, 760, y + 80], fill=(220, 225, 230, ))
    # soft fog bands using rectangles with cream
    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in (120, 260, 400, 540):
        od.rectangle([0, y, SIZE, y + 55], fill=(230, 232, 235, 140))
    im = Image.alpha_composite(im.convert("RGBA"), overlay).convert("RGB")
    return save(im, "vq_wx_fog_pole.png")


def img_wind_ladder():
    im, d = new_img(SKY)
    ground(d, 640)
    pole(d, 480, 80, 640)
    # leaning unsecured ladder
    d.line([(200, 620), (430, 160)], fill=GREY, width=8)
    d.line([(230, 620), (460, 160)], fill=GREY, width=8)
    for i in range(8):
        t = i / 7
        x1 = 200 + t * 230
        y1 = 620 - t * 460
        d.line([(x1, y1), (x1 + 30, y1)], fill=GREY, width=4)
    stick_lineman(d, 360, 300, 0.95, arms="up")
    # wind curves
    for y in (120, 200, 280):
        d.arc([40, y, 200, y + 40], 200, 340, fill=BLUE, width=3)
    # flying leaf shapes
    for x, y in [(100, 180), (140, 320), (80, 400)]:
        d.ellipse([x, y, x + 18, y + 10], fill=(60, 140, 60), outline=LINE, width=1)
    return save(im, "vq_wx_wind_ladder.png")


def img_flood_step():
    im, d = new_img((170, 195, 210))
    # flood water
    d.rectangle([0, 420, SIZE, SIZE], fill=(70, 120, 160))
    # fallen wire into water with sparks
    d.line([(80, 120), (400, 480)], fill=BLACK, width=5)
    pole(d, 120, 80, 420, crossarm=False)
    d.line([(80, 100), (200, 100)], fill=BROWN, width=8)
    stick_lineman(d, 480, 380, 1.1, arms="side")
    # feet stepping toward water
    d.ellipse([430, 455, 460, 475], fill=(40, 40, 45))
    d.ellipse([470, 458, 500, 478], fill=(40, 40, 45))
    # spark marks near water contact
    for ox, oy in [(390, 470), (410, 490), (370, 500)]:
        d.line([(ox, oy), (ox + 12, oy - 16)], fill=YELLOW, width=3)
    return save(im, "vq_wx_flood_wire.png")


def img_night_earth_on():
    im, d = new_img(NIGHT)
    ground(d, 640, (30, 45, 35))
    # AB switch / pole with earth clamp still on
    pole(d, 300, 100, 640)
    # earth rod and clamp on line
    d.line([(300, 160), (300, 160), (420, 520)], fill=(80, 180, 90), width=5)
    d.ellipse([410, 505, 445, 545], fill=ORANGE, outline=LINE, width=2)
    d.rectangle([400, 540, 455, 620], fill=GREY, outline=LINE, width=2)
    stick_lineman(d, 520, 520, 1.0, arms="side")
    # hand reaching to close switch blob
    d.rounded_rectangle([250, 200, 310, 250], radius=8, fill=RED, outline=LINE, width=2)
    d.line([(280, 250), (280, 300)], fill=LINE, width=4)
    # moon
    d.ellipse([560, 40, 630, 110], fill=(210, 215, 230), outline=LINE, width=2)
    return save(im, "vq_wx_night_earth_on.png")


def img_wet_hand_test():
    im, d = new_img((175, 195, 205))
    ground(d, 640)
    pole(d, 360, 80, 640)
    stick_lineman(d, 360, 340, 1.15, arms="up")
    # rain
    for i in range(25):
        x = 30 + (i * 59) % 680
        y = 50 + (i * 67) % 500
        d.line([(x, y), (x - 2, y + 14)], fill=(130, 160, 185), width=2)
    # bare hand touching wire - emphasize no glove (skin circle at wire)
    d.ellipse([348, 108, 372, 132], fill=(230, 190, 150), outline=LINE, width=2)
    d.line([(360, 120), (360, 150)], fill=(230, 190, 150), width=4)
    return save(im, "vq_wx_wet_hand_test.png")


def img_ss_panel_rain():
    im, d = new_img((155, 175, 190))
    ground(d, 640, (80, 95, 85))
    # outdoor panel cabinet open in rain
    d.rounded_rectangle([220, 160, 500, 520], radius=12, fill=GREY, outline=LINE, width=3)
    d.rounded_rectangle([500, 180, 620, 480], radius=8, fill=(90, 95, 100), outline=LINE, width=3)  # open door
    # busbars
    for y in (240, 300, 360):
        d.rectangle([260, y, 460, y + 18], fill=COPPER, outline=LINE, width=2)
    stick_lineman(d, 160, 420, 1.0, arms="side")
    for i in range(35):
        x = 20 + (i * 51) % 700
        y = 30 + (i * 71) % 580
        d.line([(x, y), (x - 3, y + 15)], fill=(120, 150, 175), width=2)
    # water dripping into panel
    d.line([(360, 160), (360, 230)], fill=BLUE, width=3)
    d.ellipse([350, 230, 370, 250], fill=BLUE, outline=LINE, width=1)
    return save(im, "vq_wx_ss_panel_rain.png")


def img_night_alone():
    im, d = new_img(NIGHT)
    ground(d, 640, (28, 42, 32))
    pole(d, 360, 80, 640)
    stick_lineman(d, 360, 300, 1.1, arms="up")
    # empty ground - no second person (x mark optional as gear bag only)
    d.ellipse([120, 600, 180, 640], fill=(50, 55, 60), outline=LINE, width=2)
    # dim moon
    d.ellipse([80, 50, 140, 110], fill=(180, 190, 210), outline=LINE, width=2)
    return save(im, "vq_wx_night_alone.png")


def img_storm_under_dtr():
    im, d = new_img((90, 105, 125))
    ground(d, 620, (60, 85, 55))
    # DTR tank damaged / leaning
    d.rounded_rectangle([260, 180, 460, 400], radius=10, fill=(100, 110, 90), outline=LINE, width=3)
    d.ellipse([300, 150, 420, 200], fill=(90, 100, 80), outline=LINE, width=2)  # conservator
    # cracked bushing spark
    d.line([(360, 150), (360, 100)], fill=WHITE, width=4)
    d.line([(360, 100), (400, 60)], fill=YELLOW, width=4)
    # stick man standing UNDER the DTR
    stick_lineman(d, 360, 500, 1.0, arms="side")
    # rain
    for i in range(28):
        x = 25 + (i * 49) % 690
        y = 40 + (i * 63) % 520
        d.line([(x, y), (x - 2, y + 12)], fill=(150, 170, 190), width=2)
    return save(im, "vq_wx_storm_under_dtr.png")


def img_wet_glove_hole():
    im, d = new_img((180, 200, 210))
    ground(d, 640)
    pole(d, 400, 90, 640)
    stick_lineman(d, 400, 360, 1.1, arms="up")
    # large glove inset showing hole
    d.ellipse([80, 200, 260, 420], fill=YELLOW, outline=LINE, width=3)
    d.ellipse([140, 280, 200, 360], fill=CREAM, outline=RED, width=4)  # hole
    d.line([(150, 290), (190, 350)], fill=RED, width=3)
    # rain
    for i in range(20):
        x = 40 + (i * 61) % 680
        y = 50 + (i * 77) % 500
        d.line([(x, y), (x - 2, y + 12)], fill=(130, 160, 180), width=2)
    return save(im, "vq_wx_wet_glove_hole.png")


# ---------- DTR core damage patterns ----------

def dtr_tank_cutaway(d):
    """Draw simplified cutaway DTR tank with core window."""
    d.rounded_rectangle([120, 100, 600, 620], radius=16, fill=(150, 155, 140), outline=LINE, width=4)
    # oil fill hint
    d.rectangle([140, 200, 580, 600], fill=(210, 195, 120))
    # core limbs (E shape simplified as 3 vertical + yoke)
    d.rectangle([220, 240, 280, 520], fill=CORE, outline=LINE, width=2)
    d.rectangle([330, 240, 390, 520], fill=CORE, outline=LINE, width=2)
    d.rectangle([440, 240, 500, 520], fill=CORE, outline=LINE, width=2)
    d.rectangle([220, 220, 500, 260], fill=CORE, outline=LINE, width=2)  # top yoke
    d.rectangle([220, 500, 500, 540], fill=CORE, outline=LINE, width=2)  # bottom yoke


def img_dtr_axial():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    # windings as copper rings - axially shifted / telescoped
    for i, y in enumerate([300, 340, 380, 420, 460]):
        shift = i * 12
        d.ellipse([250 + shift, y, 470 + shift, y + 28], outline=COPPER, width=5)
    # arrow-like marks showing axial force (no text) - small chevrons
    for y in (280, 480):
        d.polygon([(540, y), (580, y + 15), (540, y + 30)], fill=RED, outline=LINE)
    return save(im, "vq_dtr_axial_winding.png")


def img_dtr_radial():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    # concentric windings - inner buckled inward
    d.ellipse([250, 300, 470, 480], outline=COPPER, width=6)
    d.ellipse([290, 330, 430, 450], outline=COPPER, width=6)
    # buckled dent on inner
    d.arc([300, 350, 380, 430], 200, 340, fill=RED, width=8)
    d.ellipse([310, 370, 350, 410], fill=BURN, outline=RED, width=2)
    return save(im, "vq_dtr_radial_buckle.png")


def img_dtr_hotspot():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    # normal windings
    for y in (320, 370, 420, 470):
        d.ellipse([260, y, 460, y + 30], outline=COPPER, width=5)
    # localized hotspot burn on one side
    d.ellipse([400, 360, 470, 440], fill=BURN, outline=RED, width=3)
    d.ellipse([415, 375, 455, 420], fill=ORANGE, outline=LINE, width=2)
    # heat lines
    for x in (480, 500, 520):
        d.arc([x, 340, x + 40, 420], 270, 90, fill=ORANGE, width=3)
    return save(im, "vq_dtr_hotspot_overload.png")


def img_dtr_core_bolt():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    # core bolt through yoke with circular burn ring
    d.ellipse([340, 200, 380, 280], fill=BURN, outline=RED, width=4)
    d.ellipse([350, 210, 370, 270], fill=GREY, outline=LINE, width=2)
    d.rectangle([355, 180, 365, 300], fill=GREY, outline=LINE, width=2)
    # circular discoloration on laminations
    d.arc([300, 210, 420, 290], 0, 360, fill=ORANGE, width=5)
    return save(im, "vq_dtr_core_bolt_burn.png")


def img_dtr_flash_tank():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    for y in (330, 390, 450):
        d.ellipse([270, y, 450, y + 28], outline=COPPER, width=5)
    # flash track from winding to tank wall
    d.line([(450, 400), (580, 400)], fill=YELLOW, width=5)
    d.line([(450, 400), (580, 400)], fill=WHITE, width=2)
    # carbon track on tank wall
    d.ellipse([560, 370, 600, 430], fill=BURN, outline=RED, width=3)
    for i in range(5):
        d.line([(560, 380 + i * 8), (595, 385 + i * 8)], fill=BLACK, width=2)
    return save(im, "vq_dtr_flash_to_tank.png")


def img_dtr_lead_melt():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    for y in (340, 400, 460):
        d.ellipse([270, y, 450, y + 26], outline=COPPER, width=5)
    # HV lead up to bushing - melted blob
    d.line([(360, 240), (360, 160)], fill=COPPER, width=8)
    d.ellipse([330, 120, 390, 180], fill=ORANGE, outline=RED, width=3)
    d.ellipse([345, 135, 375, 165], fill=BURN, outline=LINE, width=2)
    # drip
    d.ellipse([350, 175, 370, 200], fill=COPPER, outline=LINE, width=1)
    return save(im, "vq_dtr_lead_melt.png")


def img_dtr_rusty_core():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    # rust blotches on laminations
    rust = (160, 70, 40)
    for box in [(230, 270, 270, 340), (340, 300, 380, 390), (450, 280, 490, 360), (250, 430, 320, 500)]:
        d.ellipse(box, fill=rust, outline=LINE, width=1)
    # water droplet marks near top
    d.ellipse([350, 170, 370, 195], fill=BLUE, outline=LINE, width=1)
    d.ellipse([380, 185, 395, 205], fill=BLUE, outline=LINE, width=1)
    return save(im, "vq_dtr_rusty_core.png")


def img_dtr_overflux():
    im, d = new_img(CREAM)
    dtr_tank_cutaway(d)
    # burned edges on yoke laminations (overfluxing)
    for x in range(220, 500, 12):
        d.line([(x, 220), (x, 260)], fill=CORE, width=2)
    # edge burn along top yoke
    d.rectangle([220, 218, 500, 235], fill=BURN, outline=RED, width=2)
    d.rectangle([220, 248, 500, 262], fill=ORANGE, outline=LINE, width=1)
    # windings normal
    for y in (320, 380, 440):
        d.ellipse([270, y, 450, y + 28], outline=COPPER, width=5)
    return save(im, "vq_dtr_overflux_yoke.png")


def main():
    gens = [
        img_lightning,
        img_rain_climb,
        img_night_dark,
        img_fog_pole,
        img_wind_ladder,
        img_flood_step,
        img_night_earth_on,
        img_wet_hand_test,
        img_ss_panel_rain,
        img_night_alone,
        img_storm_under_dtr,
        img_wet_glove_hole,
        img_dtr_axial,
        img_dtr_radial,
        img_dtr_hotspot,
        img_dtr_core_bolt,
        img_dtr_flash_tank,
        img_dtr_lead_melt,
        img_dtr_rusty_core,
        img_dtr_overflux,
    ]
    names = []
    for g in gens:
        names.append(g())
    print("TOTAL", len(names))
    for n in names:
        print(" -", n)


if __name__ == "__main__":
    main()
