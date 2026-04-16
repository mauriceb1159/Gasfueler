import {
  boolean,
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
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

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
  fuelPriceMode: varchar('fuel_price_mode', { length: 30 })
    .notNull()
    .default('manual_first'),
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

export const stationFuelPrices = pgTable('station_fuel_prices', {
  id: serial('id').primaryKey(),
  stationId: integer('station_id')
    .notNull()
    .references(() => stations.id),
  fuelGrade: varchar('fuel_grade', { length: 30 }).notNull(),
  priceCents: integer('price_cents').notNull(),
  source: varchar('source', { length: 30 }).notNull().default('manual'),
  recordedAt: timestamp('recorded_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const storeCategories = pgTable('store_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const storeItems = pgTable('store_items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id')
    .notNull()
    .references(() => storeCategories.id),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  basePriceCents: integer('base_price_cents').notNull().default(0),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const stationStoreItems = pgTable('station_store_items', {
  id: serial('id').primaryKey(),
  stationId: integer('station_id')
    .notNull()
    .references(() => stations.id),
  storeItemId: integer('store_item_id')
    .notNull()
    .references(() => storeItems.id),
  priceCents: integer('price_cents').notNull().default(0),
  active: boolean('active').notNull().default(true),
  inventoryCount: integer('inventory_count'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  stationId: integer('station_id').references(() => stations.id),
  orderType: varchar('order_type', { length: 30 }).notNull().default('fuel_service'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  pickupMode: varchar('pickup_mode', { length: 30 }),
  pickupWindowStart: timestamp('pickup_window_start'),
  pickupWindowEnd: timestamp('pickup_window_end'),
  customerNotes: text('customer_notes'),
  fulfillmentStatus: varchar('fulfillment_status', { length: 30 })
    .notNull()
    .default('draft'),
  fuelSubtotal: integer('fuel_subtotal').notNull().default(0),
  storeSubtotal: integer('store_subtotal').notNull().default(0),
  serviceFee: integer('service_fee').notNull().default(0),
  taxTotal: integer('tax_total').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  readyAt: timestamp('ready_at'),
  fulfilledAt: timestamp('fulfilled_at'),
  cancelReason: text('cancel_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  itemType: varchar('item_type', { length: 30 }).notNull(),
  storeItemId: integer('store_item_id').references(() => storeItems.id),
  stationStoreItemId: integer('station_store_item_id').references(
    () => stationStoreItems.id
  ),
  itemName: varchar('item_name', { length: 120 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  subtotalPrice: integer('subtotal_price').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  nickname: varchar('nickname', { length: 100 }),
  vehicleClass: varchar('vehicle_class', { length: 20 }),
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
  orderId: integer('order_id').references(() => orders.id),
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
  actualGallons: integer('actual_gallons'),
  actualPricePerGallon: integer('actual_price_per_gallon'),
  actualFuelTotal: integer('actual_fuel_total'),
  pumpPhotoUrl: text('pump_photo_url'),
  gasCapPhotoUrl: text('gas_cap_photo_url'),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 30 }).notNull().default('draft'),
  specialInstructions: text('special_instructions'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const drivers = pgTable('drivers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  phone: varchar('phone', { length: 30 }),
  active: boolean('active').notNull().default(true),
  availabilityStatus: varchar('availability_status', { length: 30 })
    .notNull()
    .default('offline'),
  currentStationId: integer('current_station_id').references(() => stations.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dispatchJobs = pgTable('dispatch_jobs', {
  id: serial('id').primaryKey(),
  fuelRequestId: integer('fuel_request_id').references(() => fuelRequests.id),
  orderId: integer('order_id').references(() => orders.id),
  jobType: varchar('job_type', { length: 30 }).notNull(),
  customerUserId: integer('customer_user_id')
    .notNull()
    .references(() => users.id),
  stationId: integer('station_id')
    .notNull()
    .references(() => stations.id),
  status: varchar('status', { length: 30 }).notNull().default('unassigned'),
  priority: integer('priority').notNull().default(0),
  scheduledStartAt: timestamp('scheduled_start_at'),
  scheduledEndAt: timestamp('scheduled_end_at'),
  driverNotes: text('driver_notes'),
  dispatcherNotes: text('dispatcher_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dispatchAssignments = pgTable('dispatch_assignments', {
  id: serial('id').primaryKey(),
  dispatchJobId: integer('dispatch_job_id')
    .notNull()
    .references(() => dispatchJobs.id),
  driverId: integer('driver_id')
    .notNull()
    .references(() => drivers.id),
  assignedByUserId: integer('assigned_by_user_id')
    .notNull()
    .references(() => users.id),
  assignmentStatus: varchar('assignment_status', { length: 30 })
    .notNull()
    .default('assigned'),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  declinedAt: timestamp('declined_at'),
});

export const driverLocations = pgTable('driver_locations', {
  id: serial('id').primaryKey(),
  driverId: integer('driver_id')
    .notNull()
    .references(() => drivers.id),
  latitude: varchar('latitude', { length: 30 }).notNull(),
  longitude: varchar('longitude', { length: 30 }).notNull(),
  heading: integer('heading'),
  speed: integer('speed'),
  capturedAt: timestamp('captured_at').notNull().defaultNow(),
});

export const dispatchEvents = pgTable('dispatch_events', {
  id: serial('id').primaryKey(),
  dispatchJobId: integer('dispatch_job_id')
    .notNull()
    .references(() => dispatchJobs.id),
  actorUserId: integer('actor_user_id').references(() => users.id),
  eventType: varchar('event_type', { length: 40 }).notNull(),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const fuelRequestItems = pgTable('fuel_request_items', {
  id: serial('id').primaryKey(),
  fuelRequestId: integer('fuel_request_id')
    .notNull()
    .references(() => fuelRequests.id),
  itemType: varchar('item_type', { length: 30 }).notNull().default('store_item'),
  storeItemId: integer('store_item_id').references(() => storeItems.id),
  itemName: varchar('item_name', { length: 120 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull().default(0),
  subtotalPrice: integer('subtotal_price').notNull().default(0),
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
  passwordResetTokens: many(passwordResetTokens),
  vehicles: many(vehicles),
  orders: many(orders),
  fuelRequests: many(fuelRequests),
  requestStatusEvents: many(requestStatusEvents),
  driverProfiles: many(drivers),
  customerDispatchJobs: many(dispatchJobs),
  dispatchAssignmentsMade: many(dispatchAssignments),
  dispatchEvents: many(dispatchEvents),
}));

export const stationsRelations = relations(stations, ({ many }) => ({
  stationHours: many(stationHours),
  serviceSlots: many(serviceSlots),
  fuelPrices: many(stationFuelPrices),
  stationStoreItems: many(stationStoreItems),
  orders: many(orders),
  fuelRequests: many(fuelRequests),
  drivers: many(drivers),
  dispatchJobs: many(dispatchJobs),
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

export const stationFuelPricesRelations = relations(
  stationFuelPrices,
  ({ one }) => ({
    station: one(stations, {
      fields: [stationFuelPrices.stationId],
      references: [stations.id],
    }),
  })
);

export const storeCategoriesRelations = relations(
  storeCategories,
  ({ many }) => ({
    storeItems: many(storeItems),
  })
);

export const storeItemsRelations = relations(storeItems, ({ one, many }) => ({
  category: one(storeCategories, {
    fields: [storeItems.categoryId],
    references: [storeCategories.id],
  }),
  stationStoreItems: many(stationStoreItems),
  fuelRequestItems: many(fuelRequestItems),
}));

export const stationStoreItemsRelations = relations(
  stationStoreItems,
  ({ one, many }) => ({
    station: one(stations, {
      fields: [stationStoreItems.stationId],
      references: [stations.id],
    }),
    storeItem: one(storeItems, {
      fields: [stationStoreItems.storeItemId],
      references: [storeItems.id],
    }),
    orderItems: many(orderItems),
  })
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  station: one(stations, {
    fields: [orders.stationId],
    references: [stations.id],
  }),
  fuelRequests: many(fuelRequests),
  orderItems: many(orderItems),
  dispatchJobs: many(dispatchJobs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  storeItem: one(storeItems, {
    fields: [orderItems.storeItemId],
    references: [storeItems.id],
  }),
  stationStoreItem: one(stationStoreItems, {
    fields: [orderItems.stationStoreItemId],
    references: [stationStoreItems.id],
  }),
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

export const passwordResetTokensRelations = relations(
  passwordResetTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [passwordResetTokens.userId],
      references: [users.id],
    }),
  })
);

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  fuelRequests: many(fuelRequests),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(users, {
    fields: [drivers.userId],
    references: [users.id],
  }),
  currentStation: one(stations, {
    fields: [drivers.currentStationId],
    references: [stations.id],
  }),
  assignments: many(dispatchAssignments),
  locations: many(driverLocations),
}));

export const fuelRequestsRelations = relations(fuelRequests, ({ one, many }) => ({
  order: one(orders, {
    fields: [fuelRequests.orderId],
    references: [orders.id],
  }),
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
  dispatchJobs: many(dispatchJobs),
}));

export const dispatchJobsRelations = relations(dispatchJobs, ({ one, many }) => ({
  fuelRequest: one(fuelRequests, {
    fields: [dispatchJobs.fuelRequestId],
    references: [fuelRequests.id],
  }),
  order: one(orders, {
    fields: [dispatchJobs.orderId],
    references: [orders.id],
  }),
  customerUser: one(users, {
    fields: [dispatchJobs.customerUserId],
    references: [users.id],
  }),
  station: one(stations, {
    fields: [dispatchJobs.stationId],
    references: [stations.id],
  }),
  assignments: many(dispatchAssignments),
  events: many(dispatchEvents),
}));

export const dispatchAssignmentsRelations = relations(
  dispatchAssignments,
  ({ one }) => ({
    dispatchJob: one(dispatchJobs, {
      fields: [dispatchAssignments.dispatchJobId],
      references: [dispatchJobs.id],
    }),
    driver: one(drivers, {
      fields: [dispatchAssignments.driverId],
      references: [drivers.id],
    }),
    assignedByUser: one(users, {
      fields: [dispatchAssignments.assignedByUserId],
      references: [users.id],
    }),
  })
);

export const driverLocationsRelations = relations(driverLocations, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverLocations.driverId],
    references: [drivers.id],
  }),
}));

export const dispatchEventsRelations = relations(dispatchEvents, ({ one }) => ({
  dispatchJob: one(dispatchJobs, {
    fields: [dispatchEvents.dispatchJobId],
    references: [dispatchJobs.id],
  }),
  actorUser: one(users, {
    fields: [dispatchEvents.actorUserId],
    references: [users.id],
  }),
}));

export const fuelRequestItemsRelations = relations(fuelRequestItems, ({ one }) => ({
  fuelRequest: one(fuelRequests, {
    fields: [fuelRequestItems.fuelRequestId],
    references: [fuelRequests.id],
  }),
  storeItem: one(storeItems, {
    fields: [fuelRequestItems.storeItemId],
    references: [storeItems.id],
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
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type NewContactInquiry = typeof contactInquiries.$inferInsert;
export type Station = typeof stations.$inferSelect;
export type NewStation = typeof stations.$inferInsert;
export type StationHour = typeof stationHours.$inferSelect;
export type NewStationHour = typeof stationHours.$inferInsert;
export type ServiceSlot = typeof serviceSlots.$inferSelect;
export type NewServiceSlot = typeof serviceSlots.$inferInsert;
export type StationFuelPrice = typeof stationFuelPrices.$inferSelect;
export type NewStationFuelPrice = typeof stationFuelPrices.$inferInsert;
export type StoreCategory = typeof storeCategories.$inferSelect;
export type NewStoreCategory = typeof storeCategories.$inferInsert;
export type StoreItem = typeof storeItems.$inferSelect;
export type NewStoreItem = typeof storeItems.$inferInsert;
export type StationStoreItem = typeof stationStoreItems.$inferSelect;
export type NewStationStoreItem = typeof stationStoreItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type FuelRequest = typeof fuelRequests.$inferSelect;
export type NewFuelRequest = typeof fuelRequests.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
export type DispatchJob = typeof dispatchJobs.$inferSelect;
export type NewDispatchJob = typeof dispatchJobs.$inferInsert;
export type DispatchAssignment = typeof dispatchAssignments.$inferSelect;
export type NewDispatchAssignment = typeof dispatchAssignments.$inferInsert;
export type DriverLocation = typeof driverLocations.$inferSelect;
export type NewDriverLocation = typeof driverLocations.$inferInsert;
export type DispatchEvent = typeof dispatchEvents.$inferSelect;
export type NewDispatchEvent = typeof dispatchEvents.$inferInsert;
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

export enum VehicleClass {
  CAR = 'car',
  SUV = 'suv',
  TRUCK = 'truck',
}

export enum FuelRequestItemType {
  STORE_ITEM = 'store_item',
  FUEL = 'fuel',
  SERVICE_FEE = 'service_fee',
  DISCOUNT = 'discount',
  TAX = 'tax',
}

export enum OrderType {
  FUEL_SERVICE = 'fuel_service',
  STORE_ONLY = 'store_only',
  MIXED = 'mixed',
}

export enum StationFuelPriceMode {
  MANUAL_FIRST = 'manual_first',
  GOOGLE_FIRST = 'google_first',
}

export enum PickupMode {
  ASAP = 'asap',
  SCHEDULED = 'scheduled',
  ON_ARRIVAL = 'on_arrival',
}

export enum OrderFulfillmentStatus {
  DRAFT = 'draft',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DriverAvailabilityStatus {
  OFFLINE = 'offline',
  AVAILABLE = 'available',
  ON_JOB = 'on_job',
  BREAK = 'break',
}

export enum DispatchJobType {
  FUEL = 'fuel',
  STORE = 'store',
  COMBO = 'combo',
}

export enum DispatchJobStatus {
  UNASSIGNED = 'unassigned',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  EN_ROUTE = 'en_route',
  ARRIVED = 'arrived',
  SERVICING = 'servicing',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export enum DispatchAssignmentStatus {
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REASSIGNED = 'reassigned',
}
