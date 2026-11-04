# 🎵 Danny's Music Library

A fast, searchable catalog of my MP3 collection, with album art for nearly every record.

**Live site → [djsimtech.github.io/music-library](https://djsimtech.github.io/music-library/)**

| | |
|---|---|
| Albums | 2,273 |
| Songs | 37,124 |
| Artists | ~690 |
| Album covers | 2,026 |

> This repo holds only the song list and small cover thumbnails. No audio files are stored or shared here.

---

## Features

- **Instant search** across songs, artists, and albums. Results appear in a few milliseconds as you type, with matches highlighted.
- **Album grid**: filter by section (artist albums, Rolling Stone 500, compilations, soundtracks), sort by artist, year, or title, or shuffle the order. An A–Z rail jumps straight to a letter.
- **Album view**: a full track list grouped by disc, a blurred cover backdrop, an accent colour pulled from the album art, and a vinyl record that slides out from behind the sleeve.
- **Surprise me**: opens a random album.
- **Shareable links**: every album has its own URL, such as `#album-7f0d5d03088d`.
- **Works on phones**: the album view becomes a bottom sheet, and the filters scroll sideways.
- **No frameworks or build step**: plain HTML, CSS, and JavaScript, about 25 KB of code plus the catalog.

### Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Jump to search |
| `↑` `↓` | Move through song results |
| `Enter` | Open the selected song's album |
| `←` `→` | Previous or next album while one is open |
| `Esc` | Close the album view |

---

## How it works

```
\\Synology01\music  ──►  build_catalog.ps1  ──►  catalog.js + covers/  ──►  GitHub Pages
   (MP3 library)         (runs on my PC)          (this repo)              (static site)
```

1. **`build_catalog.ps1`** (kept on my PC, outside this repo) walks the music share. It reads each MP3's ID3 tags for the title, artist, and track number, falls back to the file name when tags are missing, and groups tracks into albums using the folder layout.
2. Each album's `Folder.jpg` is resized to a 300 px thumbnail in `covers/`.
3. Everything goes into **`catalog.js`**, which the page loads in a single request.

A tag cache means rebuilds only read files that are new or changed, so updates take a minute or two instead of half an hour.

### Repo layout

```
index.html        page shell
assets/app.js     search, grid, album view, and effects
assets/style.css  styles
catalog.js        generated album and track data
covers/           generated 300 px album covers (<album-id>.jpg)
.nojekyll         serve files as-is, skipping GitHub's Jekyll processing
```

---

## Updating the site

After adding music to the NAS:

```powershell
cd D:\Claude\Music_Library
powershell -ExecutionPolicy Bypass -File .\build_catalog.ps1
cd site
git add -A
git commit -m "Update catalog"
git push
```

GitHub Pages republishes within a minute or two.

---

## Library conventions

The builder expects the share to be organised like this:

```
<Letter>\<Artist>\[YYYY - MM] - <Album>\<Artist> - [NN] - <Title>.mp3
Compilations\<Series>\<Album>\...
Soundtracks\Soundtrack - <Film>\[YYYY - MM] - Soundtrack\...
```

Multi-disc albums can use `Disc 1`, `Disc 2`, and so on as subfolders. They are merged into one album with a separate track list for each disc.

---

## Credits

- Missing album art was matched through [MusicBrainz](https://musicbrainz.org) and downloaded from the [Cover Art Archive](https://coverartarchive.org).
- Fonts: [Unbounded](https://fonts.google.com/specimen/Unbounded), [Manrope](https://fonts.google.com/specimen/Manrope), and [JetBrains Mono](https://www.jetbrains.com/lp/mono/).
- Album artwork belongs to its respective artists and labels and is shown here as small thumbnails for personal cataloguing.
