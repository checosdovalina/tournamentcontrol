import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("scorekeeper"), // superadmin, admin, scorekeeper, display
  name: text("name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournaments = pgTable("tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clubId: varchar("club_id").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  tournamentLogoUrl: text("tournament_logo_url"),
  clubLogoUrl: text("club_logo_url"),
  systemLogoUrl: text("system_logo_url"),
  config: json("config"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const courts = pgTable("courts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clubId: varchar("club_id").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  clubId: varchar("club_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pairs = pgTable("pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  player1Id: varchar("player1_id").notNull(),
  player2Id: varchar("player2_id").notNull(),
  tournamentId: varchar("tournament_id").notNull(),
  categoryId: varchar("category_id"),
  isPresent: boolean("is_present").default(false),
  isWaiting: boolean("is_waiting").default(false),
  waitingSince: timestamp("waiting_since"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  courtId: varchar("court_id").notNull(),
  pair1Id: varchar("pair1_id").notNull(),
  pair2Id: varchar("pair2_id").notNull(),
  categoryId: varchar("category_id"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  status: text("status").default("playing"), // playing, finished
  score: json("score"), // {set1: [6,4], set2: [3,6], set3: [6,2]}
  winnerId: varchar("winner_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const results = pgTable("results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").notNull(),
  winnerId: varchar("winner_id").notNull(),
  loserId: varchar("loser_id").notNull(),
  score: json("score").notNull(),
  duration: integer("duration"), // minutes
  createdAt: timestamp("created_at").defaultNow(),
});

export const tournamentUsers = pgTable("tournament_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull(), // admin, scorekeeper
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  name: text("name").notNull(), // e.g., "Masculino A", "Femenino B", "Mixto"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sponsorBanners = pgTable("sponsor_banners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  imageUrl: text("image_url").notNull(),
  link: text("link"), // Optional sponsor website link
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
});

export const insertCourtSchema = createInsertSchema(courts).omit({
  id: true,
  createdAt: true,
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
});

export const insertPairSchema = createInsertSchema(pairs).omit({
  id: true,
  createdAt: true,
}).extend({
  waitingSince: z.union([z.string(), z.date(), z.null()]).transform((val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return new Date(val);
    return val;
  }).optional(),
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
  createdAt: true,
});

export const insertTournamentUserSchema = createInsertSchema(tournamentUsers).omit({
  id: true,
  createdAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertSponsorBannerSchema = createInsertSchema(sponsorBanners).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type Court = typeof courts.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Pair = typeof pairs.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Result = typeof results.$inferSelect;
export type TournamentUser = typeof tournamentUsers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type SponsorBanner = typeof sponsorBanners.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type InsertCourt = z.infer<typeof insertCourtSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type InsertPair = z.infer<typeof insertPairSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertResult = z.infer<typeof insertResultSchema>;
export type InsertTournamentUser = z.infer<typeof insertTournamentUserSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertSponsorBanner = z.infer<typeof insertSponsorBannerSchema>;

// Extended types for UI
export type MatchWithDetails = Match & {
  court: Court;
  pair1: Pair & {
    player1: Player;
    player2: Player;
  };
  pair2: Pair & {
    player1: Player;
    player2: Player;
  };
};

export type PairWithPlayers = Pair & {
  player1: Player;
  player2: Player;
};

export type ResultWithDetails = Result & {
  match: MatchWithDetails;
  winner: PairWithPlayers;
  loser: PairWithPlayers;
};
