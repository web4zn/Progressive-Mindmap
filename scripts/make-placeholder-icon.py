"""Generate a 512x512 placeholder PNG icon for the Electron build.

Phase 0 ships a simple gradient + symbol as a stand-in. Phase 1 will
replace `build/icon.{png,icns,ico}` with the real brand mark.
"""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "build" / "icon.png"
OUT.parent.mkdir(parents=True, exist_ok=True)

SIZE = 512


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def make_pixels() -> bytes:
    """Build an RGBA buffer for SIZE x SIZE pixels."""
    pixels = bytearray()
    # Two-stop diagonal gradient (deep purple -> teal) with a simple
    # "M" mark in the centre. The mark is a 3x3 binary mask.
    mark = [
        "XXXX..XXXX",
        "X..X..X..X",
        "X..X..X..X",
        "XXXX..XXXX",
        "X..X..X..X",
        "X..X..X..X",
        "X..X..X..X",
        "X..X..X..X",
    ]
    mark_w = 8
    mark_h = 8
    mark_origin_x = (SIZE - mark_w * 24) // 2
    mark_origin_y = (SIZE - mark_h * 24) // 2
    cell = 24

    for y in range(SIZE):
        row = bytearray()
        t = y / (SIZE - 1)
        r0 = int(lerp(72, 16, t))
        g0 = int(lerp(40, 132, t))
        b0 = int(lerp(168, 144, t))
        for x in range(SIZE):
            tx = x / (SIZE - 1)
            r = int(lerp(r0, int(lerp(20, 200, tx)), 0.0)) if False else r0
            g = g0
            b = b0
            # Slight diagonal mix
            r = int(lerp(r, 220, max(0.0, (tx - t) * 0.4)))
            b = int(lerp(b, 240, max(0.0, (t - tx) * 0.4)))

            # Mark pixel?
            in_mark = False
            if mark_origin_x <= x < mark_origin_x + mark_w * cell and \
               mark_origin_y <= y < mark_origin_y + mark_h * cell:
                lx = (x - mark_origin_x) // cell
                ly = (y - mark_origin_y) // cell
                if 0 <= ly < mark_h and 0 <= lx < mark_w:
                    if mark[ly][lx] == 'X':
                        in_mark = True
            if in_mark:
                r, g, b = 245, 250, 255
            # Soft alpha at the mark edges for a less pixelated look
            a = 255
            row += bytes((r & 0xFF, g & 0xFF, b & 0xFF, a))
        pixels += b"\x00" + row  # PNG filter type 0 (None)
    return bytes(pixels)


def png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def write_png(path: Path) -> None:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(
        ">IIBBBBB",
        SIZE, SIZE,
        8,  # bit depth
        6,  # colour type: RGBA
        0,  # compression
        0,  # filter
        0,  # interlace
    )
    raw = make_pixels()
    idat = zlib.compress(raw, 9)
    blob = sig + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", idat) + png_chunk(b"IEND", b"")
    path.write_bytes(blob)
    print(f"wrote {path} ({len(blob)} bytes)")


if __name__ == "__main__":
    write_png(OUT)
