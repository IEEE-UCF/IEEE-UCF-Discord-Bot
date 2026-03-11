import prism from 'prism-media';
import type { OpusPacket } from './audioListener.ts';

/**
 * Discord Opus audio constants.
 * All voice data from Discord is 48 kHz, stereo, 20 ms frames.
 */
export const DISCORD_SAMPLE_RATE = 48_000;
export const DISCORD_CHANNELS = 2;
export const DISCORD_FRAME_SIZE = 960; // samples per channel per 20 ms frame
export const BYTES_PER_SAMPLE = 2;     // 16-bit PCM = 2 bytes

// A contiguous PCM audio buffer with the metadata needed to write a WAV file.
export interface DecodedAudio {
    // Signed 16-bit little-endian interleaved PCM data
    pcm: Buffer;
    // Sample rate in Hz (48000) 
    sampleRate: number;
    // Number of audio channels (2 = stereo)
    channels: number;
    // Bits per sample (16)
    bitDepth: number;
    // Discord user ID of the speaker
    userId: string;
}

/**
 * Silence frame constant.
 * When the Opus decoder receives a gap between packets it needs a silent
 * frame to keep the timeline continuous. Discord sends 20 ms Opus frames,
 * so one silent frame = 960 samples * 2 channels * 2 bytes = 3840 bytes.
 */
const SILENT_FRAME_BYTES = DISCORD_FRAME_SIZE * DISCORD_CHANNELS * BYTES_PER_SAMPLE;
const SILENT_FRAME = Buffer.alloc(SILENT_FRAME_BYTES);

/**
 * Maximum gap (ms) between consecutive packets before inserting silence.
 * Normal Opus frame from Discord is 20 ms, so anything above ~25 ms
 * indicates a gap we should fill.
 */
const GAP_THRESHOLD_MS = 25;

/**
 * Decode a batch of Opus packets (from one speaking turn) into a single
 * contiguous PCM buffer. Main entry point feed the `packets` array you receive from `AudioListener.onUserEnd`.
 *
 * Gaps between packets are filled with silence so the resulting PCM
 * stays time-aligned and produces a clean WAV file.
 *
 * @param packets - Opus packets captured by AudioListener for a single user turn.
 * @param userId  - Discord user ID (carried through to the result).
 * @returns The decoded PCM audio ready to be handed to wavWriter.
 */
export function decodeOpusPackets(packets: OpusPacket[], userId: string): DecodedAudio {
    if (packets.length === 0) {
        return {
            pcm: Buffer.alloc(0),
            sampleRate: DISCORD_SAMPLE_RATE,
            channels: DISCORD_CHANNELS,
            bitDepth: 16,
            userId,
        };
    }

    const decoder = new prism.opus.Decoder({
        frameSize: DISCORD_FRAME_SIZE,
        channels: DISCORD_CHANNELS,
        rate: DISCORD_SAMPLE_RATE,
    });

    const pcmChunks: Buffer[] = [];

    for (let i = 0; i < packets.length; i++) {
        // Fill gaps with silence to keep the timeline continuous
        if (i > 0) {
            const gap = packets[i]!.timestamp - packets[i - 1]!.timestamp;
            if (gap > GAP_THRESHOLD_MS) {
                const silentFrames = Math.round(gap / 20) - 1; // subtract the normal frame
                for (let s = 0; s < silentFrames; s++) {
                    pcmChunks.push(SILENT_FRAME);
                }
            }
        }

        try {
            const pcm = decodeOpusFrame(decoder, packets[i]!.data);
            pcmChunks.push(pcm);
        } catch (err) {
            // If a single frame fails to decode, substitute silence so the
            // timeline stays intact instead of crashing the whole turn.
            console.warn(`[decode] Failed to decode frame ${i} for user ${userId}:`, err);
            pcmChunks.push(SILENT_FRAME);
        }
    }

    cleanupDecoder(decoder);

    return {
        pcm: Buffer.concat(pcmChunks),
        sampleRate: DISCORD_SAMPLE_RATE,
        channels: DISCORD_CHANNELS,
        bitDepth: 16,
        userId,
    };
}

/**
 * Decode a single Opus frame to signed 16-bit LE PCM using prism-media's
 *
 * The prism `opus.Decoder` transform stream expects object-mode Opus
 * buffers and outputs PCM. Calls `.decode()` synchronously.
 */
function decodeOpusFrame(decoder: prism.opus.Decoder, opusData: Buffer): Buffer {
    // prism's OpusStream exposes the native codec handle as `.encoder`
    // regardless of whether it's an Encoder or Decoder wrapper.
    const codec = (decoder as any).encoder;

    if (!codec) {
        throw new Error('Opus codec not initialised — is an Opus backend installed? (npm i @discordjs/opus)');
    }

    // @discordjs/opus and node-opus: .decode(buffer, frameSize)
    // opusscript:                     .decode(buffer)
    const pcm: Buffer = codec.decode
        ? codec.decode(opusData, DISCORD_FRAME_SIZE)
        : codec.decodeFloat
            ? Buffer.from(codec.decodeFloat(opusData, DISCORD_FRAME_SIZE).buffer)
            : (() => { throw new Error('Unsupported Opus backend'); })();

    return pcm;
}

/**
 * Properly tear down the prism-media decoder to free native resources.
 * requires an explicit `.delete()`.
 */
function cleanupDecoder(decoder: prism.opus.Decoder): void {
    try {
        (decoder as any)._cleanup?.();
    } catch {
        // best-effort cleanup
    }
}