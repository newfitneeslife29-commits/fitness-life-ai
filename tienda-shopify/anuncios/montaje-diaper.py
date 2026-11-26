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
    ("c0.mp4", 4.6, [
        ("HOLIDAY GIFT IDEA", XB, 40, 1270, 0.2, 4.6, "pill"),
        ("The gift every new mom", BOLD, 72, 1360, 0.3, 4.6, "big"),
        ("actually uses", BOLD, 72, 1445, 0.5, 4.6, "big"),
    ]),
    ("c1.mp4", 4.6, [
        ("Hands-free &", BOLD, 84, 1300, 0.2, 4.6, "big"),
        ("stroller-ready", BOLD, 84, 1395, 0.4, 4.6, "big"),
    ]),
    ("c2.mp4", 4.6, [
        ("Changing pad included", BOLD, 70, 250, 0.2, 4.6, "big"),
        ("Insulated bottle pockets  ·  Room for everything", MED, 36, 345, 0.6, 4.6, "pill"),
    ]),
    ("c3.mp4", 4.6, [
        ("Made for moms", BOLD, 84, 1500, 0.2, 4.6, "big"),
        ("and dads", BOLD, 84, 1595, 0.4, 4.6, "big"),
    ]),
    ("c4.mp4", 5.0, [
        ("ORDER BY DEC 10 FOR CHRISTMAS", XB, 38, 195, 0.1, 5.0, "pill"),
        ("1 bag  $39.83", BOLD, 58, 275, 0.3, 5.0, "card"),
        ("Holiday Duo  $71.47", BOLD, 62, 370, 0.6, 5.0, "hl"),
        ("Free shipping  ·  kavirostore.store", XB, 38, 475, 1.0, 5.0, "pill_accent"),
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


def probe(f):
    return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f]).decode().strip())


def main(out="kaviro_ad.mp4", voice=None):
    if voice:
        vlen = probe(voice) + 0.9  # 0.4s de entrada + 0.5s de respiro final
        pre = sum(d for _, d, _ in SCENES[:-1]) - XF * (len(SCENES) - 1)
        last = max(5.0, round(vlen - pre, 2))
        f, _, t = SCENES[-1]
        t = [(a, b_, c, d, e, (last if g == 5.0 else g), h) for (a, b_, c, d, e, g, h) in t]
        SCENES[-1] = (f, last, t)
    parts = []
    for i, (f, dur, texts) in enumerate(SCENES):
        src = os.path.join(D, f)
        seg = os.path.join(D, f"seg{i}.mp4")
        srclen = probe(src)
        vf = []
        if dur > srclen - 0.05:
            vf.append(f"setpts=PTS*{(dur + 0.1) / srclen:.4f}")
        vf += [
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
    if voice:
        cmd += ["-stream_loop", "-1", "-i", music, "-i", voice]
        n = len(parts)
        fc_str += (f";[{n}:a]atrim=0:{total:.2f},asetpts=PTS-STARTPTS,volume=0.13,afade=t=in:d=0.5,afade=t=out:st={total-1.2:.2f}:d=1.2[m]"
                   f";[{n+1}:a]adelay=400|400,volume=1.6,highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=120[vo]"
                   f";[m][vo]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]")
        cmd += ["-filter_complex", fc_str, "-map", prev, "-map", "[a]", "-c:a", "aac", "-b:a", "192k"]
    elif os.path.exists(music):
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
