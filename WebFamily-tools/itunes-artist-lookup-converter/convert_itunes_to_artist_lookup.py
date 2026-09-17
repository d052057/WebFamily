#!/usr/bin/env python3
"""
convert_itunes_to_artist_lookup.py

Converts an iTunes "Library.xml" export into the JSON shape expected by
WebFamily.Server/Services/ArtistLookupService.cs.

Usage:
    python3 convert_itunes_to_artist_lookup.py Library.xml artist-lookup.json

This is a one-time / occasional data-prep tool, not part of the ASP.NET
app - re-run it whenever you export a fresh Library.xml from iTunes (e.g.
after adding new albums), then drop the resulting JSON at the path
configured in ApplicationSettings.ArtistLookupFilePath. The next admin
"regen" run will pick it up automatically.

Why per-track artist, not per-album:
    Most personal music libraries - and this one in particular - turn out
    to be compilation discs: each track can have a different artist, and
    some tracks credit multiple artists as one string (e.g. a duet). So
    this script always builds trackArtists per album. It ALSO computes an
    albumArtist as a convenience fallback, but only when one artist
    clearly dominates the album (see MAJORITY_THRESHOLD below); otherwise
    albumArtist is left null and every track relies on its own
    trackArtists entry (with no per-track match, the app will just show no
    artist for that track, exactly like the "artist not found" case
    behaves today).

Matching key format (important - must mirror how the app looks tracks
up): ArtistLookupService.GetTrackArtistAsync strips the leading track
number off the ACTUAL file name (e.g. "01 - Song.wav" -> "Song") using
TrackTitleParser before comparing, but it does NOT do that stripping to
the JSON's own trackArtists keys - it only case/punctuation-normalizes
them. So this script pre-strips the leading track number from iTunes'
"Name" field before writing it as a dict key, using the same regex
patterns as TrackTitleParser.cs. If your real WAV/MP3 file names use a
noticeably different numbering convention than iTunes did, re-check a few
matches after running a regen (see the --preview output this script
prints, and the "unmatched" report you can generate afterward from the
app's logs).
"""

import argparse
import json
import plistlib
import re
import sys
from collections import defaultdict, Counter

# Mirrors WebFamily.Server/Helpers/TrackTitleParser.cs
MULTI_DISC_PATTERN = re.compile(r'^\s*(\d{1,2})-(\d{1,3})[\s\.\-_)]+\s*(.+)$')
TRACK_NUMBER_PATTERN = re.compile(r'^\s*(?:track\s*)?\(?(\d{1,3})\)?[\s\.\-_)]+\s*(.+)$', re.IGNORECASE)

# If one artist accounts for at least this fraction of an album's tracks,
# use it as the album-level fallback artist. Tune this if you find it's
# too aggressive/conservative for your library once you see the preview.
MAJORITY_THRESHOLD = 0.6


def strip_track_number(raw_name: str) -> str:
    """Same logic as TrackTitleParser.Extract's CleanTitle, minus the
    filename-extension handling (iTunes "Name" has none)."""
    name = raw_name.strip()

    m = MULTI_DISC_PATTERN.match(name)
    if m:
        return m.group(3).strip()

    m = TRACK_NUMBER_PATTERN.match(name)
    if m:
        return m.group(2).strip()

    return name


def normalize_whitespace(value: str) -> str:
    """Collapses runs of whitespace (the XML had some double-space typos
    in artist credits, e.g. 'Sin Sisamouth,  Pen Ron') and trims."""
    return re.sub(r'\s+', ' ', value or '').strip()


def convert(input_path: str):
    with open(input_path, 'rb') as f:
        data = plistlib.load(f)

    tracks = data.get('Tracks', {})

    albums = defaultdict(list)
    skipped_no_album = 0
    for _, t in tracks.items():
        album = t.get('Album')
        name = t.get('Name')
        if not album or not name:
            skipped_no_album += 1
            continue
        albums[album].append(t)

    result = []
    preview_rows = []

    for album_title, album_tracks in albums.items():
        artist_counts = Counter()
        track_artists = {}

        for t in album_tracks:
            artist = normalize_whitespace(t.get('Artist') or '')
            if not artist:
                continue

            clean_title = strip_track_number(t.get('Name'))
            track_artists[clean_title] = artist
            artist_counts[artist] += 1

        album_artist = None
        if artist_counts:
            top_artist, top_count = artist_counts.most_common(1)[0]
            if top_count / len(album_tracks) >= MAJORITY_THRESHOLD:
                album_artist = top_artist

        result.append({
            'albumTitle': album_title,
            'albumArtist': album_artist,
            'trackArtists': track_artists
        })

        preview_rows.append((album_title, album_artist, len(album_tracks), len(artist_counts)))

    return result, preview_rows, skipped_no_album


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('input_xml', help='Path to iTunes Library.xml export')
    parser.add_argument('output_json', help='Path to write the artist-lookup JSON')
    args = parser.parse_args()

    result, preview_rows, skipped = convert(args.input_xml)

    with open(args.output_json, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(result)} albums to {args.output_json}")
    print(f"Skipped {skipped} track(s) with no Album/Name (e.g. junk entries).")
    print()
    print(f"{'Album':<45} {'Album artist (fallback)':<30} {'Tracks':>7} {'Distinct artists':>17}")
    for album_title, album_artist, n_tracks, n_artists in preview_rows:
        print(f"{album_title:<45.45} {(album_artist or '(none - per-track only)'):<30.30} {n_tracks:>7} {n_artists:>17}")


if __name__ == '__main__':
    main()
