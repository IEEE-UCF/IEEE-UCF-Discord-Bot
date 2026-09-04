import Larry from './src/structs/Larry.ts';

const bot = new Larry();

// Global error handlers
process.on('unhandledRejection', (error: Error) => {
	console.error('❌ Unhandled Promise Rejection:', error);
	// Don't exit - log and continue
});

process.on('uncaughtException', (error: Error) => {
	console.error('❌ Uncaught Exception:', error);
	// Critical error - attempt graceful shutdown
	shutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('rejectionHandled', (err) => {
	console.warn('⚠️  Promise rejection handled late:', err);
});

// Validate critical environment configuration before booting
if (!bot.config.token || bot.config.token.trim() === '') {
	console.error('❌ CRITICAL CONFIG ERROR: DISCORD_TOKEN is missing or empty in your .env file!');
	console.error('👉 Please copy .env.example to .env and paste your bot token into DISCORD_TOKEN.');
	process.exit(1);
}

// Initialize bot with error handling
try {
	await bot.init();
	console.log('✅ Bot initialized successfully.');
} catch (error) {
	console.error('❌ Failed to initialize bot:', error);
	process.exit(1);
}

// Graceful shutdown handler
let shutdownInProgress = false;

const shutdown = async (signal: string) => {
	if (shutdownInProgress) {
		console.log('\n⚠️  Force killing...');
		process.exit(1);
	}
	shutdownInProgress = true;
	console.log(`\n⏳ Received ${signal}, shutting down gracefully... (Press Ctrl+C again to force).`);

	// Force exit after 10 seconds if cleanup hangs
	const forceExitTimer = setTimeout(() => {
		console.error('❌ Shutdown timeout - forcing exit.');
		process.exit(1);
	}, 10000);

	try {
		await bot.destroy();
		clearTimeout(forceExitTimer);
		console.log('✅ Shutdown complete.');
		process.exit(0);
	} catch (error) {
		console.error('❌ Error during shutdown:', error);
		clearTimeout(forceExitTimer);
		process.exit(1);
	}
};

// Signal handlers
process.once('SIGHUP', () => shutdown('SIGHUP'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));