#!/usr/bin/env python3
"""
Builds js/dino-art.js from the original Openclipart SVGs in art/source/.

For each dino it:
  * strips editor metadata, ids and anything script-like,
  * swaps the original colours for our palette,
  * removes or adds parts (that's how Stegosaurus and Parasaurolophus are
    remixed from the Ankylosaurus and T-Rex),
  * adds rosy cheeks,
  * marks the eyes (class "eye") so they can blink.

Run it after changing anything in DINOS below:
    python3 tools/build-art.py

To see a source file's parts (ids, colours) when writing a config:
    python3 tools/build-art.py --list <file>.svg   (a file in art/source/)
"""
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art' / 'source'
OUT = ROOT / 'js' / 'dino-art.js'

SVG_NS = 'http://www.w3.org/2000/svg'
ALLOWED_TAGS = {'g', 'path', 'ellipse', 'circle', 'rect', 'polygon', 'polyline', 'line'}
ALLOWED_ATTRS = {
    'd', 'transform', 'style', 'fill', 'stroke', 'stroke-width', 'opacity',
    'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
    'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'points',
    'x1', 'y1', 'x2', 'y2', 'fill-rule',
}

INK = '#000000'
SHADE = 'fill-opacity:.3137'
CHEEK = '#ff6f9f'


def cheeks(*pts, rx=13, ry=8):
    return ''.join(
        f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{CHEEK}" opacity=".55"/>' for x, y in pts)


def plate_fan(cx, cy, r, color, start=196, end=344):
    """Stegosaurus back plates: leaf-shaped, biggest in the middle, fanned
    around the top of the body with their bases tucked behind it."""
    import math
    sizes = [(40, 15), (54, 19), (66, 23), (74, 26), (66, 23), (54, 19), (40, 15)]  # (length, half-width)
    out = []
    for i, (L, W) in enumerate(sizes):
        deg = start + (end - start) * i / (len(sizes) - 1)
        a = math.radians(deg)
        bx, by = cx + math.cos(a) * (r - 18), cy + math.sin(a) * (r - 18)
        # Drawn pointing up from the origin, then rotated into place.
        leaf = (f'M{-W * 0.7:.1f} 0 C{-W * 1.25:.1f} {-L * 0.45:.1f} {-W * 0.55:.1f} {-L * 0.88:.1f} 0 {-L - 18:.1f} '
                f'C{W * 0.55:.1f} {-L * 0.88:.1f} {W * 1.25:.1f} {-L * 0.45:.1f} {W * 0.7:.1f} 0Z')
        shade = (f'M0 {-L - 18:.1f} C{W * 0.55:.1f} {-L * 0.88:.1f} {W * 1.25:.1f} {-L * 0.45:.1f} {W * 0.7:.1f} 0 '
                 f'L{W * 0.15:.1f} 0 C{W * 0.5:.1f} {-L * 0.4:.1f} {W * 0.3:.1f} {-L * 0.8:.1f} 0 {-L - 18:.1f}Z')
        vein = f'M{-W * 0.35:.1f} {-L * 0.12:.1f} C{-W * 0.6:.1f} {-L * 0.45:.1f} {-W * 0.35:.1f} {-L * 0.75:.1f} {-W * 0.05:.1f} {-L * 0.95:.1f}'
        out.append(
            f'<g transform="translate({bx:.1f} {by:.1f}) rotate({deg + 90:.1f})">'
            f'<path d="{leaf}" style="fill:{color};stroke:{INK};stroke-width:4;stroke-linejoin:round"/>'
            f'<path d="{shade}" style="{SHADE}"/>'
            f'<path d="{vein}" style="fill:none;stroke:#fff;stroke-opacity:.45;stroke-width:4;stroke-linecap:round"/>'
            f'</g>')
    return ''.join(out)


def spike(x, y, ang, size=30):
    """A white, outlined spike like the Ankylosaurus ones, pointing at `ang` degrees."""
    return (f'<g transform="translate({x} {y}) rotate({ang})">'
            f'<path d="M0 {-size * 0.42} Q{size * 0.55} {-size * 0.3} {size} 0 Q{size * 0.55} {size * 0.3} 0 {size * 0.42}Z" '
            f'style="fill:#ffffff;stroke:{INK};stroke-width:4;stroke-linejoin:round"/>'
            f'<path d="M0 {size * 0.1} Q{size * 0.55} {size * 0.2} {size} 0 Q{size * 0.55} {size * 0.3} 0 {size * 0.42}Z" style="{SHADE}"/>'
            f'</g>')


def crest(color):
    """Parasaurolophus head crest: a long tube sweeping up and back."""
    d = 'M118 40 C124 -30 180 -78 252 -86'
    return (f'<path d="{d}" style="fill:none;stroke:{INK};stroke-width:38;stroke-linecap:round"/>'
            f'<path d="{d}" style="fill:none;stroke:{color};stroke-width:30;stroke-linecap:round"/>'
            f'<path d="M126 34 C132 -24 184 -66 248 -76" style="fill:none;stroke:#000;stroke-opacity:.18;stroke-width:9;stroke-linecap:round"/>'
            f'<path d="M110 20 C118 -36 168 -84 236 -94" style="fill:none;stroke:#fff;stroke-opacity:.35;stroke-width:6;stroke-linecap:round"/>')


def bumps(cx, cy, r, color, start=145, end=395, count=14):
    """Ankylosaurus armour: rounded bony knobs around the rim of the shell,
    plus a few on the back, so they read as bumps rather than spikes."""
    import math
    out = []
    rings = [(r - 4, count, start, end, 15, 12), (r - 34, 5, 205, 335, 12, 12)]
    for rad, n, a0, a1, big, small in rings:
        for i in range(n):
            a = math.radians(a0 + (a1 - a0) * i / (n - 1))
            x, y = cx + math.cos(a) * rad, cy + math.sin(a) * rad
            k = big if i % 2 == 0 else small
            out.append(
                f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{k}" style="fill:{color};stroke:{INK};stroke-width:3.5"/>'
                f'<path d="M{x - k * 0.75:.1f} {y + k * 0.35:.1f} A{k} {k} 0 0 0 {x + k * 0.75:.1f} {y + k * 0.35:.1f} '
                f'A{k * 0.9:.1f} {k * 0.7:.1f} 0 0 1 {x - k * 0.75:.1f} {y + k * 0.35:.1f}Z" style="{SHADE}"/>'
                f'<circle cx="{x - k * 0.35:.1f}" cy="{y - k * 0.35:.1f}" r="{k * 0.25:.1f}" fill="#fff" opacity=".6"/>')
    return ''.join(out)


def feet(color, offset=(88.31382, 19.89826)):
    """New feet for the Velociraptor (the source is cropped through its feet).
    Inserted inside the source's shifted group, so `offset` undoes its transform."""
    out = [f'<g transform="translate({offset[0]} {offset[1]})">']
    for cx in (66.5, 146.5):
        out.append(
            f'<ellipse cx="{cx}" cy="298" rx="40" ry="34" style="fill:{color};stroke:{INK};stroke-width:4"/>')
        for dx, dy, ry in ((-19, 318, 11), (0, 322, 12), (19, 318, 11)):
            out.append(f'<ellipse cx="{cx + dx}" cy="{dy}" rx="8.5" ry="{ry}" style="fill:#fff;stroke:{INK};stroke-width:3.5"/>')
    out.append('</g>')
    return ''.join(out)


def belly(cx, cy, rx, ry, color):
    """A lighter belly patch (T-Rex)."""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{color}"/>'


def spots(color, pts):
    """Darker spots on the body (Dilophosaurus)."""
    return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>' for x, y, r in pts)


def bill(color):
    """Parasaurolophus duck bill, over the lower face (nostrils draw on top)."""
    return (f'<path d="M70 150 Q70 128 122 130 Q174 128 174 150 Q174 170 122 168 Q70 170 70 150Z" style="fill:{color};stroke:{INK};stroke-width:4;stroke-linejoin:round"/>'
            f'<path d="M80 154 Q122 164 164 154" style="fill:none;stroke:{INK};stroke-width:3;stroke-linecap:round"/>')


def brow_stripes(color, offset=(88.31382, 19.89826)):
    """Allosaurus: tiger-ish stripes across the forehead and down the cheeks."""
    d = ('M84 50 Q105 60 126 50 M88 66 Q105 74 122 66 M92 82 Q105 88 118 82 '
         'M46 96 Q54 92 60 100 M164 96 Q156 92 150 100')
    return (f'<g transform="translate({offset[0]} {offset[1]})">'
            f'<path d="{d}" style="fill:none;stroke:{color};stroke-width:7;stroke-linecap:round"/></g>')


def tuft(cx, cy, color, n=3, length=34, spread=22):
    """A little tuft of feathers sticking up (drawn behind the head)."""
    out = []
    for i in range(n):
        ang = -90 + (i - (n - 1) / 2) * spread
        out.append(
            f'<g transform="translate({cx} {cy}) rotate({ang})">'
            f'<path d="M0 -8 Q{length * 0.6} -14 {length} 0 Q{length * 0.6} 14 0 8Z" style="fill:{color};stroke:{INK};stroke-width:3.5;stroke-linejoin:round"/>'
            f'<path d="M4 0 L{length - 6} 0" style="fill:none;stroke:#000;stroke-opacity:.25;stroke-width:2.5;stroke-linecap:round"/>'
            f'</g>')
    return ''.join(out)


def horn(x, y, ang, color, size=26):
    """A small rounded horn (Allosaurus brow horns)."""
    return (f'<g transform="translate({x} {y}) rotate({ang})">'
            f'<path d="M-11 0 Q-8 {-size * 0.6} 0 {-size} Q8 {-size * 0.6} 11 0Z" style="fill:{color};stroke:{INK};stroke-width:3.5;stroke-linejoin:round"/>'
            f'<path d="M0 {-size} Q8 {-size * 0.6} 11 0 L3 0 Q4 {-size * 0.5} 0 {-size}Z" style="{SHADE}"/>'
            f'</g>')


def twin_crests(color, stripe):
    """Dilophosaurus: two thin fan-shaped crests side by side on top of the head."""
    out = []
    for cx, ang in ((104, -16), (141, 16)):
        out.append(
            f'<g transform="translate({cx} 30) rotate({ang}) scale(1.3)">'
            f'<path d="M-14 0 C-24 -40 -16 -70 0 -76 C16 -70 24 -40 14 0Z" style="fill:{color};stroke:{INK};stroke-width:3.5;stroke-linejoin:round"/>'
            f'<path d="M0 -76 C16 -70 24 -40 14 0 L5 0 C12 -36 8 -62 0 -76Z" style="{SHADE}"/>'
            f'<path d="M-9 -14 Q0 -20 9 -14 M-12 -32 Q0 -40 12 -32 M-11 -50 Q0 -58 11 -50" style="fill:none;stroke:{stripe};stroke-width:4;stroke-linecap:round"/>'
            f'</g>')
    return ''.join(out)


def dome(color, knob):
    """Pachycephalosaurus: a big rounded dome on the head, ringed by knobs."""
    import math
    cx, cy, rx, ry = 122, 24, 62, 38
    out = [f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" style="fill:{color};stroke:{INK};stroke-width:4"/>',
           f'<path d="M{cx} {cy - ry} A{rx} {ry} 0 0 1 {cx + rx} {cy} L{cx + rx - 14} {cy} A{rx - 14} {ry - 10} 0 0 0 {cx} {cy - ry}Z" style="{SHADE}"/>',
           f'<path d="M{cx - 40} {cy - 26} Q{cx - 22} {cy - 44} {cx} {cy - 44}" style="fill:none;stroke:#fff;stroke-opacity:.5;stroke-width:6;stroke-linecap:round"/>']
    for i in range(7):
        a = math.radians(190 + 160 * i / 6)
        x, y = cx + math.cos(a) * (rx - 2), cy + math.sin(a) * (ry - 2)
        out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" style="fill:{knob};stroke:{INK};stroke-width:3"/>')
    return ''.join(out)


def feathers(color, tip):
    """Archaeopteryx: a fringe of feathers under both wings plus a feathered tail.
    Drawn over the bottom edge of the Pterodactyl's wings so they read as layered feathers."""
    import math
    out = []

    def feather(x, y, ang, length, width=13):
        return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.1f})">'
                f'<path d="M0 {-width} Q{length * 0.65} {-width * 1.1} {length} 0 Q{length * 0.65} {width * 1.1} 0 {width}Z" style="fill:{color};stroke:{INK};stroke-width:3.5;stroke-linejoin:round"/>'
                f'<path d="M{length * 0.62} {-width * 0.95} Q{length * 0.9} {-width * 0.5} {length} 0 Q{length * 0.9} {width * 0.5} {length * 0.62} {width * 0.95} Q{length * 0.7} 0 {length * 0.62} {-width * 0.95}Z" style="fill:{tip}"/>'
                f'<path d="M6 0 L{length - 8} 0" style="fill:none;stroke:#000;stroke-opacity:.25;stroke-width:2.5;stroke-linecap:round"/>'
                f'</g>')

    # under each wing: from the wing tip in towards the body
    for i in range(7):
        t = i / 6
        x = 22 + t * 240
        y = 290 - math.sin(t * math.pi) * 12
        ang = 112 - t * 26
        length = 78 - t * 16
        out.append(feather(x, y, ang, length))
        out.append(feather(723 - x, y, 180 - ang, length))
    # tail fan at the end of the tail
    for ang in (-25, 5, 35):
        out.append(feather(536, 318, ang, 92, 17))
    return ''.join(out)


def frill_spikes(cx, cy, rx, ry, color, start=200, end=340, n=6, length=80, width=20):
    """Styracosaurus: long spikes fanned around the top of the (oval) frill, drawn
    behind it with their bases well inside its edge so they grow out of it."""
    import math
    out = []
    for i in range(n):
        deg = start + (end - start) * i / (n - 1)
        a = math.radians(deg)
        x, y = cx + math.cos(a) * rx, cy + math.sin(a) * ry
        L, W = length, width
        out.append(
            f'<g transform="translate({x:.1f} {y:.1f}) rotate({deg + 90:.1f})">'
            f'<path d="M{-W} 0 Q{-W * 0.6} {-L * 0.6} 0 {-L} Q{W * 0.6} {-L * 0.6} {W} 0Z" style="fill:{color};stroke:{INK};stroke-width:4;stroke-linejoin:round"/>'
            f'<path d="M0 {-L} Q{W * 0.6} {-L * 0.6} {W} 0 L{W * 0.3} 0 Q{W * 0.3} {-L * 0.5} 0 {-L}Z" style="{SHADE}"/>'
            f'</g>')
    return ''.join(out)


def bull_horns(color):
    """Carnotaurus: thick horns curving out and up from above the eyes (drawn behind the head)."""
    out = []
    for s in (-1, 1):
        cx = 123 + s * 50
        d = (f'M{cx - s * 22} 44 C{cx + s * 26} 52 {cx + s * 58} 22 {cx + s * 58} -30 '
             f'C{cx + s * 36} -4 {cx + s * 16} 6 {cx - s * 18} 2Z')
        sh = (f'M{cx + s * 58} -30 C{cx + s * 58} 22 {cx + s * 26} 52 {cx - s * 22} 44 '
              f'L{cx - s * 20} 34 C{cx + s * 20} 38 {cx + s * 48} 14 {cx + s * 58} -30Z')
        out.append(f'<path d="{d}" style="fill:{color};stroke:{INK};stroke-width:4;stroke-linejoin:round"/>'
                   f'<path d="{sh}" style="{SHADE}"/>')
    return ''.join(out)


def feather_ruff(cx, cy, r, color, tip, start=165, end=375, n=11, length=78, width=24):
    """Therizinosaurus: a fluffy ring of wide feathers around the body (drawn behind it)."""
    import math
    out = []
    for i in range(n):
        deg = start + (end - start) * i / (n - 1)
        a = math.radians(deg)
        x, y = cx + math.cos(a) * (r - 30), cy + math.sin(a) * (r - 30)
        L, W = length, width
        out.append(
            f'<g transform="translate({x:.1f} {y:.1f}) rotate({deg:.1f})">'
            f'<path d="M0 {-W} Q{L * 0.65} {-W * 1.1} {L} 0 Q{L * 0.65} {W * 1.1} 0 {W}Z" style="fill:{color};stroke:{INK};stroke-width:3.5;stroke-linejoin:round"/>'
            f'<path d="M{L * 0.62} {-W * 0.95} Q{L * 0.9} {-W * 0.5} {L} 0 Q{L * 0.9} {W * 0.5} {L * 0.62} {W * 0.95} Q{L * 0.7} 0 {L * 0.62} {-W * 0.95}Z" style="fill:{tip}"/>'
            f'<path d="M6 0 L{L - 8} 0" style="fill:none;stroke:#000;stroke-opacity:.25;stroke-width:2.5;stroke-linecap:round"/>'
            f'</g>')
    return ''.join(out)


def big_claws(x, y, side):
    """Therizinosaurus: three long white sickle claws fanning out from a hand (side -1 = left, 1 = right)."""
    out = []
    for ang, L in ((30, 70), (52, 84), (74, 70)):
        W = 10
        out.append(
            f'<g transform="rotate({90 - side * ang}) scale(1 {side})">'
            f'<path d="M0 {-W} Q{L * 0.6} {-W} {L} {W * 1.6} Q{L * 0.55} {W * 0.2} 0 {W}Z" style="fill:#fff;stroke:{INK};stroke-width:3.5;stroke-linejoin:round"/>'
            f'<path d="M{L * 0.15} {W * 0.5} Q{L * 0.55} {W * 0.5} {L} {W * 1.6} Q{L * 0.55} {W * 0.2} 0 {W}Z" style="{SHADE}"/>'
            f'</g>')
    return f'<g transform="translate({x} {y})">' + ''.join(out) + '</g>'


WATER, WATER_EDGE = '#4fb3ff', '#1f6fb0'  # kept blue on golden dinos (see KEEP in js/dinos.js)


def flippers(color):
    """Plesiosaurus: a paddle-shaped flipper either side of the body (drawn behind it)."""
    out = []
    for s, x in ((-1, 40), (1, 144)):
        out.append(
            f'<g transform="translate({x} 424) rotate({s * -14})">'
            f'<path d="M0 -24 Q{s * 80} -38 {s * 118} 6 Q{s * 78} 30 0 24Z" style="fill:{color};stroke:{INK};stroke-width:4;stroke-linejoin:round"/>'
            f'<path d="M{s * 10} 8 Q{s * 55} 16 {s * 88} 6" style="fill:none;stroke:#000;stroke-opacity:.25;stroke-width:5;stroke-linecap:round"/>'
            f'</g>')
    return ''.join(out)


def water(y=436, x0=-152, x1=356, n=16):
    """Plesiosaurus: wavy water over the bottom half of the body. It spans exactly the
    square the game fits this viewBox into (the art isn't clipped), so it fills the card."""
    step = (x1 - x0) / n
    waves = ''.join(f'Q{x0 + step * (i + 0.5):.1f} {y - 14} {x0 + step * (i + 1):.1f} {y} ' for i in range(n))
    return (f'<path d="M{x0} {y} {waves}L{x1} {y + 72} L{x0} {y + 72}Z" '
            f'style="fill:{WATER};fill-opacity:.85;stroke:{WATER_EDGE};stroke-width:4;stroke-linejoin:round"/>'
            f'<path d="M-30 466 q14 -8 28 0 M150 478 q14 -8 28 0 M60 494 q14 -8 28 0 M230 462 q14 -8 28 0" '
            f'style="fill:none;stroke:#fff;stroke-opacity:.7;stroke-width:4;stroke-linecap:round"/>')


DINOS = [
    {
        'id': 'trex', 'src': 'trex-23513.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#6fd34f'},
        'insert_after': {'g241': belly(123, 266, 72, 74, '#b3f08f')},
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'triceratops', 'src': 'triceratops-23511.svg',
        'eyes': [r'^g278$', r'^g282$'],
        'colors': {'#698000': '#ff9b2f'},
        'after': cheeks((60, 146), (154, 146)),
    },
    {
        'id': 'stegosaurus', 'src': 'ankylosaurus-356643.svg',
        'eyes': [r'^g255$', r'^g259$'],
        'colors': {'#698000': '#a07cff', '#485800': '#8160e6'},
        'remove': [r'^g297'],  # the ring of spikes
        'viewBox': '-40 -62 370 300',
        # Tail spikes are drawn first (behind the tail) so they grow out of its tip.
        'before': spike(262, 26, -140, 42) + spike(270, 24, -40, 42) + spike(260, 46, 185, 36) + spike(276, 44, -5, 36)
                  + plate_fan(111, 108, 92, '#ff5fa2'),
        'after': cheeks((80, 140), (144, 140), rx=11, ry=7),
    },
    {
        'id': 'brontosaurus', 'src': 'brontosaurus-23508.svg',
        'eyes': [r'^g255$', r'^g259$'],
        'colors': {'#698000': '#3fa9f5'},
        'after': cheeks((48, 98), (141, 98), rx=12, ry=7),
    },
    {
        'id': 'pterodactyl', 'src': 'pterodactyl-28420.svg', 'flies': True,
        'eyes': [r'^eyes$'],
        'colors': {'#d37d1a': '#a3abb5'},  # gray, so it can't be mistaken for a golden dino
        'gradient_fill': '#ff9f43',   # toes were gradients; flatten them
        'remove': [r'^shadow$'],      # drop shadow (the game draws its own)
        'viewBox': '0 0 723 445',
        'after': cheeks((322, 206), (400, 206), rx=12, ry=7),
    },
    {
        'id': 'ankylosaurus', 'src': 'ankylosaurus-356643.svg',
        'eyes': [r'^g255$', r'^g259$'],
        'colors': {'#698000': '#20c4a8', '#485800': '#138f7a'},
        'remove': [r'^g297'],  # the original ring of spikes...
        'insert_after': {'g242': bumps(111.5, 108.5, 92.5, '#f3e6c4')},  # ...becomes bony bumps on the shell
        'after': cheeks((80, 140), (144, 140), rx=11, ry=7),
    },
    {
        'id': 'parasaurolophus', 'src': 'trex-23513.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#ff7eb6'},
        'remove': [r'^g282$', r'^g285$'],  # T-Rex fangs
        'insert_after': {'g291': bill('#ffc4de')},  # duck bill over the lower face
        'viewBox': '0 -118 308 482',
        'before': crest('#b44fe0'),
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'spinosaurus', 'src': 'spinosaurus-356257.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#ff5a4e', '#95702b': '#ffd23f'},
        # Slimmer than the T-Rex: squeeze the body and arms, pull feet, tail and sail in.
        'wrap': {
            'g241': 'translate(123 0) scale(0.78 1) translate(-123 0)',
            'g265': 'translate(123 0) scale(0.84 1) translate(-123 0)',
            'g247': 'translate(14 0)', 'g256': 'translate(-14 0)',
            'layer1_1_': 'translate(-26 0)', 'g83': 'translate(-24 0)',
        },
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'velociraptor', 'src': 'velociraptor-355256.svg',
        'eyes': [r'^n44$', r'^n48$'],  # this file has no ids; see --list
        'colors': {'#9f7e0d': '#b07642'},
        'viewBox': '0 -52 302 390',
        'remove': [r'^n18$', r'^n23$'],               # cropped feet...
        'insert_after': {'n13': feet('#b07642')},     # ...replaced with whole ones
        'before': tuft(105, 12, '#ff8c42', n=5, length=50, spread=17),
        'after': cheeks((64, 78), (148, 78), rx=11, ry=7),
    },
    {
        'id': 'allosaurus', 'src': 'velociraptor-355256.svg',
        'eyes': [r'^n44$', r'^n48$'],
        'colors': {'#9f7e0d': '#5763e0'},
        'viewBox': '0 -44 302 382',
        'remove': [r'^n18$', r'^n23$'],
        'before': horn(50, 18, -28, '#ff7a3c', 40) + horn(161, 18, 28, '#ff7a3c', 40),
        'insert_after': {'n13': feet('#5763e0'), 'n40': brow_stripes('#2f369a')},
        'after': cheeks((64, 78), (148, 78), rx=11, ry=7),
    },
    {
        'id': 'dilophosaurus', 'src': 'trex-23513.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#c3e33f'},
        'insert_after': {'g241': spots('#8fb21c', [(36, 196, 12), (24, 238, 8), (52, 282, 10), (206, 194, 12),
                                                   (220, 236, 8), (192, 282, 10), (96, 300, 9), (150, 300, 9),
                                                   (123, 330, 7), (44, 160, 7), (202, 160, 7)])},
        'viewBox': '0 -82 308 446',
        'before': twin_crests('#ff4d4d', '#ffd23f'),
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'pachycephalosaurus', 'src': 'trex-23513.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#f1e2c2'},
        'remove': [r'^g282$', r'^g285$'],  # T-Rex fangs
        'viewBox': '0 -24 308 388',
        'insert_after': {'g291': dome('#d08a3e', '#8f5a2a')},  # over the head, under the eyes
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'archaeopteryx', 'src': 'pterodactyl-28420.svg', 'flies': True,
        'eyes': [r'^eyes$'],
        'colors': {'#d37d1a': '#d14fc8'},
        'gradient_fill': '#ffcf3a',
        'remove': [r'^shadow$'],
        'viewBox': '0 0 723 445',
        'after': feathers('#3ec1e6', '#1f6fb0') + cheeks((322, 206), (400, 206), rx=12, ry=7),
    },
    {
        'id': 'styracosaurus', 'src': 'triceratops-23511.svg',
        'eyes': [r'^g278$', r'^g282$'],
        'colors': {'#698000': '#4cc9f0'},
        'remove': [r'^g297$', r'^path3190_1_$'],  # brow horns, for a crown of frill spikes
        'wrap': {'g290': 'translate(110 160) scale(1.8) translate(-110 -160)'},  # and a bigger nose horn
        'viewBox': '-30 -70 320 352',
        'before': frill_spikes(110, 96, 82, 70, '#ff9f43'),
        'after': cheeks((60, 146), (154, 146)),
    },
    {
        'id': 'carnotaurus', 'src': 'spinosaurus-356257.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#b23a48'},
        'remove': [r'^g83$'],  # the sail
        # Slimmed like the Spinosaurus.
        'wrap': {
            'g241': 'translate(123 0) scale(0.78 1) translate(-123 0)',
            'g265': 'translate(123 0) scale(0.84 1) translate(-123 0)',
            'g247': 'translate(14 0)', 'g256': 'translate(-14 0)',
            'layer1_1_': 'translate(-26 0)',
        },
        'insert_after': {'g241': spots('#8c2235', [(x, y, 6) for x in (72, 174) for y in (190, 222, 254, 286)]
                                       + [(x, y, 5) for x in (96, 150) for y in (176, 300)])},  # bumpy scales
        'viewBox': '0 -40 315 403',
        'before': bull_horns('#fff3c4'),
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'therizinosaurus', 'src': 'velociraptor-355256.svg',
        'eyes': [r'^n44$', r'^n48$'],
        'colors': {'#9f7e0d': '#8e44ad'},
        'viewBox': '-40 -52 382 390',
        'remove': [r'^n18$', r'^n23$', r'^n11$', r'^n16$'],  # cropped feet and the little claws
        'insert_after': {'n13': feet('#8e44ad')},
        'before': feather_ruff(114, 214, 108, '#c38be0', '#ff8fc7') + tuft(114, 14, '#ff8fc7', n=3, length=58, spread=28),
        'after': big_claws(80, 250, -1) + big_claws(150, 250, 1) + cheeks((64, 78), (148, 78), rx=11, ry=7),
    },
]

# Finished dinos waiting for a place to live (not built into the game yet).
# The Plesiosaurus needs a water location first; move it into DINOS (and add it
# to js/dinos.js) when there is one.
LATER = [
    {
        'id': 'plesiosaurus', 'src': 'brontosaurus-23508.svg',
        'eyes': [r'^g255$', r'^g259$'],
        'colors': {'#698000': '#ff8a65'},
        'remove': [r'^g268$'],  # legs: it swims instead
        'viewBox': '-90 0 384 508',
        'before': flippers('#ff8a65'),
        'after': cheeks((48, 98), (141, 98), rx=12, ry=7) + water(),
    },
]


def local(tag):
    return tag.split('}', 1)[-1]


def auto_ids(root):
    """Give every drawable element without an id a stable one ("n0", "n1", ...)
    in document order, so files without ids can still be targeted."""
    n = 0
    for el in root.iter():
        if local(el.tag) in ALLOWED_TAGS:
            if not el.get('id'):
                el.set('id', f'n{n}')
            n += 1


def clean(el, cfg):
    """Return cleaned markup for el's children, or '' to drop it."""
    out = []
    for child in list(el):
        tag = local(child.tag)
        if tag not in ALLOWED_TAGS:
            continue
        cid = child.get('id', '')
        if any(re.search(p, cid) for p in cfg.get('remove', [])):
            continue
        style = child.get('style', '')
        fill = (re.search(r'fill:\s*(#[0-9a-fA-F]{3,6})', style) or [None, child.get('fill')])[1]
        if fill and fill.lower() in cfg.get('remove_fill', []):
            continue
        attrs = []
        for k, v in child.attrib.items():
            k = local(k)
            if k not in ALLOWED_ATTRS:
                continue
            if k in ('style', 'fill', 'stroke'):
                v = re.sub(r'url\(#[^)]*\)', cfg.get('gradient_fill', '#999999'), v)
                for old, new in cfg['colors'].items():
                    v = re.sub(re.escape(old), new, v, flags=re.I)
            attrs.append(f'{k}="{v}"')
        inner = clean(child, cfg) if tag == 'g' else ''
        if tag == 'g' and not inner:
            continue
        a = (' ' + ' '.join(attrs)) if attrs else ''
        markup = f'<{tag}{a}>{inner}</{tag}>' if tag == 'g' else f'<{tag}{a}/>'
        # Wrap eyes in their own group so CSS can blink them without
        # fighting the original transform attributes.
        if any(re.search(p, cid) for p in cfg.get('eyes', [])):
            markup = f'<g class="eye">{markup}</g>'
        if cid in cfg.get('wrap', {}):
            markup = f'<g transform="{cfg["wrap"][cid]}">{markup}</g>'
        out.append(markup)
        out.append(cfg.get('insert_after', {}).get(cid, ''))
    return ''.join(out)


def build(cfg):
    root = ET.parse(SRC / cfg['src']).getroot()
    auto_ids(root)
    vb = cfg.get('viewBox') or root.get('viewBox')
    body = cfg.get('before', '') + clean(root, cfg) + cfg.get('after', '')
    body = re.sub(r'\s+', ' ', body)
    assert not re.search(r'<script|\son\w+=|javascript:', body, re.I)
    return {'viewBox': vb, 'svg': body}


def main():
    art = {d['id']: build(d) for d in DINOS}
    js = ('/* Generated by tools/build-art.py from art/source/ (Openclipart, CC0). Do not edit by hand. */\n'
          '(function (DM) {\n  DM.DINO_ART = ' + json.dumps(art, indent=1) +
          ';\n})(window.DinoMatch = window.DinoMatch || {});\n')
    OUT.write_text(js)
    print(f'wrote {OUT.relative_to(ROOT)} ({len(js) // 1024} KB, {len(art)} dinos)')


def list_parts(name):
    """Print a source file's parts with their ids and colours (for writing configs)."""
    root = ET.parse(SRC / name).getroot()
    auto_ids(root)

    def walk(el, depth):
        for c in el:
            if local(c.tag) not in ALLOWED_TAGS:
                continue
            fill = c.get('fill') or (re.search(r'fill:([^;]+)', c.get('style', '')) or [None, ''])[1]
            print(f"{c.get('id'):<28}{'  ' * depth}{local(c.tag):8}{fill}")
            walk(c, depth + 1)
    walk(root, 0)


if __name__ == '__main__':
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == '--list':
        list_parts(sys.argv[2])
    else:
        main()
