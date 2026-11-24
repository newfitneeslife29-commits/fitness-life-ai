#!/usr/bin/env python3
"""Monta el anuncio vertical 1080x1920 con textos y oferta final (ffmpeg)."""
import subprocess, sys, os

D = os.path.dirname(os.path.abspath(__file__))
BOLD = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
MED = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
if not os.path.exists(MED):
    MED = "/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf"

# (archivo, segundos a usar, [(texto, fuente, tamaño, y, inicio, fin, estilo)])
SCENES = [
    ("c0.mp4", 3.6, [
        ("BLACK FRIDAY", XB, 46, 250, 0.2, 3.6, "pill"),
        ("Your new favorite", BOLD, 92, 350, 0.3, 3.6, "big"),
        ("face cream", BOLD, 92, 450, 0.5, 3.6, "big"),
        ("From $10 per jar", MED, 48, 575, 0.8, 3.6, "small"),
    ]),
    ("c1.mp4", 3.6, [
        ("Retinol + Collagen", BOLD, 78, 250, 0.2, 3.6, "big"),
        ("+ Hyaluronic Acid", BOLD, 78, 345, 0.4, 3.6, "big"),
        ("Morning routine", MED, 50, 1380, 0.3, 3.6, "pill"),
    ]),
    ("c2.mp4", 3.6, [
        ("Day & night formula", BOLD, 78, 250, 0.2, 3.6, "big"),
        ("Deep hydration, smoother-looking skin", MED, 44, 350, 0.4, 3.6, "small"),
        ("Night routine", MED, 50, 1380, 0.3, 3.6, "pill"),
    ]),
    ("c3.mp4", 3.6, [
        ("Made for every", BOLD, 82, 250, 0.2, 3.6, "big"),
        ("skincare routine", BOLD, 82, 345, 0.4, 3.6, "big"),
    ]),
    ("c4.mp4", 5.0, [
        ("BLACK FRIDAY  ·  ENDS NOV 30", XB, 38, 195, 0.1, 5.0, "pill"),
        ("1 jar  $14.99", BOLD, 54, 268, 0.3, 5.0, "card"),
        ("2 jars  $24.99", BOLD, 54, 350, 0.5, 5.0, "card"),
        ("4 jars  $39.99", BOLD, 66, 440, 0.7, 5.0, "hl"),
        ("Free shipping · kavirostore.store", XB, 42, 540, 1.0, 5.0, "pill_accent"),
    ]),
]
XF = 0.35  # duración del fundido entre escenas


def esc(t):
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace("%", "\\%")


def text_filter(t, font, size, y, a, b, style):
    alpha = f"if(lt(t,{a}),0,if(lt(t,{a+0.25}),(t-{a})/0.25,1))"
    common = f"fontfile='{font}':text='{esc(t)}':fontsize={size}:x=(w-text_w)/2:y={y}:alpha='{alpha}':enable='between(t,{a},{b})'"
    if style == "big":
        return f"drawtext={common}:fontcolor=white:shadowcolor=black@0.55:shadowx=0:shadowy=3:borderw=2:bordercolor=black@0.25"
    if style == "small":
        return f"drawtext={common}:fontcolor=white:shadowcolor=black@0.6:shadowx=0:shadowy=2:box=1:boxcolor=black@0.35:boxborderw=18"
    if style == "pill":
        return f"drawtext={common}:fontcolor=white:box=1:boxcolor=0x0B1220@0.85:boxborderw=22"
    if style == "pill_accent":
        return f"drawtext={common}:fontcolor=white:box=1:boxcolor=0xFF4F2E@0.95:boxborderw=26"
    if style == "card":
        return f"drawtext={common}:fontcolor=0x0B1220:box=1:boxcolor=white@0.92:boxborderw=22"
    if style == "hl":
        return f"drawtext={common}:fontcolor=0x0B1220:box=1:boxcolor=0xFFD43B@0.95:boxborderw=20"
    raise ValueError(style)


def main(out="kaviro_ad.mp4"):
    parts = []
    for i, (f, dur, texts) in enumerate(SCENES):
        src = os.path.join(D, f)
        seg = os.path.join(D, f"seg{i}.mp4")
        vf = [
            "scale=1080:1920:force_original_aspect_ratio=increase",
            "crop=1080:1920",
            "fps=30",
            "format=yuv420p",
        ]
        # degradado suave arriba para que el texto se lea
        base = ",".join(vf)
        txt = ",".join(text_filter(*t) for t in texts)
        grad = os.path.join(D, "grad.png")
        fcx = f"[0:v]{base}[b];[b][1:v]overlay=0:0[o];[o]{txt}[v]"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-i", grad, "-t", str(dur), "-an",
                        "-filter_complex", fcx, "-map", "[v]", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                        "-r", "30", seg], check=True)
        parts.append((seg, dur))

    # unir con fundidos
    inputs = []
    for seg, _ in parts:
        inputs += ["-i", seg]
    fc = []
    prev = "[0:v]"
    offset = 0.0
    for i in range(1, len(parts)):
        offset += parts[i - 1][1] - XF
        lbl = f"[v{i}]"
        fc.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={offset:.2f}{lbl}")
        prev = lbl
    fc_str = ";".join(fc)
    music = os.path.join(D, "music.mp3")
    cmd = ["ffmpeg", "-y", "-loglevel", "error"] + inputs
    total = sum(d for _, d in parts) - XF * (len(parts) - 1)
    if os.path.exists(music):
        cmd += ["-i", music]
        fc_str += f";[{len(parts)}:a]atrim=0:{total:.2f},afade=t=in:d=0.5,afade=t=out:st={total-1.2:.2f}:d=1.2,volume=0.8[a]"
        cmd += ["-filter_complex", fc_str, "-map", prev, "-map", "[a]", "-c:a", "aac", "-b:a", "160k"]
    else:
        cmd += ["-filter_complex", fc_str, "-map", prev]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            os.path.join(D, out)]
    subprocess.run(cmd, check=True)
    print("ok", out, f"{total:.2f}s")


if __name__ == "__main__":
    main(*(sys.argv[1:]))
