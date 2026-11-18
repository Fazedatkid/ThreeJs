"""Mix dialogue + music (ducked under speech) + sfx -> audio/mix.wav"""
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import uniform_filter1d
SR = 44100
d, sr = sf.read('audio/dialogue.wav', dtype='float64'); assert sr == 24000
d = resample_poly(d, 147, 80)
m, _ = sf.read('audio/music.wav'); s, _ = sf.read('audio/sfx.wav')
N = min(len(m), len(s)); d = np.pad(d, (0, max(0, N - len(d))))[:N]
# speech envelope -> ducking gain for music
e = uniform_filter1d(np.abs(d), int(0.08 * SR))
e = uniform_filter1d((e > 0.02).astype(float), int(0.25 * SR))
duck = 1 - 0.55 * np.clip(e * 1.5, 0, 1)
D = np.stack([d, d], 1) * 0.9
out = D + m[:N] * 0.32 * duck[:, None] + s[:N] * 0.42
out /= np.abs(out).max() / 0.95
sf.write('audio/mix_pre.wav', out.astype(np.float32), SR)
for a, b in [(0, 5), (5, 15), (15, 28), (28, 42), (42, 55)]:
    seg = out[int(a * SR):int(b * SR)]; print(f'{a:2d}-{b:2d}s rms {20*np.log10(np.sqrt((seg**2).mean())+1e-9):6.1f} dB')
