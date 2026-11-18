# Max Talks — a 55-second animated comedy short (9:16)

A cute golden retriever named Max discovers that every dog on Earth can suddenly speak English,
and he has *notes* about his owner's parenting.

**Output:** `out/max_talks.mp4` — 1080×1920, 30 fps, H.264 + AAC, burned-in subtitles.

Everything is original and generated from code: characters, set, animation, voices (open-weight
TTS), music and sound effects. No existing characters, assets, samples or music are used.

| Time | Scene |
|------|-------|
| 0–5s | TV: "Breaking news! All dogs can now speak English!" Max turns: *"We need to talk about your parenting."* |
| 5–15s | Spit-take. Max complains about three years of the same "brown crunchy circles". |
| 15–28s | Confession: the neighbor's missing slippers — 47 of them — and he blamed the cat. |
| 28–42s | Sunglasses on. Demands: own bedroom, a phone with unlimited data, a personal chef. |
| 42–55s | Owner gives in… but Max already has a second family next door. Owner frozen in shock; Max strolls out the doggy door. |

## How it is made

* **3D / animation** — `scene/` is a Three.js scene rendered headless (Chromium + SwiftShader) frame-by-frame.
  * `lib/fur.js` — shell-textured fur (instanced shells + procedural strands, per-vertex lit for speed).
  * `lib/max.js`, `lib/owner.js`, `lib/cat.js` — procedural, rigged characters with expressive faces
    (eyes, lids, brows, jaw/lips) and sit/stand/walk poses.
  * `lib/room.js` — cozy living room, sunset window, neighbor's house, props, demand icons.
  * `main.js` — 21 camera shots, character performance tracks, colored mood lighting, lip-sync.
* **Voices** — `gen_audio.py` uses [Kokoro-82M](https://github.com/thewh1teagle/kokoro-onnx) (Apache-2.0)
  offline TTS, places every line on the timeline and extracts per-frame mouth open/round curves
  for lip-sync into `timeline.json`.
* **Music + SFX** — `music.py` synthesizes an original score (news sting, bouncy pizzicato theme,
  sneaky spy walk, silly fanfare, boss groove, ukulele, dramatic sting, whistled walk-off) and all
  sound effects with numpy.
* **Mix** — `mix.py` ducks music under dialogue; loudness normalized to about -14 LUFS.
* **Subtitles** — `subs.py` writes `subs.ass` (speaker-colored, pop-in), burned in by ffmpeg.

## Rebuild

```bash
pip install kokoro-onnx soundfile scipy numpy pillow fonttools brotli
npm install
# models: kokoro-v1.0.onnx + voices-v1.0.bin from the kokoro-onnx GitHub release -> models/
python3 gen_audio.py && python3 music.py && python3 mix.py
ffmpeg -i audio/mix_pre.wav -af loudnorm=I=-14:TP=-1:LRA=11 -ar 44100 audio/mix.wav
python3 subs.py
node server.js &            # static server on :8123
node render.js              # -> frames/*.jpg  (preview: http://localhost:8123/scene/index.html?w=540&h=960&play)
./assemble.sh               # -> out/max_talks.mp4
```

## Credits

* Font: Fredoka (SIL Open Font License 1.1), via @fontsource/fredoka; `fonts/FredokaSub.ttf` is a renamed copy for libass.
* TTS model: Kokoro-82M (Apache-2.0).
