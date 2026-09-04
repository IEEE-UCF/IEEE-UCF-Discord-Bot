import config from './src/config';

export default {
	schema: './src/modules/database/Schema.ts',
	out: './src/modules/database/migrations',
	dialect: 'postgresql',
	dbCredentials: {
		url: config.postgres,
	},
};
