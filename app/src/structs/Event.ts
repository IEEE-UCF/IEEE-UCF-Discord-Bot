export interface EventOptions {
	name?: string;
	once?: boolean;
}

export abstract class Event {
	public client: any; // Will be Larry type when available
	public name: string;
	public once: boolean;

	constructor(client: any, options: EventOptions = {}) {
		this.client = client;
		this.name = options.name ?? this.constructor.name;
		this.once = options.once ?? false;
	}

	/**
	 * Execute the event
	 */
	abstract run(...args: any[]): Promise<void> | void;
}