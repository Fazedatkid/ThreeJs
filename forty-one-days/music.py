"""Original procedural score + sound effects for "41 Days". Everything is synthesized from scratch
with numpy (no samples, no existing music). Writes audio/music.wav and audio/sfx.wav."""
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

SR = 44100
import json
TL = json.load(open("timeline.json")); LN = {l["id"]: l for l in TL["lines"]}
DUR = TL["duration"]
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




from scipy.signal import fftconvolve


def mixs(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o

# ---------------- extra instruments
def piano(f, dur=1.6, vel=1.0):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for k, a in [(1, 1.0), (2, 0.45), (3, 0.22), (4, 0.12), (5, 0.06), (6, 0.03)]:
        fk = f * k * (1 + 0.0004 * k * k)
        x += a * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1.2 + k * 0.9) * (1 + f / 900))
    x += 0.15 * lp(rng.normal(0, 1, n), 3000) * np.exp(-t * 60)          # hammer
    return x * env(n, 0.002, 10, r=0.12, hold=dur - 0.12) * vel


def musicbox(f, dur=1.2):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.35 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 9) + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 16)) * env(n, 0.001, 10)


def choir(f, dur, vowel=(700, 1150)):
    f = hz(f); n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t)
    x = sum(saw(f * (1 + d) * vib, t) for d in (-0.008, 0, 0.007)) / 3
    y = bp(x, vowel[0] * 0.8, vowel[0] * 1.25) + 0.7 * bp(x, vowel[1] * 0.85, vowel[1] * 1.2) + 0.25 * lp(x, 400)
    return y * env(n, 0.5, 1, 1, 0.6, hold=dur - 0.6)


def shaker():
    n = int(0.09 * SR); t = np.arange(n) / SR
    return hp(rng.normal(0, 1, n), 5000) * np.sin(np.pi * t / 0.09) ** 2


def tick(g=1.0, f=3200):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (bp(rng.normal(0, 1, n), f * 0.6, f * 1.6) + 0.5 * np.sin(2 * np.pi * f * t)) * np.exp(-t * 180) * g


def shimmer(t0, g=0.2, base='C6'):
    for i, nn in enumerate(['C6', 'E6', 'G6', 'C7', 'E7']):
        put(sfx, t0 + i * 0.045, bell(hz(nn) * hz(base) / hz('C6'), 1.2), g * (1 - i * 0.12), (-1) ** i * 0.4)


def boom(t0, g=0.5):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t * 8)
    put(sfx, t0, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) + 0.3 * lp(rng.normal(0, 1, n), 200) * np.exp(-t * 5), g)


def noise_burst(t0, dur, f1, f2, g, decay=10, pan=0.0):
    n = int(dur * SR); t = np.arange(n) / SR
    put(sfx, t0, bp(rng.normal(0, 1, n), f1, f2) * np.exp(-t * decay), g, pan)


L = LN
s2, s3 = 4.69, 8.7
s4, s5, s6 = L['v4']['start'] - 0.2, L['v5']['start'] - 0.25, L['n1']['start'] - 0.8
s7, s8, s9 = L['x1']['start'] - 0.15, L['x3']['start'] - 0.25, L['x4']['end'] + 0.3
mid = s9 + 0.75; zero = mid + 0.35; spin = zero + 0.45; land = L['c1']['start'] - 0.42
s10, s11, END = L['c2']['end'] + 0.2, L['v7']['end'] + 0.15, DUR
print('cues', dict(s4=s4, s5=s5, s6=s6, s7=s7, s8=s8, s9=s9, land=land, s10=s10, s11=s11))

# ===================== SCORE =====================
# S1: music-box birthday lullaby (original), cut by a record scratch when the number appears
mb = ['E5', 'G5', 'C6', 'B5', 'G5', 'A5', 'G5', 'E5']
for i, nn in enumerate(mb):
    if i * 0.19 < 1.35: put(music, 0.05 + i * 0.19, musicbox(nn), 0.35, 0.2)
put(music, 0.05, musicbox('C4', 1.4), 0.25, -0.2); put(music, 0.81, musicbox('G4', 1.0), 0.2, -0.2)
music[int(1.45 * SR):int(1.5 * SR)] *= np.linspace(1, 0, int(0.05 * SR))[:, None]
music[int(1.5 * SR):int(1.62 * SR)] = 0
scratch(1.40)
# low suspense pad under the reveal
chord(strings, ['C3', 'Eb3', 'G3'], 1.7, s3 - 1.7 - 0.2, 0.22)
for k in np.arange(2.0, s3 - 0.3, 0.92): put(music, k, bass('C2', 0.25), 0.35); put(music, k + 0.22, bass('C2', 0.2), 0.22)
chord(strings, ['Ab3', 'C4', 'Eb4'], 7.75, 0.9, 0.3)
# S3: bouncy pizzicato comedy in F (8.7 - 15.6)
B = 0.42
bassl = ['F2', 'C3', 'F2', 'A2', 'Bb2', 'F2', 'C3', 'G2']
mel = ['A4', None, 'C5', 'A4', 'F4', None, 'G4', 'A4', 'Bb4', None, 'D5', 'Bb4', 'C5', None, 'E5', 'C5']
t, i = s3 + 0.05, 0
while t < s4 - 0.3:
    put(music, t, pluck(bassl[(i // 2) % 8], 0.3, 0.3, 0.993), 0.5, -0.15)
    if i % 2 == 1: put(music, t, snap(), 0.15, 0.35)
    if mel[i % 16]: put(music, t + B / 2, pluck(mel[i % 16], 0.25, 0.75, 0.994), 0.3, 0.25)
    if i % 4 == 0: put(music, t, woodblock(1100), 0.12, 0.3)
    t += B; i += 1
for k, nn in [(11.14, 'C5'), (11.42, 'F5')]: put(music, k, marimba(nn, 0.6), 0.4)   # "For LIFE."
# S4: warm fingerpicked guitar in G (dock)
prog = [['G2', 'D3', 'G3', 'B3'], ['D2', 'A2', 'D3', 'F#3'], ['E2', 'B2', 'E3', 'G3'], ['C2', 'G2', 'C3', 'E3']]
bt = 0.3; t = s4 + 0.05; k = 0
while t < s5 + 0.6:
    ch = prog[(k // 8) % 4]; pat = [0, 2, 1, 3, 2, 1, 3, 2]
    g = 0.42 * (1 - max(0, (t - s5) / 0.6))
    put(music, t, pluck(ch[pat[k % 8]], 0.9, 0.45, 0.997), g, (-0.2, 0.2)[k % 2])
    if k % 2 == 0: put(music, t, shaker(), 0.05 * g / 0.42, 0.4)
    t += bt; k += 1
for kk, nn in enumerate(['B4', 'D5', 'G5', 'F#5', 'D5']): put(music, s4 + 2.4 + kk * 0.6, whistle(nn, 0.5), 0.07, 0.3)
# S5: uneasy gentle piano (A minor / F)
for j, (ch, d) in enumerate([(['A2', 'E3', 'A3', 'C4'], 1.3), (['F2', 'C3', 'F3', 'A3'], 1.3), (['D3', 'F3', 'A3', 'C4'], 1.3), (['E2', 'B2', 'E3', 'G#3'], 1.6)]):
    t0 = s5 + 0.1 + j * 1.3
    for q, nn in enumerate(ch): put(music, t0 + q * 0.11, piano(nn, d + 0.6, 0.8), 0.22, -0.2 + q * 0.13)
put(music, s5 + 2.2, piano('E5', 1.2, 0.6), 0.15, 0.3); put(music, s5 + 3.5, piano('C5', 1.4, 0.6), 0.14, 0.3)
# S6: near silence, clock ticks + low cello drone + sparse piano
put(music, s6 + 0.6, strings('D2', s7 - s6 - 0.6), 0.2)
put(music, s6 + 1.6, strings('A2', s7 - s6 - 1.6), 0.12)
for t0, nn in [(L['n3']['start'] + 1.2, 'D5'), (L['n4']['start'] - 0.2, 'F5'), (L['n5']['start'] + 0.3, 'A4')]: put(music, t0, piano(nn, 2.2, 0.7), 0.2, 0.2)
# S7: muffled memory piano (lowpassed)
mem = np.zeros((N, 2)); keep = music; music = mem
for j, nn in enumerate(['A4', 'E4', 'C5', 'B4', 'A4', 'E4', 'G4', 'F4']): put(music, s7 + 0.1 + j * 0.45, piano(nn, 1.4, 0.8), 0.28, 0.1)
for j, ch in enumerate([['A2', 'E3'], ['F2', 'C3']]): chord(piano, ch, s7 + 0.1 + j * 1.8, 2.2, 0.3)
mem[:, 0] = lp(mem[:, 0], 1400); mem[:, 1] = lp(mem[:, 1], 1400)
music = keep; music += mem
# S8: piano + strings start to swell
for j, nn in enumerate(['C5', 'B4', 'A4', 'G4', 'A4']): put(music, s8 + 0.1 + j * 0.6, piano(nn, 1.6, 0.8), 0.24, 0.15)
chord(strings, ['A2', 'E3', 'C4'], s8, s9 - s8 + 0.3, 0.2)
# S9: midnight - ticks, chime, power-down, slot spin + riser, BIG swell
put(music, mid, bell('C5', 2.5), 0.35); put(music, mid, bell('G4', 2.5), 0.25)
riser_n = int((land - spin) * SR); tr = np.arange(riser_n) / SR
_rn = rng.normal(0, 1, riser_n); _u = tr / tr[-1]; riser = (lp(_rn, 600) * (1 - _u ** 2) + lp(_rn, 6600) * _u ** 2) * _u ** 1.5
put(music, spin, riser, 0.4)
sw = END - land
chord(strings, ['C3', 'G3', 'E4', 'G4', 'C5'], land, s10 - land + 0.3, 0.55)
chord(choir, ['C4', 'E4', 'G4'], land + 0.05, s10 - land, 0.35)
for q, nn in enumerate(['C2', 'C3', 'G3', 'C4', 'E4', 'G4', 'C5']): put(music, land + q * 0.03, piano(nn, 3.0, 1.0), 0.28)
put(music, land, timpani('C2', 2.0), 0.6)
for j, (ch) in enumerate([['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4']]): chord(piano, ch, land + 1.8 + j * 1.0, 1.6, 0.35)
# S10: warm ukulele + piano resolution (C major)
uk = [['C4', 'E4', 'G4', 'C5'], ['G3', 'D4', 'G4', 'B4'], ['A3', 'E4', 'A4', 'C5'], ['F3', 'C4', 'F4', 'A4']]
t = s10 + 0.05; k = 0
while t < s11 - 0.1:
    ch = uk[(k // 4) % 4]
    for q, nn in enumerate(ch): put(music, t + q * 0.012, pluck(nn, 0.5, 0.7, 0.995), 0.16 if k % 2 else 0.2, -0.1 + q * 0.07)
    t += 0.38; k += 1
melo = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'C5']
for j, nn in enumerate(melo): put(music, s10 + 0.4 + j * 0.6, piano(nn, 1.3, 0.75), 0.22, 0.2)
chord(strings, ['C3', 'G3', 'E4'], s10, s11 - s10, 0.18)
# S11: mysterious chime for Grandma's 9, then a playful button
for j, nn in enumerate(['E6', 'B5', 'G6']): put(music, s11 + 0.25 + j * 0.09, bell(nn, 2.0), 0.18, (-0.3, 0, 0.3)[j])
chord(strings, ['E3', 'B3', 'G4'], s11 + 0.2, L['g1']['start'] - s11, 0.15, trem=0)
g1e = L['g1']['end']
for j, nn in enumerate(['C5', 'E5', 'G5', 'C6']): put(music, g1e + 0.05 + j * 0.12, marimba(nn, 0.5), 0.4, 0.1)
for nn in ['C3', 'C4']: put(music, g1e + 0.55, pluck(nn, 0.9, 0.5), 0.45)
put(music, g1e + 0.55, kick(0.7), 0.5)

# ===================== SFX =====================
whoosh(0.35, 0.7, 0.28, up=False)                               # blowing out candles
noise_burst(0.95, 0.4, 200, 1200, 0.05, 6)                      # smoke
shimmer(1.45, 0.22); boom(1.47, 0.35)                            # the number appears
shimmer(5.25, 0.16, 'D6'); shimmer(6.75, 0.14, 'E6')
boom(7.75, 0.45); whoosh(7.6, 0.25, 0.2)                         # zoom on Dad's 41
put(sfx, 11.95, mixs(woodblock(300), bell('C6', 0.3) * 0.2), 0.45)   # helmet clonk
for k in np.arange(12.05, 12.9, 0.11): noise_burst(k + rng.uniform(0, 0.05), 0.03, 1500, 6000, 0.25, 120, rng.uniform(-0.5, 0.5))  # bubble wrap pops
whoosh(13.05, 0.3, 0.28)                                         # bacon snatch
tb = L['v4']['end']
nr = int(0.45 * SR); trr = np.arange(nr) / SR
put(sfx, tb - 0.85, np.sign(np.sin(2 * np.pi * np.cumsum(35 + 25 * trr) / SR)) * hp(rng.normal(0, 1, nr), 2000) * 0.5, 0.12)   # reel
noise_burst(tb - 0.62, 0.6, 300, 3000, 0.35, 5)                 # splash
n = int(0.35 * SR); tq = np.arange(n) / SR
put(sfx, tb - 0.35, lp(rng.normal(0, 1, n), 700) * (1 + np.sin(2 * np.pi * 18 * tq)) * np.exp(-tq * 9), 0.3)   # boot squelch
for k in [L['f1']['start'] - 0.05, L['f3']['start'] - 0.05]: put(sfx, k, bell('A6', 0.5), 0.12)   # number ticks down
for a, b in [(s4, s5), (s10, s11)]:                              # lake ambience
    nn = int((b - a) * SR); w = lp(rng.normal(0, 1, nn), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * np.arange(nn) / SR)) ** 2
    put(sfx, a, w, 0.06)
for k in np.arange(s10 + 0.4, s11, 1.3):                         # birds
    for q in range(3): put(sfx, k + q * 0.11 + rng.uniform(0, 0.05), whistle(rng.uniform(2600, 3600), 0.07, slide=rng.uniform(-0.3, 0.3)), 0.025, 0.5)
tear = L['v5']['start'] + 0.7
noise_burst(tear - 0.05, 0.35, 1500, 7000, 0.3, 9, 0.1)          # ticket tear
noise_burst(s5 + 2.1, 0.5, 100, 800, 0.2, 4)                     # bear hug squeeze
put(sfx, s5 + 2.25, whistle(900, 0.25, slide=-0.4), 0.05)
for k in np.arange(s6, s7, 1.0): put(sfx, k, tick(0.5, 2800 if int(k) % 2 else 3300), 0.25, 0.3)   # clock ticks
shimmer(L['n4']['start'] - 0.2, 0.14, 'A5')                      # the 1 over Milo
for j in range(4): put(sfx, s7 + 0.3 + j * 0.5, lp(rng.normal(0, 1, int(0.08 * SR)), 500) * np.exp(-np.arange(int(0.08 * SR)) / SR * 40), 0.12)   # footsteps
ds = L['x2']['start'] + 0.88
boom(ds, 0.25); noise_burst(ds, 0.25, 150, 2500, 0.4, 18)        # door slam
for k in np.arange(s9, mid, 0.5): put(sfx, k, tick(0.8, 3000), 0.35)
n = int(0.6 * SR); tz = np.arange(n) / SR                        # power-down to 0
put(sfx, zero, np.sin(2 * np.pi * np.cumsum(600 * np.exp(-tz * 4) + 60) / SR) * np.exp(-tz * 3), 0.2)
k, gap = spin, 0.11                                              # slot-machine spin
while k < land - 0.04: put(sfx, k, tick(0.9, 2400 + rng.uniform(-300, 300)), 0.3, rng.uniform(-0.3, 0.3)); k += gap; gap = max(0.035, gap * 0.9)
shimmer(land, 0.35, 'C6'); shimmer(land + 0.12, 0.25, 'G6'); boom(land, 0.4)
put(sfx, L['g1']['start'] + 0.05, woodblock(500), 0.3)          # grabs helmet
put(sfx, L['g1']['start'] + 0.35, woodblock(320), 0.35)         # helmet on
for q in range(2): put(sfx, g1e + 0.2 + q * 0.22, mixs(bell('A6', 0.5), bell('E7', 0.4) * 0.5), 0.12)   # bike bell
for j in range(6): put(sfx, g1e + 0.2 + j * 0.16, lp(rng.normal(0, 1, int(0.06 * SR)), 600) * np.exp(-np.arange(int(0.06 * SR)) / SR * 50), 0.15)   # running

# light room reverb on the music bus
ir_n = int(1.6 * SR); ir = rng.normal(0, 1, ir_n) * np.exp(-np.arange(ir_n) / SR * 3.2); ir[0] = 0; ir /= np.abs(ir).sum() / 6
for c in range(2): music[:, c] = music[:, c] + 0.22 * fftconvolve(music[:, c], ir)[:N]
for name, buf in [('music', music), ('sfx', sfx)]:
    buf /= max(1e-9, np.abs(buf).max()) / 0.9
    sf.write(f'audio/{name}.wav', buf.astype(np.float32), SR)
print('wrote audio/music.wav audio/sfx.wav')
