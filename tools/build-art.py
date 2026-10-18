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


DINOS = [
    {
        'id': 'trex', 'src': 'trex-23513.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#6fd34f'},
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
        'before': plate_fan(111, 108, 92, '#ff5fa2'),
        'after': spike(252, 30, 195) + spike(284, 24, -20) + spike(256, 56, 165, 26) + spike(286, 52, 15, 26)
                 + cheeks((80, 140), (144, 140), rx=11, ry=7),
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
        'colors': {'#d37d1a': '#ffcf3a'},
        'gradient_fill': '#ffb703',   # toes were gradients; flatten them
        'remove': [r'^shadow$'],      # drop shadow (the game draws its own)
        'viewBox': '0 0 723 445',
        'after': cheeks((322, 206), (400, 206), rx=12, ry=7),
    },
    {
        'id': 'ankylosaurus', 'src': 'ankylosaurus-356643.svg',
        'eyes': [r'^g255$', r'^g259$'],
        'colors': {'#698000': '#20c4a8', '#485800': '#138f7a'},
        'after': cheeks((80, 140), (144, 140), rx=11, ry=7),
    },
    {
        'id': 'parasaurolophus', 'src': 'trex-23513.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#ff7eb6'},
        'remove': [r'^g282$', r'^g285$'],  # T-Rex fangs
        'viewBox': '0 -118 308 482',
        'before': crest('#b44fe0'),
        'after': cheeks((84, 100), (161, 100)),
    },
    {
        'id': 'spinosaurus', 'src': 'spinosaurus-356257.svg',
        'eyes': [r'^g300$', r'^g306$'],
        'colors': {'#698000': '#ff5a4e', '#95702b': '#ffd23f'},
        'after': cheeks((84, 100), (161, 100)),
    },
]


def local(tag):
    return tag.split('}', 1)[-1]


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
        out.append(markup)
    return ''.join(out)


def build(cfg):
    root = ET.parse(SRC / cfg['src']).getroot()
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


if __name__ == '__main__':
    main()
