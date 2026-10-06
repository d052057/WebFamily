# Setting up Demucs for the Splitter page on another computer

This guide installs Demucs (the voice/music separator) in its own Python environment and connects it to the WebDownload app. It records the setup that worked on the original machine, so follow the same steps on the new one.

**What was tested:** Windows 10/11, Python 3.14, Demucs 4.1.0, CPU only, app served by IIS. Anything marked *(untested)* has not been tried.

## How the pieces fit

- The app does not contain Demucs. It starts `demucs.exe` as an outside program, the same way it starts `yt-dlp.exe` and `ffmpeg.exe`.
- `demucs.exe` is only a small launcher. It starts the Python environment next to it, so **Python is required** on the computer. You cannot copy `demucs.exe` alone.
- The Python environment (a "virtual environment") remembers the exact folder it was created in. **Always create it on the new computer, in its final location. Never copy it from another machine, and never move it afterward.**
- Demucs downloads its model (a few hundred MB) the first time it runs.

## Checklist

1. Install Python (for all users if IIS runs the app).
2. Install the Microsoft Visual C++ Redistributable.
3. Create the environment and install Demucs.
4. Test Demucs from a command prompt.
5. Put `ffmpeg.exe` next to the app.
6. Create the folders and set permissions.
7. Add the `Splitter` section to the server's `appsettings.json`.
8. Publish the app, recycle the pool, and test from the page.

## 1. Install Python

1. Download the Windows installer (64-bit) from python.org. Python 3.14 was tested. Demucs 4.1.0 needs Python 3.10 or newer; other versions are *(untested)*.
2. Run it and choose **Customize installation**. On the Advanced Options page, tick **Install Python for all users**. This puts Python under `C:\Program Files`, where an IIS application pool can read it. A per-user install lands under `C:\Users\<name>\AppData` and the pool account usually cannot use it.
3. Keep the **py launcher** option ticked. It lets you start a specific version with `py -3.14`.
4. Check it: open a new Command Prompt and run `py -3.14 --version`.

If the application pool runs as your own Windows account (not the default `IIS AppPool\<name>`), a per-user install also works.

## 2. Install the Visual C++ Redistributable

PyTorch (which Demucs runs on) needs the Microsoft Visual C++ Redistributable (x64). Download "Microsoft Visual C++ Redistributable latest supported v14" from Microsoft and run it. Skip this if it is already installed.

## 3. Create the environment and install Demucs

Open a Command Prompt (an administrator one is simplest for creating `C:\Tools`) and run these one at a time:

```
mkdir C:\Tools
py -3.14 -m venv C:\Tools\demucs314
C:\Tools\demucs314\Scripts\python.exe -m pip install --upgrade pip
C:\Tools\demucs314\Scripts\python.exe -m pip install demucs numpy
```

- `pip install demucs` downloads PyTorch as well, which is large. On Windows the default PyTorch from PyPI is the CPU build, which is what you want unless you have a supported GPU (see section 9).
- `numpy` is installed explicitly because Demucs 4.1.0 needs it but does not list it, and without it Demucs fails with `No module named 'numpy'`.

**To get exactly the same versions as the working machine** (recommended): on the working machine run

```
C:\Tools\demucs314\Scripts\python.exe -m pip freeze > demucs-requirements.txt
```

copy `demucs-requirements.txt` to the new computer, and replace the last install line with

```
C:\Tools\demucs314\Scripts\python.exe -m pip install -r demucs-requirements.txt
```

Keep that file with this guide. It is the record of what worked.

## 4. Test Demucs from a command prompt

**Run these from a folder that is not a Demucs source folder.** Python looks in the current folder first, so running inside a downloaded `demucs-4.x.x` source folder loads that old code and fails with `No module named 'dora'`.

```
cd /d C:\Tools
C:\Tools\demucs314\Scripts\python.exe -m pip show demucs
C:\Tools\demucs314\Scripts\python.exe -m demucs --help
C:\Tools\demucs314\Scripts\demucs.exe --help
```

All three should work, and `pip show` should list a Version (4.1.0 on the working machine).

Now separate a short clip (30 to 60 seconds of music, as `.wav` or `.mp3`):

```
C:\Tools\demucs314\Scripts\demucs.exe -d cpu --two-stems=vocals -o C:\Tools\demucs-test "C:\path\to\short-clip.mp3"
```

The first run downloads the model, so it needs internet access and takes longer. A warning about unauthenticated requests to the Hugging Face hub is harmless. When it finishes, `C:\Tools\demucs-test\htdemucs\<clip name>\` should contain `vocals.wav` and `no_vocals.wav`. Play both to check.

For reference, the original machine (CPU only) separated a 6 minute 20 second track in about 4 minutes 38 seconds with the standard model. The High-quality model is about four times slower.

## 5. ffmpeg

The app already needs `ffmpeg.exe` next to it (the same copy `yt-dlp` and Voiceover use). Check it is in the app folder, for example `C:\inetpub\webdownload\ffmpeg.exe`.

## 6. Folders and permissions

Create the folders:

```
mkdir C:\Tools\demucs-models
mkdir d:\medias\separated
```

Which account runs the app decides what to do next. In IIS Manager, open **Application Pools**, select the pool, then **Advanced Settings**, and read **Identity**. Set **Load User Profile** to **True**.

**If the identity is the default `ApplicationPoolIdentity`** (the account is `IIS AppPool\<pool name>`), grant it access. Replace `webdownload` with your pool's name:

```
icacls "C:\Tools\demucs314" /grant "IIS AppPool\webdownload:(OI)(CI)RX"
icacls "C:\Tools\demucs-models" /grant "IIS AppPool\webdownload:(OI)(CI)M"
icacls "d:\medias\separated" /grant "IIS AppPool\webdownload:(OI)(CI)M"
```

`RX` is read and execute, `M` is modify. The pool account also needs to read the Python install itself, which it can when Python was installed for all users.

**If the identity is a Windows account of your own**, that account already has the access it needs. Skip the `icacls` lines, but make sure the folders above exist and that the account can write to `d:\medias\separated` and `C:\Tools\demucs-models`.

Programs the app starts (`demucs.exe`, `ffmpeg.exe`, `yt-dlp.exe`) always run as the pool's identity.

## 7. App settings

Open the **server's** `appsettings.json`, in the folder IIS runs from (for example `C:\inetpub\webdownload\appsettings.json`), **not** the copy in your project. Publishing does not update it. Add a top-level `Splitter` section, next to `YtDlp` and `Subtitle`, and mind the commas:

```json
"Splitter": {
  "DemucsExecutablePath": "C:\\Tools\\demucs314\\Scripts\\demucs.exe",
  "ModelCacheFolder": "C:\\Tools\\demucs-models",
  "OutputFolder": "d:\\medias\\separated",
  "StandardModel": "htdemucs",
  "HighQualityModel": "htdemucs_ft",
  "Mp3Bitrate": "320k"
}
```

Backslashes are doubled in JSON. Every other Splitter setting has a default. `ModelCacheFolder` makes Demucs keep its downloaded model in a fixed place instead of a profile folder that may differ per account.

The app code must also be registered in `Program.cs` (done in the project already, listed here for a fresh deployment):

```csharp
builder.Services.Configure<SplitterSettings>(builder.Configuration.GetSection("Splitter")); // once only
builder.Services.AddSingleton<DeviceDetector>();
builder.Services.AddSingleton<DemucsRunner>();
builder.Services.AddSingleton<SplitterService>();
builder.Services.AddSingleton<SplitterJobRunner>();
builder.Services.AddScoped<MediaTreeService>();

app.MapHub<SplitterHub>("/splitterHub");
```

## 8. Publish, recycle, test

1. Publish the app to the server folder, then **recycle the application pool**.
2. Check the settings are being read: open `http://<server>/<app>/api/Splitter/hardware?refresh=true`. It should answer with the device, for example `Running on: CPU`. If it says the Python "was not found next to the Demucs program", the `Splitter` section is not being read.
3. Open the Splitter page. The list should fill and the hardware line should show.
4. Pick a short video or song and press **Keep voice**. Progress should go "Extracting the audio", then "Separating voice and music (CPU)". Links to the results appear at the end. Results are in `d:\medias\separated\audio` and `\video`.

## 9. Optional: a graphics card (NVIDIA)

*(untested; the original machine's card, a Quadro K2100M from 2013, is too old to use.)*

- Demucs says GPU use needs a card with at least 3 GB of memory, and PyTorch only supports reasonably recent NVIDIA cards.
- On the new computer, install a GPU build of PyTorch **before** Demucs, using the exact command that the PyTorch "Get Started" page at pytorch.org gives for your Windows, pip and CUDA version. Then install Demucs as in section 3.
- Check it: `C:\Tools\demucs314\Scripts\python.exe -c "import torch; print(torch.__version__, torch.cuda.is_available())"` should print `True`.
- The Splitter page checks this itself when it opens. It shows `Running on: <card name>` or `Running on: CPU`, and the refresh button next to it checks again. If a GPU job fails (for example out of memory), the job logs it and runs again on the CPU.

## 10. Optional: a computer with no internet *(untested)*

- On the working machine, with the same Windows and Python version, run `C:\Tools\demucs314\Scripts\python.exe -m pip download -r demucs-requirements.txt -d wheels`. Copy the `wheels` folder to the new computer and install with `pip install --no-index --find-links wheels -r demucs-requirements.txt`.
- Copy the contents of the working machine's `ModelCacheFolder` to the new one, so the model does not have to be downloaded.
- Demucs also contacts the Hugging Face hub on each run. Test that a job completes without internet before relying on it.

## Troubleshooting

| What you see | Cause and fix |
|---|---|
| `No module named 'dora'` | You ran Demucs from inside a downloaded source folder. Run it from another folder (`cd /d C:\Tools`). |
| `No module named 'numpy'` | Run `...\python.exe -m pip install numpy`. |
| Page error: "Could not start Demucs ('demucs.exe')... cannot find the file" | The running app is using the default name. The server's `appsettings.json` has no `Splitter` section or it is misspelled; fix it, check `Program.cs` registers `Configure<SplitterSettings>`, recycle the pool. |
| "Could not open the progress connection" | The .NET server is not running, or `/splitterHub` is not mapped, or `ng serve` has no proxy entry for it. |
| Demucs starts but fails under IIS only | Permissions or Python location: the pool account cannot read `C:\Tools\demucs314` or the Python install (check the `home =` line in `C:\Tools\demucs314\pyvenv.cfg`; if it points into a user profile, reinstall Python for all users and recreate the environment). Also check **Load User Profile**. |
| Demucs crashes on Khmer file names or progress output | The app starts Python in UTF-8 mode for this. If it still happens, send the full message. |
| Very slow | Expected on a CPU: roughly three-quarters of the track's length with the standard model, about four times that with High. Long movies can need several GB of RAM and temp disk. |
| Model downloads again | `ModelCacheFolder` is not set, or a different account is running the app. Set it to a fixed folder. |

## Updating or removing

- **Update Demucs:** `C:\Tools\demucs314\Scripts\python.exe -m pip install --upgrade demucs`, then recycle the pool. Re-run the test in section 4.
- **Remove it:** delete `C:\Tools\demucs314` and `C:\Tools\demucs-models`, and remove the `Splitter` section from `appsettings.json`.
- **Move it:** do not move or rename `C:\Tools\demucs314`. Delete it and repeat section 3 in the new place, then update `DemucsExecutablePath`.
