import { VoiceConnection, EndBehaviorType } from '@discordjs/voice';
import { User } from 'discord.js';
import { Readable } from 'stream';

// Single captured Opus audio packet with metadata.
export interface OpusPacket {
    // Raw Opus-encoded audio data
    data: Buffer;
    // Discord user ID of the speaker
    userId: string;
    // Timestamp when the packet was received
    timestamp: number;
}

// config for the audio listener behavior.
export interface AudioListenerOptions {
    // How long (ms) to wait after silence before ending the user's audio stream.(1000ms default)
    silenceThreshold?: number;

    // Called whenever an Opus packet is received from any user(real-time processing)
    onPacket?: (packet: OpusPacket) => void;

    // Called when a user starts speaking (stream created).
    onUserStart?: (userId: string) => void;

    /**
     * Called when a user stops speaking(after silence threshold).
     * Receives the full array of Opus packets captured during that speaking turn.
     */
    onUserEnd?: (userId: string, packets: OpusPacket[]) => void;

    // error on a user's audio stream.
    onError?: (userId: string, error: Error) => void;
}

/**
 * subscribes to a Discord voice connection's receiver
 * captures raw Opus audio packets from speaking users. It manages per-user
 * streams and provides callbacks for real-time packet handling and
 * speech-turn boundaries.
 **/
export class AudioListener {
    private connection: VoiceConnection;
    private options: Required<AudioListenerOptions>;
    private activeStreams: Map<string, Readable> = new Map();
    private userPackets: Map<string, OpusPacket[]> = new Map();
    private listening: boolean = false;
    private speakingHandler: ((userId: string) => void) | null = null;

    constructor(connection: VoiceConnection, options: AudioListenerOptions = {}) {
        this.connection = connection;
        this.options = {
            silenceThreshold: options.silenceThreshold ?? 1000,
            onPacket: options.onPacket ?? (() => {}),
            onUserStart: options.onUserStart ?? (() => {}),
            onUserEnd: options.onUserEnd ?? (() => {}),
            onError: options.onError ?? ((userId, err) => {
                console.error(`[AudioListener] Stream error for user ${userId}:`, err);
            }),
        };
    }

    /**
     * Whether the listener is currently active and subscribing to new speakers.
     */
    get isListening(): boolean {
        return this.listening;
    }

    /**
     * Returns the set of user IDs currently being listened to.
     */
    get activeUsers(): string[] {
        return [...this.activeStreams.keys()];
    }

    /**
     * Start listening for audio on the voice connection.
     * Subscribes to the receiver's 'speaking' event to detect when users
     * begin talking, and creates an Opus audio stream for each speaker.
     */
    start(): void {
        if (this.listening) {
            console.warn('[AudioListener] Already listening.');
            return;
        }

        this.listening = true;
        const receiver = this.connection.receiver;

        this.speakingHandler = (userId: string) => {
            // Don't create duplicate streams for a user already being captured
            if (this.activeStreams.has(userId)) return;
            this.subscribeToUser(userId);
        };

        receiver.speaking.on('start', this.speakingHandler);
        console.log('[AudioListener] Started listening for voice audio.');
    }

    /**
     * Stop listening and tear down all active user audio streams.
     */
    stop(): void {
        if (!this.listening) return;

        this.listening = false;

        // Remove the speaking listener
        if (this.speakingHandler) {
            this.connection.receiver.speaking.removeListener('start', this.speakingHandler);
            this.speakingHandler = null;
        }

        // Destroy all active streams
        for (const [userId, stream] of this.activeStreams) {
            stream.destroy();
            // Fire onUserEnd for any in-progress captures
            const packets = this.userPackets.get(userId);
            if (packets && packets.length > 0) {
                this.options.onUserEnd(userId, packets);
            }
        }

        this.activeStreams.clear();
        this.userPackets.clear();

        console.log('[AudioListener] Stopped listening.');
    }

    /**
     * Subscribe to a single user's Opus audio stream from the voice receiver.
     */
    private subscribeToUser(userId: string): void {
        const receiver = this.connection.receiver;

        const opusStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: this.options.silenceThreshold,
            },
        });

        this.activeStreams.set(userId, opusStream);
        this.userPackets.set(userId, []);
        this.options.onUserStart(userId);

        opusStream.on('data', (chunk: Buffer) => {
            const packet: OpusPacket = {
                data: chunk,
                userId,
                timestamp: Date.now(),
            };

            // Accumulate for the turn
            this.userPackets.get(userId)?.push(packet);

            // Fire real-time callback
            this.options.onPacket(packet);
        });

        opusStream.on('end', () => {
            const packets = this.userPackets.get(userId) ?? [];

            this.activeStreams.delete(userId);
            this.userPackets.delete(userId);

            this.options.onUserEnd(userId, packets);
        });

        opusStream.on('error', (err: Error) => {
            this.activeStreams.delete(userId);
            this.userPackets.delete(userId);
            this.options.onError(userId, err);
        });
    }
}