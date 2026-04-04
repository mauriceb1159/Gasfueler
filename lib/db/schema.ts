import {
  boolean,
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const contactInquiries = pgTable('contact_inquiries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 120 }),
  inquiryType: varchar('inquiry_type', { length: 40 }).notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const stations = pgTable('stations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 50 }).notNull(),
  zip: varchar('zip', { length: 20 }).notNull(),
  latitude: varchar('latitude', { length: 30 }),
  longitude: varchar('longitude', { length: 30 }),
  active: boolean('active').notNull().default(true),
  supportsSnacks: boolean('supports_snacks').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const stationHours = pgTable('station_hours', {
  id: serial('id').primaryKey(),
  stationId: integer('station_id')
    .notNull()
    .references(() => stations.id),
  dayOfWeek: integer('day_of_week').notNull(),
  openTime: varchar('open_time', { length: 10 }).notNull(),
  closeTime: varchar('close_time', { length: 10 }).notNull(),
});

export const serviceSlots = pgTable('service_slots', {
  id: serial('id').primaryKey(),
  stationId: integer('station_id')
    .notNull()
    .references(() => stations.id),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  capacity: integer('capacity').notNull().default(1),
  bookedCount: integer('booked_count').notNull().default(0),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  nickname: varchar('nickname', { length: 100 }),
  make: varchar('make', { length: 100 }),
  model: varchar('model', { length: 100 }),
  color: varchar('color', { length: 50 }),
  licensePlate: varchar('license_plate', { length: 30 }).notNull(),
  fuelType: varchar('fuel_type', { length: 30 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const fuelRequests = pgTable('fuel_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  stationId: integer('station_id')
    .notNull()
    .references(() => stations.id),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  slotId: integer('slot_id')
    .notNull()
    .references(() => serviceSlots.id),
  fuelGrade: varchar('fuel_grade', { length: 30 }).notNull(),
  requestType: varchar('request_type', { length: 30 }).notNull(),
  requestedGallons: integer('requested_gallons'),
  requestedDollarAmount: integer('requested_dollar_amount'),
  fuelEstimate: integer('fuel_estimate'),
  serviceFee: integer('service_fee').notNull().default(0),
  addonTotal: integer('addon_total').notNull().default(0),
  totalEstimate: integer('total_estimate').notNull().default(0),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  specialInstructions: text('special_instructions'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const fuelRequestItems = pgTable('fuel_request_items', {
  id: serial('id').primaryKey(),
  fuelRequestId: integer('fuel_request_id')
    .notNull()
    .references(() => fuelRequests.id),
  itemName: varchar('item_name', { length: 120 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
});

export const requestStatusEvents = pgTable('request_status_events', {
  id: serial('id').primaryKey(),
  fuelRequestId: integer('fuel_request_id')
    .notNull()
    .references(() => fuelRequests.id),
  status: varchar('status', { length: 30 }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
  vehicles: many(vehicles),
  fuelRequests: many(fuelRequests),
  requestStatusEvents: many(requestStatusEvents),
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  stationHours: many(stationHours),
  serviceSlots: many(serviceSlots),
  fuelRequests: many(fuelRequests),
}));

export const stationHoursRelations = relations(stationHours, ({ one }) => ({
  station: one(stations, {
    fields: [stationHours.stationId],
    references: [stations.id],
  }),
}));

export const serviceSlotsRelations = relations(serviceSlots, ({ one, many }) => ({
  station: one(stations, {
    fields: [serviceSlots.stationId],
    references: [stations.id],
  }),
  fuelRequests: many(fuelRequests),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  fuelRequests: many(fuelRequests),
}));

export const fuelRequestsRelations = relations(fuelRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [fuelRequests.userId],
    references: [users.id],
  }),
  station: one(stations, {
    fields: [fuelRequests.stationId],
    references: [stations.id],
  }),
  vehicle: one(vehicles, {
    fields: [fuelRequests.vehicleId],
    references: [vehicles.id],
  }),
  slot: one(serviceSlots, {
    fields: [fuelRequests.slotId],
    references: [serviceSlots.id],
  }),
  items: many(fuelRequestItems),
  statusEvents: many(requestStatusEvents),
}));

export const fuelRequestItemsRelations = relations(fuelRequestItems, ({ one }) => ({
  fuelRequest: one(fuelRequests, {
    fields: [fuelRequestItems.fuelRequestId],
    references: [fuelRequests.id],
  }),
}));

export const requestStatusEventsRelations = relations(
  requestStatusEvents,
  ({ one }) => ({
    fuelRequest: one(fuelRequests, {
      fields: [requestStatusEvents.fuelRequestId],
      references: [fuelRequests.id],
    }),
    createdByUser: one(users, {
      fields: [requestStatusEvents.createdBy],
      references: [users.id],
    }),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type NewContactInquiry = typeof contactInquiries.$inferInsert;
export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;
export type StationHour = typeof stationHours.$inferSelect;
export type NewStationHour = typeof stationHours.$inferInsert;
export type ServiceSlot = typeof serviceSlots.$inferSelect;
export type NewServiceSlot = typeof serviceSlots.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type FuelRequest = typeof fuelRequests.$inferSelect;
export type NewFuelRequest = typeof fuelRequests.$inferInsert;
export type FuelRequestItem = typeof fuelRequestItems.$inferSelect;
export type NewFuelRequestItem = typeof fuelRequestItems.$inferInsert;
export type RequestStatusEvent = typeof requestStatusEvents.$inferSelect;
export type NewRequestStatusEvent = typeof requestStatusEvents.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

export enum ServiceSlotStatus {
  OPEN = 'open',
  FULL = 'full',
  CLOSED = 'closed',
}

export enum FuelRequestType {
  FILL_TANK = 'fill_tank',
  GALLONS = 'gallons',
  DOLLAR_AMOUNT = 'dollar_amount',
}

export enum FuelRequestStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  SCHEDULED = 'scheduled',
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  NO_SHOW = 'no_show',
}
