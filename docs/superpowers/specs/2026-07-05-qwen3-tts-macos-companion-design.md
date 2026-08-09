# Qwen3-TTS macOS Companion Design

**Status:** Approved

**Date:** 2026-07-05

## Goal

Add a locally hosted, commercially usable Qwen3-TTS narration option to Artful Learning without removing the existing in-browser HeadTTS path. The local option must run on Apple Silicon, produce per-segment audio plus word timestamps, provide a simple model-management experience, and ship as a downloadable macOS companion app built by GitHub Actions.

## Confirmed Decisions

- Keep HeadTTS as the browser provider.
- Add a local-server provider backed by Qwen3-TTS CustomVoice and Qwen3 Forced Aligner.
- Target Apple M-series Macs only in the first release.
- Ship a macOS menu-bar app with a browser-based localhost management interface.
- Support built-in voices and emotion/style control only.
- Do not include voice cloning or VoiceDesign.
- Offer two TTS models:
  - Qwen3-TTS 0.6B CustomVoice 4-bit.
  - Qwen3-TTS 1.7B CustomVoice 4-bit.
- Always install Qwen3 Forced Aligner 0.6B 8-bit with the selected TTS model.
- Build an unsigned, ad-hoc-signed arm64 DMG because no Apple Developer ID is available.
- Clearly instruct users to right-click and choose **Open** on first launch.
- Keep all generated speech, prompts, models, and alignment data on the user's Mac.

## Non-Goals

- Windows or Linux desktop packaging.
- Intel Mac support.
- Voice cloning or reference-audio uploads.
- VoiceDesign.
- Multiple simultaneous generation jobs.
- Automatic application updates.
- Remote or LAN access to the TTS server.
- A general model-plugin marketplace.
- Replacing the existing timeline, preview, audio mixdown, persistence, or video-export implementations.

## System Architecture

```text
GitHub Pages web app
  └─ NarrationSidebar
      ├─ Browser tab
      │   └─ HeadTtsProvider
      └─ Local Server tab
          └─ LocalTtsProvider
              └─ http://127.0.0.1:17860
                  └─ macOS menu-bar companion
                      ├─ FastAPI API
                      ├─ localhost management UI
                      ├─ MLX-Audio
                      ├─ Qwen3-TTS CustomVoice
                      ├─ Qwen3 Forced Aligner
                      └─ model and task management
```

The web application owns provider selection and converts provider-neutral synthesis results into the existing `NarrationTrack`, `NarrationAudioSegment`, and `SubtitleCue` structures. The desktop service does not import or duplicate the React application's types.

## Repository Layout

```text
desktop/tts-companion/
  app/
    main.py
    server.py
    models.py
    synthesis.py
    tasks.py
    static/
  tests/
  requirements.lock
  pyinstaller.spec

src/lib/tts/
  types.ts
  headttsProvider.ts
  localTtsProvider.ts
  narrationBuilder.ts

src/hooks/
  useNarrationTTS.ts
```

Responsibilities:

- `main.py`: menu-bar lifecycle, single-instance lock, custom URL scheme handling, server startup, dashboard opening, and clean shutdown.
- `server.py`: FastAPI routes, request validation, CORS, local-network headers, and error mapping.
- `models.py`: hardware inspection, model recommendations, allowlisted downloads, active-model selection, and memory policy.
- `synthesis.py`: Qwen generation, pause insertion, forced alignment, and provider-neutral result construction.
- `tasks.py`: the one-active-task state machine for downloads and synthesis.
- `static/`: dependency-free HTML, CSS, and JavaScript for the localhost management UI.
- `types.ts`: provider-neutral request, progress, capability, error, and synthesis-result types.
- `headttsProvider.ts`: existing browser inference behind the common provider contract.
- `localTtsProvider.ts`: localhost health checks, task polling, cancellation, and result retrieval.
- `narrationBuilder.ts`: shared text segmentation, pause parsing, provider-result normalization, and subtitle-cue construction.
- `useNarrationTTS.ts`: provider selection, UI status, cancellation, and generation orchestration.

`NarrationSidebar.tsx` remains responsible for presentation only. It must not contain model-download, fetch, alignment, or provider-normalization logic.

## Desktop Companion Lifecycle

1. The user downloads the DMG from the GitHub Release link in the narration sidebar.
2. The user drags the app into Applications.
3. On first launch, the user right-clicks the app and selects **Open** because the app is not notarized.
4. The app obtains a single-instance lock.
5. It binds only to `127.0.0.1:17860`.
6. It adds a menu-bar item with:
   - Service status.
   - Open management page.
   - Restart service.
   - Quit.
7. On first launch or incomplete setup, it opens `http://127.0.0.1:17860`.
8. Later launches start the service and remain in the menu bar.

The app registers `artful-learning-tts://open`. The web application's **I have installed it, start and connect** action opens this URL and then polls `/health`. If the scheme is unavailable, the page keeps the download and manual-launch instructions visible.

## Model Storage and Recommendation

Models are stored outside the application bundle:

```text
~/Library/Application Support/Artful Learning TTS/models/
```

The service detects:

- `arm64` architecture.
- Apple chip name.
- physical memory from `sysctl`.
- available disk space.
- macOS version.
- MLX availability.

Recommendation rules:

| System memory | Recommended TTS model | Alignment model |
|---|---|---|
| 8 GB | Qwen3-TTS 0.6B CustomVoice 4-bit | Forced Aligner 0.6B 8-bit |
| 16 GB or more | Qwen3-TTS 1.7B CustomVoice 4-bit | Forced Aligner 0.6B 8-bit |

The user may override the recommendation. The UI must show model download size and an estimated memory range before download.

For 8 GB systems, the service unloads the TTS model before loading the aligner. For systems with at least 16 GB, TTS remains resident and the aligner is loaded lazily; it is retained only if the process remains below the memory threshold.

The first release does not download bf16, 6-bit, or 8-bit TTS variants. Two selectable TTS models are enough to cover the supported hardware range.

## Model Download Behavior

- Model IDs come from a fixed allowlist.
- Downloads use pinned Hugging Face repository revisions.
- The service checks available disk space before starting.
- Partial downloads are resumable.
- A model becomes selectable only after all expected files pass size and presence checks.
- Active-model configuration is written atomically.
- A failed or cancelled download never replaces a working model.
- Download tasks survive UI reloads but not application restarts; cached partial files remain resumable.

Approximate published model sizes:

- 0.6B CustomVoice 4-bit: 1.69 GB.
- 1.7B CustomVoice 4-bit: 2.31 GB.
- Forced Aligner 8-bit: 1.27 GB.

## Web Narration UI

The narration sidebar adds two tabs:

- **Browser**: current HeadTTS controls and behavior.
- **Local Server**: Qwen3-TTS connection and generation controls.

The sidebar header always includes the latest macOS download link:

```text
https://github.com/acer1456/image-shot-video-generator/releases/latest/download/Artful-Learning-TTS-macOS-arm64.dmg
```

The local-server tab supports four confirmed states:

1. **Service unavailable**
   - Download macOS app.
   - Start installed app and connect.
2. **Service available, model downloading**
   - Display TTS and aligner download progress.
   - Link to the full management page.
3. **Ready**
   - Display model, language, voice, emotion, style, speed, pause, and advanced controls.
4. **Recoverable failure**
   - Keep the service connected.
   - Preserve existing narration.
   - Offer retry, switch to 0.6B, or return to browser TTS.

The web app checks `/health` when the local-server tab opens and while an explicit connection attempt is active. It must not poll continuously while the browser provider is selected.

## Local Generation Controls

Basic controls:

- Language.
- Built-in speaker.
- Emotion preset:
  - Natural.
  - Warm.
  - Calm.
  - Joyful.
  - Dramatic.
  - Custom.
- Emotion intensity.
- Style instruction.
- Speaking speed target.
- Pause intensity.

Advanced controls:

- Seed.
- Temperature.
- Top-p.

Emotion presets map to versioned instruction templates. Intensity maps deterministically to modifiers such as `slightly`, `clearly`, and `strongly`. The final instruction is visible and editable when **Custom** is selected.

Speaking speed is an instruction target, not guaranteed post-processing. The UI may show familiar multiplier values but must explain that the model controls the result approximately. Forced alignment runs after synthesis, so subtitle timings match the produced audio.

## Shared Segmentation and Pause Rules

The current text segmentation, pause presets, and `[pause N]` syntax move out of the HeadTTS implementation into `narrationBuilder.ts`.

Both providers receive the same ordered speech segments:

```text
text
pauseAfterMs
```

The local service synthesizes and aligns each speech segment independently. Explicit silence is inserted between segments after synthesis. This preserves:

- independent timeline audio actions;
- waveform rendering;
- per-segment drag and deletion;
- deterministic manual pauses;
- stable segment-to-word associations.

## API Design

Base URL:

```text
http://127.0.0.1:17860
```

Endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service version and readiness |
| GET | `/v1/capabilities` | Device, model, voice, language, and parameter metadata |
| POST | `/v1/models/{model_id}/download` | Start an allowlisted model download |
| POST | `/v1/narrations` | Start synthesis and alignment |
| GET | `/v1/tasks/{task_id}` | Read download or generation progress |
| DELETE | `/v1/tasks/{task_id}` | Cancel the active task |
| GET | `/v1/tasks/{task_id}/result` | Retrieve completed synthesis output |

Only one download or synthesis task runs at a time. A second request receives `TASK_BUSY`.

### Synthesis Request

```json
{
  "segments": [
    {
      "text": "Art has the power to change how we see the world.",
      "pauseAfterMs": 280
    }
  ],
  "language": "English",
  "speaker": "Ryan",
  "instruction": "Warm, intimate museum narration with gentle pauses.",
  "speed": 1.0,
  "seed": 42,
  "temperature": 0.9,
  "topP": 0.95
}
```

### Synthesis Result

```json
{
  "modelId": "qwen3-tts-1.7b-customvoice-4bit",
  "segments": [
    {
      "id": "generated-uuid",
      "text": "Art has the power to change how we see the world.",
      "startTime": 0,
      "duration": 3.82,
      "sampleRate": 24000,
      "wavBase64": "base64-encoded-wav",
      "pauseAfterMs": 280,
      "words": [
        {
          "word": "Art",
          "startTime": 0.12,
          "duration": 0.21
        }
      ]
    }
  ]
}
```

The web adapter decodes each WAV to `Float32Array`, offsets word timestamps, adds segment IDs, builds subtitle cues, and returns the existing narration result shape. Qwen Forced Aligner does not provide the phoneme timestamps currently emitted by HeadTTS, so local-provider tracks use an empty `phonemes` array. Existing playback and export do not depend on it.

## API Security

- Bind only to `127.0.0.1`.
- Use a fixed port and fail clearly if it is unavailable.
- Use an application-level single-instance lock.
- Allow CORS only for:
  - the production GitHub Pages origin;
  - the approved localhost Vite development origins.
- Handle browser Private Network Access preflight requests.
- Require `Content-Type: application/json` for mutating endpoints.
- Reject unknown fields and invalid enum values.
- Limit request bodies and narration length.
- Reject arbitrary model URLs and filesystem paths.
- Do not expose a generic command, file, proxy, or download endpoint.
- Do not accept reference audio in the first release.

No bearer token is added in the first release because the service is loopback-only, the web origin is fixed, and all mutating requests require JSON preflight. Authentication should be reconsidered only if remote origins or LAN binding are introduced.

## Error Handling

Stable error codes:

- `SERVICE_NOT_READY`
- `MODEL_NOT_READY`
- `MODEL_NOT_SUPPORTED`
- `TASK_BUSY`
- `INSUFFICIENT_MEMORY`
- `INSUFFICIENT_DISK`
- `DOWNLOAD_FAILED`
- `GENERATION_FAILED`
- `ALIGNMENT_FAILED`
- `GENERATION_CANCELLED`

Failures never clear or overwrite the current narration. The frontend replaces the current track only after a complete result has been decoded and normalized.

If alignment fails after successful synthesis, the job fails as `ALIGNMENT_FAILED`; it does not silently create approximate subtitles. Reliable timestamps are a required capability of the local provider.

## Persistence Compatibility

`NarrationTrack` gains optional provider and model metadata. Existing projects without those fields normalize to the browser HeadTTS provider.

Audio data remains provider-neutral. Loading, previewing, editing, and exporting a saved project does not require the original provider or model to be installed.

The project save/load path and autosave path must persist the same provider metadata. Existing audio segment serialization remains unchanged.

## Desktop Management UI

The localhost management page uses static HTML, CSS, and JavaScript served by FastAPI. It does not add a second React build.

Confirmed layout:

- Service status and local URL.
- Apple chip, memory, and macOS indicators.
- Recommended model highlighted.
- Alternative model with explicit override action.
- Required aligner status.
- Download and verification progress.
- Test-text input and audio preview.
- Clear recovery action for insufficient memory.

The menu-bar app supplies only lifecycle controls. Model selection and diagnostics live in the management page so they are not duplicated in two interfaces.

## Packaging and Release

Runtime:

- Python 3.12.
- MLX-Audio.
- FastAPI and Uvicorn.
- `rumps` for the macOS menu bar.
- PyInstaller `onedir` arm64 application bundle.

`onedir` is preferred over `onefile` because the application contains MLX and other native libraries. It avoids extracting the full runtime on every launch and makes signing diagnostics inspectable.

GitHub Actions workflow:

1. Trigger on `tts-v*` tags or `workflow_dispatch`.
2. Run on the Apple Silicon `macos-26` runner.
3. Install pinned Python dependencies.
4. Run Python tests and the no-model self-test.
5. Build the `.app` using the checked-in PyInstaller spec.
6. Apply ad-hoc signing to nested native binaries and the app bundle.
7. Verify signatures and launch the app in self-test mode.
8. Create the DMG with `hdiutil`.
9. Generate a SHA-256 file.
10. Create a GitHub Release and upload:
    - `Artful-Learning-TTS-macOS-arm64.dmg`
    - `Artful-Learning-TTS-macOS-arm64.dmg.sha256`

Release notes and the web download panel state:

- Apple M-series requirement.
- Model downloads occur after installation.
- First launch requires right-clicking the app and choosing **Open**.
- The app is ad-hoc signed but not Apple-notarized.

## Verification

### Automated Desktop Checks

- System information parsing.
- Model recommendation thresholds.
- Model allowlist enforcement.
- Insufficient disk handling.
- Download cancellation, resume, and atomic activation.
- One-active-task behavior.
- API schema and unknown-field rejection.
- CORS and Private Network Access preflight behavior.
- Stable error-code mapping.
- Result-schema validation.
- App bundle self-test and `/health`.

### Automated Web Checks

- Browser provider behavior remains available.
- Local-server state transitions.
- Download-link target.
- Request parameter mapping.
- Cancellation.
- WAV decoding and result normalization.
- Existing project normalization defaults to HeadTTS.
- `npm run build`.

### Required Apple Silicon Checks

- 8 GB Mac:
  - 0.6B generation.
  - TTS unload before aligner load.
  - successful word alignment.
- 16 GB or larger Mac:
  - 1.7B generation.
  - successful word alignment.
  - memory-policy behavior.

### End-to-End Acceptance

1. Install the DMG using the documented first-launch flow.
2. Download the recommended model and aligner.
3. Connect from the GitHub Pages narration sidebar.
4. Generate a multi-sentence narration with a manual pause.
5. Verify per-segment waveforms and word-timed subtitle cues.
6. Drag and delete narration segments on the timeline.
7. Save and reload the project.
8. Preview and export a video.
9. Confirm preview and exported narration timing match.
10. Switch back to HeadTTS and confirm the browser path still works.

## Licensing and Distribution Notes

- Qwen3-TTS code and official model weights are Apache-2.0.
- Qwen3 Forced Aligner code and official model weights are Apache-2.0.
- MLX-Audio is MIT.
- Converted MLX model repositories retain Apache-2.0 metadata.
- The release bundle must include third-party notices.
- Commercial model permission does not grant permission to impersonate or misuse a real person's voice; the first release avoids voice cloning entirely.

References:

- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS)
- [Qwen3-ASR and Forced Aligner](https://github.com/QwenLM/Qwen3-ASR)
- [MLX-Audio](https://github.com/Blaizzy/mlx-audio)
- [GitHub-hosted macOS runners](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Apple notarization requirements](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
