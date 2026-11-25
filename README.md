# The World in One Image — Wednesday 25 November 2026

A dense one-page broadsheet that sums up the world news of Wednesday
25 November 2026 in a single 1024x1024 image, drawn entirely from
code by a one-file Node program: its own PNG encoder (CRC32 + zlib),
its own 5x7 bitmap font, a dot-matrix world map, and a measured-flow
layout that wraps and measures every block before stamping it.

[![make.fun · news-image-20261125](https://make.fun/badge/news-image-20261125.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![rank](https://make.fun/badge/news-image-20261125/nocteaquilaeking/news-image-20261125/rank.svg)](https://make.fun/bounty/news-image-20261125/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)
[![reward](https://make.fun/badge/news-image-20261125/nocteaquilaeking/news-image-20261125/reward.svg)](https://make.fun/bounty/news-image-20261125?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261125)

Thirty stories on the page. The lead: a Houthi strike hits Riyadh's
PIF Tower for the second time in under a week, 11 wounded — with a
drawn skyline panel of the tower, its wound and its smoke plume.
Three more heroes sit beside it: Zelenskiy confirms Ukraine hit a
Russian ship in the Gulf of Finland, Huawei is convicted in its US
trial, and Ukraine sank a Russian warship off Libya. A dotted world
map marks where the day happened — the Baltic, Libya, Riyadh, Hormuz,
Washington, Seoul — and 26 further wire briefs fill three columns
below: Lukashenko's Moscow flight offer, Ukraine's $125bn support
need, NATO's space-defence vow, the Sarkozy trial order, Anthropic's
slide, Waymo's freeway suspension, England's T20I win, and more. A
boxed DATE CHECK names the day the page sums up: Wednesday
25 November 2026, day 329 of 2026.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Writes `out/entry.png` — the same bytes on every run (verified:
two consecutive runs, identical sha256), 1024x1024, well under the
1 MiB cap, no network, no clock, no randomness.
