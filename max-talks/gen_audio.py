"""Generate all dialogue with Kokoro TTS, place it on the 55s timeline, and export
timing + per-frame mouth curves (for lip-sync) to timeline.json."""
import json, subprocess, os
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

FPS = 30
DUR = 55.0
SR = 24000
VOICES = {
    "max": dict(voice="am_puck", speed=1.08, pitch=1.10),   # pitched up a touch: cute, cheeky
    "owner": dict(voice="af_heart", speed=1.12, pitch=1.0),
    "news": dict(voice="bm_george", speed=1.28, pitch=1.0),
}
# (id, speaker, start_sec, text, subtitle text)
LINES = [
    ("news1", "news", 0.25, "Breaking news! All dogs can now speak English!", None),
    ("s1", "max", 3.05, "We need to talk about your parenting.", None),
    ("s2a", "owner", 5.15, "Max?! You can TALK?!", None),
    ("s2b", "max", 6.65, "Three years. Same brown crunchy circles. Every. Single. Day.", None),
    ("s2c", "owner", 10.75, "It's premium kibble!", None),
    ("s2d", "max", 11.95, "It tastes like cardboard's sad cousin.", None),
    ("s3a", "max", 15.25, "Also... confession time.", None),
    ("s3b", "max", 16.95, "The neighbor's missing slippers? That was me.", None),
    ("s3c", "owner", 19.95, "You blamed the CAT!", None),
    ("s3d", "max", 21.85, "The cat had motive.", None),
    ("s3e", "max", 23.75, "Forty-seven slippers. Zero regrets.", None),
    ("s4a", "max", 28.25, "Now. My demands.", None),
    ("s4b", "max", 29.95, "One: my own bedroom.", None),
    ("s4c", "max", 32.05, "Two: a phone. Unlimited data.", None),
    ("s4d", "max", 34.65, "Three: a personal chef. Something fancy.", None),
    ("s4e", "owner", 37.65, "A personal chef?! I can barely afford YOU!", None),
    ("s5a", "owner", 42.25, "Ugh... fine. Deal.", None),
    ("s5b", "max", 44.25, "Great! Actually... never mind.", None),
    ("s5c", "max", 46.45, "I already have a second family next door.", None),
    ("s5d", "owner", 49.05, "You WHAT?!", None),
    ("s5e", "max", 50.35, "They do bacon Tuesdays. Byeee!", None),
]

os.makedirs("audio/lines", exist_ok=True)
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(0.02 * SR)); b = min(len(x), idx[-1] + int(0.06 * SR))
    return x[a:b]


def pitch_shift(path, factor):
    if abs(factor - 1) < 1e-3:
        return
    tmp = path + ".tmp.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-af",
                    f"asetrate={int(SR*factor)},aresample={SR},atempo={1/factor:.5f}", tmp], check=True)
    os.replace(tmp, path)


mix = np.zeros(int(DUR * SR) + SR, dtype=np.float32)
out = []
for lid, spk, start, text, sub in LINES:
    v = VOICES[spk]
    tts_text = text.replace("TALK", "talk").replace("CAT", "cat").replace("YOU", "you").replace("WHAT", "what")
    s, sr = k.create(tts_text, voice=v["voice"], speed=v["speed"], lang="en-us")
    assert sr == SR
    s = trim(np.asarray(s, dtype=np.float32))
    p = f"audio/lines/{lid}.wav"
    sf.write(p, s, SR)
    pitch_shift(p, v["pitch"])
    s, _ = sf.read(p, dtype="float32")
    s = s / (np.abs(s).max() + 1e-6) * 0.85
    a = int(start * SR)
    mix[a:a + len(s)] += s
    dur = len(s) / SR
    # ---- lip-sync curves at FPS: openness (RMS) + roundness (low spectral centroid)
    hop = SR // FPS
    nfr = int(np.ceil(len(s) / hop))
    open_, round_ = [], []
    for i in range(nfr):
        seg = s[i * hop:(i + 1) * hop + hop // 2]
        if len(seg) < 16:
            open_.append(0); round_.append(0); continue
        rms = float(np.sqrt(np.mean(seg ** 2)))
        spec = np.abs(np.fft.rfft(seg * np.hanning(len(seg))))
        fr = np.fft.rfftfreq(len(seg), 1 / SR)
        band = (fr > 150) & (fr < 5000)
        cen = float((spec[band] * fr[band]).sum() / (spec[band].sum() + 1e-9))
        open_.append(rms)
        round_.append(cen)
    o = np.array(open_); o = o / (np.percentile(o, 95) + 1e-9)
    o = np.clip((o - 0.08) / 0.92, 0, 1) ** 0.8
    c = np.array(round_)
    r = np.clip((1800 - c) / 900, 0, 1) * (o > 0.15)
    # light smoothing
    ker = np.array([0.25, 0.5, 0.25])
    o = np.convolve(o, ker, "same"); r = np.convolve(r, ker, "same")
    out.append(dict(id=lid, speaker=spk, start=round(start, 3), end=round(start + dur, 3), text=text,
                    mouthOpen=[round(float(x), 3) for x in o], mouthRound=[round(float(x), 3) for x in r]))
    print(f"{lid:6s} {spk:6s} {start:6.2f}-{start+dur:6.2f}  ({dur:.2f}s)  {text}")

# overlap check
for i in range(1, len(out)):
    if out[i]["start"] < out[i - 1]["end"] + 0.05:
        print("!! OVERLAP", out[i - 1]["id"], out[i]["id"], out[i - 1]["end"], out[i]["start"])

mix = mix[:int(DUR * SR)]
sf.write("audio/dialogue.wav", mix, SR)
json.dump(dict(fps=FPS, duration=DUR, lines=out), open("timeline.json", "w"))
print("wrote timeline.json + audio/dialogue.wav")
