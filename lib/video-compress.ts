'use client'

/**
 * In-browser video compression via ffmpeg.wasm.
 *
 * Re-encodes the input to H.264/AAC MP4 at CRF 28 (visually-lossless web
 * default) and scales down to maxWidth so 4K phone clips don't get uploaded
 * as-is. Returns a new File, or the original if compression made it larger
 * or anything failed.
 *
 * Notes:
 *   - The ffmpeg core (~30 MB WASM) is fetched lazily on the first call and
 *     reused across subsequent compressions in the same session.
 *   - Core files come from unpkg; CSP must allow `blob:` script/worker and
 *     `https://unpkg.com` in connect-src (see next.config.ts).
 *   - Only call this on the client (it depends on Worker / WASM).
 */

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

const CORE_VERSION = '0.12.6'
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`

async function getFFmpeg(
  onLog?: (msg: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ff = new FFmpeg()
    if (onLog) ff.on('log', ({ message }) => onLog(message))
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    })
    ffmpegInstance = ff
    return ff
  })()

  return loadPromise
}

export interface CompressVideoOptions {
  /** Constant-rate factor — lower = better quality, larger file. 28 ≈ web default. */
  crf?: number
  /** Encoder speed/quality tradeoff. 'fast' is a good balance for in-browser. */
  preset?:
    | 'ultrafast'
    | 'superfast'
    | 'veryfast'
    | 'faster'
    | 'fast'
    | 'medium'
  /** Cap on the longer side of the output; aspect ratio is preserved. */
  maxWidth?: number
  /** 0 → 1 progress while encoding (does not include the WASM cold-start). */
  onProgress?: (ratio: number) => void
  /** Fires once ffmpeg has finished its (potentially slow) first-time load. */
  onReady?: () => void
}

export async function compressVideo(
  file: File,
  opts: CompressVideoOptions = {},
): Promise<File> {
  const crf = opts.crf ?? 28
  const preset = opts.preset ?? 'fast'
  const maxWidth = opts.maxWidth ?? 1280

  if (typeof window === 'undefined') return file

  try {
    const ff = await getFFmpeg()
    opts.onReady?.()

    const progressListener = ({ progress }: { progress: number }) => {
      if (opts.onProgress) opts.onProgress(Math.max(0, Math.min(1, progress)))
    }
    ff.on('progress', progressListener)

    const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() ?? '.mp4'
    const inputName = `input${ext}`
    const outputName = 'output.mp4'

    await ff.writeFile(inputName, await fetchFile(file))

    await ff.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-crf', String(crf),
      '-preset', preset,
      // Scale down if wider than maxWidth, keeping aspect ratio; -2 keeps
      // height a multiple of 2 (required by libx264).
      '-vf', `scale='min(${maxWidth},iw)':-2`,
      '-c:a', 'aac',
      '-b:a', '128k',
      // faststart relocates the MP4 moov atom to the start so the file
      // can begin playing before fully downloaded — important for web.
      '-movflags', '+faststart',
      outputName,
    ])

    const data = await ff.readFile(outputName)
    ff.off('progress', progressListener)

    // Clean the in-memory FS so subsequent compressions don't OOM.
    try { await ff.deleteFile(inputName) } catch {}
    try { await ff.deleteFile(outputName) } catch {}

    const bytes = data as Uint8Array
    const blob = new Blob([bytes as BlobPart], { type: 'video/mp4' })

    // If we somehow made the file bigger (already-compressed clips can do
    // this), keep the original.
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.mp4'
    return new File([blob], newName, {
      type: 'video/mp4',
      lastModified: Date.now(),
    })
  } catch (err) {
    console.error('[video-compress] failed, uploading original:', err)
    return file
  }
}
