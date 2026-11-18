"""Burned-in subtitles (ASS) from timeline.json: word-chunked dialogue (speaker colors, pop-in),
plus bold top-of-screen story captions."""
import json, re
TL = json.load(open('timeline.json')); LN = {l['id']: l for l in TL['lines']}
COL = {'milo': '&H0080E6FF', 'dad': '&H00FFD9A6', 'vo': '&H00FFFFFF'}   # ASS colours are BGR
def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'
def chunks(text, maxc=22):
    words = text.split(); out = []; cur = ''
    for w in words:
        if cur and (len(cur) + 1 + len(w) > maxc or re.search(r'[.?!,]$', cur)):
            out.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    if cur: out.append(cur)
    merged = []
    for c in out:
        if merged and len(c) <= 5 and len(merged[-1]) + len(c) < maxc + 4: merged[-1] += ' ' + c
        else: merged.append(c)
    return merged
GOLD = ['41', 'forty-one', 'Forty-one', 'YES', 'yes', 'later', 'LOSING', 'YOU', 'changed', 'goodbye']
def gold(txt):
    for g in GOLD:
        txt = re.sub(rf'\b{re.escape(g)}\b', '{\\\\1c&H0022A6FF&}' + g + '{\\\\1c%COL%}', txt)
    return txt
ev = []
lines = TL['lines']
for k, L in enumerate(lines):
    cs = chunks(L['text']); tot = sum(len(c) for c in cs); t = L['start']; dur = L['end'] - L['start']
    nxt = lines[k + 1]['start'] if k + 1 < len(lines) else TL['duration']
    for i, c in enumerate(cs):
        d = dur * len(c) / tot
        end = t + d if i < len(cs) - 1 else min(nxt - 0.03, L['end'] + 0.35)
        style = 'VO' if L['speaker'] == 'vo' else 'Main'
        col = COL[L['speaker']]
        txt = gold(c.replace('...', '…')).replace('%COL%', col)
        ev.append(f"Dialogue: 1,{ts(t)},{ts(end)},{style},,0,0,0,,{{\\fad(40,60)\\fscx85\\fscy85\\t(0,90,\\fscx100\\fscy100)\\1c{col}}}{txt}")
        t += d
# top story captions (start, end, text)
s4 = LN['v4']['start'] - 0.2; s5 = LN['v5']['start'] - 0.25; s6 = LN['n1']['start'] - 0.8; s7 = LN['x1']['start'] - 0.15
s8 = LN['x3']['start'] - 0.25; s9 = LN['x4']['end'] + 0.3; s10 = LN['c2']['end'] + 0.2; s11 = LN['v7']['end'] + 0.15
land = LN['c1']['start'] - 0.42
TOP = [
    (1.5, 4.6, 'DAD: 41 DAYS LEFT'),
    (8.75, 11.0, 'DAY 2'), (11.95, 15.7, 'OPERATION: KEEP DAD ALIVE'),
    (s4 + 0.1, LN['v4']['end'] - 0.9, 'DAY 11: SAID YES'), (LN['v4']['end'] - 0.85, LN['f1']['start'] - 0.1, 'DAY 11: CAUGHT… A BOOT'),
    (LN['f3']['start'] - 0.05, s5 - 0.05, 'DAY 29: LAUGHED AT HIS JOKES'),
    (s5 + 0.1, s5 + 1.8, 'DAY 38'),
    (s6 + 0.05, LN['n3']['start'] - 0.1, 'DAY 41 · 11:58 PM'),
    (s7 + 0.05, s8 - 0.1, "DAD'S SIDE OF THE STORY…"),
    (s9 + 0.05, land - 0.1, '12:00 AM'),
    (LN['v6']['start'] + 0.1, LN['v6']['start'] + 2.4, 'It was never counting down.'),
    (s11 + 0.3, LN['g1']['start'] - 0.1, 'GRANDMA: 9'),
    (LN['g1']['end'] + 0.1, TL['duration'], 'PART 2? 👇'.replace(' 👇', '')),
]
for a, b, txt in TOP:
    ev.append(f"Dialogue: 0,{ts(a)},{ts(b)},Top,,0,0,0,,{{\\fad(120,150)\\fscx70\\fscy70\\t(0,160,\\fscx100\\fscy100)}}{txt}")
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,FredokaSub,80,&H00FFFFFF,&H00FFFFFF,&H00201014,&H96000000,0,0,0,0,100,100,1,0,1,7,4,2,70,70,420,1
Style: VO,FredokaSub,72,&H00FFFFFF,&H00FFFFFF,&H00201014,&H96000000,0,1,0,0,100,100,1,0,1,6,4,2,70,70,420,1
Style: Top,FredokaSub,70,&H0066D9FF,&H00FFFFFF,&H00141020,&HA0000000,0,0,0,0,100,100,2,0,1,7,5,8,60,60,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
open('subs.ass', 'w').write(head + '\n'.join(ev) + '\n')
print(len(ev), 'events')
