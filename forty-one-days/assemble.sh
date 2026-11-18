#!/bin/sh
# Encode frames + mixed audio + burned subtitles into the final vertical video.
# The flashback (36.82s-40.55s) is desaturated and given a soft vintage grade.
set -e
cd "$(dirname "$0")"
mkdir -p out
ffmpeg -y -framerate 30 -i frames/%05d.jpg -i audio/mix.wav \
  -vf "hue=s=0.3:enable='between(t,36.82,40.55)',curves=preset=vintage:enable='between(t,36.82,40.55)',subtitles=subs.ass:fontsdir=fonts,vignette=angle=PI/6" \
  -c:v libx264 -preset slow -crf 20 -maxrate 11M -bufsize 22M -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k \
  -movflags +faststart -shortest out/41_days.mp4
