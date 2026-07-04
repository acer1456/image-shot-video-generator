# Qwen3-TTS macOS Companion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Apple-Silicon-only Qwen3-TTS companion app and a modular local-server narration provider while preserving the existing HeadTTS browser path, narration timeline, persistence, preview, and export behavior.

**Architecture:** The React app owns provider selection and converts provider-neutral synthesis output into the existing `NarrationTrack` and `SubtitleCue` structures. A separate Python 3.12 menu-bar app binds FastAPI to `127.0.0.1:17860`, manages allowlisted MLX models, runs one download or synthesis task at a time, returns per-segment WAV plus word timestamps, and serves a dependency-free management page. Provider-specific networking, model lifecycle, and ML inference stay outside `NarrationSidebar.tsx`.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Radix Tabs, Python 3.12, FastAPI, Uvicorn, MLX-Audio, Hugging Face Hub, rumps, PyInstaller `onedir`, GitHub Actions on Apple Silicon macOS.

---

## Scope and success criteria

This plan implements the approved design in `docs/superpowers/specs/2026-07-05-qwen3-tts-macos-companion-design.md`.

The implementation is complete only when all of these are true:

- HeadTTS remains selectable as **瀏覽器**, with the same voices, pauses, subtitles, playback, and export behavior.
- **本地伺服器** connects only to `http://127.0.0.1:17860`.
- The local service recommends 0.6B on 8 GB Macs and 1.7B on Macs with at least 16 GB.
- Only the approved 0.6B TTS, 1.7B TTS, and forced-aligner repositories can be downloaded.
- Local generation returns independently editable narration segments and aligned word timestamps.
- A generation, alignment, connection, or decode failure leaves the existing narration and subtitles unchanged.
- Saved projects and autosaves preserve `provider` and `modelId`; old projects default to HeadTTS.
- The companion is built into `Artful Learning TTS.app`, wrapped in `Artful-Learning-TTS-macOS-arm64.dmg`, ad-hoc signed, checksummed, and attached to `tts-v*` GitHub Releases.
- No voice cloning, arbitrary URLs, arbitrary filesystem paths, LAN binding, concurrent jobs, Intel packaging, Windows packaging, or auto-update logic is added.

## Deliberate constraints

- Do not add Vitest, Jest, or another frontend test runner. This repository currently has no test script.
- Use Python's `unittest` for desktop-service units and API tests.
- Use the existing `playwright-core` dependency for one standalone browser smoke script.
- Do not move narration state into `useAppStore`; `App.tsx` already owns it correctly.
- Do not change `src/lib/narration.ts`, timeline editing, canvas preview, video encoding, or audio mixdown unless a failing acceptance check proves a provider-neutral defect.
- Do not clear the current track before generation. Replace it only after the complete result has decoded and normalized.
- Do not download models during CI or ordinary unit tests.

## Fixed external identifiers

Keep the model allowlist in one Python constant:

| Internal ID | Hugging Face repository | Pinned revision | Download bytes |
|---|---|---:|---:|
| `qwen3-tts-0.6b-customvoice-4bit` | `mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-4bit` | `08c72cad5e2fd0f41730c8bd1f28149585e46361` | `1690000000` |
| `qwen3-tts-1.7b-customvoice-4bit` | `mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-4bit` | `f35faf19b0cc2160865af64ecf0f22f83d335135` | `2310000000` |
| `qwen3-forced-aligner-0.6b-8bit` | `mlx-community/Qwen3-ForcedAligner-0.6B-8bit` | `0e1a68e` | `1270000000` |

Before the first production release, resolve the short aligner revision to its full commit SHA and update only the constant and its assertion. Never track `main`.

Other fixed values:

```text
Service URL: http://127.0.0.1:17860
Custom URL: artful-learning-tts://open
Model root: ~/Library/Application Support/Artful Learning TTS/models
Release asset: Artful-Learning-TTS-macOS-arm64.dmg
Download URL: https://github.com/acer1456/image-shot-video-generator/releases/latest/download/Artful-Learning-TTS-macOS-arm64.dmg
```

## Task 1: Extract provider-neutral narration construction

**Files:**

- Create: `src/lib/tts/types.ts`
- Create: `src/lib/tts/narrationBuilder.ts`
- Modify: `src/hooks/useheadTTS.ts`

- [ ] **Step 1: Define the shared contracts**

Create `src/lib/tts/types.ts` with these exported shapes:

```ts
import type { NarrationTrack, SubtitleCue } from '@/types'

export type NarrationProviderId = 'headtts' | 'local'

export type NarrationProviderStatus =
  | { phase: 'idle'; message: string; progress: number }
  | { phase: 'connecting'; message: string; progress: number }
  | { phase: 'loading'; message: string; progress: number }
  | { phase: 'generating'; message: string; progress: number }
  | { phase: 'error'; message: string; progress: number; code?: string }

export interface NarrationVoice {
  value: string
  label: string
}

export interface SpeechSegment {
  text: string
  pauseAfterMs: number
}

export interface ProviderWordTimestamp {
  word: string
  startTime: number
  duration: number
}

export interface ProviderAudioSegment {
  id: string
  text: string
  startTime: number
  duration: number
  sampleRate: number
  audioData: Float32Array
  pauseAfterMs: number
  words: ProviderWordTimestamp[]
}

export interface NarrationGenerationResult {
  track: NarrationTrack
  subtitleCues: SubtitleCue[]
}

export interface BuildNarrationResultInput {
  text: string
  voice: string
  speed: number
  pauseIntensity: number
  segments: ProviderAudioSegment[]
}
```

- [ ] **Step 2: Move shared pause and subtitle logic without behavior changes**

Move these existing responsibilities from `useheadTTS.ts` to `src/lib/tts/narrationBuilder.ts`:

```ts
export function clampPauseIntensity(value: number): number
export function parseNarrationSpeechSegments(
  text: string,
  pauseIntensity: number,
): SpeechSegment[]
export function buildNarrationResult(
  input: BuildNarrationResultInput,
): NarrationGenerationResult
```

`parseNarrationSpeechSegments` must preserve the current seven pause presets, punctuation rules, newline rules, `[pause N]` syntax, whitespace normalization, and `0..5000` millisecond clamp exactly.

Keep the existing Traditional Chinese UI labels in `NarrationSidebar.tsx` unchanged:

```ts
const PAUSE_LABELS = ['關閉', '很短', '短', '自然', '明顯', '偏慢', '慢節奏']
```

`buildNarrationResult` must:

1. Generate one narration ID.
2. Flatten segment words, offsetting each word by the segment's `startTime`.
3. Set each word's `segmentId`.
4. Calculate `wordStartIndex` and `wordEndIndex` per audio segment.
5. Build the same width-aware subtitle groups currently produced by `buildSubtitleCues`.
6. Set `phonemes: []` by default and allow HeadTTS to replace it afterward.
7. Return only provider-neutral audio, word, and subtitle data in this task. Task 2 adds provider metadata after extending `NarrationTrack`.

- [ ] **Step 3: Make HeadTTS consume the shared builder**

Keep connection, worker cleanup, model loading, and phoneme extraction in `useheadTTS.ts`. Replace its local parsing and track/subtitle construction with:

```ts
const speechSegments = parseNarrationSpeechSegments(trimmed, normalizedPauseIntensity)

const result = buildNarrationResult({
  text: trimmed,
  voice,
  speed,
  pauseIntensity: normalizedPauseIntensity,
  segments: providerSegments,
})

result.track.phonemes = phonemes
return result
```

During the existing synthesis loop, accumulate `ProviderAudioSegment[]` instead of constructing the final track directly. Word times inside each provider segment must be relative to that segment; phoneme times remain final timeline times and keep the same generated segment ID. Advance the segment cursor after each returned audio chunk so multi-message HeadTTS responses preserve their current timing.

Do not rename `useheadTTS` in this task. The provider-selection hook will wrap it later.

- [ ] **Step 4: Verify the behavior-preserving extraction**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite complete successfully. HeadTTS code contains no local `PAUSE_PRESETS`, `parseNarrationSpeechSegments`, or `buildSubtitleCues` definitions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/types.ts src/lib/tts/narrationBuilder.ts src/hooks/useheadTTS.ts
git commit -m "refactor: share narration generation pipeline"
```

## Task 2: Persist provider metadata compatibly

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/lib/tts/types.ts`
- Modify: `src/lib/tts/narrationBuilder.ts`
- Modify: `src/hooks/useheadTTS.ts`
- Modify: `src/lib/projectNormalize.ts`
- Modify: `src/hooks/useProjectIO.ts`
- Modify: `src/hooks/useAutosave.ts`

- [ ] **Step 1: Extend the track type**

Add:

```ts
export type NarrationProvider = 'headtts' | 'local'
```

Replace the duplicate union in `src/lib/tts/types.ts` with:

```ts
import type { NarrationProvider, NarrationTrack, SubtitleCue } from '@/types'

export type NarrationProviderId = NarrationProvider
```

Add these optional fields to `NarrationTrack`:

```ts
provider?: NarrationProvider
modelId?: string
```

They remain optional so existing in-memory and serialized data stay source-compatible.

- [ ] **Step 2: Add provider metadata to the shared builder**

Add to `BuildNarrationResultInput`:

```ts
provider: NarrationProviderId
modelId?: string
```

Set both fields on the `NarrationTrack` object created by `buildNarrationResult`. Update the HeadTTS call:

```ts
provider: 'headtts',
modelId: 'headtts-1.3.0',
```

- [ ] **Step 3: Default legacy projects to HeadTTS**

In both branches of `normalizeNarrationTrack`, add:

```ts
provider: t.provider === 'local' ? 'local' : 'headtts',
modelId: typeof t.modelId === 'string' ? t.modelId : undefined,
```

For the legacy-segment branch, set:

```ts
provider: 'headtts',
modelId: undefined,
```

- [ ] **Step 4: Save identical metadata in explicit save and autosave**

Immediately after `text` in each manually serialized narration object in `useProjectIO.ts` and `useAutosave.ts`, add:

```ts
provider: narrationTrack.provider ?? 'headtts',
modelId: narrationTrack.modelId,
```

Use `options.narrationTrack` in `useProjectIO.ts` and `narrationTrack` in `useAutosave.ts`. Do not change audio serialization.

- [ ] **Step 5: Verify compatibility**

Run:

```bash
npm run build
```

Expected: successful build; no changes to project version numbers or audio encoding.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/tts/types.ts src/lib/tts/narrationBuilder.ts src/hooks/useheadTTS.ts src/lib/projectNormalize.ts src/hooks/useProjectIO.ts src/hooks/useAutosave.ts
git commit -m "feat: persist narration provider metadata"
```

## Task 3: Add the loopback API client and WAV decoder

**Files:**

- Create: `src/lib/tts/localTtsProvider.ts`

- [ ] **Step 1: Define strict API response types**

Implement:

```ts
export const LOCAL_TTS_BASE_URL = 'http://127.0.0.1:17860'
export const LOCAL_TTS_DOWNLOAD_URL =
  'https://github.com/acer1456/image-shot-video-generator/releases/latest/download/Artful-Learning-TTS-macOS-arm64.dmg'

export interface LocalHealth {
  service: 'artful-learning-tts'
  version: string
  ready: boolean
  activeTaskId: string | null
}

export interface LocalModelCapability {
  id: string
  name: string
  installed: boolean
  recommended: boolean
  downloadBytes: number
  memoryLabel: string
}

export interface LocalCapabilities {
  device: {
    architecture: string
    chip: string
    memoryBytes: number
    freeDiskBytes: number
    macosVersion: string
    mlxAvailable: boolean
  }
  models: LocalModelCapability[]
  activeModelId: string | null
  alignerInstalled: boolean
  languages: string[]
  voices: Array<{ id: string; name: string; languages: string[] }>
  parameters: {
    speed: { min: number; max: number; step: number }
    temperature: { min: number; max: number; step: number }
    topP: { min: number; max: number; step: number }
  }
}
```

Use a generic `requestJson<T>` helper that:

- uses `AbortSignal`;
- sends `Accept: application/json`;
- sends `Content-Type: application/json` only when a body exists;
- rejects non-2xx responses using `{ error: { code, message } }`;
- never accepts a caller-supplied base URL.

- [ ] **Step 2: Implement explicit methods**

Export only:

```ts
export function getLocalHealth(signal?: AbortSignal): Promise<LocalHealth>
export function getLocalCapabilities(signal?: AbortSignal): Promise<LocalCapabilities>
export function startModelDownload(modelId: string, signal?: AbortSignal): Promise<{ taskId: string }>
export function startLocalNarration(request: LocalNarrationRequest, signal?: AbortSignal): Promise<{ taskId: string }>
export function getLocalTask(taskId: string, signal?: AbortSignal): Promise<LocalTask>
export function cancelLocalTask(taskId: string, signal?: AbortSignal): Promise<void>
export function getLocalTaskResult(taskId: string, signal?: AbortSignal): Promise<LocalNarrationResult>
```

`taskId` and `modelId` must be inserted with `encodeURIComponent`.

- [ ] **Step 3: Decode WAV without adding a dependency**

Implement:

```ts
export async function decodeWavBase64(
  value: string,
  context?: AudioContext,
): Promise<{
  audioData: Float32Array
  sampleRate: number
}> {
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0))
  const decoder = context ?? new AudioContext()
  try {
    const buffer = await decoder.decodeAudioData(bytes.buffer.slice(0))
    return {
      audioData: new Float32Array(buffer.getChannelData(0)),
      sampleRate: buffer.sampleRate,
    }
  } finally {
    if (!context) await decoder.close()
  }
}
```

Reject an empty base64 string before creating `AudioContext`.

- [ ] **Step 4: Verify**

Run:

```bash
npm run build
```

Expected: successful build and no new package dependency.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tts/localTtsProvider.ts
git commit -m "feat: add local TTS API client"
```

## Task 4: Add the local-provider hook and provider selector

**Files:**

- Create: `src/hooks/useLocalTTS.ts`
- Create: `src/hooks/useNarrationTTS.ts`
- Modify: `src/hooks/useheadTTS.ts`

- [ ] **Step 1: Implement local connection state**

`useLocalTTS` must expose:

```ts
export interface LocalGenerationOptions {
  language: string
  voice: string
  emotion: 'natural' | 'warm' | 'calm' | 'joyful' | 'dramatic' | 'custom'
  emotionIntensity: number
  styleInstruction: string
  speed: number
  pauseIntensity: number
  seed: number
  temperature: number
  topP: number
}

export function useLocalTTS(): {
  status: NarrationProviderStatus
  health: LocalHealth | null
  capabilities: LocalCapabilities | null
  connect: () => Promise<void>
  downloadModel: (modelId: string) => Promise<void>
  generate: (text: string, options: LocalGenerationOptions) => Promise<NarrationGenerationResult>
  cancel: () => Promise<void>
}
```

Connection rules:

- no polling on mount;
- `connect()` requests `/health`, then `/v1/capabilities`;
- while explicitly connecting, retry every 750 ms for at most 20 seconds;
- on unmount, abort the request and clear the timer;
- opening the custom scheme is a UI action, not part of this hook.

- [ ] **Step 2: Implement deterministic emotion instructions**

Keep templates in a single versioned constant:

```ts
const EMOTION_TEMPLATES_V1 = {
  natural: 'Natural, clear museum narration.',
  warm: 'Warm, intimate museum narration.',
  calm: 'Calm, measured museum narration.',
  joyful: 'Joyful, bright museum narration.',
  dramatic: 'Dramatic, cinematic museum narration.',
} as const

const INTENSITY_MODIFIERS = ['slightly', 'clearly', 'strongly'] as const
```

Map intensity `0..100` to:

- `0..32`: `slightly`;
- `33..66`: `clearly`;
- `67..100`: `strongly`.

For `custom`, send the trimmed custom instruction unchanged. For presets, prepend the modifier and append the optional style instruction. Do not use an LLM.

- [ ] **Step 3: Implement one-task polling and result normalization**

Generation flow:

1. Parse text with `parseNarrationSpeechSegments`.
2. POST the segments and local options.
3. Poll every 500 ms.
4. Map `queued`, `running`, and task progress into provider status.
5. On `failed` or `cancelled`, throw the stable service error.
6. Fetch the result only after `completed`.
7. Decode every WAV before constructing a track.
8. Call `buildNarrationResult` with `provider: 'local'`.
9. Set `phonemes: []`.

Decode segments sequentially through one `AudioContext`, close it in `finally`, and only then call `buildNarrationResult`. This avoids opening many audio contexts or holding duplicate decoded buffers on 8 GB systems.

- [ ] **Step 4: Add a common selector without moving UI state**

`useNarrationTTS.ts` should instantiate both hooks once and return:

```ts
export function useNarrationTTS(provider: NarrationProviderId) {
  const browser = useheadTTS()
  const local = useLocalTTS()
  return {
    active: provider === 'local' ? local : browser,
    browser,
    local,
  }
}
```

Update `useheadTTS` to expose the same common `status`, `cancel`, and `voices` naming. Keep its existing positional `generate` signature until the sidebar integration task; do not force local-only fields into HeadTTS.

- [ ] **Step 5: Verify**

Run:

```bash
npm run build
```

Expected: successful build; opening the app does not contact port 17860 yet because the sidebar still uses `useheadTTS`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useLocalTTS.ts src/hooks/useNarrationTTS.ts src/hooks/useheadTTS.ts
git commit -m "feat: add modular narration provider hooks"
```

## Task 5: Add Browser and Local Server tabs to the narration sidebar

**Files:**

- Modify: `src/components/panel/NarrationSidebar.tsx`
- Reuse: `src/components/ui/tabs.tsx`

- [ ] **Step 1: Add provider state with a backward-compatible initial value**

Replace the direct `useheadTTS()` call with:

```ts
const [provider, setProvider] = useState<NarrationProviderId>(() => {
  if (track?.provider === 'local') return 'local'
  return localStorage.getItem('narration_tts_provider') === 'local' ? 'local' : 'headtts'
})
const { browser, local } = useNarrationTTS(provider)
```

Persist provider changes under `narration_tts_provider`. When loading a track, update the selected provider only if `track.provider` is present.

When `provider` changes to `local`, call `local.connect()` once from an effect. Do not retry after the explicit 20-second connection window ends, and do not poll while `provider === 'headtts'`.

- [ ] **Step 2: Add the tabs and fixed download link**

Under the sidebar header, add:

```tsx
<Tabs
  value={provider}
  onValueChange={value => setProvider(value as NarrationProviderId)}
>
  <TabsList className="mx-3 mt-3 grid grid-cols-2">
    <TabsTrigger value="headtts">瀏覽器</TabsTrigger>
    <TabsTrigger value="local">本地伺服器</TabsTrigger>
  </TabsList>
</Tabs>
```

Add a compact link immediately below it:

```tsx
<a
  href={LOCAL_TTS_DOWNLOAD_URL}
  className="mx-3 mt-2 text-[11px] text-primary hover:underline"
>
  下載 Apple 晶片版 TTS 服務
</a>
```

- [ ] **Step 3: Render the four approved local states**

Keep the existing prompt editor and subtitle editor. Replace only the provider control area:

1. **Unavailable:** download link, first-launch right-click instruction, and button:

   ```ts
   window.location.href = 'artful-learning-tts://open'
   void local.connect()
   ```

2. **Connected/downloading:** selected model, aligner status, progress bar, cancel button, dashboard link.
3. **Ready:** model, language, voice, emotion, intensity, style, speed, pause, and collapsed advanced controls.
4. **Recoverable failure:** message plus Retry, use 0.6B, and switch to Browser actions.

The dashboard link is fixed to `http://127.0.0.1:17860`; use `target="_blank"` and `rel="noreferrer"`.

- [ ] **Step 4: Wire provider-specific generation**

For Browser:

```ts
result = await browser.generate(trimmed, voice, speed, pauseIntensity)
```

For Local:

```ts
result = await local.generate(trimmed, {
  language,
  voice: localVoice,
  emotion,
  emotionIntensity,
  styleInstruction,
  speed,
  pauseIntensity,
  seed,
  temperature,
  topP,
})
```

Crucially, remove the pre-generation calls that clear the track and cues. Apply the result only after the awaited generation succeeds:

```ts
const result = await generateSelectedProvider()
onTrackChange(result.track)
if (shouldCreateSubtitles) {
  onSubtitleCuesChange(result.subtitleCues)
  onActiveSubtitleIdChange(result.subtitleCues[0]?.id ?? null)
}
```

If generation fails, retain the old track, old cues, and active cue.

- [ ] **Step 5: Keep provider-specific voice selections separate**

Use:

```ts
const [browserVoice, setBrowserVoice] = useState(
  track?.provider !== 'local' ? track?.voice ?? 'af_heart' : 'af_heart',
)
const [localVoice, setLocalVoice] = useState(
  track?.provider === 'local' ? track.voice : 'Ryan',
)
```

Do not reuse a local speaker ID as a HeadTTS voice ID or vice versa.

- [ ] **Step 6: Verify**

Run:

```bash
npm run build
```

Expected: successful build. Browser tab generates through HeadTTS. Local tab shows unavailable state when no companion runs. The sidebar header contains the exact release URL.

- [ ] **Step 7: Commit**

```bash
git add src/components/panel/NarrationSidebar.tsx
git commit -m "feat: add browser and local narration tabs"
```

## Task 6: Establish the desktop Python package and stable contracts

**Files:**

- Create: `desktop/tts-companion/requirements.in`
- Create: `desktop/tts-companion/app/__init__.py`
- Create: `desktop/tts-companion/app/contracts.py`
- Create: `desktop/tts-companion/tests/__init__.py`
- Create: `desktop/tts-companion/tests/test_contracts.py`
- Generate: `desktop/tts-companion/requirements.lock`
- Modify: `.gitignore`

- [ ] **Step 1: Add bounded dependencies**

Create `requirements.in`:

```text
fastapi>=0.116,<1
huggingface-hub[hf_xet]>=0.34,<1
httpx>=0.28,<1
mlx-audio>=0.3.1,<0.4
pyinstaller>=6.15,<7
rumps>=0.4,<1
uvicorn>=0.35,<1
```

- [ ] **Step 2: Write failing contract tests**

`test_contracts.py` must assert:

- unknown narration request fields are rejected;
- an empty segment list is rejected;
- more than 100 segments is rejected;
- total text beyond 20,000 characters is rejected;
- `pauseAfterMs` outside `0..5000` is rejected;
- speed accepts only `0.6..1.6`;
- temperature accepts only `0.1..1.5`;
- top-p accepts only `0.1..1.0`;
- stable busy payload is `{ "error": { "code": "TASK_BUSY", "message": "已有任務正在執行" } }`.

Run:

```bash
cd desktop/tts-companion
python3.12 -m unittest tests.test_contracts -v
```

Expected: `ModuleNotFoundError: No module named 'app.contracts'`.

- [ ] **Step 3: Implement exact Pydantic contracts**

Use `ConfigDict(extra='forbid')` on every request model. Define:

```py
ErrorCode = Literal[
    "SERVICE_NOT_READY",
    "MODEL_NOT_READY",
    "MODEL_NOT_SUPPORTED",
    "TASK_BUSY",
    "INSUFFICIENT_MEMORY",
    "INSUFFICIENT_DISK",
    "DOWNLOAD_FAILED",
    "GENERATION_FAILED",
    "ALIGNMENT_FAILED",
    "GENERATION_CANCELLED",
]

class NarrationSegmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=2000)
    pauseAfterMs: int = Field(default=0, ge=0, le=5000)

class NarrationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    segments: list[NarrationSegmentRequest] = Field(min_length=1, max_length=100)
    language: Literal["Chinese", "English", "Japanese", "Korean", "French", "German", "Spanish"]
    speaker: str = Field(min_length=1, max_length=64)
    instruction: str = Field(default="", max_length=1000)
    speed: float = Field(default=1, ge=0.6, le=1.6)
    seed: int = Field(default=42, ge=0, le=2147483647)
    temperature: float = Field(default=0.9, ge=0.1, le=1.5)
    topP: float = Field(default=0.95, ge=0.1, le=1)
```

Add a model validator that rejects combined segment text beyond 20,000 characters. Use camelCase aliases for JSON fields and `populate_by_name=True`.

Define response models in the same file so the API and synthesis layer share one schema:

```py
class WordTimestamp(BaseModel):
    word: str
    startTime: float = Field(ge=0)
    duration: float = Field(gt=0)

class NarrationResultSegment(BaseModel):
    id: str
    text: str
    startTime: float = Field(ge=0)
    duration: float = Field(gt=0)
    sampleRate: int = Field(gt=0)
    wavBase64: str = Field(min_length=1)
    pauseAfterMs: int = Field(ge=0, le=5000)
    words: list[WordTimestamp]

class NarrationResult(BaseModel):
    modelId: str
    segments: list[NarrationResultSegment] = Field(min_length=1)

class ApiError(RuntimeError):
    def __init__(self, code: ErrorCode, message: str, status_code: int) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
```

- [ ] **Step 4: Lock and install dependencies**

Before creating the environment, add these repository ignore rules:

```gitignore
.venv/
desktop/tts-companion/build/
desktop/tts-companion/models/
```

Run:

```bash
cd desktop/tts-companion
python3.12 -m venv .venv
.venv/bin/python -m pip install pip-tools==7.5.0
.venv/bin/pip-compile --generate-hashes --output-file requirements.lock requirements.in
.venv/bin/pip install --require-hashes -r requirements.lock
```

Expected: lockfile generated and dependencies installed. If MLX-Audio resolution fails, stop and adjust only compatible version bounds; do not remove hashes.

- [ ] **Step 5: Run tests**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest discover -s tests -v
```

Expected: all contract tests pass.

- [ ] **Step 6: Commit**

```bash
git add .gitignore desktop/tts-companion/requirements.in desktop/tts-companion/requirements.lock desktop/tts-companion/app/__init__.py desktop/tts-companion/app/contracts.py desktop/tts-companion/tests/__init__.py desktop/tts-companion/tests/test_contracts.py
git commit -m "feat: define local TTS service contracts"
```

## Task 7: Implement the one-active-task state machine

**Files:**

- Create: `desktop/tts-companion/app/tasks.py`
- Create: `desktop/tts-companion/tests/test_tasks.py`

- [ ] **Step 1: Write failing task tests**

Cover:

- first task starts as `queued`;
- second task raises `TASK_BUSY`;
- progress is monotonic and clamped to `0..100`;
- completed result is retrievable;
- failed task stores stable code and message;
- cancellation sets an event visible to the worker;
- cancelling a completed task is a no-op;
- terminal task releases the active slot.

Run:

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_tasks -v
```

Expected: import failure.

- [ ] **Step 2: Implement the state machine**

Use only `dataclasses`, `threading.Lock`, `threading.Event`, `time`, and `uuid`.

Public API:

```py
class TaskBusyError(RuntimeError):
    code = "TASK_BUSY"

@dataclass
class TaskRecord:
    id: str
    kind: Literal["download", "narration"]
    state: Literal["queued", "running", "completed", "failed", "cancelled"]
    progress: int
    message: str
    error_code: str | None
    result: dict[str, object] | None
    cancel_event: Event
    created_at: float

class TaskManager:
    def begin(self, kind: Literal["download", "narration"]) -> TaskRecord
    def mark_running(self, task_id: str, message: str) -> None
    def update(self, task_id: str, progress: int, message: str) -> None
    def complete(self, task_id: str, result: dict[str, object]) -> None
    def fail(self, task_id: str, code: str, message: str) -> None
    def cancel(self, task_id: str) -> None
    def get(self, task_id: str) -> TaskRecord
    def active_task_id(self) -> str | None
```

Keep records in memory for the app lifetime. Return copies from `get` so HTTP serialization cannot mutate state.

- [ ] **Step 3: Verify and commit**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_tasks -v
git add app/tasks.py tests/test_tasks.py
git commit -m "feat: add local TTS task manager"
```

Expected: all task tests pass.

## Task 8: Implement device inspection and allowlisted model management

**Files:**

- Create: `desktop/tts-companion/app/models.py`
- Create: `desktop/tts-companion/tests/test_models.py`

- [ ] **Step 1: Write failing tests with injected fakes**

Cover:

- 8 GB recommends 0.6B;
- 16 GB and 32 GB recommend 1.7B;
- non-arm64 marks service unsupported;
- unknown model ID raises `MODEL_NOT_SUPPORTED`;
- insufficient disk accounts for TTS plus required aligner plus 15% headroom;
- download uses exact repository and pinned revision;
- download target is `model-id.partial`;
- activation writes `manifest.json`, then atomically renames to final directory;
- cancellation leaves the partial directory and does not replace an installed model;
- active configuration uses write-to-temp then `os.replace`;
- installed status requires the manifest plus every expected file.

- [ ] **Step 2: Implement constants and pure recommendation logic**

Define immutable `ModelSpec` records and:

```py
MODEL_SPECS: dict[str, ModelSpec]
ALIGNER_ID = "qwen3-forced-aligner-0.6b-8bit"

def recommend_tts_model(memory_bytes: int) -> str:
    return (
        "qwen3-tts-1.7b-customvoice-4bit"
        if memory_bytes >= 16 * 1024**3
        else "qwen3-tts-0.6b-customvoice-4bit"
    )
```

Inspect:

- architecture with `platform.machine()`;
- chip with `sysctl -n machdep.cpu.brand_string`;
- physical memory with `sysctl -n hw.memsize`;
- macOS with `platform.mac_ver()`;
- disk with `shutil.disk_usage(model_root).free`;
- MLX import availability with `importlib.util.find_spec("mlx")`.

Inject command runner, downloader, and disk reader into `ModelManager` so tests do not need macOS or network.

- [ ] **Step 3: Implement resumable, atomic downloads**

Call:

```py
snapshot_download(
    repo_id=spec.repo_id,
    revision=spec.revision,
    local_dir=partial_dir,
    resume_download=True,
)
```

The progress adapter may report bytes when available; otherwise keep the task message at `正在下載模型…` and set progress to `10..85`. Verification occupies `86..95`, atomic activation `96..100`.

The TTS download endpoint must also ensure the aligner is installed. Do not expose a separate arbitrary repository endpoint.

- [ ] **Step 4: Verify and commit**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_models -v
git add app/models.py tests/test_models.py
git commit -m "feat: manage allowlisted local TTS models"
```

Expected: all model tests pass without downloading model weights.

## Task 9: Implement synthesis, memory policy, WAV encoding, and alignment

**Files:**

- Create: `desktop/tts-companion/app/synthesis.py`
- Create: `desktop/tts-companion/tests/test_synthesis.py`

- [ ] **Step 1: Write failing tests against fake backends**

Inject a `TtsBackend`, `AlignerBackend`, and `MemoryController`. Cover:

- each input speech segment is synthesized independently;
- output `startTime` includes preceding segment audio plus `pauseAfterMs`;
- WAV is mono PCM16 with the declared sample rate;
- aligned words are segment-relative in service output;
- no phoneme field is emitted;
- cancellation is checked before model load, before every segment, after synthesis, and before alignment;
- alignment failure raises `ALIGNMENT_FAILED`;
- synthesis failure raises `GENERATION_FAILED`;
- 8 GB policy unloads TTS before aligner load;
- 16 GB policy keeps TTS loaded but unloads aligner when resident memory exceeds 75% of physical memory.

- [ ] **Step 2: Implement provider-independent synthesis orchestration**

Public API:

```py
class SynthesisService:
    def synthesize(
        self,
        request: NarrationRequest,
        *,
        model_id: str,
        cancel_event: Event,
        progress: Callable[[int, str], None],
    ) -> NarrationResult:
        """Generate segment audio, run forced alignment, and return validated output."""
```

The orchestrator, not the FastAPI route, owns:

- lazy TTS load;
- per-segment generation;
- PCM normalization;
- WAV encoding;
- pause-derived timeline offsets;
- TTS unload policy;
- forced alignment;
- word normalization;
- cancellation checks;
- final result validation.

- [ ] **Step 3: Keep MLX imports behind adapters**

Put MLX-Audio-specific imports inside adapter load methods so `--self-test` and ordinary unit tests do not load models:

```py
from mlx_audio.tts.utils import load_model as load_tts_model
from mlx_audio.stt.utils import load_model as load_stt_model
```

If the installed MLX-Audio version exposes a different forced-aligner entrypoint, adapt only `MlxAlignerBackend`. Preserve the `AlignerBackend.align(audio, sample_rate, text, language)` contract and its tests.

For TTS, normalize the installed MLX-Audio generator into:

```py
audio = backend.generate(
    text=segment.text,
    language=request.language,
    speaker=request.speaker,
    instruction=request.instruction,
    seed=request.seed,
    temperature=request.temperature,
    top_p=request.topP,
)
```

Do not implement speed with resampling; include the target in the instruction.

- [ ] **Step 4: Encode WAV with the standard library**

Use `wave`, `io.BytesIO`, `base64`, and clipped PCM16 conversion. The result schema per segment is:

```py
{
    "id": str(uuid4()),
    "text": segment.text,
    "startTime": round(start_time, 6),
    "duration": round(len(audio) / sample_rate, 6),
    "sampleRate": sample_rate,
    "wavBase64": encoded_wav,
    "pauseAfterMs": segment.pauseAfterMs,
    "words": [
        {
            "word": word.text,
            "startTime": round(word.start_time, 6),
            "duration": round(word.duration, 6),
        }
    ],
}
```

- [ ] **Step 5: Verify and commit**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_synthesis -v
git add app/synthesis.py tests/test_synthesis.py
git commit -m "feat: synthesize and align local narration"
```

Expected: tests pass using fake arrays; no model download or MLX allocation occurs.

## Task 10: Implement the loopback FastAPI service and security boundary

**Files:**

- Create: `desktop/tts-companion/app/server.py`
- Create: `desktop/tts-companion/tests/test_server.py`

- [ ] **Step 1: Write failing API tests**

Build the app with fake model and synthesis services. Cover:

- `GET /health`;
- `GET /v1/capabilities`;
- valid model download starts a task;
- unknown model returns `MODEL_NOT_SUPPORTED`;
- second active request returns `TASK_BUSY`;
- narration starts, polls, and returns a result;
- cancel changes task state;
- result before completion returns `SERVICE_NOT_READY`;
- unknown narration fields return 422;
- non-JSON mutation returns 415;
- narration body over 256 KiB returns 413;
- allowed production and Vite origins receive CORS headers;
- an unapproved origin receives no CORS allow-origin header;
- OPTIONS includes `Access-Control-Allow-Private-Network: true` when requested;
- no route accepts a URL or path parameter other than allowlisted `model_id` and generated `task_id`.

- [ ] **Step 2: Implement dependency-injected app creation**

Use:

```py
ALLOWED_ORIGINS = {
    "https://acer1456.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

def create_app(
    *,
    model_manager: ModelManager,
    synthesis_service: SynthesisService,
    task_manager: TaskManager,
) -> FastAPI:
    """Construct the API without opening a network listener."""
```

The production origin must match the deployed Pages origin. If deploy configuration proves the app uses a more specific origin, replace this constant before release; never use `*`.

- [ ] **Step 3: Run work outside the event loop**

Use one `ThreadPoolExecutor(max_workers=1)`. A route starts a task, submits a closure, and returns `202 { "taskId": "generated-uuid" }`. The worker closure owns terminal state updates.

Map stable error codes consistently:

| Code | HTTP |
|---|---:|
| `MODEL_NOT_SUPPORTED` | 404 |
| `TASK_BUSY` | 409 |
| `SERVICE_NOT_READY`, `MODEL_NOT_READY` | 409 |
| `INSUFFICIENT_MEMORY`, `INSUFFICIENT_DISK` | 422 |
| `GENERATION_CANCELLED` | 409 |
| `DOWNLOAD_FAILED`, `GENERATION_FAILED`, `ALIGNMENT_FAILED` | 500 |

Do not use FastAPI `BackgroundTasks` for model inference because cancellation and the one-worker invariant need explicit ownership.

- [ ] **Step 4: Add body, content-type, and PNA middleware**

Middleware order:

1. request-size rejection from `Content-Length` plus a guarded body read;
2. JSON content-type check for POST/DELETE requests with bodies;
3. explicit origin CORS;
4. PNA response header for approved preflights.

Bind enforcement belongs in `main.py`; the app factory itself must not start a listener.

- [ ] **Step 5: Verify and commit**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_server -v
git add app/server.py tests/test_server.py
git commit -m "feat: expose secured loopback TTS API"
```

Expected: all API tests pass; tests use no network listener and no model weights.

## Task 11: Add the static management interface

**Files:**

- Create: `desktop/tts-companion/app/static/index.html`
- Create: `desktop/tts-companion/app/static/styles.css`
- Create: `desktop/tts-companion/app/static/app.js`
- Modify: `desktop/tts-companion/app/server.py`
- Create: `desktop/tts-companion/tests/test_static_ui.py`

- [ ] **Step 1: Add static-route tests**

Assert:

- `/` returns the management page;
- CSS and JS are served with correct content types;
- the page contains service status, device cards, both model IDs, aligner status, download controls, test text, and audio preview;
- no external script, stylesheet, font, analytics, or CDN URL exists.

- [ ] **Step 2: Implement the single-page dashboard**

Use semantic HTML and CSS variables. The page must show:

- green/amber/red service status;
- local URL;
- chip, memory, macOS, MLX, and free-disk values;
- recommended model visually highlighted;
- explicit override button on the other model;
- aligner installed state;
- download progress and cancel;
- test text, language, speaker, instruction, speed, temperature, top-p, generate, and audio element;
- insufficient-memory recovery copy.

All fetch calls use relative paths. Do not duplicate the service base URL in JavaScript.

- [ ] **Step 3: Mount static files**

Resolve static assets from:

```py
Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent)) / "static"
```

Use the source-tree `app/static` directory when not bundled.

- [ ] **Step 4: Verify and commit**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_static_ui -v
git add app/static app/server.py tests/test_static_ui.py
git commit -m "feat: add local TTS management dashboard"
```

Expected: static tests pass and the page has no remote asset dependencies.

## Task 12: Add menu-bar lifecycle, custom URL handling, and self-test

**Files:**

- Create: `desktop/tts-companion/app/main.py`
- Create: `desktop/tts-companion/tests/test_main.py`

- [ ] **Step 1: Write lifecycle tests around injected side effects**

Cover:

- a second instance exits without starting a server;
- listener host is exactly `127.0.0.1`;
- listener port is exactly `17860`;
- first launch opens the dashboard;
- `artful-learning-tts://open` opens the dashboard;
- restart stops and starts the server thread;
- quit releases the single-instance lock;
- `--self-test` starts the app factory, requests `/health`, prints `SELF_TEST_OK`, and exits without menu-bar or model loading.

- [ ] **Step 2: Implement a small lifecycle controller**

Use:

- `fcntl.flock` on `~/Library/Application Support/Artful Learning TTS/service.lock`;
- a daemon thread for Uvicorn;
- `webbrowser.open("http://127.0.0.1:17860")`;
- `rumps.App` with status, open, restart, and quit menu items;
- `sys.argv` parsing for `--self-test` and URL arguments.

Register a real macOS URL event handler through PyObjC:

```py
NSAppleEventManager.sharedAppleEventManager().setEventHandler_andSelector_forEventClass_andEventID_(
    url_handler,
    "handleGetURLEvent:withReplyEvent:",
    kInternetEventClass,
    kAEGetURL,
)
```

The handler accepts only `artful-learning-tts://open` and opens the dashboard. Keep the `sys.argv` URL path as a cold-launch fallback. Record first launch in `~/Library/Application Support/Artful Learning TTS/settings.json` using an atomic write; open the dashboard automatically only when that flag is absent or setup is incomplete.

Keep menu items free of model-management logic.

- [ ] **Step 3: Verify locally**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_main -v
.venv/bin/python -m app.main --self-test
```

Expected final line:

```text
SELF_TEST_OK
```

- [ ] **Step 4: Commit**

```bash
git add app/main.py tests/test_main.py
git commit -m "feat: add macOS TTS menu bar lifecycle"
```

## Task 13: Package the Apple Silicon app and add third-party notices

**Files:**

- Create: `desktop/tts-companion/pyinstaller.spec`
- Create: `desktop/tts-companion/THIRD_PARTY_NOTICES.md`
- Create: `desktop/tts-companion/scripts/sign-app.sh`
- Create: `desktop/tts-companion/scripts/build-dmg.sh`
- Create: `desktop/tts-companion/tests/test_bundle_config.py`

- [ ] **Step 1: Add bundle-configuration tests**

Parse the spec and assert:

- bundle name is `Artful Learning TTS.app`;
- bundle identifier is `cc.artlearning.tts`;
- architecture is `arm64`;
- static assets and notices are included;
- URL scheme is `artful-learning-tts`;
- `LSUIElement` is true;
- build mode is `onedir`, not onefile.

- [ ] **Step 2: Implement the PyInstaller spec**

The `BUNDLE` `info_plist` must include:

```py
{
    "CFBundleDisplayName": "Artful Learning TTS",
    "CFBundleIdentifier": "cc.artlearning.tts",
    "CFBundleShortVersionString": os.environ.get("TTS_VERSION", "0.0.0"),
    "LSMinimumSystemVersion": "13.0",
    "LSUIElement": True,
    "CFBundleURLTypes": [
        {
            "CFBundleURLName": "cc.artlearning.tts",
            "CFBundleURLSchemes": ["artful-learning-tts"],
        }
    ],
}
```

Collect MLX-Audio, MLX, Hugging Face Hub, Uvicorn, FastAPI, and rumps submodules only when PyInstaller analysis requires them. Do not blindly collect every installed package.

- [ ] **Step 3: Add deterministic signing and DMG scripts**

`sign-app.sh` must:

1. verify the app path;
2. find nested `.dylib`, `.so`, and executable Mach-O files;
3. ad-hoc sign nested binaries deepest-first with `codesign --force --sign -`;
4. sign the app bundle;
5. run `codesign --verify --deep --strict --verbose=2`.

`build-dmg.sh` must:

1. create a clean staging directory;
2. copy the app;
3. add an `/Applications` symlink;
4. call `hdiutil create -format UDZO`;
5. output exactly `Artful-Learning-TTS-macOS-arm64.dmg`;
6. run `shasum -a 256` into `.dmg.sha256`.

- [ ] **Step 4: Add notices**

Include project name, license, source URL, and purpose for:

- Qwen3-TTS;
- Qwen3 Forced Aligner/Qwen3-ASR;
- MLX-Audio;
- MLX;
- FastAPI;
- Uvicorn;
- rumps;
- Hugging Face Hub;
- PyInstaller.

Do not copy full licenses into the notices file unless their license requires it; include required license texts as separate bundled files when applicable.

- [ ] **Step 5: Verify and commit**

```bash
cd desktop/tts-companion
.venv/bin/python -m unittest tests.test_bundle_config -v
git add pyinstaller.spec THIRD_PARTY_NOTICES.md scripts tests/test_bundle_config.py
git commit -m "build: package Apple Silicon TTS companion"
```

Expected: bundle configuration tests pass. Actual `.app` build is deferred to an Apple Silicon build step.

## Task 14: Add the GitHub Actions release workflow

**Files:**

- Create: `.github/workflows/release-tts-macos.yml`

- [ ] **Step 1: Add trigger and permissions**

Use:

```yaml
name: Release macOS TTS Companion

on:
  workflow_dispatch:
  push:
    tags:
      - "tts-v*"

permissions:
  contents: write
```

The single job runs on `macos-26`.

- [ ] **Step 2: Add exact build stages**

Stages:

1. `actions/checkout`.
2. `actions/setup-python` with Python 3.12 and pip cache keyed by `requirements.lock`.
3. Derive `TTS_VERSION` from the `tts-v` tag, or use `0.0.0-dev` for manual runs.
4. `pip install --require-hashes -r requirements.lock`.
5. `python -m unittest discover -s tests -v`.
6. `pyinstaller pyinstaller.spec --noconfirm`.
7. `scripts/sign-app.sh "dist/Artful Learning TTS.app"`.
8. `codesign --verify --deep --strict`.
9. `"dist/Artful Learning TTS.app/Contents/MacOS/Artful Learning TTS" --self-test`.
10. `scripts/build-dmg.sh`.
11. Upload both DMG files as workflow artifacts.
12. For tag builds, publish with `softprops/action-gh-release`.

No model files or Hugging Face cache may be present in the release artifact.

- [ ] **Step 3: Add release notes**

Release body must state:

- Apple M-series only;
- macOS 13 or newer;
- models download after installation;
- first launch requires right-click → Open;
- ad-hoc signed and not notarized;
- localhost-only service;
- model and source license links.

- [ ] **Step 4: Validate YAML and commit**

Run:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/release-tts-macos.yml"); puts "YAML_OK"'
git add .github/workflows/release-tts-macos.yml
git commit -m "ci: release macOS TTS companion"
```

Expected final line:

```text
YAML_OK
```

## Task 15: Add a standalone frontend smoke test

**Files:**

- Create: `scripts/verify-local-tts-ui.mjs`

- [ ] **Step 1: Start Vite from the script**

Use Node's `child_process.spawn` to run:

```text
npm run dev -- --host 127.0.0.1 --port 4177
```

Wait for `http://127.0.0.1:4177` to respond, with a 30-second timeout. Kill the child in `finally`.

Because `playwright-core` does not download a browser, resolve the executable in this order:

1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`;
2. `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`;
3. `/Applications/Chromium.app/Contents/MacOS/Chromium`.

If none exists, fail with a direct installation/path message instead of silently skipping the smoke test.

- [ ] **Step 2: Stub only the fixed loopback routes**

With `playwright-core`, route `http://127.0.0.1:17860/**` and return deterministic fixtures for:

- `/health`;
- `/v1/capabilities`;
- `POST /v1/narrations`;
- `GET /v1/tasks/task-smoke`;
- `GET /v1/tasks/task-smoke/result`.

Generate a valid 24 kHz, mono, 100 ms silent PCM16 WAV in the script and base64-encode it. Do not commit a binary fixture.

- [ ] **Step 3: Assert the user flow**

The script must:

1. open the app at desktop viewport;
2. expand the narration panel if collapsed;
3. click **本地伺服器**;
4. click connect;
5. assert model, language, speaker, emotion, and advanced controls;
6. enter `Art changes how we see.`;
7. generate;
8. assert the narration duration and at least one subtitle card;
9. switch back to **瀏覽器**;
10. assert the HeadTTS voice selector still exists;
11. assert the download link exact `href`.

- [ ] **Step 4: Run the build and smoke test**

```bash
npm run build
node scripts/verify-local-tts-ui.mjs
```

Expected:

```text
LOCAL_TTS_UI_SMOKE_OK
```

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-local-tts-ui.mjs
git commit -m "test: verify local TTS narration UI"
```

## Task 16: Run the integrated verification matrix

**Files:**

- Modify only if verification exposes a scoped defect.

- [ ] **Step 1: Run all offline checks**

```bash
npm run build
node scripts/verify-local-tts-ui.mjs
cd desktop/tts-companion
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m app.main --self-test
```

Expected:

- Vite build succeeds.
- Browser smoke prints `LOCAL_TTS_UI_SMOKE_OK`.
- All Python tests pass.
- Self-test prints `SELF_TEST_OK`.

- [ ] **Step 2: Build locally on Apple Silicon**

```bash
cd desktop/tts-companion
uname -m
.venv/bin/pyinstaller pyinstaller.spec --noconfirm
scripts/sign-app.sh "dist/Artful Learning TTS.app"
"dist/Artful Learning TTS.app/Contents/MacOS/Artful Learning TTS" --self-test
scripts/build-dmg.sh
```

Expected:

- `uname -m` prints `arm64`.
- bundle self-test succeeds.
- DMG and SHA256 files exist.
- `lipo -archs` on bundled native binaries reports `arm64` and never `x86_64` only.

- [ ] **Step 3: Perform the real-model 16 GB acceptance check**

On an Apple Silicon Mac with at least 16 GB:

1. Install and right-click → Open.
2. Verify the menu-bar item and management page.
3. Download the recommended 1.7B model and aligner.
4. Generate at least three sentences with `[pause 800]`.
5. Confirm every returned word stays inside its segment duration.
6. Confirm the second segment starts after the first audio plus 800 ms.
7. Connect from the Vite app and generate the same text.
8. Drag and delete narration segments.
9. Save and reload the project.
10. Preview and export a video.
11. Switch to Browser and generate through HeadTTS.

- [ ] **Step 4: Perform the real-model 8 GB acceptance check**

On an 8 GB Apple Silicon Mac:

1. Verify 0.6B is recommended.
2. Generate multi-sentence narration.
3. Observe that TTS unload occurs before aligner load.
4. Confirm no process crash and no corrupted active model.
5. Trigger insufficient disk or memory through a controlled test fixture, then verify the recovery UI.

- [ ] **Step 5: Trigger the release workflow**

First run `workflow_dispatch`. Inspect artifact contents before tagging. Then:

```bash
git tag tts-v0.1.0
git push origin tts-v0.1.0
```

Expected GitHub Release assets:

```text
Artful-Learning-TTS-macOS-arm64.dmg
Artful-Learning-TTS-macOS-arm64.dmg.sha256
```

Download the release asset using the exact sidebar URL and verify its SHA256.

- [ ] **Step 6: Final scope audit**

Run:

```bash
git diff --stat 25fc8d3..HEAD
git status --short
```

Confirm:

- no edits to timeline, canvas, video render, or mixdown modules unless backed by a recorded verification failure;
- no model weights, `.venv`, `dist`, or build outputs are tracked;
- no wildcard CORS;
- no host other than `127.0.0.1`;
- no arbitrary repository, URL, path, shell, or upload endpoint;
- worktree is clean after the final commit.

## Implementation notes for execution

- If MLX-Audio's current Python API differs from the adapter assumptions, change only the two backend adapters and their real-model smoke path. Do not leak MLX objects into FastAPI routes or React types.
- Treat model revisions and dependency locks as release inputs. Updating them requires a dedicated commit plus the full desktop test suite and one real-model smoke test.
- A short aligner revision is accepted only during development. The first tagged release must pin its full SHA.
- `localhost` is not interchangeable with `127.0.0.1` for this feature. Use the numeric loopback address consistently in the service, web client, dashboard link, and verification.
- The frontend may display server progress, but it must not infer model installation from HTTP availability. `/v1/capabilities` is the source of truth.
- Existing loaded projects must play and export without the companion installed because their audio remains embedded or restored from IndexedDB.
