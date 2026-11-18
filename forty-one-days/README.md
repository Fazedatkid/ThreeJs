# 41 Days — a 60-second animated short (9:16)

**"What if you could see how many days you had left with everyone you love?"**

On his 14th birthday, Milo suddenly sees a glowing number over everyone he loves. Mom: 15,302.
His best friend: 22,870. Dad: **41**. He spends every day saying *yes* to his dad: helmet at breakfast,
fishing, terrible dad jokes. But Dad is acting weird too. On the last night, at 11:58 PM, they both
confess: Dad could see a number over *Milo's* head as well. Each thought he was losing the other.
At midnight the numbers drop to 0… then spin up to **16,436**. The number never counted down to goodbye.
It counted the days they'd actually spend together, if nothing changed. *So they changed it.*
Final beat: Grandma's photo on the fridge says **9**. Part 2?

**Output:** `out/41_days.mp4` (1080×1920, 30 fps, H.264 + AAC, burned-in captions, about 60 s).

Everything is original and generated from code: characters, sets, animation, voices (open-weight
TTS), music and sound effects.

| Time | Scene |
|------|-------|
| 0–4.7s | Birthday candles. A golden **41** appears over Dad. |
| 4.7–8.7s | Mom 15,302 · best friend (video call) 22,870 · Dad 41 (snap zoom). |
| 8.7–15.8s | Operation: Keep Dad Alive. Helmet at breakfast, bubble-wrapped arm, bacon confiscated. |
| 15.8–24.1s | Lake dock, golden hour. Milo catches a boot, laughs way too hard at a dad joke. 30 → 19 → 12. |
| 24.1–29.3s | Dad tears up his work-trip ticket. A hug that lasts way too long. **3**. |
| 29.3–36.8s | Day 41, 11:58 PM. "There's a number. Over your head." Milo has a **1** too. |
| 36.8–40.5s | Dad's side of the story (desaturated flashback): "Later, Dad." *Slam.* 41 → 40 → 39… |
| 40.5–50.4s | "I thought I was losing YOU." Midnight: 1 → 0 → slot-machine spin → **16,436**. Bubble wrap callback. |
| 50.4–56.6s | Sunrise on the dock. "It was never counting down to goodbye… So we changed it." |
| 56.6–60.4s | Grandma's photo: **9**. Milo grabs the helmet: "Grandma! Do you like fishing?" PART 2? |

## How it is made

* **3D / animation**: `scene/` is a Three.js scene rendered headless (Chromium + SwiftShader) frame by frame.
  * `lib/human.js`: one configurable, rigged cartoon human (expressive face: eyes, lids, brows,
    lip-sync mouth; curly / receding / bun hair, beard, glasses, hoodie, headphones; arm posing by
    Euler angles or by aim vectors) plus presets for Milo, Dad and Mom.
  * `lib/sets.js`: kitchen (window sky per time of day, working wall clock, fridge with Grandma's
    photo, hallway + bedroom door), lake dock (sky dome, rippling water, hills, trees), and the glowing
    gold `Counter` (canvas-text sprite, heartbeat pulse, orbiting sparkles, cold-blue "0" state, burst).
  * `lib/props.js`: cake with "14" candles, flames and smoke, helmet, bubble-wrap sleeve, bacon,
    toast, mugs with steam, tablet video call, fishing rods/lines, boot, torn boarding pass.
  * `main.js`: 35 camera shots, per-scene performance tracks, lighting presets (evening, morning,
    night, golden hour, sunrise), lip-sync from the audio timeline.
* **Voices**: `gen_audio.py` uses [Kokoro-82M](https://github.com/thewh1teagle/kokoro-onnx) (Apache-2.0)
  offline TTS, lays the lines out on the timeline and extracts per-frame mouth curves into `timeline.json`.
* **Music + SFX**: `music.py` synthesizes an original score with numpy (music-box lullaby cut by a
  record scratch, pizzicato comedy, fingerpicked guitar, uneasy piano, ticking-clock silence,
  muffled flashback piano, the big strings/choir/piano swell, ukulele resolution) and every sound effect.
* **Mix**: `mix.py` ducks music under dialogue; loudness normalized to about -14 LUFS.
* **Captions**: `subs.py` writes `subs.ass` (word-chunked, speaker-coloured, key words in gold,
  plus top-of-screen story captions), burned in by ffmpeg in `assemble.sh` (which also grades the flashback).

## Rebuild

```bash
pip install kokoro-onnx soundfile scipy numpy pillow
npm install
# models: kokoro-v1.0.onnx + voices-v1.0.bin from the kokoro-onnx GitHub release (model-files-v1.0) -> models/
python3 gen_audio.py && python3 music.py && python3 mix.py
ffmpeg -i audio/mix_pre.wav -af loudnorm=I=-14:TP=-1:LRA=11 -ar 44100 audio/mix.wav
python3 subs.py
PORT=8124 node server.js &          # static server
node render.js 0 906 & node render.js 906 1811   # -> frames/*.jpg (resumable, can run in parallel)
./assemble.sh                        # -> out/41_days.mp4
```
`node snap.js 3.5 10 ...` renders individual times to `snaps/` for quick checks.

## Credits

* Font: Fredoka (SIL Open Font License 1.1), via @fontsource/fredoka; `fonts/FredokaSub.ttf` is a renamed copy for libass.
* TTS model: Kokoro-82M (Apache-2.0).
