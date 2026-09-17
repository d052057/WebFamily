# iTunes artist lookup converter

## What's here
- `convert_itunes_to_artist_lookup.py` — the converter script. Re-run it
  whenever you export a fresh `Library.xml` from iTunes.
- `artist-lookup.json` — **already generated from your uploaded
  Library.xml.** 55 albums, ready to use right now.
- `conversion-report.txt` — the per-album summary printed when the script
  ran (which albums got an album-level fallback artist vs. per-track only).

## How to use it
```
python3 convert_itunes_to_artist_lookup.py Library.xml artist-lookup.json
```
Then copy `artist-lookup.json` to wherever you set
`ApplicationSettings.ArtistLookupFilePath` in your app config, and run the
admin "regen" for the RPM menu. `ArtistLookupService` (from the last
delivery) will pick it up automatically — no code changes needed.

## What we found in your library
Your 55 albums are the "Golden Crown" (រស្មីពានមាស) Khmer compilation
series — **54 of 55 discs mix multiple artists track-by-track** (only
"Golden Crown 25" is effectively single-artist across its tracks). So:

- **Per-track artist is the primary data** — every track in the JSON gets
  its own `trackArtists` entry when iTunes had an Artist value for it.
- **Album-level `albumArtist` is only set when one artist clearly
  dominates** (≥60% of that album's tracks — see `MAJORITY_THRESHOLD` in
  the script, tune it if you want a different cutoff). That happened for
  7 of the 55 albums (10, 02, 20, 32, 36, 44 — all dominated by Sin
  Sisamouth). The other 48 albums have `albumArtist: null`, meaning every
  track relies entirely on its own per-track match; there's simply no
  single meaningful "album artist" for a various-artists disc.
- **One junk entry was skipped**: a stray track literally named
  `"output"` with no Album/Artist — almost certainly a leftover from a
  failed import, not a real song. If that's wrong and you do have a real
  song called "output," let me know and I'll adjust the script to keep
  entries with a Name but no Album instead of dropping them.
- **Minor whitespace inconsistencies got cleaned up** — e.g. some combined
  credits appeared as both `"Sin Sisamouth, Pen Ron"` and
  `"Sin Sisamouth,  Pen Ron"` (double space) in the raw XML; the script
  collapses those to one artist string.

## Matching mechanics (why the JSON keys look the way they do)
`ArtistLookupService.GetTrackArtistAsync` strips the leading track number
off your *actual* WAV/MP3 file name before comparing (e.g.
`"01 - Song.wav"` → `"Song"`), but does **not** do that stripping to the
JSON's own keys — it only normalizes case/punctuation. So this script
pre-strips iTunes' `"01-Song Name"` → `"Song Name"` using the same regex
patterns as `TrackTitleParser.cs`, so the keys line up with what the app
will be comparing against at regen time.

**One thing to verify once you regen**: this only works if your actual
WAV file names use a similar "leading number + separator" convention to
what iTunes' `Name` field used (which they did here — e.g.
`"01-ចំប៉ារង្សី"`). If your real rip file names are formatted
differently, some tracks may not match and will simply come back with no
artist (safe failure — nothing breaks, they just stay blank). Run a
regen and spot-check a few albums; if matches look sparse, send me a
couple of real file names and I'll adjust the parser.
