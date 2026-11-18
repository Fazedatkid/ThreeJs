"""Build burned-in subtitles (ASS) from timeline.json: short chunks, speaker colors, pop-in."""
import json, re
TL = json.load(open('timeline.json'))
COL = {'max': '&H0066D1FF', 'owner': '&H00FFFFFF', 'news': '&H00FFE9B8'}
def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'
def chunks(text, maxc=24):
    words = text.split(); out = []; cur = ''
    for w in words:
        if cur and (len(cur) + 1 + len(w) > maxc or re.search(r'[.?!:]$', cur)):
            out.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    if cur: out.append(cur)
    # merge tiny fragments
    merged = []
    for c in out:
        if merged and len(c) <= 6 and len(merged[-1]) + len(c) < maxc + 6: merged[-1] += ' ' + c
        else: merged.append(c)
    return merged
events = []
lines = TL['lines']
for k, L in enumerate(lines):
    cs = chunks(L['text']); tot = sum(len(c) for c in cs)
    t = L['start']; dur = L['end'] - L['start']
    nxt = lines[k + 1]['start'] if k + 1 < len(lines) else 55
    for i, c in enumerate(cs):
        d = dur * len(c) / tot
        end = t + d if i < len(cs) - 1 else min(nxt - 0.03, L['end'] + 0.35)
        style = 'TV' if L['speaker'] == 'news' else 'Main'
        txt = c.replace('...', '…')
        events.append(f"Dialogue: 0,{ts(t)},{ts(end)},{style},,0,0,0,,{{\\fad(40,60)\\fscx82\\fscy82\\t(0,90,\\fscx100\\fscy100)\\1c{COL[L['speaker']]}}}{txt}")
        t += d
head = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Main,FredokaSub,84,&H00FFFFFF,&H00FFFFFF,&H00241018,&H96000000,0,0,0,0,100,100,1,0,1,7,4,2,70,70,430,1
Style: TV,FredokaSub,70,&H00FFFFFF,&H00FFFFFF,&H00241018,&H96000000,0,1,0,0,100,100,1,0,1,6,4,2,70,70,430,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
open('subs.ass', 'w').write(head + '\n'.join(events) + '\n')
print(len(events), 'subtitle events'); print('\n'.join(e.split(',,')[-1][-40:] for e in events[:6]))
