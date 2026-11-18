"""Generate all dialogue with Kokoro TTS (offline, Apache-2.0), lay it out on the timeline,
and export timing + per-frame mouth curves (lip-sync) to timeline.json.
Each line is placed `gap` seconds after the previous line ends, or at an absolute time `at`."""
import json, subprocess, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

FPS = 30
SR = 24000
VOICES = {
    "vo":   dict(voice="am_puck", speed=1.13, pitch=1.13),   # Milo narrating (same voice, softer mix)
    "milo": dict(voice="am_puck", speed=1.15, pitch=1.13),
    "dad":  dict(voice="am_michael", speed=1.12, pitch=0.95),
}
# (id, speaker, placement, text)   placement: ("gap", s) after previous end, or ("at", s)
LINES = [
    ("v1",  "vo",   ("at", 0.30), "On my fourteenth birthday, I found out I had forty-one days left with my dad."),
    ("v2",  "vo",   ("gap", 0.35), "Mom? Fifteen thousand. Best friend? Twenty-two thousand."),
    ("v3",  "vo",   ("gap", 0.30), "Dad? Forty-one."),
    ("b1",  "milo", ("gap", 0.45), "Dad. Helmet."),
    ("b2",  "dad",  ("gap", 0.25), "For breakfast?"),
    ("b3",  "milo", ("gap", 0.15), "For LIFE."),
    ("b4",  "dad",  ("gap", 0.45), "Is this about the bacon? Because I will fight you on the bacon."),
    ("v4",  "vo",   ("gap", 0.45), "So I started saying yes. To everything."),
    ("f1",  "dad",  ("gap", 0.70), "I used to hate facial hair... but then it grew on me."),
    ("f3",  "milo", ("gap", 0.10), "Ha ha ha ha ha!"),
    ("f4",  "dad",  ("gap", 0.20), "It wasn't THAT funny."),
    ("v5",  "vo",   ("gap", 0.40), "But Dad was acting weird too."),
    ("h1",  "milo", ("gap", 0.70), "Dad... you're crushing me."),
    ("h2",  "dad",  ("gap", 0.15), "Five more seconds."),
    ("n1",  "milo", ("gap", 1.30), "Dad... I need to tell you something."),
    ("n3",  "dad",  ("gap", 0.30), "Me first. There's a number. Over your head."),
    ("n4",  "milo", ("gap", 0.60), "Forty-one?"),
    ("n5",  "dad",  ("gap", 0.30), "It WAS forty-one."),
    ("x1",  "milo", ("gap", 0.45), "Later, Dad."),
    ("x2",  "dad",  ("gap", 0.35), "Every time you said later, it got smaller."),
    ("x3",  "milo", ("gap", 0.40), "I thought I was losing YOU."),
    ("x4",  "dad",  ("gap", 0.15), "I thought I was losing YOU."),
    ("c1",  "dad",  ("gap", 3.00), "So... the bubble wrap was unnecessary."),
    ("c2",  "milo", ("gap", 0.15), "The bubble wrap was VERY necessary."),
    ("v6",  "vo",   ("gap", 0.60), "It was never counting down to goodbye. It counted our days together... if nothing changed."),
    ("v7",  "vo",   ("gap", 0.30), "So we changed it."),
    ("g1",  "milo", ("gap", 1.25), "Grandma! Do you like fishing?"),
]
TAIL = 1.4   # seconds after the last line

os.makedirs("audio/lines", exist_ok=True)
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x
    a = max(0, idx[0] - int(0.02 * SR)); b = min(len(x), idx[-1] + int(0.06 * SR))
    return x[a:b]


def pitch_shift(path, factor):
    if abs(factor - 1) < 1e-3: return
    tmp = path + ".tmp.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-af",
                    f"asetrate={int(SR*factor)},aresample={SR},atempo={1/factor:.5f}", tmp], check=True)
    os.replace(tmp, path)


clips, t = [], 0.0
for lid, spk, (mode, val), text in LINES:
    v = VOICES[spk]
    s, sr = k.create(text.replace("LIFE", "life").replace("THAT", "that").replace("WAS", "was").replace("YOU", "you").replace("VERY", "very"),
                     voice=v["voice"], speed=v["speed"], lang="en-us")
    s = trim(np.asarray(s, dtype=np.float32))
    p = f"audio/lines/{lid}.wav"; sf.write(p, s, SR); pitch_shift(p, v["pitch"])
    s, _ = sf.read(p, dtype="float32"); s = s / (np.abs(s).max() + 1e-6) * (0.72 if spk == "vo" else 0.85)
    start = val if mode == "at" else t + val
    t = start + len(s) / SR
    clips.append((lid, spk, start, text, s))

DUR = round(t + TAIL, 2)
mix = np.zeros(int(DUR * SR) + SR, dtype=np.float32)
out = []
for lid, spk, start, text, s in clips:
    a = int(start * SR); mix[a:a + len(s)] += s; dur = len(s) / SR
    hop = SR // FPS; nfr = int(np.ceil(len(s) / hop)); open_, cen_ = [], []
    for i in range(nfr):
        seg = s[i * hop:(i + 1) * hop + hop // 2]
        if len(seg) < 16: open_.append(0); cen_.append(0); continue
        open_.append(float(np.sqrt(np.mean(seg ** 2))))
        spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))); fr = np.fft.rfftfreq(len(seg), 1 / SR)
        band = (fr > 150) & (fr < 5000); cen_.append(float((spec[band] * fr[band]).sum() / (spec[band].sum() + 1e-9)))
    o = np.array(open_); o = o / (np.percentile(o, 95) + 1e-9); o = np.clip((o - 0.08) / 0.92, 0, 1) ** 0.8
    r = np.clip((1800 - np.array(cen_)) / 900, 0, 1) * (o > 0.15)
    ker = np.array([0.25, 0.5, 0.25]); o = np.convolve(o, ker, "same"); r = np.convolve(r, ker, "same")
    out.append(dict(id=lid, speaker=spk, start=round(start, 3), end=round(start + dur, 3), text=text,
                    mouthOpen=[round(float(x), 3) for x in o], mouthRound=[round(float(x), 3) for x in r]))
    print(f"{lid:4s} {spk:5s} {start:6.2f}-{start+dur:6.2f}  {text}")
mix = mix[:int(DUR * SR)]
sf.write("audio/dialogue.wav", mix, SR)
json.dump(dict(fps=FPS, duration=DUR, lines=out), open("timeline.json", "w"))
print("DURATION", DUR)
