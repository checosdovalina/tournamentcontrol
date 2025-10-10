import { db } from "./db";
import {
  users,
  tournaments,
  tournamentUsers,
  categories,
  sponsorBanners,
  clubs,
  courts,
  players,
  pairs,
  matches,
  results,
  scheduledMatches,
  scheduledMatchPlayers,
  type User,
  type InsertUser,
  type Tournament,
  type InsertTournament,
  type TournamentUser,
  type InsertTournamentUser,
  type Category,
  type InsertCategory,
  type SponsorBanner,
  type InsertSponsorBanner,
  type Club,
  type InsertClub,
  type Court,
  type InsertCourt,
  type Player,
  type InsertPlayer,
  type Pair,
  type InsertPair,
  type Match,
  type InsertMatch,
  type Result,
  type InsertResult,
  type MatchWithDetails,
  type PairWithPlayers,
  type ResultWithDetails,
  type ScheduledMatch,
  type InsertScheduledMatch,
  type ScheduledMatchPlayer,
  type InsertScheduledMatchPlayer,
  type ScheduledMatchWithDetails,
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Tournaments
  async getTournament(id: string): Promise<Tournament | undefined> {
    const result = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    return result[0];
  }

  async getTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments);
  }

  async getActiveTournament(): Promise<Tournament | undefined> {
    const result = await db.select().from(tournaments).where(eq(tournaments.isActive, true)).limit(1);
    return result[0];
  }

  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const result = await db.insert(tournaments).values(tournament).returning();
    return result[0];
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | undefined> {
    // Transform dates if they're strings
    const cleanUpdates: any = { ...updates };
    if (cleanUpdates.startDate && typeof cleanUpdates.startDate === 'string') {
      cleanUpdates.startDate = new Date(cleanUpdates.startDate);
    }
    if (cleanUpdates.endDate && typeof cleanUpdates.endDate === 'string') {
      cleanUpdates.endDate = new Date(cleanUpdates.endDate);
    }
    
    const result = await db.update(tournaments).set(cleanUpdates).where(eq(tournaments.id, id)).returning();
    return result[0];
  }

  // Tournament Users
  async getTournamentUser(id: string): Promise<TournamentUser | undefined> {
    const result = await db.select().from(tournamentUsers).where(eq(tournamentUsers.id, id)).limit(1);
    return result[0];
  }

  async getTournamentUsersByTournament(tournamentId: string): Promise<TournamentUser[]> {
    return await db.select().from(tournamentUsers).where(eq(tournamentUsers.tournamentId, tournamentId));
  }

  async getTournamentUsersByUser(userId: string): Promise<TournamentUser[]> {
    return await db.select().from(tournamentUsers).where(eq(tournamentUsers.userId, userId));
  }

  async getTournamentUserByUserAndTournament(userId: string, tournamentId: string): Promise<TournamentUser | undefined> {
    const result = await db
      .select()
      .from(tournamentUsers)
      .where(and(eq(tournamentUsers.userId, userId), eq(tournamentUsers.tournamentId, tournamentId)))
      .limit(1);
    return result[0];
  }

  async createTournamentUser(tournamentUser: InsertTournamentUser): Promise<TournamentUser> {
    const result = await db.insert(tournamentUsers).values(tournamentUser).returning();
    return result[0];
  }

  async updateTournamentUser(id: string, updates: Partial<TournamentUser>): Promise<TournamentUser | undefined> {
    const result = await db.update(tournamentUsers).set(updates).where(eq(tournamentUsers.id, id)).returning();
    return result[0];
  }

  async deleteTournamentUser(id: string): Promise<boolean> {
    const result = await db.delete(tournamentUsers).where(eq(tournamentUsers.id, id)).returning();
    return result.length > 0;
  }

  // Categories
  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async getCategoriesByTournament(tournamentId: string): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(and(eq(categories.tournamentId, tournamentId), eq(categories.isActive, true)));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    const result = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return result[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning();
    return result.length > 0;
  }

  // Sponsor Banners
  async getSponsorBanner(id: string): Promise<SponsorBanner | undefined> {
    const result = await db.select().from(sponsorBanners).where(eq(sponsorBanners.id, id)).limit(1);
    return result[0];
  }

  async getSponsorBannersByTournament(tournamentId: string): Promise<SponsorBanner[]> {
    return await db
      .select()
      .from(sponsorBanners)
      .where(and(eq(sponsorBanners.tournamentId, tournamentId), eq(sponsorBanners.isActive, true)))
      .orderBy(sponsorBanners.displayOrder);
  }

  async createSponsorBanner(banner: InsertSponsorBanner): Promise<SponsorBanner> {
    const result = await db.insert(sponsorBanners).values(banner).returning();
    return result[0];
  }

  async updateSponsorBanner(id: string, updates: Partial<SponsorBanner>): Promise<SponsorBanner | undefined> {
    const result = await db.update(sponsorBanners).set(updates).where(eq(sponsorBanners.id, id)).returning();
    return result[0];
  }

  async deleteSponsorBanner(id: string): Promise<boolean> {
    const result = await db.delete(sponsorBanners).where(eq(sponsorBanners.id, id)).returning();
    return result.length > 0;
  }

  // Clubs
  async getClub(id: string): Promise<Club | undefined> {
    const result = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);
    return result[0];
  }

  async getClubs(): Promise<Club[]> {
    return await db.select().from(clubs);
  }

  async createClub(club: InsertClub): Promise<Club> {
    const result = await db.insert(clubs).values(club).returning();
    return result[0];
  }

  async updateClub(id: string, updates: Partial<InsertClub>): Promise<Club | undefined> {
    const result = await db.update(clubs).set(updates).where(eq(clubs.id, id)).returning();
    return result[0];
  }

  async deleteClub(id: string): Promise<boolean> {
    const result = await db.delete(clubs).where(eq(clubs.id, id)).returning();
    return result.length > 0;
  }

  // Courts
  async getCourt(id: string): Promise<Court | undefined> {
    const result = await db.select().from(courts).where(eq(courts.id, id)).limit(1);
    return result[0];
  }

  async getCourts(): Promise<Court[]> {
    return await db.select().from(courts);
  }

  async getCourtsByClub(clubId: string): Promise<Court[]> {
    return await db.select().from(courts).where(eq(courts.clubId, clubId));
  }

  async createCourt(court: InsertCourt): Promise<Court> {
    const result = await db.insert(courts).values(court).returning();
    return result[0];
  }

  async updateCourt(id: string, updates: Partial<Court>): Promise<Court | undefined> {
    const result = await db.update(courts).set(updates).where(eq(courts.id, id)).returning();
    return result[0];
  }

  // Players
  async getPlayer(id: string): Promise<Player | undefined> {
    const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
    return result[0];
  }

  async getPlayers(): Promise<Player[]> {
    return await db.select().from(players);
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const result = await db.insert(players).values(player).returning();
    return result[0];
  }

  // Pairs
  async getPair(id: string): Promise<Pair | undefined> {
    const result = await db.select().from(pairs).where(eq(pairs.id, id)).limit(1);
    return result[0];
  }

  async getPairs(): Promise<PairWithPlayers[]> {
    const pairsData = await db
      .select({
        pair: pairs,
        player1: players,
        player2: players,
      })
      .from(pairs)
      .leftJoin(players, eq(pairs.player1Id, players.id));

    const result: PairWithPlayers[] = [];
    for (const row of pairsData) {
      const player2 = await db.select().from(players).where(eq(players.id, row.pair.player2Id)).limit(1);
      if (row.player1 && player2[0]) {
        result.push({
          ...row.pair,
          player1: row.player1,
          player2: player2[0],
        });
      }
    }
    return result;
  }

  async getPairsByTournament(tournamentId: string): Promise<PairWithPlayers[]> {
    const pairsData = await db
      .select({
        pair: pairs,
        player1: players,
        player2: players,
      })
      .from(pairs)
      .leftJoin(players, eq(pairs.player1Id, players.id))
      .where(eq(pairs.tournamentId, tournamentId));

    const result: PairWithPlayers[] = [];
    for (const row of pairsData) {
      const player2 = await db.select().from(players).where(eq(players.id, row.pair.player2Id)).limit(1);
      if (row.player1 && player2[0]) {
        result.push({
          ...row.pair,
          player1: row.player1,
          player2: player2[0],
        });
      }
    }
    return result;
  }

  async getWaitingPairs(tournamentId: string): Promise<PairWithPlayers[]> {
    const waitingPairsData = await db
      .select({
        pair: pairs,
        player1: players,
        player2: players,
      })
      .from(pairs)
      .leftJoin(players, eq(pairs.player1Id, players.id))
      .where(and(eq(pairs.tournamentId, tournamentId), eq(pairs.isWaiting, true)))
      .orderBy(pairs.waitingSince);

    const result: PairWithPlayers[] = [];
    for (const row of waitingPairsData) {
      const player2 = await db.select().from(players).where(eq(players.id, row.pair.player2Id)).limit(1);
      if (row.player1 && player2[0]) {
        result.push({
          ...row.pair,
          player1: row.player1,
          player2: player2[0],
        });
      }
    }
    return result;
  }

  async createPair(pair: InsertPair): Promise<Pair> {
    const result = await db.insert(pairs).values(pair).returning();
    return result[0];
  }

  async updatePair(id: string, updates: Partial<Pair>): Promise<Pair | undefined> {
    const result = await db.update(pairs).set(updates).where(eq(pairs.id, id)).returning();
    return result[0];
  }

  async deletePair(id: string): Promise<boolean> {
    const result = await db.delete(pairs).where(eq(pairs.id, id)).returning();
    return result.length > 0;
  }

  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1);
    return result[0];
  }

  async getMatches(): Promise<Match[]> {
    return await db.select().from(matches);
  }

  async getCurrentMatches(tournamentId: string): Promise<MatchWithDetails[]> {
    const currentMatches = await db
      .select()
      .from(matches)
      .where(and(eq(matches.tournamentId, tournamentId), eq(matches.status, "playing")));

    const result: MatchWithDetails[] = [];
    for (const match of currentMatches) {
      const court = await this.getCourt(match.courtId);
      const pair1 = await this.getPair(match.pair1Id);
      const pair2 = await this.getPair(match.pair2Id);

      if (!court || !pair1 || !pair2) continue;

      const player1_1 = await this.getPlayer(pair1.player1Id);
      const player1_2 = await this.getPlayer(pair1.player2Id);
      const player2_1 = await this.getPlayer(pair2.player1Id);
      const player2_2 = await this.getPlayer(pair2.player2Id);

      if (!player1_1 || !player1_2 || !player2_1 || !player2_2) continue;

      result.push({
        ...match,
        court,
        pair1: { ...pair1, player1: player1_1, player2: player1_2 },
        pair2: { ...pair2, player1: player2_1, player2: player2_2 },
      });
    }
    return result;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const result = await db.insert(matches).values(match).returning();
    return result[0];
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    const result = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return result[0];
  }

  // Results
  async getResult(id: string): Promise<Result | undefined> {
    const result = await db.select().from(results).where(eq(results.id, id)).limit(1);
    return result[0];
  }

  async getResults(): Promise<Result[]> {
    return await db.select().from(results);
  }

  async getRecentResults(tournamentId: string, limit = 10): Promise<ResultWithDetails[]> {
    const recentResults = await db
      .select({
        result: results,
        match: matches,
      })
      .from(results)
      .innerJoin(matches, eq(results.matchId, matches.id))
      .where(eq(matches.tournamentId, tournamentId))
      .orderBy(desc(results.createdAt))
      .limit(limit);

    const resultDetails: ResultWithDetails[] = [];
    for (const row of recentResults) {
      const court = await this.getCourt(row.match.courtId);
      const pair1 = await this.getPair(row.match.pair1Id);
      const pair2 = await this.getPair(row.match.pair2Id);
      const winner = await this.getPair(row.result.winnerId);
      const loser = await this.getPair(row.result.loserId);

      if (!court || !pair1 || !pair2 || !winner || !loser) continue;

      const pair1_p1 = await this.getPlayer(pair1.player1Id);
      const pair1_p2 = await this.getPlayer(pair1.player2Id);
      const pair2_p1 = await this.getPlayer(pair2.player1Id);
      const pair2_p2 = await this.getPlayer(pair2.player2Id);
      const winner_p1 = await this.getPlayer(winner.player1Id);
      const winner_p2 = await this.getPlayer(winner.player2Id);
      const loser_p1 = await this.getPlayer(loser.player1Id);
      const loser_p2 = await this.getPlayer(loser.player2Id);

      if (!pair1_p1 || !pair1_p2 || !pair2_p1 || !pair2_p2 || !winner_p1 || !winner_p2 || !loser_p1 || !loser_p2)
        continue;

      resultDetails.push({
        ...row.result,
        match: {
          ...row.match,
          court,
          pair1: { ...pair1, player1: pair1_p1, player2: pair1_p2 },
          pair2: { ...pair2, player1: pair2_p1, player2: pair2_p2 },
        },
        winner: { ...winner, player1: winner_p1, player2: winner_p2 },
        loser: { ...loser, player1: loser_p1, player2: loser_p2 },
      });
    }
    return resultDetails;
  }

  async createResult(result: InsertResult): Promise<Result> {
    const resultData = await db.insert(results).values(result).returning();
    return resultData[0];
  }

  async updateResult(id: string, updates: Partial<Result>): Promise<Result | undefined> {
    const result = await db.update(results).set(updates).where(eq(results.id, id)).returning();
    return result[0];
  }

  async deleteResult(id: string): Promise<boolean> {
    const result = await db.delete(results).where(eq(results.id, id)).returning();
    return result.length > 0;
  }

  // Scheduled Matches
  async getScheduledMatch(id: string): Promise<ScheduledMatch | undefined> {
    const result = await db.select().from(scheduledMatches).where(eq(scheduledMatches.id, id)).limit(1);
    return result[0];
  }

  async getScheduledMatchesByTournament(tournamentId: string): Promise<ScheduledMatchWithDetails[]> {
    const matches = await db
      .select()
      .from(scheduledMatches)
      .where(eq(scheduledMatches.tournamentId, tournamentId))
      .orderBy(scheduledMatches.day);

    const matchesWithDetails: ScheduledMatchWithDetails[] = [];
    for (const match of matches) {
      const details = await this.buildScheduledMatchWithDetails(match);
      if (details) {
        matchesWithDetails.push(details);
      }
    }
    return matchesWithDetails;
  }

  async getScheduledMatchesByDay(tournamentId: string, day: Date): Promise<ScheduledMatchWithDetails[]> {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const matches = await db
      .select()
      .from(scheduledMatches)
      .where(
        and(
          eq(scheduledMatches.tournamentId, tournamentId),
          sql`DATE(${scheduledMatches.day}) = DATE(${dayStart})`
        )
      )
      .orderBy(scheduledMatches.plannedTime);

    const matchesWithDetails: ScheduledMatchWithDetails[] = [];
    for (const match of matches) {
      const details = await this.buildScheduledMatchWithDetails(match);
      if (details) {
        matchesWithDetails.push(details);
      }
    }
    return matchesWithDetails;
  }

  async createScheduledMatch(scheduledMatch: InsertScheduledMatch): Promise<ScheduledMatch> {
    const result = await db.insert(scheduledMatches).values(scheduledMatch).returning();
    const match = result[0];

    const pair1 = await this.getPair(scheduledMatch.pair1Id);
    const pair2 = await this.getPair(scheduledMatch.pair2Id);

    if (pair1 && pair2) {
      await db.insert(scheduledMatchPlayers).values([
        {
          scheduledMatchId: match.id,
          playerId: pair1.player1Id,
          pairId: pair1.id,
          isPresent: false,
        },
        {
          scheduledMatchId: match.id,
          playerId: pair1.player2Id,
          pairId: pair1.id,
          isPresent: false,
        },
        {
          scheduledMatchId: match.id,
          playerId: pair2.player1Id,
          pairId: pair2.id,
          isPresent: false,
        },
        {
          scheduledMatchId: match.id,
          playerId: pair2.player2Id,
          pairId: pair2.id,
          isPresent: false,
        },
      ]);
    }

    return match;
  }

  async updateScheduledMatch(id: string, updates: Partial<ScheduledMatch>): Promise<ScheduledMatch | undefined> {
    const result = await db.update(scheduledMatches).set(updates).where(eq(scheduledMatches.id, id)).returning();
    return result[0];
  }

  async deleteScheduledMatch(id: string): Promise<boolean> {
    await db.delete(scheduledMatchPlayers).where(eq(scheduledMatchPlayers.scheduledMatchId, id));
    const result = await db.delete(scheduledMatches).where(eq(scheduledMatches.id, id)).returning();
    return result.length > 0;
  }

  // Scheduled Match Players
  async getScheduledMatchPlayers(scheduledMatchId: string): Promise<(ScheduledMatchPlayer & { player: Player })[]> {
    const matchPlayers = await db
      .select()
      .from(scheduledMatchPlayers)
      .where(eq(scheduledMatchPlayers.scheduledMatchId, scheduledMatchId));

    const playersWithDetails: (ScheduledMatchPlayer & { player: Player })[] = [];
    for (const matchPlayer of matchPlayers) {
      const player = await this.getPlayer(matchPlayer.playerId);
      if (player) {
        playersWithDetails.push({ ...matchPlayer, player });
      }
    }
    return playersWithDetails;
  }

  async checkInPlayer(
    scheduledMatchId: string,
    playerId: string,
    checkedInBy: string
  ): Promise<ScheduledMatchPlayer | undefined> {
    const result = await db
      .update(scheduledMatchPlayers)
      .set({
        isPresent: true,
        checkInTime: new Date(),
        checkedInBy,
      })
      .where(and(eq(scheduledMatchPlayers.scheduledMatchId, scheduledMatchId), eq(scheduledMatchPlayers.playerId, playerId)))
      .returning();

    const updated = result[0];
    if (!updated) return undefined;

    const allPlayers = await this.getScheduledMatchPlayers(scheduledMatchId);
    const allPresent = allPlayers.every((p) => p.isPresent);

    if (allPresent) {
      await this.updateScheduledMatch(scheduledMatchId, { status: "ready" });
    }

    return updated;
  }

  async checkOutPlayer(scheduledMatchId: string, playerId: string): Promise<ScheduledMatchPlayer | undefined> {
    const match = await this.getScheduledMatch(scheduledMatchId);

    const result = await db
      .update(scheduledMatchPlayers)
      .set({
        isPresent: false,
        checkInTime: null,
        checkedInBy: null,
      })
      .where(and(eq(scheduledMatchPlayers.scheduledMatchId, scheduledMatchId), eq(scheduledMatchPlayers.playerId, playerId)))
      .returning();

    const updated = result[0];
    if (!updated) return undefined;

    if (match && match.status === "ready") {
      await this.updateScheduledMatch(scheduledMatchId, { status: "scheduled" });
    }

    return updated;
  }

  async resetPlayerStatus(scheduledMatchId: string, playerId: string): Promise<ScheduledMatchPlayer | undefined> {
    const match = await this.getScheduledMatch(scheduledMatchId);

    const result = await db
      .update(scheduledMatchPlayers)
      .set({
        isPresent: null,
        checkInTime: null,
        checkedInBy: null,
      })
      .where(and(eq(scheduledMatchPlayers.scheduledMatchId, scheduledMatchId), eq(scheduledMatchPlayers.playerId, playerId)))
      .returning();

    const updated = result[0];
    if (!updated) return undefined;

    if (match && match.status === "ready") {
      await this.updateScheduledMatch(scheduledMatchId, { status: "scheduled" });
    }

    return updated;
  }

  // Court Assignment
  async autoAssignCourt(scheduledMatchId: string): Promise<ScheduledMatch | undefined> {
    const match = await this.getScheduledMatch(scheduledMatchId);
    if (!match) return undefined;

    const tournament = await this.getTournament(match.tournamentId);
    if (!tournament) return undefined;

    const availableCourts = await db
      .select()
      .from(courts)
      .where(and(eq(courts.clubId, tournament.clubId), eq(courts.isAvailable, true)))
      .limit(1);

    const availableCourt = availableCourts[0];
    if (!availableCourt) return undefined;

    return await this.updateScheduledMatch(scheduledMatchId, {
      courtId: availableCourt.id,
      status: "assigned",
    });
  }

  async manualAssignCourt(scheduledMatchId: string, courtId: string): Promise<ScheduledMatch | undefined> {
    const match = await this.getScheduledMatch(scheduledMatchId);
    if (!match) return undefined;

    return await this.updateScheduledMatch(scheduledMatchId, {
      courtId,
      status: "assigned",
    });
  }

  private async buildScheduledMatchWithDetails(match: ScheduledMatch): Promise<ScheduledMatchWithDetails | null> {
    const pair1 = await this.getPair(match.pair1Id);
    const pair2 = await this.getPair(match.pair2Id);

    if (!pair1 || !pair2) return null;

    const player1_1 = await this.getPlayer(pair1.player1Id);
    const player1_2 = await this.getPlayer(pair1.player2Id);
    const player2_1 = await this.getPlayer(pair2.player1Id);
    const player2_2 = await this.getPlayer(pair2.player2Id);

    if (!player1_1 || !player1_2 || !player2_1 || !player2_2) return null;

    const category = match.categoryId ? await this.getCategory(match.categoryId) : undefined;
    const court = match.courtId ? await this.getCourt(match.courtId) : undefined;

    const matchPlayers = await this.getScheduledMatchPlayers(match.id);

    return {
      ...match,
      pair1: { ...pair1, player1: player1_1, player2: player1_2 },
      pair2: { ...pair2, player1: player2_1, player2: player2_2 },
      category,
      court,
      players: matchPlayers,
    };
  }
}
