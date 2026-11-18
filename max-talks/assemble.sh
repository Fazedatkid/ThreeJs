#!/bin/sh
# Encode frames + mixed audio + burned subtitles into the final vertical video.
set -e
cd "$(dirname "$0")"
mkdir -p out
ffmpeg -y -framerate 30 -i frames/%05d.jpg -i audio/mix.wav \
  -vf "subtitles=subs.ass:fontsdir=fonts,vignette=angle=PI/7" \
  -c:v libx264 -preset slow -crf 20 -maxrate 11M -bufsize 22M -pix_fmt yuv420p -profile:v high -c:a aac -b:a 192k \
  -movflags +faststart -shortest out/max_talks.mp4
