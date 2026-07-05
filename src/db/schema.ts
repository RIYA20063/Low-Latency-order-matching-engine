import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, doublePrecision, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // We'll just use email as UID or generate a UUID
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  usdBalance: doublePrecision('usd_balance').default(100000.0).notNull(), // Start with $100k
  btcBalance: doublePrecision('btc_balance').default(0.0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const orders = pgTable('orders', {
  id: varchar('id', { length: 36 }).primaryKey(), // We use generated string IDs
  userId: integer('user_id').references(() => users.id).notNull(),
  side: text('side').notNull(), // BUY or SELL
  price: doublePrecision('price').notNull(),
  qty: doublePrecision('qty').notNull(),
  status: text('status').notNull(), // OPEN, PARTIAL_FILL, FILL, CANCELED
  createdAt: timestamp('created_at').defaultNow(),
});

export const trades = pgTable('trades', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  orderId: varchar('order_id', { length: 36 }).references(() => orders.id).notNull(),
  side: text('side').notNull(), // BUY or SELL
  price: doublePrecision('price').notNull(),
  qty: doublePrecision('qty').notNull(),
  execType: text('exec_type').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  trades: many(trades),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  trades: many(trades),
}));

export const tradesRelations = relations(trades, ({ one }) => ({
  user: one(users, {
    fields: [trades.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [trades.orderId],
    references: [orders.id],
  })
}));
