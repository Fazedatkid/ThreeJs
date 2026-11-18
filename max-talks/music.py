"""Original procedural score + sound effects for 'Max Talks' (55s). Everything is synthesized
from scratch with numpy: no samples, no existing music. Writes audio/music.wav and audio/sfx.wav."""
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
DUR = 55.0
N = int(DUR * SR)
rng = np.random.default_rng(7)
music = np.zeros((N, 2)); sfx = np.zeros((N, 2))
NOTE = {'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6, 'E': -5, 'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1, 'A': 0, 'A#': 1, 'Bb': 1, 'B': 2}


def hz(n):
    if isinstance(n, (int, float)): return n
    name, octv = (n[:-1], int(n[-1]))
    return 440 * 2 ** ((NOTE[name] + (octv - 4) * 12) / 12)


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)


def bp(x, f1, f2, order=2):
    return sosfilt(butter(order, [f1 / (SR / 2), min(f2, SR / 2 - 100) / (SR / 2)], 'band', output='sos'), x)


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, hold=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    dec = s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4))
    e = np.where(t < a, e, dec)
    if hold is not None:
        rel = np.clip((t - hold) / r, 0, 1); e = e * (1 - rel)
    return e


def put(buf, t, x, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(x) <= 0: return
    x = x[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(x), 0] += x * gain * l * 1.41
    buf[i:i + len(x), 1] += x * gain * r * 1.41


# ---------------- instruments
def pluck(f, dur=0.6, bright=0.6, decay=0.996):
    f = hz(f); n = int(dur * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p); buf = lp(buf, 1000 + bright * 7000)
    out = np.zeros(n); idx = 0
    b = buf.copy()
    for i in range(n):
        v = b[idx]; nxt = b[(idx + 1) % p]
        out[i] = v; b[idx] = decay * 0.5 * (v + nxt); idx = (idx + 1) % p
    return out * env(n, 0.001, dur * 2, r=0.05, hold=dur - 0.05)


def marimba(f, dur=0.5):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 6) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 50)
    return x * env(n, 0.002, 10)


def saw(f, t):
    ph = (f * t) % 1.0
    return 2 * ph - 1


def brass(f, dur=0.4, cutoff=2500, det=0.004):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    x = sum(saw(f * (1 + d), t) for d in (-det, 0, det)) / 3
    e = env(n, 0.03, 0.25, 0.7, 0.08, hold=dur - 0.08)
    x = lp(x * e, cutoff) * (0.6 + 0.4 * e)
    return x


def strings(f, dur, trem=0.0):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    x = sum(saw(f * (1 + d) * (1 + 0.003 * np.sin(2 * np.pi * 5.5 * t + k)), t) for k, d in enumerate((-0.006, -0.002, 0.003, 0.007))) / 4
    x = lp(x, 2200)
    e = env(n, 0.15, 1, 1, 0.2, hold=dur - 0.2)
    if trem: e = e * (0.55 + 0.45 * np.sin(2 * np.pi * trem * t))
    return x * e


def bass(f, dur=0.3):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.15 * saw(f, t)
    return lp(x, 900) * env(n, 0.004, 0.35, 0.3, 0.04, hold=dur - 0.04)


def whistle(f, dur=0.25, slide=0):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    fr = f * (1 + slide * t / dur) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    x = np.sin(ph) + 0.08 * rng.normal(0, 1, n) * 0.3
    return x * env(n, 0.02, 1, 1, 0.04, hold=dur - 0.04)


def kick(g=1.0):
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12) * g


def snare(dur=0.18, f1=1200, f2=8000):
    n = int(dur * SR); t = np.arange(n) / SR
    return bp(rng.normal(0, 1, n), f1, f2) * np.exp(-t * 22) + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)


def hat(dur=0.05):
    n = int(dur * SR); return hp(rng.normal(0, 1, n), 7000) * np.exp(-np.arange(n) / SR * 80)


def snap():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return bp(rng.normal(0, 1, n), 1800, 5000, 3) * np.exp(-t * 70) * 1.5


def woodblock(f=900):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.7 * t)) * np.exp(-t * 45)


def timpani(f, dur=1.2):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 4) + 0.3 * lp(rng.normal(0, 1, n), 400) * np.exp(-t * 18)
    return x * np.exp(-t * 2.5)


def bell(f, dur=1.6):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    parts = [(1, 1, 2.5), (2.76, 0.5, 4), (5.4, 0.25, 7), (8.9, 0.12, 10)]
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in parts) * env(n, 0.001, 10)


def chord(fn, notes, t0, dur, gain, pan=0.0, buf=None, **kw):
    for i, n_ in enumerate(notes):
        put(buf if buf is not None else music, t0, fn(n_, dur, **kw), gain / len(notes) ** 0.5, pan + (i - len(notes) / 2) * 0.12)


B = 0.5  # beat (120 bpm)

# ===================== SCORE =====================
# --- S1a: TV news jingle (0 - 2.9), filtered like a TV speaker
tv = np.zeros((N, 2)); keep = music; music = tv
for t0, ch in [(0.05, ['C4', 'E4', 'G4', 'C5']), (0.3, ['C4', 'E4', 'G4', 'C5']), (0.55, ['F4', 'A4', 'C5', 'F5']), (0.8, ['G4', 'B4', 'D5', 'G5'])]:
    chord(brass, ch, t0, 0.22 if t0 < 0.8 else 0.9, 0.5, cutoff=3500)
put(music, 0.05, timpani('C2', 1.0), 0.5)
for k in range(int(1.0 / 0.25), int(2.9 / 0.25)):
    put(music, k * 0.25, woodblock(1400 if k % 4 == 0 else 1000), 0.18)
chord(strings, ['C3', 'G3'], 1.0, 1.9, 0.25)
tv[:, 0] = bp(tv[:, 0], 250, 5000); tv[:, 1] = bp(tv[:, 1], 250, 5000)
music = keep; music += tv * 0.9

# --- S1b: "We need to talk" tension (3.0 - 5.0): low suspicious cello
put(music, 3.05, strings('D2', 1.9), 0.25)
put(music, 4.55, pluck('D3', 0.4, 0.3), 0.3)

# --- S2: bouncy comedic theme in F (5.0 - 13.6)
prog = [('F', 'F2', 'C3'), ('Bb', 'Bb1', 'F2'), ('C', 'C2', 'G2'), ('F', 'F2', 'C3'), ('Dm', 'D2', 'A2')]
mel = [['A4', None, 'C5', None, 'A4', 'F4', 'G4', 'A4'], ['Bb4', None, 'D5', None, 'Bb4', 'G4', 'A4', 'Bb4'],
       ['C5', None, 'E5', None, 'G5', None, 'E5', 'C5'], ['F5', None, 'C5', None, 'A4', None, 'F4', None],
       ['D5', None, 'F5', 'E5', 'D5', None, 'A4', None]]
t0 = 5.6
for bar in range(4):
    bt = t0 + bar * 4 * B
    name, r, fifth = prog[bar % 5]
    put(music, bt, pluck(r, 0.45, 0.4), 0.55, -0.1); put(music, bt + B, pluck(fifth, 0.3, 0.4), 0.35, -0.1)
    put(music, bt + 2 * B, pluck(r, 0.45, 0.4), 0.5, -0.1); put(music, bt + 3.5 * B, pluck(fifth, 0.2, 0.4), 0.35, -0.1)
    for i in range(4): put(music, bt + i * B, kick(0.5 if i % 2 == 0 else 0.0), 0.5)
    for i in (1, 3): put(music, bt + i * B, snap(), 0.22, 0.3)
    for i in range(8): put(music, bt + i * B / 2, hat(), 0.08 + (i % 2) * 0.04, 0.4)
    for i, n_ in enumerate(mel[bar % 5]):
        if n_ and not (bar == 3 and bt + i * B / 2 > 13.0): put(music, bt + i * B / 2, marimba(n_, 0.45), 0.32, 0.25)
# the 'every. single. day.' paw taps get a xylophone hit each
for k, n_ in zip([8.42, 8.86, 9.3], ['C5', 'E5', 'G5']): put(music, k, marimba(n_, 0.6), 0.45, 0.0)
# deadpan 'cardboard's sad cousin' -> music thins, sad descending pluck (13.75 eye roll)
for i, n_ in enumerate(['A3', 'Ab3', 'G3', 'F#3']): put(music, 13.75 + i * 0.28, pluck(n_, 0.5 if i < 3 else 1.2, 0.2), 0.45)

# --- S3: sneaky spy pizzicato in D minor (15.0 - 23.7)
walk = ['D2', 'F2', 'A2', 'Bb2', 'A2', 'F2', 'E2', 'C#2']
t = 15.0
while t < 23.65:
    if 21.2 <= t < 21.85: t += B; continue
    i = int(round((t - 15.0) / B))
    put(music, t, pluck(walk[i % 8], 0.3, 0.25, 0.992), 0.55, -0.15)
    if i % 2 == 1: put(music, t, snap(), 0.28, 0.35)
    if i % 4 == 0: put(music, t + B * 0.5, marimba(['D5', 'F5', 'A4', 'E5'][(i // 4) % 4], 0.25), 0.18, 0.3)
    t += B
put(music, 16.95, bell('A5', 1.5), 0.25, 0.3); put(music, 17.05, bell('D6', 1.5), 0.2, -0.3)  # slipper reveal sparkle
chord(brass, ['D4', 'F4', 'A4', 'D5'], 19.95, 0.35, 0.45)  # 'You blamed the CAT!' stab
# triumphant (silly) fanfare on the slipper throne 23.7 - 28
fan = [(23.75, ['D4', 'F#4', 'A4'], 0.22), (24.0, ['D4', 'F#4', 'A4'], 0.22), (24.25, ['D4', 'F#4', 'A4'], 0.22), (24.5, ['G4', 'B4', 'D5'], 0.5),
       (25.1, ['A4', 'C#5', 'E5'], 0.5), (25.75, ['D4', 'F#4', 'A4', 'D5'], 1.9)]
for tt, ch, d in fan: chord(brass, ch, tt, d, 0.42, cutoff=3200)
put(music, 23.75, timpani('D2', 1.0), 0.45); put(music, 25.75, timpani('D2', 2.0), 0.55)
for k in range(10): put(music, 26.0 + k * 0.17, snare(0.1), 0.06 + k * 0.01, 0.2)

# --- S4: funky 'boss' groove (28.0 - 37.6)
riff = ['E2', None, 'E2', 'G2', None, 'A2', None, 'B2']
t = 28.0
while t < 37.55:
    bar_t = (t - 28.0) % (4 * B)
    i = int(round((t - 28.0) / (B / 2)))
    n_ = riff[i % 8]
    if n_: put(music, t, bass(n_, 0.2), 0.6, -0.05)
    if i % 2 == 0: put(music, t, kick(0.8), 0.5)
    if i % 4 == 2: put(music, t, snare(), 0.25, 0.1)
    put(music, t, hat(0.03), 0.07, 0.4)
    t += B / 2
chord(brass, ['E4', 'B4', 'E5'], 28.65, 0.5, 0.4)  # sunglasses 'cool' stab
for k in [28.0 + i * 2.0 for i in range(5)]: chord(strings, ['E3', 'G3', 'B3', 'D4'], k, 1.9, 0.12)

# --- S4b: 40.2 - 42 awkward silence: crickets (sfx section below)
# --- S5: gentle ukulele (42.0 - 45.0)
uk = [['C4', 'E4', 'G4', 'C5'], ['G3', 'D4', 'G4', 'B4'], ['A3', 'E4', 'A4', 'C5']]
for bar in range(3):
    bt = 42.1 + bar * 1.0
    if bt > 44.95: break
    for k, tt in enumerate([0, 0.25, 0.5, 0.75]):
        if bt + tt < 44.95:
            for j, n_ in enumerate(uk[bar % 3]): put(music, bt + tt + j * 0.012, pluck(n_, 0.4, 0.7, 0.994), 0.12 if k % 2 else 0.17, -0.2 + j * 0.13)
put(music, 44.25, bell('E6', 1.0), 0.15)  # "Great!" sparkle
put(music, 45.05, pluck('B3', 1.3, 0.3, 0.998), 0.35)  # 'actually...' hanging note
# tension build 46.35 - 48.35
for k, n_ in enumerate(['C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3']):
    chord(strings, [n_, hz(n_) * 1.5], 46.4 + k * 0.245, 0.3, 0.12 + k * 0.03, trem=12)
for k in range(24): put(music, 46.4 + k * 0.08, snare(0.08), 0.03 + k * 0.006, -0.2)
# DUN DUN DUNNN
for tt, d in [(48.35, 0.22), (48.62, 0.22), (48.9, 1.3)]:
    chord(brass, ['C3', 'Eb3', 'Gb3', 'C4'], tt, d, 0.65, cutoff=1800)
    put(music, tt, timpani('C2', 1.4 if d > 1 else 0.5), 0.8)
put(music, 49.05, strings('C2', 1.25), 0.3)

# --- S5 ending: carefree whistle walk-off (50.4 - 55)
wm = [('E5', .25), ('G5', .25), ('A5', .5), ('G5', .25), ('E5', .25), ('C5', .5), ('D5', .25), ('E5', .25), ('D5', .25), ('C5', .25), ('A4', .5), ('G4', .5),
      ('C5', .25), ('E5', .25), ('G5', .5), ('A5', .25), ('G5', .25), ('E5', .5)]
t = 50.45
for n_, d in wm:
    if t > 54.3: break
    put(music, t, whistle(n_, d * 0.95), 0.2, 0.15); t += d
bl = ['C2', 'G2', 'A2', 'E2', 'F2', 'C2', 'G2', 'G2']
for i in range(8):
    tt = 50.45 + i * B
    if tt > 54.3: break
    put(music, tt, pluck(bl[i], 0.35, 0.3), 0.45, -0.1)
    put(music, tt + B / 2, pluck(['E3', 'G3'][i % 2], 0.2, 0.6), 0.15, 0.2)
    put(music, tt, kick(0.4 if i % 2 == 0 else 0), 0.4); put(music, tt + B / 2, hat(), 0.08, 0.4)
# final button: shocked 'ta-da' + cymbal
chord(brass, ['C4', 'E4', 'G4', 'C5'], 54.45, 0.5, 0.45)
put(music, 54.45, timpani('C2', 0.55), 0.6)
n = int(0.6 * SR); put(music, 54.45, hp(rng.normal(0, 1, n), 5000) * np.exp(-np.arange(n) / SR * 6), 0.12)

# ===================== SFX =====================
def scratch(t0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 500 + 1600 * np.abs(np.sin(2 * np.pi * 3.3 * t)) * np.exp(-t * 2)
    x = bp(rng.normal(0, 1, n), 300, 4000) * 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR)
    put(sfx, t0, x * env(n, 0.005, 0.3, 0.2, 0.1, hold=0.35), 0.35)


def whoosh(t0, dur=0.45, g=0.3, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.normal(0, 1, n); e = np.sin(np.pi * t / dur) ** 2
    lo = lp(x, 900); hi = lp(x, 4000)
    mixk = t / dur if up else 1 - t / dur
    put(sfx, t0, (lo * (1 - mixk) + hi * mixk) * e, g)


scratch(2.92); scratch(37.58)
# spit-take spray
n = int(0.5 * SR); put(sfx, 5.1, bp(rng.normal(0, 1, n), 600, 6000) * np.exp(-np.arange(n) / SR * 7), 0.35, 0.1)
# mug clink-ish
put(sfx, 5.08, bell('C7', 0.4), 0.05)
# paw taps
for k in [8.42, 8.86, 9.3]: put(sfx, k, woodblock(420), 0.4)
whoosh(16.9, 0.5, 0.18); whoosh(23.65, 0.4, 0.15)
# cat hiss
n = int(0.6 * SR); tt = np.arange(n) / SR
hiss = hp(rng.normal(0, 1, n), 2500) * np.minimum(1, tt / 0.04) * np.exp(-np.maximum(0, tt - 0.35) * 10)
growl = lp(saw(70 + 10 * np.sin(2 * np.pi * 23 * tt), tt), 500) * 0.4 * np.exp(-tt * 3)
put(sfx, 21.28, hiss * 0.55 + growl * 0.3, 0.6, -0.1)
# sunglasses whoosh + glint ding
whoosh(28.45, 0.25, 0.25, up=False); put(sfx, 28.66, bell('E7', 0.6), 0.08, 0.2)
# demand dings (bell + coin)
for k, n_ in zip([29.95, 32.05, 34.65], ['C6', 'E6', 'G6']):
    put(sfx, k, bell(n_, 1.0), 0.22); put(sfx, k + 0.06, bell(hz(n_) * 2, 0.6), 0.08)
    whoosh(k - 0.12, 0.2, 0.1)
# owner stands up: couch creak (low noise)
n = int(0.3 * SR); put(sfx, 37.7, lp(rng.normal(0, 1, n), 300) * np.exp(-np.arange(n) / SR * 8), 0.25)
# crickets in the awkward silence
for k in range(9):
    tt0 = 40.35 + k * 0.19 + (0.35 if k >= 3 else 0) + (0.35 if k >= 6 else 0)
    if tt0 > 41.95: break
    n = int(0.05 * SR); tc = np.arange(n) / SR
    put(sfx, tt0, np.sin(2 * np.pi * 4600 * tc) * (0.5 + 0.5 * np.sin(2 * np.pi * 60 * tc)) * np.exp(-tc * 30), 0.05, 0.4)
# handshake swish
whoosh(43.35, 0.3, 0.12)
# whip pan
whoosh(46.95, 0.6, 0.35)
# zoom on WHAT
n = int(1.0 * SR); tz = np.arange(n) / SR
put(sfx, 48.95, np.sin(2 * np.pi * np.cumsum(120 + 500 * tz) / SR) * np.exp(-tz * 2) * 0.4 + lp(rng.normal(0, 1, n), 2000) * np.exp(-tz * 3) * 0.3, 0.35)
# paw steps during walk-off
for k in range(16):
    tt0 = 51.05 + k * 0.21
    if tt0 > 54.4: break
    n = int(0.05 * SR); put(sfx, tt0, lp(rng.normal(0, 1, n), 700) * np.exp(-np.arange(n) / SR * 60), 0.12 * (1 - k / 22), 0.2)
# doggy-door flap
for k, g in [(54.05, 0.35), (54.25, 0.2), (54.42, 0.1)]: put(sfx, k, woodblock(260) + lp(rng.normal(0, 1, int(0.12 * SR)), 900) * np.exp(-np.arange(int(0.12 * SR)) / SR * 40), g, 0.5)
# subtle room tone
music += np.stack([lp(rng.normal(0, 1, N), 300), lp(rng.normal(0, 1, N), 300)], 1) * 0.004

for name, buf in [('music', music), ('sfx', sfx)]:
    buf = buf / (np.abs(buf).max() + 1e-9) * 0.9
    sf.write(f'audio/{name}.wav', buf.astype(np.float32), SR)
print('wrote audio/music.wav audio/sfx.wav')
