import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, ilike, or, gte, lte, desc, asc, sql } from 'drizzle-orm';
import * as schema from './Schema.js';
import type {
	Member, NewMember,
	Event, NewEvent,
	Project, NewProject,
	Committee, NewCommittee,
	CommitteeMember,
	Sponsorship, NewSponsorship,
} from './Schema.js';

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

	// ==================== MEMBER METHODS ====================

	/**
	 * Get member by Discord user ID
	 */
	async getMemberByDiscordId(discordId: string): Promise<Member | null> {
		try {
			const members = await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.discordID, discordId))
				.limit(1);
			return members[0] ?? null;
		} catch (error) {
			console.error('Error getting member by Discord ID:', error);
			return null;
		}
	}

	/**
	 * Get member by database ID
	 */
	async getMemberById(id: string): Promise<Member | null> {
		try {
			const members = await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.id, id))
				.limit(1);
			return members[0] ?? null;
		} catch (error) {
			console.error('Error getting member by ID:', error);
			return null;
		}
	}

	/**
	 * Get member by personal email
	 */
	async getMemberByPersonalEmail(email: string): Promise<Member | null> {
		try {
			const members = await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.personalEmail, email.toLowerCase()))
				.limit(1);
			return members[0] ?? null;
		} catch (error) {
			console.error('Error getting member by personal email:', error);
			return null;
		}
	}

	/**
	 * Get member by UCF email
	 */
	async getMemberByUcfEmail(email: string): Promise<Member | null> {
		try {
			const members = await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.ucfEmail, email.toLowerCase()))
				.limit(1);
			return members[0] ?? null;
		} catch (error) {
			console.error('Error getting member by UCF email:', error);
			return null;
		}
	}

	/**
	 * Create a new member
	 */
	async createMember(data: NewMember): Promise<Member | null> {
		try {
			const members = await this.db.insert(schema.Members).values({
				...data,
				personalEmail: data.personalEmail?.toLowerCase(),
				ucfEmail: data.ucfEmail?.toLowerCase(),
			}).returning();
			return members[0] ?? null;
		} catch (error) {
			console.error('Error creating member:', error);
			return null;
		}
	}

	/**
	 * Update member by Discord ID
	 */
	async updateMemberByDiscordId(discordId: string, data: Partial<NewMember>): Promise<Member | null> {
		try {
			const updateData: any = { ...data, updatedAt: new Date() };
			if (data.personalEmail) updateData.personalEmail = data.personalEmail.toLowerCase();
			if (data.ucfEmail) updateData.ucfEmail = data.ucfEmail.toLowerCase();

			const members = await this.db.update(schema.Members)
				.set(updateData)
				.where(eq(schema.Members.discordID, discordId))
				.returning();
			return members[0] ?? null;
		} catch (error) {
			console.error('Error updating member:', error);
			return null;
		}
	}

	/**
	 * Update member by ID
	 */
	async updateMember(id: string, data: Partial<NewMember>): Promise<Member | null> {
		try {
			const updateData: any = { ...data, updatedAt: new Date() };
			if (data.personalEmail) updateData.personalEmail = data.personalEmail.toLowerCase();
			if (data.ucfEmail) updateData.ucfEmail = data.ucfEmail.toLowerCase();

			const members = await this.db.update(schema.Members)
				.set(updateData)
				.where(eq(schema.Members.id, id))
				.returning();
			return members[0] ?? null;
		} catch (error) {
			console.error('Error updating member:', error);
			return null;
		}
	}

	/**
	 * Delete member by Discord ID
	 */
	async deleteMemberByDiscordId(discordId: string): Promise<boolean> {
		try {
			await this.db.delete(schema.Members)
				.where(eq(schema.Members.discordID, discordId));
			return true;
		} catch (error) {
			console.error('Error deleting member:', error);
			return false;
		}
	}

	/**
	 * Search members by name, email, or Discord ID
	 */
	async searchMembers(query: string, limit: number = 50): Promise<Member[]> {
		try {
			const searchTerm = `%${query.toLowerCase()}%`;
			return await this.db.select()
				.from(schema.Members)
				.where(or(
					ilike(schema.Members.firstName, searchTerm),
					ilike(schema.Members.lastName, searchTerm),
					ilike(schema.Members.personalEmail, searchTerm),
					ilike(schema.Members.ucfEmail, searchTerm),
					ilike(schema.Members.discordID, searchTerm),
				))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName))
				.limit(limit);
		} catch (error) {
			console.error('Error searching members:', error);
			return [];
		}
	}

	/**
	 * Get all members with an officerRole (for display)
	 */
	async getOfficers(): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(sql`${schema.Members.officerRole} IS NOT NULL`)
				.orderBy(asc(schema.Members.officerRole));
		} catch (error) {
			console.error('Error getting officers:', error);
			return [];
		}
	}

	/**
	 * Get all administrators
	 */
	async getAdministrators(): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.administrator, true))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName));
		} catch (error) {
			console.error('Error getting administrators:', error);
			return [];
		}
	}

	/**
	 * Get members by graduation year
	 */
	async getMembersByGraduationYear(year: number): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.graduationYear, year))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName));
		} catch (error) {
			console.error('Error getting members by graduation year:', error);
			return [];
		}
	}

	/**
	 * Get members by major
	 */
	async getMembersByMajor(major: string): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(ilike(schema.Members.major, `%${major}%`))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName));
		} catch (error) {
			console.error('Error getting members by major:', error);
			return [];
		}
	}

	/**
	 * Get members who have paid dues
	 */
	async getMembersWithPaidDues(): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.duesPaid, true))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName));
		} catch (error) {
			console.error('Error getting members with paid dues:', error);
			return [];
		}
	}

	/**
	 * Get all members with pagination
	 */
	async getAllMembers(page: number = 1, limit: number = 50): Promise<Member[]> {
		try {
			const offset = (page - 1) * limit;
			return await this.db.select()
				.from(schema.Members)
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName))
				.limit(limit)
				.offset(offset);
		} catch (error) {
			console.error('Error getting all members:', error);
			return [];
		}
	}

	/**
	 * Get member count
	 */
	async getMemberCount(): Promise<number> {
		try {
			const result = await this.db.select({ count: sql<number>`count(*)` })
				.from(schema.Members);
			return result[0]?.count ?? 0;
		} catch (error) {
			console.error('Error getting member count:', error);
			return 0;
		}
	}

	/**
	 * Get active members
	 */
	async getActiveMembers(): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.active, true))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName));
		} catch (error) {
			console.error('Error getting active members:', error);
			return [];
		}
	}

	/**
	 * Get members by officer role
	 */
	async getMembersByOfficerRole(role: 'Executive Chair' | 'Vice Chair' | 'Treasurer' | 'Secretary' | 'Project Chair' | 'Workshop Chair' | 'Conference Chair' | 'Outreach Chair' | 'Service Chair' | 'Social Chair' | 'Professional Development Chair' | 'Marketing Chair' | 'Software Chair'): Promise<Member[]> {
		try {
			return await this.db.select()
				.from(schema.Members)
				.where(eq(schema.Members.officerRole, role))
				.orderBy(asc(schema.Members.firstName), asc(schema.Members.lastName));
		} catch (error) {
			console.error('Error getting members by officer role:', error);
			return [];
		}
	}

	// ==================== EVENT METHODS ====================

	/**
	 * Get event by ID
	 */
	async getEventById(id: string): Promise<Event | null> {
		try {
			const events = await this.db.select()
				.from(schema.Events)
				.where(eq(schema.Events.id, id))
				.limit(1);
			return events[0] ?? null;
		} catch (error) {
			console.error('Error getting event by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new event
	 */
	async createEvent(data: NewEvent): Promise<Event | null> {
		try {
			const events = await this.db.insert(schema.Events).values(data).returning();
			return events[0] ?? null;
		} catch (error) {
			console.error('Error creating event:', error);
			return null;
		}
	}

	/**
	 * Get upcoming events
	 */
	async getUpcomingEvents(limit: number = 20): Promise<Event[]> {
		try {
			const now = new Date().toISOString();
			return await this.db.select()
				.from(schema.Events)
				.where(gte(schema.Events.startTime, now))
				.orderBy(asc(schema.Events.startTime))
				.limit(limit);
		} catch (error) {
			console.error('Error getting upcoming events:', error);
			return [];
		}
	}

	/**
	 * Get past events
	 */
	async getPastEvents(limit: number = 20): Promise<Event[]> {
		try {
			const now = new Date().toISOString();
			return await this.db.select()
				.from(schema.Events)
				.where(lte(schema.Events.startTime, now))
				.orderBy(desc(schema.Events.startTime))
				.limit(limit);
		} catch (error) {
			console.error('Error getting past events:', error);
			return [];
		}
	}

	/**
	 * Search events by title or location
	 */
	async searchEvents(query: string, limit: number = 20): Promise<Event[]> {
		try {
			const searchTerm = `%${query.toLowerCase()}%`;
			return await this.db.select()
				.from(schema.Events)
				.where(or(
					ilike(schema.Events.title, searchTerm),
					ilike(schema.Events.location, searchTerm),
					ilike(schema.Events.description, searchTerm),
				))
				.orderBy(desc(schema.Events.startTime))
				.limit(limit);
		} catch (error) {
			console.error('Error searching events:', error);
			return [];
		}
	}

	/**
	 * Update event by ID
	 */
	async updateEvent(id: string, data: Partial<NewEvent>): Promise<Event | null> {
		try {
			const updateData: any = { ...data, updatedAt: new Date().toISOString() };
			const events = await this.db.update(schema.Events)
				.set(updateData)
				.where(eq(schema.Events.id, id))
				.returning();
			return events[0] ?? null;
		} catch (error) {
			console.error('Error updating event:', error);
			return null;
		}
	}

	/**
	 * Delete event by ID
	 */
	async deleteEvent(id: string): Promise<boolean> {
		try {
			await this.db.delete(schema.Events)
				.where(eq(schema.Events.id, id));
			return true;
		} catch (error) {
			console.error('Error deleting event:', error);
			return false;
		}
	}

	// ==================== COMMITTEE METHODS ====================

	/**
	 * Get committee by ID
	 */
	async getCommitteeById(id: string): Promise<Committee | null> {
		try {
			const committees = await this.db.select()
				.from(schema.Committees)
				.where(eq(schema.Committees.id, id))
				.limit(1);
			return committees[0] ?? null;
		} catch (error) {
			console.error('Error getting committee by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new committee
	 */
	async createCommittee(data: NewCommittee): Promise<Committee | null> {
		try {
			const committees = await this.db.insert(schema.Committees).values(data).returning();
			return committees[0] ?? null;
		} catch (error) {
			console.error('Error creating committee:', error);
			return null;
		}
	}

	/**
	 * Get all committees
	 */
	async getAllCommittees(): Promise<Committee[]> {
		try {
			return await this.db.select()
				.from(schema.Committees)
				.orderBy(asc(schema.Committees.title));
		} catch (error) {
			console.error('Error getting all committees:', error);
			return [];
		}
	}

	/**
	 * Search committees by title
	 */
	async searchCommittees(query: string): Promise<Committee[]> {
		try {
			const searchTerm = `%${query.toLowerCase()}%`;
			return await this.db.select()
				.from(schema.Committees)
				.where(ilike(schema.Committees.title, searchTerm))
				.orderBy(asc(schema.Committees.title));
		} catch (error) {
			console.error('Error searching committees:', error);
			return [];
		}
	}

	/**
	 * Get committee members
	 */
	async getCommitteeMembers(committeeId: string): Promise<(CommitteeMember & { member: Member })[]> {
		try {
			return await this.db.select()
				.from(schema.CommitteeMembers)
				.leftJoin(schema.Members, eq(schema.CommitteeMembers.memberId, schema.Members.id))
				.where(eq(schema.CommitteeMembers.committeeId, committeeId));
		} catch (error) {
			console.error('Error getting committee members:', error);
			return [];
		}
	}

	/**
	 * Get committee by slug
	 */
	async getCommitteeBySlug(slug: string): Promise<Committee | null> {
		try {
			const committees = await this.db.select()
				.from(schema.Committees)
				.where(eq(schema.Committees.slug, slug))
				.limit(1);
			return committees[0] ?? null;
		} catch (error) {
			console.error('Error getting committee by slug:', error);
			return null;
		}
	}

	/**
	 * Get active committees
	 */
	async getActiveCommittees(): Promise<Committee[]> {
		try {
			return await this.db.select()
				.from(schema.Committees)
				.where(eq(schema.Committees.active, true))
				.orderBy(asc(schema.Committees.title));
		} catch (error) {
			console.error('Error getting active committees:', error);
			return [];
		}
	}

	/**
	 * Update committee by ID
	 */
	async updateCommittee(id: string, data: Partial<NewCommittee>): Promise<Committee | null> {
		try {
			const updateData: any = { ...data, updatedAt: new Date() };
			const committees = await this.db.update(schema.Committees)
				.set(updateData)
				.where(eq(schema.Committees.id, id))
				.returning();
			return committees[0] ?? null;
		} catch (error) {
			console.error('Error updating committee:', error);
			return null;
		}
	}

	/**
	 * Delete committee by ID
	 */
	async deleteCommittee(id: string): Promise<boolean> {
		try {
			await this.db.delete(schema.Committees)
				.where(eq(schema.Committees.id, id));
			return true;
		} catch (error) {
			console.error('Error deleting committee:', error);
			return false;
		}
	}

	// ==================== PROJECT METHODS ====================

	/**
	 * Get project by ID
	 */
	async getProjectById(id: string): Promise<Project | null> {
		try {
			const projects = await this.db.select()
				.from(schema.Projects)
				.where(eq(schema.Projects.id, id))
				.limit(1);
			return projects[0] ?? null;
		} catch (error) {
			console.error('Error getting project by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new project
	 */
	async createProject(data: NewProject): Promise<Project | null> {
		try {
			const projects = await this.db.insert(schema.Projects).values(data).returning();
			return projects[0] ?? null;
		} catch (error) {
			console.error('Error creating project:', error);
			return null;
		}
	}

	/**
	 * Search projects by title or overview
	 */
	async searchProjects(query: string, limit: number = 20): Promise<Project[]> {
		try {
			const searchTerm = `%${query.toLowerCase()}%`;
			return await this.db.select()
				.from(schema.Projects)
				.where(or(
					ilike(schema.Projects.title, searchTerm),
					ilike(schema.Projects.overview, searchTerm),
				))
				.orderBy(asc(schema.Projects.title))
				.limit(limit);
		} catch (error) {
			console.error('Error searching projects:', error);
			return [];
		}
	}

	/**
	 * Get all projects
	 */
	async getAllProjects(): Promise<Project[]> {
		try {
			return await this.db.select()
				.from(schema.Projects)
				.orderBy(asc(schema.Projects.title));
		} catch (error) {
			console.error('Error getting all projects:', error);
			return [];
		}
	}

	/**
	 * Get project by slug
	 */
	async getProjectBySlug(slug: string): Promise<Project | null> {
		try {
			const projects = await this.db.select()
				.from(schema.Projects)
				.where(eq(schema.Projects.slug, slug))
				.limit(1);
			return projects[0] ?? null;
		} catch (error) {
			console.error('Error getting project by slug:', error);
			return null;
		}
	}

	/**
	 * Get active projects
	 */
	async getActiveProjects(): Promise<Project[]> {
		try {
			return await this.db.select()
				.from(schema.Projects)
				.where(eq(schema.Projects.active, true))
				.orderBy(asc(schema.Projects.title));
		} catch (error) {
			console.error('Error getting active projects:', error);
			return [];
		}
	}

	/**
	 * Update project by ID
	 */
	async updateProject(id: string, data: Partial<NewProject>): Promise<Project | null> {
		try {
			const updateData: any = { ...data, updatedAt: new Date() };
			const projects = await this.db.update(schema.Projects)
				.set(updateData)
				.where(eq(schema.Projects.id, id))
				.returning();
			return projects[0] ?? null;
		} catch (error) {
			console.error('Error updating project:', error);
			return null;
		}
	}

	/**
	 * Delete project by ID
	 */
	async deleteProject(id: string): Promise<boolean> {
		try {
			await this.db.delete(schema.Projects)
				.where(eq(schema.Projects.id, id));
			return true;
		} catch (error) {
			console.error('Error deleting project:', error);
			return false;
		}
	}

	// ==================== SPONSORSHIP METHODS ====================

	/**
	 * Get sponsorship by ID
	 */
	async getSponsorshipById(id: string): Promise<Sponsorship | null> {
		try {
			const sponsorships = await this.db.select()
				.from(schema.Sponsorships)
				.where(eq(schema.Sponsorships.id, id))
				.limit(1);
			return sponsorships[0] ?? null;
		} catch (error) {
			console.error('Error getting sponsorship by ID:', error);
			return null;
		}
	}

	/**
	 * Create a new sponsorship
	 */
	async createSponsorship(data: NewSponsorship): Promise<Sponsorship | null> {
		try {
			const sponsorships = await this.db.insert(schema.Sponsorships).values(data).returning();
			return sponsorships[0] ?? null;
		} catch (error) {
			console.error('Error creating sponsorship:', error);
			return null;
		}
	}

	/**
	 * Get sponsorships by tier
	 */
	async getSponsorshipsByTier(tier: 'Bronze' | 'Silver' | 'Gold'): Promise<Sponsorship[]> {
		try {
			return await this.db.select()
				.from(schema.Sponsorships)
				.where(eq(schema.Sponsorships.tier, tier))
				.orderBy(desc(schema.Sponsorships.moneyDonated));
		} catch (error) {
			console.error('Error getting sponsorships by tier:', error);
			return [];
		}
	}

	/**
	 * Get active sponsorships
	 */
	async getActiveSponsorships(): Promise<Sponsorship[]> {
		try {
			return await this.db.select()
				.from(schema.Sponsorships)
				.where(eq(schema.Sponsorships.active, true))
				.orderBy(desc(schema.Sponsorships.moneyDonated));
		} catch (error) {
			console.error('Error getting active sponsorships:', error);
			return [];
		}
	}

	/**
	 * Get all sponsorships
	 */
	async getAllSponsorships(): Promise<Sponsorship[]> {
		try {
			return await this.db.select()
				.from(schema.Sponsorships)
				.orderBy(desc(schema.Sponsorships.moneyDonated));
		} catch (error) {
			console.error('Error getting all sponsorships:', error);
			return [];
		}
	}

	/**
	 * Update sponsorship by ID
	 */
	async updateSponsorship(id: string, data: Partial<NewSponsorship>): Promise<Sponsorship | null> {
		try {
			const updateData: any = { ...data, updatedAt: new Date() };
			const sponsorships = await this.db.update(schema.Sponsorships)
				.set(updateData)
				.where(eq(schema.Sponsorships.id, id))
				.returning();
			return sponsorships[0] ?? null;
		} catch (error) {
			console.error('Error updating sponsorship:', error);
			return null;
		}
	}

	/**
	 * Delete sponsorship by ID
	 */
	async deleteSponsorship(id: string): Promise<boolean> {
		try {
			await this.db.delete(schema.Sponsorships)
				.where(eq(schema.Sponsorships.id, id));
			return true;
		} catch (error) {
			console.error('Error deleting sponsorship:', error);
			return false;
		}
	}

	// ==================== MEMBER PERMISSIONS METHODS ====================

	/**
	 * Grant a permission to a member in a specific context
	 */
	async grantPermission(
		memberId: string,
		permission: 'scan_attendance' | 'view_statistics' | 'manage_context',
		contextType: string,
		contextId?: string | null,
		grantedById?: string | null,
		expiresAt?: Date | null,
	): Promise<typeof schema.MemberPermissions.$inferSelect | null> {
		try {
			const permissions = await this.db.insert(schema.MemberPermissions).values({
				memberId,
				permission,
				contextType,
				contextId: contextId ?? null,
				grantedById: grantedById ?? null,
				expiresAt: expiresAt ?? null,
			}).returning();
			return permissions[0] ?? null;
		} catch (error) {
			console.error('Error granting permission:', error);
			return null;
		}
	}

	/**
	 * Revoke a permission from a member (soft delete by setting active to false)
	 */
	async revokePermission(permissionId: string): Promise<boolean> {
		try {
			await this.db.update(schema.MemberPermissions)
				.set({ active: false })
				.where(eq(schema.MemberPermissions.id, permissionId));
			return true;
		} catch (error) {
			console.error('Error revoking permission:', error);
			return false;
		}
	}

	/**
	 * Get all active permissions for a member
	 */
	async getMemberPermissions(memberId: string): Promise<typeof schema.MemberPermissions.$inferSelect[]> {
		try {
			const now = new Date();
			return await this.db.select()
				.from(schema.MemberPermissions)
				.where(
					sql`${schema.MemberPermissions.memberId} = ${memberId} 
						AND ${schema.MemberPermissions.active} = true 
						AND (${schema.MemberPermissions.expiresAt} IS NULL OR ${schema.MemberPermissions.expiresAt} > ${now})`,
				);
		} catch (error) {
			console.error('Error getting member permissions:', error);
			return [];
		}
	}

	/**
	 * Check if a member has a specific permission in a context
	 */
	async hasPermission(
		memberId: string,
		permission: 'scan_attendance' | 'view_statistics' | 'manage_context',
		contextType: string,
		contextId?: string | null,
	): Promise<boolean> {
		try {
			const now = new Date();
			const permissions = await this.db.select()
				.from(schema.MemberPermissions)
				.where(
					sql`${schema.MemberPermissions.memberId} = ${memberId}
						AND ${schema.MemberPermissions.permission} = ${permission}
						AND ${schema.MemberPermissions.contextType} = ${contextType}
						AND ${schema.MemberPermissions.contextId} = ${contextId ?? null}
						AND ${schema.MemberPermissions.active} = true
						AND (${schema.MemberPermissions.expiresAt} IS NULL OR ${schema.MemberPermissions.expiresAt} > ${now})`,
				)
				.limit(1);
			return permissions.length > 0;
		} catch (error) {
			console.error('Error checking permission:', error);
			return false;
		}
	}

	/**
	 * Get all permissions for a specific context (e.g., all permissions for a project)
	 */
	async getContextPermissions(contextType: string, contextId?: string | null): Promise<typeof schema.MemberPermissions.$inferSelect[]> {
		try {
			const now = new Date();
			return await this.db.select()
				.from(schema.MemberPermissions)
				.where(
					sql`${schema.MemberPermissions.contextType} = ${contextType}
						AND ${schema.MemberPermissions.contextId} = ${contextId ?? null}
						AND ${schema.MemberPermissions.active} = true
						AND (${schema.MemberPermissions.expiresAt} IS NULL OR ${schema.MemberPermissions.expiresAt} > ${now})`,
				);
		} catch (error) {
			console.error('Error getting context permissions:', error);
			return [];
		}
	}

	/**
	 * Get event by slug
	 */
	async getEventBySlug(slug: string): Promise<Event | null> {
		try {
			const events = await this.db.select()
				.from(schema.Events)
				.where(eq(schema.Events.slug, slug))
				.limit(1);
			return events[0] ?? null;
		} catch (error) {
			console.error('Error getting event by slug:', error);
			return null;
		}
	}

	/**
	 * Get events by committee
	 */
	async getEventsByCommittee(committeeId: string): Promise<Event[]> {
		try {
			return await this.db.select()
				.from(schema.Events)
				.where(eq(schema.Events.committeeId, committeeId))
				.orderBy(desc(schema.Events.startTime));
		} catch (error) {
			console.error('Error getting events by committee:', error);
			return [];
		}
	}

	/**
	 * Get active events
	 */
	async getActiveEvents(): Promise<Event[]> {
		try {
			return await this.db.select()
				.from(schema.Events)
				.where(eq(schema.Events.active, true))
				.orderBy(desc(schema.Events.startTime));
		} catch (error) {
			console.error('Error getting active events:', error);
			return [];
		}
	}

	// ==================== EVENT ATTENDEE METHODS ====================

	/**
	 * Add attendee to event
	 */
	async addEventAttendee(eventId: string, memberId: string): Promise<typeof schema.EventAttendees.$inferSelect | null> {
		try {
			const attendees = await this.db.insert(schema.EventAttendees).values({
				eventId,
				memberId,
			}).returning();
			return attendees[0] ?? null;
		} catch (error) {
			console.error('Error adding event attendee:', error);
			return null;
		}
	}

	/**
	 * Remove attendee from event
	 */
	async removeEventAttendee(eventId: string, memberId: string): Promise<boolean> {
		try {
			await this.db.delete(schema.EventAttendees)
				.where(
					sql`${schema.EventAttendees.eventId} = ${eventId} AND ${schema.EventAttendees.memberId} = ${memberId}`,
				);
			return true;
		} catch (error) {
			console.error('Error removing event attendee:', error);
			return false;
		}
	}

	/**
	 * Get all attendees for an event
	 */
	async getEventAttendees(eventId: string): Promise<(typeof schema.EventAttendees.$inferSelect & { member: Member })[]> {
		try {
			return await this.db.select()
				.from(schema.EventAttendees)
				.leftJoin(schema.Members, eq(schema.EventAttendees.memberId, schema.Members.id))
				.where(eq(schema.EventAttendees.eventId, eventId));
		} catch (error) {
			console.error('Error getting event attendees:', error);
			return [];
		}
	}

	/**
	 * Get attendee count for an event
	 */
	async getEventAttendeeCount(eventId: string): Promise<number> {
		try {
			const result = await this.db.select({ count: sql<number>`count(*)` })
				.from(schema.EventAttendees)
				.where(eq(schema.EventAttendees.eventId, eventId));
			return result[0]?.count ?? 0;
		} catch (error) {
			console.error('Error getting event attendee count:', error);
			return 0;
		}
	}

	/**
	 * Get all events a member has attended
	 */
	async getMemberAttendedEvents(memberId: string): Promise<Event[]> {
		try {
			const attendees = await this.db.select()
				.from(schema.EventAttendees)
				.leftJoin(schema.Events, eq(schema.EventAttendees.eventId, schema.Events.id))
				.where(eq(schema.EventAttendees.memberId, memberId))
				.orderBy(desc(schema.Events.startTime));
			return attendees.map((a: any) => a.events).filter(Boolean) as Event[];
		} catch (error) {
			console.error('Error getting member attended events:', error);
			return [];
		}
	}

	/**
	 * Check if member attended event
	 */
	async didMemberAttendEvent(eventId: string, memberId: string): Promise<boolean> {
		try {
			const attendees = await this.db.select()
				.from(schema.EventAttendees)
				.where(
					sql`${schema.EventAttendees.eventId} = ${eventId} AND ${schema.EventAttendees.memberId} = ${memberId}`,
				)
				.limit(1);
			return attendees.length > 0;
		} catch (error) {
			console.error('Error checking member attendance:', error);
			return false;
		}
	}

	// ==================== PROJECT MEMBER METHODS ====================

	/**
	 * Add member to project
	 */
	async addProjectMember(projectId: string, memberId: string, isLead: boolean = false): Promise<typeof schema.ProjectMembers.$inferSelect | null> {
		try {
			const projectMembers = await this.db.insert(schema.ProjectMembers).values({
				projectId,
				memberId,
				isLead,
			}).returning();
			return projectMembers[0] ?? null;
		} catch (error) {
			console.error('Error adding project member:', error);
			return null;
		}
	}

	/**
	 * Remove member from project
	 */
	async removeProjectMember(projectId: string, memberId: string): Promise<boolean> {
		try {
			await this.db.delete(schema.ProjectMembers)
				.where(
					sql`${schema.ProjectMembers.projectId} = ${projectId} AND ${schema.ProjectMembers.memberId} = ${memberId}`,
				);
			return true;
		} catch (error) {
			console.error('Error removing project member:', error);
			return false;
		}
	}

	/**
	 * Get all members of a project
	 */
	async getProjectMembers(projectId: string): Promise<(typeof schema.ProjectMembers.$inferSelect & { member: Member })[]> {
		try {
			return await this.db.select()
				.from(schema.ProjectMembers)
				.leftJoin(schema.Members, eq(schema.ProjectMembers.memberId, schema.Members.id))
				.where(eq(schema.ProjectMembers.projectId, projectId));
		} catch (error) {
			console.error('Error getting project members:', error);
			return [];
		}
	}

	/**
	 * Get all projects a member is part of
	 */
	async getMemberProjects(memberId: string): Promise<Project[]> {
		try {
			const projectMembers = await this.db.select()
				.from(schema.ProjectMembers)
				.leftJoin(schema.Projects, eq(schema.ProjectMembers.projectId, schema.Projects.id))
				.where(eq(schema.ProjectMembers.memberId, memberId));
			return projectMembers.map((pm: any) => pm.projects).filter(Boolean) as Project[];
		} catch (error) {
			console.error('Error getting member projects:', error);
			return [];
		}
	}

	// ==================== COMMITTEE MEMBER METHODS ====================

	/**
	 * Add member to committee
	 */
	async addCommitteeMember(committeeId: string, memberId: string, isChair: boolean = false): Promise<typeof schema.CommitteeMembers.$inferSelect | null> {
		try {
			const committeeMembers = await this.db.insert(schema.CommitteeMembers).values({
				committeeId,
				memberId,
				isChair,
			}).returning();
			return committeeMembers[0] ?? null;
		} catch (error) {
			console.error('Error adding committee member:', error);
			return null;
		}
	}

	/**
	 * Remove member from committee
	 */
	async removeCommitteeMember(committeeId: string, memberId: string): Promise<boolean> {
		try {
			await this.db.delete(schema.CommitteeMembers)
				.where(
					sql`${schema.CommitteeMembers.committeeId} = ${committeeId} AND ${schema.CommitteeMembers.memberId} = ${memberId}`,
				);
			return true;
		} catch (error) {
			console.error('Error removing committee member:', error);
			return false;
		}
	}

	/**
	 * Get all committees a member is part of
	 */
	async getMemberCommittees(memberId: string): Promise<Committee[]> {
		try {
			const committeeMembers = await this.db.select()
				.from(schema.CommitteeMembers)
				.leftJoin(schema.Committees, eq(schema.CommitteeMembers.committeeId, schema.Committees.id))
				.where(eq(schema.CommitteeMembers.memberId, memberId));
			return committeeMembers.map((cm: any) => cm.committees).filter(Boolean) as Committee[];
		} catch (error) {
			console.error('Error getting member committees:', error);
			return [];
		}
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
