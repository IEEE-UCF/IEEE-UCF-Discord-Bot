import {
	pgTable,
	index,
	foreignKey,
	unique,
	uuid,
	varchar,
	text,
	timestamp,
	boolean,
	date,
	integer,
	pgEnum,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

export const genderEnum = pgEnum('gender_enum', ['M', 'F', 'NB', 'O', 'PNTS']);
export const officerRoleEnum = pgEnum('officer_role_enum', [
	'Executive Chair',
	'Vice Chair',
	'Treasurer',
	'Secretary',
	'Project Chair',
	'Workshop Chair',
	'Conference Chair',
	'Outreach Chair',
	'Service Chair',
	'Social Chair',
	'Professional Development Chair',
	'Marketing Chair',
	'Software Chair',
]);
export const sponsorshipTierEnum = pgEnum('sponsorship_tier_enum', ['Bronze', 'Silver', 'Gold']);

export const committees = pgTable(
	'committees',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		title: varchar({ length: 255 }).notNull(),
		about: text().notNull(),
		chairId: uuid('chair_id').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		slug: varchar({ length: 64 }),
		discordRoleId: varchar('discord_role_id', { length: 64 }),
		active: boolean().default(true).notNull(),
	},
	(table) => [
		index('committees_idx_chair_id').using(
			'btree',
			table.chairId.asc().nullsLast().op('uuid_ops'),
		),
		index('committees_idx_created_at').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamptz_ops'),
		),
		index('committees_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('committees_idx_slug').using('btree', table.slug.asc().nullsLast().op('text_ops')),
		index('committees_idx_title').using('btree', table.title.asc().nullsLast().op('text_ops')),
		index('committees_idx_updated_at').using(
			'btree',
			table.updatedAt.asc().nullsLast().op('timestamptz_ops'),
		),
		foreignKey({
			columns: [table.chairId],
			foreignColumns: [members.id],
			name: 'committees_chair_id_members_id_fk',
		}).onDelete('cascade'),
		unique('committees_slug_unique').on(table.slug),
	],
);

export const committeeMembers = pgTable(
	'committee_members',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		committeeId: uuid('committee_id').notNull(),
		memberId: uuid('member_id').notNull(),
		isChair: boolean('is_chair').default(false).notNull(),
	},
	(table) => [
		index('committee_members_idx_committee_id').using(
			'btree',
			table.committeeId.asc().nullsLast().op('uuid_ops'),
		),
		index('committee_members_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('committee_members_idx_is_chair').using(
			'btree',
			table.isChair.asc().nullsLast().op('bool_ops'),
		),
		index('committee_members_idx_member_id').using(
			'btree',
			table.memberId.asc().nullsLast().op('uuid_ops'),
		),
		foreignKey({
			columns: [table.committeeId],
			foreignColumns: [committees.id],
			name: 'committee_members_committee_id_committees_id_fk',
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.id],
			name: 'committee_members_member_id_members_id_fk',
		}).onDelete('cascade'),
		unique('committee_member_unique').on(table.committeeId, table.memberId),
	],
);

export const projectMembers = pgTable(
	'project_members',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		projectId: uuid('project_id').notNull(),
		memberId: uuid('member_id').notNull(),
		isLead: boolean('is_lead').default(false).notNull(),
	},
	(table) => [
		index('project_members_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('project_members_idx_is_lead').using(
			'btree',
			table.isLead.asc().nullsLast().op('bool_ops'),
		),
		index('project_members_idx_member_id').using(
			'btree',
			table.memberId.asc().nullsLast().op('uuid_ops'),
		),
		index('project_members_idx_project_id').using(
			'btree',
			table.projectId.asc().nullsLast().op('uuid_ops'),
		),
		foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: 'project_members_project_id_projects_id_fk',
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.id],
			name: 'project_members_member_id_members_id_fk',
		}).onDelete('cascade'),
		unique('project_member_unique').on(table.projectId, table.memberId),
	],
);

export const events = pgTable(
	'events',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		title: varchar({ length: 255 }).notNull(),
		location: varchar({ length: 255 }).notNull(),
		committeeId: uuid('committee_id'),
		description: text().notNull(),
		flyerUrl: varchar('flyer_url', { length: 500 }),
		rsvpLink: varchar('rsvp_link', { length: 500 }),
		photoUrls: text('photo_urls'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		slug: varchar({ length: 64 }),
		startTime: timestamp('start_time', { withTimezone: true, mode: 'string' }).notNull(),
		endTime: timestamp('end_time', { withTimezone: true, mode: 'string' }),
		requiresDues: boolean('requires_dues').default(false).notNull(),
		active: boolean().default(true).notNull(),
	},
	(table) => [
		index('events_idx_committee_id').using(
			'btree',
			table.committeeId.asc().nullsLast().op('uuid_ops'),
		),
		index('events_idx_created_at').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamptz_ops'),
		),
		index('events_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('events_idx_location').using(
			'btree',
			table.location.asc().nullsLast().op('text_ops'),
		),
		index('events_idx_start_time').using(
			'btree',
			table.startTime.asc().nullsLast().op('timestamptz_ops'),
		),
		index('events_idx_time_desc').using(
			'btree',
			table.startTime.desc().nullsFirst().op('timestamptz_ops'),
		),
		index('events_idx_title').using('btree', table.title.asc().nullsLast().op('text_ops')),
		index('events_idx_updated_at').using(
			'btree',
			table.updatedAt.asc().nullsLast().op('timestamptz_ops'),
		),
		foreignKey({
			columns: [table.committeeId],
			foreignColumns: [committees.id],
			name: 'events_committee_id_committees_id_fk',
		}).onDelete('cascade'),
		unique('events_slug_unique').on(table.slug),
	],
);

export const members = pgTable(
	'members',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		firstName: varchar('first_name', { length: 255 }).notNull(),
		middleName: varchar('middle_name', { length: 255 }),
		lastName: varchar('last_name', { length: 255 }).notNull(),
		officerStatus: boolean('officer_status').default(false).notNull(),
		officerRole: officerRoleEnum('officer_role'),
		administrator: boolean().default(false).notNull(),
		biography: text(),
		duesPaid: boolean('dues_paid').default(false).notNull(),
		discordId: varchar({ length: 64 }).notNull(),
		dateOfBirth: date('date_of_birth').notNull(),
		personalEmail: varchar('personal_email', { length: 255 }).notNull(),
		phoneNumber: varchar('phone_number', { length: 20 }),
		major: varchar({ length: 255 }).notNull(),
		gender: genderEnum().notNull(),
		graduationYear: integer('graduation_year').notNull(),
		resumeUrl: text('resume_url'),
		linkedinUrl: text('linkedin_url'),
		githubUrl: text('github_url'),
		websiteUrl: text('website_url'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		active: boolean().default(true).notNull(),
		userId: uuid('user_id'),
		ucfEmail: varchar('ucf_email', { length: 255 }).notNull(),
	},
	(table) => [
		index('members_idx_active_officer').using(
			'btree',
			table.officerStatus.asc().nullsLast().op('bool_ops'),
			table.administrator.asc().nullsLast().op('bool_ops'),
		),
		index('members_idx_administrator').using(
			'btree',
			table.administrator.asc().nullsLast().op('bool_ops'),
		),
		index('members_idx_created_at').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamptz_ops'),
		),
		index('members_idx_discordId').using(
			'btree',
			table.discordId.asc().nullsLast().op('text_ops'),
		),
		index('members_idx_dues_paid').using(
			'btree',
			table.duesPaid.asc().nullsLast().op('bool_ops'),
		),
		index('members_idx_full_name').using(
			'btree',
			table.firstName.asc().nullsLast().op('text_ops'),
			table.lastName.asc().nullsLast().op('text_ops'),
		),
		index('members_idx_gender').using('btree', table.gender.asc().nullsLast().op('enum_ops')),
		index('members_idx_graduation_year').using(
			'btree',
			table.graduationYear.asc().nullsLast().op('int4_ops'),
		),
		index('members_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('members_idx_major').using('btree', table.major.asc().nullsLast().op('text_ops')),
		index('members_idx_officer_role').using(
			'btree',
			table.officerRole.asc().nullsLast().op('enum_ops'),
		),
		index('members_idx_officer_status').using(
			'btree',
			table.officerStatus.asc().nullsLast().op('bool_ops'),
		),
		index('members_idx_personal_email').using(
			'btree',
			table.personalEmail.asc().nullsLast().op('text_ops'),
		),
		index('members_idx_ucf_email').using(
			'btree',
			table.ucfEmail.asc().nullsLast().op('text_ops'),
		),
		index('members_idx_updated_at').using(
			'btree',
			table.updatedAt.asc().nullsLast().op('timestamptz_ops'),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'members_user_id_users_id_fk',
		}).onDelete('cascade'),
		unique('members_discordId_unique').on(table.discordId),
		unique('members_personal_email_unique').on(table.personalEmail),
		unique('members_ucf_email_unique').on(table.ucfEmail),
	],
);

export const projects = pgTable(
	'projects',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		title: varchar({ length: 255 }).notNull(),
		overview: text().notNull(),
		hardwareInfo: text('hardware_info'),
		softwareInfo: text('software_info'),
		skills: text(),
		photoUrls: text('photo_urls'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		slug: varchar({ length: 64 }),
		discordRoleId: varchar('discord_role_id', { length: 64 }),
		active: boolean().default(true).notNull(),
	},
	(table) => [
		index('projects_idx_created_at').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamptz_ops'),
		),
		index('projects_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('projects_idx_slug').using('btree', table.slug.asc().nullsLast().op('text_ops')),
		index('projects_idx_title').using('btree', table.title.asc().nullsLast().op('text_ops')),
		index('projects_idx_updated_at').using(
			'btree',
			table.updatedAt.asc().nullsLast().op('timestamptz_ops'),
		),
		unique('projects_slug_unique').on(table.slug),
	],
);

export const eventAttendees = pgTable(
	'event_attendees',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		eventId: uuid('event_id').notNull(),
		memberId: uuid('member_id').notNull(),
		timestamp: timestamp({ withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	},
	(table) => [
		index('event_attendees_idx_event_id').using(
			'btree',
			table.eventId.asc().nullsLast().op('uuid_ops'),
		),
		index('event_attendees_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('event_attendees_idx_member_id').using(
			'btree',
			table.memberId.asc().nullsLast().op('uuid_ops'),
		),
		foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: 'event_attendees_event_id_events_id_fk',
		}).onDelete('cascade'),
		foreignKey({
			columns: [table.memberId],
			foreignColumns: [members.id],
			name: 'event_attendees_member_id_members_id_fk',
		}).onDelete('cascade'),
		unique('event_attendee_unique').on(table.eventId, table.memberId),
	],
);

export const sessions = pgTable(
	'sessions',
	{
		sessionToken: varchar('session_token', { length: 255 }).primaryKey().notNull(),
		userId: uuid('user_id').notNull(),
		expires: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'sessions_user_id_users_id_fk',
		}).onDelete('cascade'),
	],
);

export const users = pgTable(
	'users',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		name: text(),
		email: varchar({ length: 255 }).notNull(),
		emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'string' }),
		image: text(),
		discordId: varchar({ length: 64 }).notNull(),
	},
	(table) => [unique('users_email_unique').on(table.email)],
);

export const sponsorships = pgTable(
	'sponsorships',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		companyName: varchar('company_name', { length: 255 }).notNull(),
		moneyDonated: integer('money_donated').notNull(),
		description: text(),
		tier: sponsorshipTierEnum().notNull(),
		companyLogoUrl: varchar('company_logo_url', { length: 500 }),
		websiteUrl: varchar('website_url', { length: 500 }),
		contactEmail: varchar('contact_email', { length: 255 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
			.defaultNow()
			.notNull(),
		active: boolean().default(true).notNull(),
	},
	(table) => [
		index('sponsorships_idx_company_name').using(
			'btree',
			table.companyName.asc().nullsLast().op('text_ops'),
		),
		index('sponsorships_idx_created_at').using(
			'btree',
			table.createdAt.asc().nullsLast().op('timestamptz_ops'),
		),
		index('sponsorships_idx_id').using('btree', table.id.asc().nullsLast().op('uuid_ops')),
		index('sponsorships_idx_tier').using('btree', table.tier.asc().nullsLast().op('enum_ops')),
		index('sponsorships_idx_updated_at').using(
			'btree',
			table.updatedAt.asc().nullsLast().op('timestamptz_ops'),
		),
	],
);

export const accounts = pgTable(
	'accounts',
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid('user_id').notNull(),
		type: varchar({ length: 255 }).notNull(),
		provider: varchar({ length: 255 }).notNull(),
		providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
		refreshToken: text('refresh_token'),
		accessToken: text('access_token'),
		expiresAt: integer('expires_at'),
		tokenType: varchar('token_type', { length: 255 }),
		scope: varchar({ length: 255 }),
		idToken: text('id_token'),
		sessionState: varchar('session_state', { length: 255 }),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: 'accounts_user_id_users_id_fk',
		}).onDelete('cascade'),
	],
);

export const membersRelations = relations(members, ({ many, one }) => ({
	committeeMembers: many(committeeMembers),
	projectMembers: many(projectMembers),
	user: one(users, {
		fields: [members.userId],
		references: [users.id],
	}),
}));

export const committeeMembersRelations = relations(committeeMembers, ({ one }) => ({
	member: one(members, {
		fields: [committeeMembers.memberId],
		references: [members.id],
	}),
	committee: one(committees, {
		fields: [committeeMembers.committeeId],
		references: [committees.id],
	}),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
	member: one(members, {
		fields: [projectMembers.memberId],
		references: [members.id],
	}),
	project: one(projects, {
		fields: [projectMembers.projectId],
		references: [projects.id],
	}),
}));

export const committeesRelations = relations(committees, ({ one, many }) => ({
	chair: one(members, {
		fields: [committees.chairId],
		references: [members.id],
	}),
	committeeMembers: many(committeeMembers),
	events: many(events),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
	projectMembers: many(projectMembers),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
	committee: one(committees, {
		fields: [events.committeeId],
		references: [committees.id],
	}),
	attendees: many(eventAttendees),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
	event: one(events, {
		fields: [eventAttendees.eventId],
		references: [events.id],
	}),
	member: one(members, {
		fields: [eventAttendees.memberId],
		references: [members.id],
	}),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
	member: one(members, {
		fields: [users.id],
		references: [members.userId],
	}),
}));
