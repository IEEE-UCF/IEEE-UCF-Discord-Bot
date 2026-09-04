import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './Schema.js';

export class Database {
	private client: any;
	private pool: Pool;
	private db: any;
	private isConnected: boolean = false;

	constructor(client: any, connectionString: string) {
		this.client = client;
		this.pool = new Pool({
			connectionString,
			max: 20, // Maximum number of clients in the pool
			idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
			connectionTimeoutMillis: 2000, // How long to wait when connecting
		});
		this.db = drizzle(this.pool, { schema });
	}

	async loadDatabase(): Promise<boolean> {
		try {
			// Test the connection
			const client = await this.pool.connect();
			await client.query('SELECT NOW()');
			client.release();

			this.isConnected = true;
			this.client?.logger?.startup('Connected to PostgreSQL database!');
			return true;
		} catch (error: any) {
			this.isConnected = false;
			this.client?.logger?.fail('Error connecting to database.');

			// Log detailed error information
			if (error.code === '28P01') {
				this.client?.logger?.fail('Database authentication failed: Invalid username or password.');
			} else if (error.code === 'ECONNREFUSED') {
				this.client?.logger?.fail('Database connection refused: Is PostgreSQL running?');
			} else if (error.code === 'ENOTFOUND') {
				this.client?.logger?.fail('Database host not found: Check your connection string.');
			} else if (error.code === 'ETIMEDOUT') {
				this.client?.logger?.fail('Database connection timeout: Check your network or firewall settings.');
			} else {
				this.client?.logger?.fail(`Database error (${error.code ?? 'UNKNOWN'}): ${error.message ?? 'Unknown error'}`);
			}

			return false;
		}
	}

	async closeDatabase(): Promise<boolean> {
		try {
			await this.pool.end();
			this.isConnected = false;
			this.client?.logger?.shutdown('Database connection closed.');
			return true;
		} catch (error) {
			this.client?.logger?.fail('Error closing database.');
			console.error('Database close error:', error);
			return false;
		}
	}

	/**
	 * Check if database is connected
	 */
	isReady(): boolean {
		return this.isConnected;
	}

	/**
	 * Execute a transaction
	 */
	transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
		return this.db.transaction(callback);
	}

	// ==================== UTILITY METHODS ====================

	/**
	 * Execute raw SQL query (use with caution)
	 */
	async rawQuery(query: string, params?: any[]): Promise<any> {
		try {
			return await this.pool.query(query, params);
		} catch (error) {
			console.error('Error executing raw query:', error);
			throw error;
		}
	}

	/**
	 * Get the drizzle database instance for complex queries
	 */
	getDB() {
		return this.db;
	}

	/**
	 * Get the connection pool for direct access
	 */
	getPool(): Pool {
		return this.pool;
	}

	/**
	 * Health check - verify database connection
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const client = await this.pool.connect();
			await client.query('SELECT 1');
			client.release();
			return true;
		} catch (error) {
			console.error('Database health check failed:', error);
			return false;
		}
	}
}
