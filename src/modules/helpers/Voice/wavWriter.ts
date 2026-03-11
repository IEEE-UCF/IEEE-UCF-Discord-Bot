import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { DecodedAudio } from './decode.ts';

// Default directory where recordings are saved, relative to the project root.
const DEFAULT_RECORDINGS_DIR = path.resolve(process.cwd(), 'recordings');

// Result returned after a WAV file is successfully written.
export interface WavWriteResult {
    // Absolute path to the written .wav file
    filePath: string;
    // File size in bytes (header + PCM data)
    fileSize: number;
    // Duration of the audio in seconds
    durationSeconds: number;
    // Discord user ID of the speaker
    userId: string;
}

/**
 * Options for customising where and how WAV files are written.
 */
export interface WavWriterOptions {
    /**
     * Directory to write recordings into.
     * Created automatically if it doesn't exist.
     * Default: `<project root>/recordings`
     */
    outputDir?: string;

    /**
     * Custom filename (without extension). If omitted a default name is
     * generated from the userId and a timestamp:
     * `<userId>-<epoch>.wav`
     */
    filename?: string;
}

/**
 * Write a DecodedAudio result from `decode.ts` to a WAV file on disk.
 *
 * The file is placed inside a `recordings/` directory (created if absent).
 * Returns metadata about the written file so downstream code (e.g. a
 * transcription service) knows where to find it and how long it is.
 */
export async function writeWav(
    audio: DecodedAudio,
    options: WavWriterOptions = {},
): Promise<WavWriteResult> {
    const outputDir = options.outputDir ?? DEFAULT_RECORDINGS_DIR;

    // Ensure the recordings directory exists
    if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
    }

    const filename = options.filename
        ? `${options.filename}.wav`
        : `${audio.userId}-${Date.now()}.wav`;

    const filePath = path.join(outputDir, filename);

    const header = buildWavHeader(audio);
    const wavBuffer = Buffer.concat([header, audio.pcm]);

    await writeFile(filePath, wavBuffer);

    const bytesPerSample = audio.bitDepth / 8;
    const totalSamples = audio.pcm.length / (bytesPerSample * audio.channels);
    const durationSeconds = totalSamples / audio.sampleRate;

    return {
        filePath,
        fileSize: wavBuffer.length,
        durationSeconds,
        userId: audio.userId,
    };
}

/**
 * Build a standard 44-byte RIFF/WAVE header for PCM audio.
 *
 * Layout (all values little-endian unless noted):
 * ```
 * Offset  Size  Field
 * ──────  ────  ─────────────────────────
 *  0       4    "RIFF"             (ASCII)
 *  4       4    File size − 8      (uint32)
 *  8       4    "WAVE"             (ASCII)
 * 12       4    "fmt "             (ASCII)
 * 16       4    Subchunk1 size     (16 for PCM)
 * 20       2    Audio format       (1 = PCM)
 * 22       2    Channels
 * 24       4    Sample rate
 * 28       4    Byte rate          (rate × channels × bitsPerSample / 8)
 * 32       2    Block align        (channels × bitsPerSample / 8)
 * 34       2    Bits per sample
 * 36       4    "data"             (ASCII)
 * 40       4    PCM data size      (uint32)
 * ```
 */
function buildWavHeader(audio: DecodedAudio): Buffer {
    const { sampleRate, channels, bitDepth, pcm } = audio;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = channels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcm.length;

    const header = Buffer.alloc(44);

    // RIFF chunk descriptor
    header.write('RIFF', 0, 'ascii');                     //  0: ChunkID
    header.writeUInt32LE(36 + dataSize, 4);               //  4: ChunkSize
    header.write('WAVE', 8, 'ascii');                     //  8: Format

    // "fmt " sub-chunk
    header.write('fmt ', 12, 'ascii');                    // 12: Subchunk1ID
    header.writeUInt32LE(16, 16);                         // 16: Subchunk1Size (PCM)
    header.writeUInt16LE(1, 20);                          // 20: AudioFormat (1 = PCM)
    header.writeUInt16LE(channels, 22);                   // 22: NumChannels
    header.writeUInt32LE(sampleRate, 24);                 // 24: SampleRate
    header.writeUInt32LE(byteRate, 28);                   // 28: ByteRate
    header.writeUInt16LE(blockAlign, 32);                 // 32: BlockAlign
    header.writeUInt16LE(bitDepth, 34);                   // 34: BitsPerSample

    // "data" sub-chunk
    header.write('data', 36, 'ascii');                    // 36: Subchunk2ID
    header.writeUInt32LE(dataSize, 40);                   // 40: Subchunk2Size

    return header;
}