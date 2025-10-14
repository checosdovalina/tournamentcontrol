import { 
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
  type Advertisement,
  type InsertAdvertisement,
  type Announcement,
  type InsertAnnouncement,
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
  type ScheduledMatchWithDetails
} from "@shared/schema";
import { randomUUID } from "crypto";
import { DatabaseStorage } from "./db-storage";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Tournaments
  getTournament(id: string): Promise<Tournament | undefined>;
  getTournaments(): Promise<Tournament[]>;
  getActiveTournament(): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | undefined>;
  
  // Tournament Users (user-tournament assignments)
  getTournamentUser(id: string): Promise<TournamentUser | undefined>;
  getTournamentUsersByTournament(tournamentId: string): Promise<TournamentUser[]>;
  getTournamentUsersByUser(userId: string): Promise<TournamentUser[]>;
  getTournamentUserByUserAndTournament(userId: string, tournamentId: string): Promise<TournamentUser | undefined>;
  createTournamentUser(tournamentUser: InsertTournamentUser): Promise<TournamentUser>;
  updateTournamentUser(id: string, updates: Partial<TournamentUser>): Promise<TournamentUser | undefined>;
  deleteTournamentUser(id: string): Promise<boolean>;
  
  // Categories
  getCategory(id: string): Promise<Category | undefined>;
  getCategoriesByTournament(tournamentId: string): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Sponsor Banners
  getSponsorBanner(id: string): Promise<SponsorBanner | undefined>;
  getSponsorBannersByTournament(tournamentId: string): Promise<SponsorBanner[]>;
  createSponsorBanner(banner: InsertSponsorBanner): Promise<SponsorBanner>;
  updateSponsorBanner(id: string, updates: Partial<SponsorBanner>): Promise<SponsorBanner | undefined>;
  deleteSponsorBanner(id: string): Promise<boolean>;
  
  // Advertisements
  getAdvertisement(id: string): Promise<Advertisement | undefined>;
  getAdvertisementsByTournament(tournamentId: string): Promise<Advertisement[]>;
  getActiveAdvertisements(tournamentId: string): Promise<Advertisement[]>;
  createAdvertisement(advertisement: InsertAdvertisement): Promise<Advertisement>;
  updateAdvertisement(id: string, updates: Partial<Advertisement>): Promise<Advertisement | undefined>;
  deleteAdvertisement(id: string): Promise<boolean>;
  
  // Announcements
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  getAnnouncementsByTournament(tournamentId: string): Promise<Announcement[]>;
  getActiveAnnouncements(tournamentId: string): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;
  
  // Clubs
  getClub(id: string): Promise<Club | undefined>;
  getClubs(): Promise<Club[]>;
  createClub(club: InsertClub): Promise<Club>;
  updateClub(id: string, updates: Partial<InsertClub>): Promise<Club | undefined>;
  deleteClub(id: string): Promise<boolean>;
  
  // Courts
  getCourt(id: string): Promise<Court | undefined>;
  getCourts(): Promise<Court[]>;
  getCourtsByClub(clubId: string): Promise<Court[]>;
  createCourt(court: InsertCourt): Promise<Court>;
  updateCourt(id: string, updates: Partial<Court>): Promise<Court | undefined>;
  
  // Players
  getPlayer(id: string): Promise<Player | undefined>;
  getPlayers(): Promise<Player[]>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  
  // Pairs
  getPair(id: string): Promise<Pair | undefined>;
  getPairs(): Promise<PairWithPlayers[]>;
  getPairsByTournament(tournamentId: string): Promise<PairWithPlayers[]>;
  getWaitingPairs(tournamentId: string): Promise<PairWithPlayers[]>;
  createPair(pair: InsertPair): Promise<Pair>;
  updatePair(id: string, updates: Partial<Pair>): Promise<Pair | undefined>;
  deletePair(id: string): Promise<boolean>;
  
  // Matches
  getMatch(id: string): Promise<Match | undefined>;
  getMatches(): Promise<Match[]>;
  getCurrentMatches(tournamentId: string): Promise<MatchWithDetails[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined>;
  
  // Results
  getResult(id: string): Promise<Result | undefined>;
  getResults(): Promise<Result[]>;
  getRecentResults(tournamentId: string, limit?: number): Promise<ResultWithDetails[]>;
  getResultsByDateRange(tournamentId: string, startDate: Date, endDate: Date): Promise<ResultWithDetails[]>;
  createResult(result: InsertResult): Promise<Result>;
  updateResult(id: string, updates: Partial<Result>): Promise<Result | undefined>;
  deleteResult(id: string): Promise<boolean>;
  
  // Scheduled Matches
  getScheduledMatch(id: string): Promise<ScheduledMatch | undefined>;
  getScheduledMatchesByTournament(tournamentId: string): Promise<ScheduledMatchWithDetails[]>;
  getScheduledMatchesByDay(tournamentId: string, day: Date): Promise<ScheduledMatchWithDetails[]>;
  createScheduledMatch(scheduledMatch: InsertScheduledMatch): Promise<ScheduledMatch>;
  updateScheduledMatch(id: string, updates: Partial<ScheduledMatch>): Promise<ScheduledMatch | undefined>;
  deleteScheduledMatch(id: string): Promise<boolean>;
  
  // Scheduled Match Players (Check-in)
  getScheduledMatchPlayers(scheduledMatchId: string): Promise<(ScheduledMatchPlayer & { player: Player })[]>;
  checkInPlayer(scheduledMatchId: string, playerId: string, checkedInBy: string): Promise<ScheduledMatchPlayer | undefined>;
  checkOutPlayer(scheduledMatchId: string, playerId: string): Promise<ScheduledMatchPlayer | undefined>;
  resetPlayerStatus(scheduledMatchId: string, playerId: string): Promise<ScheduledMatchPlayer | undefined>;
  
  // Court Assignment
  autoAssignCourt(scheduledMatchId: string): Promise<ScheduledMatch | undefined>;
  manualAssignCourt(scheduledMatchId: string, courtId: string): Promise<ScheduledMatch | undefined>;
  
  // Tournament Reset
  resetTournamentData(tournamentId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tournaments: Map<string, Tournament>;
  private tournamentUsers: Map<string, TournamentUser>;
  private categories: Map<string, Category>;
  private sponsorBanners: Map<string, SponsorBanner>;
  private advertisements: Map<string, Advertisement>;
  private clubs: Map<string, Club>;
  private courts: Map<string, Court>;
  private players: Map<string, Player>;
  private pairs: Map<string, Pair>;
  private matches: Map<string, Match>;
  private results: Map<string, Result>;
  private scheduledMatches: Map<string, ScheduledMatch>;
  private scheduledMatchPlayers: Map<string, ScheduledMatchPlayer>;

  constructor() {
    this.users = new Map();
    this.tournaments = new Map();
    this.tournamentUsers = new Map();
    this.categories = new Map();
    this.sponsorBanners = new Map();
    this.advertisements = new Map();
    this.clubs = new Map();
    this.courts = new Map();
    this.players = new Map();
    this.pairs = new Map();
    this.matches = new Map();
    this.results = new Map();
    this.scheduledMatches = new Map();
    this.scheduledMatchPlayers = new Map();
    
    // Initialize with some test data
    this.initializeTestData();
  }

  private async initializeTestData() {
    // Create default club
    const club = await this.createClub({
      name: "Club Deportivo Central",
      address: "Av. Principal 123"
    });

    // Create courts
    for (let i = 1; i <= 6; i++) {
      await this.createCourt({
        name: `Cancha ${i}`,
        clubId: club.id,
        isAvailable: i === 4 || i === 6 // Courts 4 and 6 available
      });
    }

    // Create tournament
    const tournament = await this.createTournament({
      name: "Torneo Primavera 2024",
      clubId: club.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      isActive: true,
      config: {
        logos: {},
        sponsors: []
      }
    });

    // Create superadmin user
    const superadmin = await this.createUser({
      username: "superadmin",
      password: "super123",
      role: "superadmin",
      name: "Super Administrador"
    });

    // Create default admin user
    const admin = await this.createUser({
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Admin Principal"
    });

    // Create scorekeeper user  
    const scorekeeper = await this.createUser({
      username: "escribano",
      password: "escribano123",
      role: "scorekeeper", 
      name: "Escribano Sistema"
    });

    // Assign users to tournament
    await this.createTournamentUser({
      tournamentId: tournament.id,
      userId: admin.id,
      role: "admin",
      status: "active"
    });

    await this.createTournamentUser({
      tournamentId: tournament.id,
      userId: scorekeeper.id,
      role: "scorekeeper",
      status: "active"
    });

    // Create default category
    await this.createCategory({
      tournamentId: tournament.id,
      name: "General",
      description: "Categoría general por defecto",
      isActive: true
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser,
      role: insertUser.role || "scorekeeper",
      email: insertUser.email ?? null,
      id,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  // Tournaments
  async getTournament(id: string): Promise<Tournament | undefined> {
    return this.tournaments.get(id);
  }

  async getActiveTournament(): Promise<Tournament | undefined> {
    return Array.from(this.tournaments.values()).find(t => t.isActive);
  }

  async createTournament(insertTournament: InsertTournament): Promise<Tournament> {
    const id = randomUUID();
    const tournament: Tournament = {
      ...insertTournament,
      isActive: insertTournament.isActive ?? true,
      config: insertTournament.config ?? null,
      tournamentLogoUrl: insertTournament.tournamentLogoUrl ?? null,
      clubLogoUrl: insertTournament.clubLogoUrl ?? null,
      systemLogoUrl: insertTournament.systemLogoUrl ?? null,
      id,
      createdAt: new Date()
    };
    this.tournaments.set(id, tournament);
    return tournament;
  }

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | undefined> {
    const tournament = this.tournaments.get(id);
    if (!tournament) return undefined;
    
    const updated = { ...tournament, ...updates };
    this.tournaments.set(id, updated);
    return updated;
  }

  // Clubs
  async getClub(id: string): Promise<Club | undefined> {
    return this.clubs.get(id);
  }

  async getClubs(): Promise<Club[]> {
    return Array.from(this.clubs.values());
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const id = randomUUID();
    const club: Club = {
      ...insertClub,
      address: insertClub.address ?? null,
      logoUrl: insertClub.logoUrl ?? null,
      id,
      createdAt: new Date()
    };
    this.clubs.set(id, club);
    return club;
  }

  async updateClub(id: string, updates: Partial<InsertClub>): Promise<Club | undefined> {
    const club = this.clubs.get(id);
    if (!club) return undefined;
    
    const updated = { ...club, ...updates };
    this.clubs.set(id, updated);
    return updated;
  }

  async deleteClub(id: string): Promise<boolean> {
    return this.clubs.delete(id);
  }

  // Courts
  async getCourt(id: string): Promise<Court | undefined> {
    return this.courts.get(id);
  }

  async getCourts(): Promise<Court[]> {
    return Array.from(this.courts.values());
  }

  async getCourtsByClub(clubId: string): Promise<Court[]> {
    return Array.from(this.courts.values()).filter(court => court.clubId === clubId);
  }

  async createCourt(insertCourt: InsertCourt): Promise<Court> {
    const id = randomUUID();
    const court: Court = {
      ...insertCourt,
      isAvailable: insertCourt.isAvailable ?? true,
      id,
      createdAt: new Date()
    };
    this.courts.set(id, court);
    return court;
  }

  async updateCourt(id: string, updates: Partial<Court>): Promise<Court | undefined> {
    const court = this.courts.get(id);
    if (!court) return undefined;
    
    const updated = { ...court, ...updates };
    this.courts.set(id, updated);
    return updated;
  }

  // Players
  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async getPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = {
      ...insertPlayer,
      clubId: insertPlayer.clubId ?? null,
      id,
      createdAt: new Date()
    };
    this.players.set(id, player);
    return player;
  }

  // Pairs
  async getPair(id: string): Promise<Pair | undefined> {
    return this.pairs.get(id);
  }

  async getPairs(): Promise<PairWithPlayers[]> {
    const allPairs = Array.from(this.pairs.values());
    const result: PairWithPlayers[] = [];
    
    for (const pair of allPairs) {
      const player1 = this.players.get(pair.player1Id);
      const player2 = this.players.get(pair.player2Id);
      if (player1 && player2) {
        result.push({
          ...pair,
          player1,
          player2,
        });
      }
    }
    return result;
  }

  async getPairsByTournament(tournamentId: string): Promise<PairWithPlayers[]> {
    const tournamentPairs = Array.from(this.pairs.values()).filter(pair => pair.tournamentId === tournamentId);
    const result: PairWithPlayers[] = [];
    
    for (const pair of tournamentPairs) {
      const player1 = this.players.get(pair.player1Id);
      const player2 = this.players.get(pair.player2Id);
      if (player1 && player2) {
        result.push({
          ...pair,
          player1,
          player2,
        });
      }
    }
    return result;
  }

  async getWaitingPairs(tournamentId: string): Promise<PairWithPlayers[]> {
    const waitingPairs = Array.from(this.pairs.values())
      .filter(pair => pair.tournamentId === tournamentId && pair.isWaiting)
      .sort((a, b) => (a.waitingSince?.getTime() || 0) - (b.waitingSince?.getTime() || 0));

    const pairsWithPlayers: PairWithPlayers[] = [];
    for (const pair of waitingPairs) {
      const player1 = await this.getPlayer(pair.player1Id);
      const player2 = await this.getPlayer(pair.player2Id);
      if (player1 && player2) {
        pairsWithPlayers.push({ ...pair, player1, player2 });
      }
    }
    return pairsWithPlayers;
  }

  async createPair(insertPair: InsertPair): Promise<Pair> {
    const id = randomUUID();
    const pair: Pair = {
      ...insertPair,
      categoryId: insertPair.categoryId ?? null,
      isPresent: insertPair.isPresent ?? false,
      isWaiting: insertPair.isWaiting ?? false,
      waitingSince: insertPair.waitingSince ?? null,
      id,
      createdAt: new Date()
    };
    this.pairs.set(id, pair);
    return pair;
  }

  async updatePair(id: string, updates: Partial<Pair>): Promise<Pair | undefined> {
    const pair = this.pairs.get(id);
    if (!pair) return undefined;
    
    const updated = { ...pair, ...updates };
    this.pairs.set(id, updated);
    return updated;
  }

  async deletePair(id: string): Promise<boolean> {
    return this.pairs.delete(id);
  }

  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    return this.matches.get(id);
  }

  async getMatches(): Promise<Match[]> {
    return Array.from(this.matches.values());
  }

  async getCurrentMatches(tournamentId: string): Promise<MatchWithDetails[]> {
    const currentMatches = Array.from(this.matches.values())
      .filter(match => match.tournamentId === tournamentId && match.status === "playing");

    const matchesWithDetails: MatchWithDetails[] = [];
    for (const match of currentMatches) {
      const court = await this.getCourt(match.courtId);
      const pair1 = await this.getPair(match.pair1Id);
      const pair2 = await this.getPair(match.pair2Id);
      
      if (court && pair1 && pair2) {
        const player1_1 = await this.getPlayer(pair1.player1Id);
        const player1_2 = await this.getPlayer(pair1.player2Id);
        const player2_1 = await this.getPlayer(pair2.player1Id);
        const player2_2 = await this.getPlayer(pair2.player2Id);
        
        if (player1_1 && player1_2 && player2_1 && player2_2) {
          matchesWithDetails.push({
            ...match,
            court,
            pair1: { ...pair1, player1: player1_1, player2: player1_2 },
            pair2: { ...pair2, player1: player2_1, player2: player2_2 }
          });
        }
      }
    }
    return matchesWithDetails;
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = randomUUID();
    const match: Match = {
      ...insertMatch,
      categoryId: insertMatch.categoryId ?? null,
      format: insertMatch.format ?? null,
      status: insertMatch.status ?? "playing",
      startTime: insertMatch.startTime ?? new Date(),
      endTime: insertMatch.endTime ?? null,
      score: insertMatch.score ?? null,
      winnerId: insertMatch.winnerId ?? null,
      notes: insertMatch.notes ?? null,
      id,
      createdAt: new Date()
    };
    this.matches.set(id, match);
    return match;
  }

  async updateMatch(id: string, updates: Partial<Match>): Promise<Match | undefined> {
    const match = this.matches.get(id);
    if (!match) return undefined;
    
    const updated = { ...match, ...updates };
    this.matches.set(id, updated);
    return updated;
  }

  // Results
  async getResult(id: string): Promise<Result | undefined> {
    return this.results.get(id);
  }

  async getResults(): Promise<Result[]> {
    return Array.from(this.results.values());
  }

  async getRecentResults(tournamentId: string, limit = 10): Promise<ResultWithDetails[]> {
    const resultsWithDetails: ResultWithDetails[] = [];
    
    // First filter by tournament, then sort and limit
    const allResults = Array.from(this.results.values());
    const tournamentResults: Result[] = [];
    
    for (const result of allResults) {
      const match = await this.getMatch(result.matchId);
      if (match && match.tournamentId === tournamentId) {
        tournamentResults.push(result);
      }
    }
    
    // Sort by creation date and apply limit
    const recentResults = tournamentResults
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);

    for (const result of recentResults) {
      const match = await this.getMatch(result.matchId);
      if (match) {
        const court = await this.getCourt(match.courtId);
        const pair1 = await this.getPair(match.pair1Id);
        const pair2 = await this.getPair(match.pair2Id);
        
        if (!court || !pair1 || !pair2) continue;

        const pair1_p1 = await this.getPlayer(pair1.player1Id);
        const pair1_p2 = await this.getPlayer(pair1.player2Id);
        const pair2_p1 = await this.getPlayer(pair2.player1Id);
        const pair2_p2 = await this.getPlayer(pair2.player2Id);
        
        if (!pair1_p1 || !pair1_p2 || !pair2_p1 || !pair2_p2) continue;

        const winner = await this.getPair(result.winnerId);
        const loser = await this.getPair(result.loserId);
        
        if (winner && loser) {
          const winner_p1 = await this.getPlayer(winner.player1Id);
          const winner_p2 = await this.getPlayer(winner.player2Id);
          const loser_p1 = await this.getPlayer(loser.player1Id);
          const loser_p2 = await this.getPlayer(loser.player2Id);
          
          if (winner_p1 && winner_p2 && loser_p1 && loser_p2) {
            resultsWithDetails.push({
              ...result,
              match: {
                ...match,
                court,
                pair1: { ...pair1, player1: pair1_p1, player2: pair1_p2 },
                pair2: { ...pair2, player1: pair2_p1, player2: pair2_p2 }
              },
              winner: { ...winner, player1: winner_p1, player2: winner_p2 },
              loser: { ...loser, player1: loser_p1, player2: loser_p2 }
            });
          }
        }
      }
    }
    return resultsWithDetails;
  }

  async getResultsByDateRange(tournamentId: string, startDate: Date, endDate: Date): Promise<ResultWithDetails[]> {
    const resultsWithDetails: ResultWithDetails[] = [];
    
    const allResults = Array.from(this.results.values());
    const tournamentResults: Result[] = [];
    
    // Build a map of matchId -> scheduledMatch for efficient lookup
    const scheduledMatches = Array.from(this.scheduledMatches.values());
    const matchIdToScheduledMatch = new Map<string, any>();
    for (const sm of scheduledMatches) {
      if (sm.matchId) {
        matchIdToScheduledMatch.set(sm.matchId, sm);
      }
    }
    
    for (const result of allResults) {
      const match = await this.getMatch(result.matchId);
      if (match && match.tournamentId === tournamentId) {
        let matchDay: Date;
        
        // Try to get day from scheduled match first
        const scheduledMatch = matchIdToScheduledMatch.get(match.id);
        if (scheduledMatch?.day) {
          matchDay = new Date(scheduledMatch.day);
        } 
        // Fallback to match start time
        else if (match.startTime) {
          matchDay = new Date(match.startTime);
        } 
        // Last resort: use result creation time (clone to avoid mutation)
        else {
          matchDay = result.createdAt ? new Date(result.createdAt) : new Date();
        }
        
        matchDay.setHours(0, 0, 0, 0);
        
        if (matchDay >= startDate && matchDay < endDate) {
          tournamentResults.push(result);
        }
      }
    }
    
    const sortedResults = tournamentResults
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    for (const result of sortedResults) {
      const match = await this.getMatch(result.matchId);
      if (match) {
        const court = await this.getCourt(match.courtId);
        const pair1 = await this.getPair(match.pair1Id);
        const pair2 = await this.getPair(match.pair2Id);
        
        if (!court || !pair1 || !pair2) continue;

        const pair1_p1 = await this.getPlayer(pair1.player1Id);
        const pair1_p2 = await this.getPlayer(pair1.player2Id);
        const pair2_p1 = await this.getPlayer(pair2.player1Id);
        const pair2_p2 = await this.getPlayer(pair2.player2Id);
        
        if (!pair1_p1 || !pair1_p2 || !pair2_p1 || !pair2_p2) continue;

        const winner = await this.getPair(result.winnerId);
        const loser = await this.getPair(result.loserId);
        
        if (winner && loser) {
          const winner_p1 = await this.getPlayer(winner.player1Id);
          const winner_p2 = await this.getPlayer(winner.player2Id);
          const loser_p1 = await this.getPlayer(loser.player1Id);
          const loser_p2 = await this.getPlayer(loser.player2Id);
          
          if (winner_p1 && winner_p2 && loser_p1 && loser_p2) {
            resultsWithDetails.push({
              ...result,
              match: {
                ...match,
                court,
                pair1: { ...pair1, player1: pair1_p1, player2: pair1_p2 },
                pair2: { ...pair2, player1: pair2_p1, player2: pair2_p2 }
              },
              winner: { ...winner, player1: winner_p1, player2: winner_p2 },
              loser: { ...loser, player1: loser_p1, player2: loser_p2 }
            });
          }
        }
      }
    }
    return resultsWithDetails;
  }

  async createResult(insertResult: InsertResult): Promise<Result> {
    const id = randomUUID();
    const result: Result = {
      ...insertResult,
      duration: insertResult.duration ?? null,
      id,
      createdAt: new Date()
    };
    this.results.set(id, result);
    return result;
  }

  async updateResult(id: string, updates: Partial<Result>): Promise<Result | undefined> {
    const result = this.results.get(id);
    if (!result) return undefined;
    const updatedResult = { ...result, ...updates };
    this.results.set(id, updatedResult);
    return updatedResult;
  }

  async deleteResult(id: string): Promise<boolean> {
    return this.results.delete(id);
  }

  // Additional User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // Additional Tournament methods
  async getTournaments(): Promise<Tournament[]> {
    return Array.from(this.tournaments.values());
  }

  // Tournament Users methods
  async getTournamentUser(id: string): Promise<TournamentUser | undefined> {
    return this.tournamentUsers.get(id);
  }

  async getTournamentUsersByTournament(tournamentId: string): Promise<TournamentUser[]> {
    return Array.from(this.tournamentUsers.values()).filter(tu => tu.tournamentId === tournamentId);
  }

  async getTournamentUsersByUser(userId: string): Promise<TournamentUser[]> {
    return Array.from(this.tournamentUsers.values()).filter(tu => tu.userId === userId);
  }

  async getTournamentUserByUserAndTournament(userId: string, tournamentId: string): Promise<TournamentUser | undefined> {
    return Array.from(this.tournamentUsers.values()).find(
      tu => tu.userId === userId && tu.tournamentId === tournamentId
    );
  }

  async createTournamentUser(insertTournamentUser: InsertTournamentUser): Promise<TournamentUser> {
    const id = randomUUID();
    const tournamentUser: TournamentUser = {
      ...insertTournamentUser,
      status: insertTournamentUser.status ?? "active",
      id,
      createdAt: new Date()
    };
    this.tournamentUsers.set(id, tournamentUser);
    return tournamentUser;
  }

  async updateTournamentUser(id: string, updates: Partial<TournamentUser>): Promise<TournamentUser | undefined> {
    const tournamentUser = this.tournamentUsers.get(id);
    if (!tournamentUser) return undefined;
    
    const updated = { ...tournamentUser, ...updates };
    this.tournamentUsers.set(id, updated);
    return updated;
  }

  async deleteTournamentUser(id: string): Promise<boolean> {
    return this.tournamentUsers.delete(id);
  }

  // Categories methods
  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoriesByTournament(tournamentId: string): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      cat => cat.tournamentId === tournamentId && cat.isActive
    );
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = {
      ...insertCategory,
      description: insertCategory.description ?? null,
      isActive: insertCategory.isActive ?? true,
      id,
      createdAt: new Date()
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updated = { ...category, ...updates };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Sponsor Banners methods
  async getSponsorBanner(id: string): Promise<SponsorBanner | undefined> {
    return this.sponsorBanners.get(id);
  }

  async getSponsorBannersByTournament(tournamentId: string): Promise<SponsorBanner[]> {
    return Array.from(this.sponsorBanners.values())
      .filter(banner => banner.tournamentId === tournamentId && banner.isActive)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }

  async createSponsorBanner(insertBanner: InsertSponsorBanner): Promise<SponsorBanner> {
    const id = randomUUID();
    const banner: SponsorBanner = {
      ...insertBanner,
      link: insertBanner.link ?? null,
      displayOrder: insertBanner.displayOrder ?? 0,
      isActive: insertBanner.isActive ?? true,
      id,
      createdAt: new Date()
    };
    this.sponsorBanners.set(id, banner);
    return banner;
  }

  async updateSponsorBanner(id: string, updates: Partial<SponsorBanner>): Promise<SponsorBanner | undefined> {
    const banner = this.sponsorBanners.get(id);
    if (!banner) return undefined;
    
    const updated = { ...banner, ...updates };
    this.sponsorBanners.set(id, updated);
    return updated;
  }

  async deleteSponsorBanner(id: string): Promise<boolean> {
    return this.sponsorBanners.delete(id);
  }

  // Advertisements
  async getAdvertisement(id: string): Promise<Advertisement | undefined> {
    return this.advertisements.get(id);
  }

  async getAdvertisementsByTournament(tournamentId: string): Promise<Advertisement[]> {
    return Array.from(this.advertisements.values())
      .filter(ad => ad.tournamentId === tournamentId)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async getActiveAdvertisements(tournamentId: string): Promise<Advertisement[]> {
    return Array.from(this.advertisements.values())
      .filter(ad => ad.tournamentId === tournamentId && ad.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async createAdvertisement(advertisement: InsertAdvertisement): Promise<Advertisement> {
    const id = randomUUID();
    const newAdvertisement: Advertisement = {
      ...advertisement,
      id,
      isActive: advertisement.isActive ?? true,
      displayOrder: advertisement.displayOrder ?? 0,
      duration: advertisement.duration ?? 5,
      startTime: advertisement.startTime ?? null,
      endTime: advertisement.endTime ?? null,
      activeDays: advertisement.activeDays ?? null,
      createdAt: new Date(),
    };
    this.advertisements.set(id, newAdvertisement);
    return newAdvertisement;
  }

  async updateAdvertisement(id: string, updates: Partial<Advertisement>): Promise<Advertisement | undefined> {
    const advertisement = this.advertisements.get(id);
    if (!advertisement) return undefined;
    const updated = { ...advertisement, ...updates };
    this.advertisements.set(id, updated);
    return updated;
  }

  async deleteAdvertisement(id: string): Promise<boolean> {
    return this.advertisements.delete(id);
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
    
    const players = await this.getScheduledMatchPlayers(match.id);

    return {
      ...match,
      pair1: { ...pair1, player1: player1_1, player2: player1_2 },
      pair2: { ...pair2, player1: player2_1, player2: player2_2 },
      category,
      court,
      players
    };
  }

  async getScheduledMatch(id: string): Promise<ScheduledMatch | undefined> {
    return this.scheduledMatches.get(id);
  }

  async getScheduledMatchesByTournament(tournamentId: string): Promise<ScheduledMatchWithDetails[]> {
    const matches = Array.from(this.scheduledMatches.values())
      .filter(match => match.tournamentId === tournamentId)
      .sort((a, b) => a.day.getTime() - b.day.getTime());

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

    const matches = Array.from(this.scheduledMatches.values())
      .filter(match => {
        const matchDay = new Date(match.day);
        matchDay.setHours(0, 0, 0, 0);
        return match.tournamentId === tournamentId && 
               matchDay.getTime() === dayStart.getTime();
      })
      .sort((a, b) => {
        if (a.plannedTime && b.plannedTime) {
          return a.plannedTime.localeCompare(b.plannedTime);
        }
        return 0;
      });

    const matchesWithDetails: ScheduledMatchWithDetails[] = [];
    for (const match of matches) {
      const details = await this.buildScheduledMatchWithDetails(match);
      if (details) {
        matchesWithDetails.push(details);
      }
    }
    return matchesWithDetails;
  }

  async createScheduledMatch(insertScheduledMatch: InsertScheduledMatch): Promise<ScheduledMatch> {
    const id = randomUUID();
    const scheduledMatch: ScheduledMatch = {
      ...insertScheduledMatch,
      categoryId: insertScheduledMatch.categoryId ?? null,
      format: insertScheduledMatch.format ?? null,
      plannedTime: insertScheduledMatch.plannedTime ?? null,
      status: insertScheduledMatch.status ?? "scheduled",
      courtId: insertScheduledMatch.courtId ?? null,
      matchId: insertScheduledMatch.matchId ?? null,
      notes: insertScheduledMatch.notes ?? null,
      id,
      createdAt: new Date()
    };
    this.scheduledMatches.set(id, scheduledMatch);

    const pair1 = await this.getPair(insertScheduledMatch.pair1Id);
    const pair2 = await this.getPair(insertScheduledMatch.pair2Id);

    if (pair1 && pair2) {
      await this.createScheduledMatchPlayer({
        scheduledMatchId: id,
        playerId: pair1.player1Id,
        pairId: pair1.id,
        isPresent: false,
        checkInTime: null,
        checkedInBy: null
      });

      await this.createScheduledMatchPlayer({
        scheduledMatchId: id,
        playerId: pair1.player2Id,
        pairId: pair1.id,
        isPresent: false,
        checkInTime: null,
        checkedInBy: null
      });

      await this.createScheduledMatchPlayer({
        scheduledMatchId: id,
        playerId: pair2.player1Id,
        pairId: pair2.id,
        isPresent: false,
        checkInTime: null,
        checkedInBy: null
      });

      await this.createScheduledMatchPlayer({
        scheduledMatchId: id,
        playerId: pair2.player2Id,
        pairId: pair2.id,
        isPresent: false,
        checkInTime: null,
        checkedInBy: null
      });
    }

    return scheduledMatch;
  }

  private async createScheduledMatchPlayer(insertPlayer: InsertScheduledMatchPlayer): Promise<ScheduledMatchPlayer> {
    const id = randomUUID();
    const player: ScheduledMatchPlayer = {
      ...insertPlayer,
      isPresent: insertPlayer.isPresent ?? false,
      checkInTime: insertPlayer.checkInTime ?? null,
      checkedInBy: insertPlayer.checkedInBy ?? null,
      id,
      createdAt: new Date()
    };
    this.scheduledMatchPlayers.set(id, player);
    return player;
  }

  async updateScheduledMatch(id: string, updates: Partial<ScheduledMatch>): Promise<ScheduledMatch | undefined> {
    const match = this.scheduledMatches.get(id);
    if (!match) return undefined;
    
    const updated = { ...match, ...updates };
    this.scheduledMatches.set(id, updated);
    return updated;
  }

  async deleteScheduledMatch(id: string): Promise<boolean> {
    const players = Array.from(this.scheduledMatchPlayers.values())
      .filter(p => p.scheduledMatchId === id);
    
    for (const player of players) {
      this.scheduledMatchPlayers.delete(player.id);
    }
    
    return this.scheduledMatches.delete(id);
  }

  async getScheduledMatchPlayers(scheduledMatchId: string): Promise<(ScheduledMatchPlayer & { player: Player })[]> {
    const matchPlayers = Array.from(this.scheduledMatchPlayers.values())
      .filter(p => p.scheduledMatchId === scheduledMatchId);

    const playersWithDetails: (ScheduledMatchPlayer & { player: Player })[] = [];
    for (const matchPlayer of matchPlayers) {
      const player = await this.getPlayer(matchPlayer.playerId);
      if (player) {
        playersWithDetails.push({ ...matchPlayer, player });
      }
    }
    return playersWithDetails;
  }

  async checkInPlayer(scheduledMatchId: string, playerId: string, checkedInBy: string): Promise<ScheduledMatchPlayer | undefined> {
    const matchPlayer = Array.from(this.scheduledMatchPlayers.values())
      .find(p => p.scheduledMatchId === scheduledMatchId && p.playerId === playerId);

    if (!matchPlayer) return undefined;

    const updated: ScheduledMatchPlayer = {
      ...matchPlayer,
      isPresent: true,
      checkInTime: new Date(),
      checkedInBy
    };
    this.scheduledMatchPlayers.set(matchPlayer.id, updated);

    const allPlayers = await this.getScheduledMatchPlayers(scheduledMatchId);
    const allPresent = allPlayers.every(p => p.isPresent);

    if (allPresent) {
      await this.updateScheduledMatch(scheduledMatchId, { status: "ready" });
    }

    return updated;
  }

  async checkOutPlayer(scheduledMatchId: string, playerId: string): Promise<ScheduledMatchPlayer | undefined> {
    const matchPlayer = Array.from(this.scheduledMatchPlayers.values())
      .find(p => p.scheduledMatchId === scheduledMatchId && p.playerId === playerId);

    if (!matchPlayer) return undefined;

    const match = await this.getScheduledMatch(scheduledMatchId);
    
    const updated: ScheduledMatchPlayer = {
      ...matchPlayer,
      isPresent: false,
      checkInTime: null,
      checkedInBy: null
    };
    this.scheduledMatchPlayers.set(matchPlayer.id, updated);

    if (match && match.status === "ready") {
      await this.updateScheduledMatch(scheduledMatchId, { status: "scheduled" });
    }

    return updated;
  }

  async resetPlayerStatus(scheduledMatchId: string, playerId: string): Promise<ScheduledMatchPlayer | undefined> {
    const matchPlayer = Array.from(this.scheduledMatchPlayers.values())
      .find(p => p.scheduledMatchId === scheduledMatchId && p.playerId === playerId);

    if (!matchPlayer) return undefined;

    const match = await this.getScheduledMatch(scheduledMatchId);
    
    const updated: ScheduledMatchPlayer = {
      ...matchPlayer,
      isPresent: null,
      checkInTime: null,
      checkedInBy: null
    };
    this.scheduledMatchPlayers.set(matchPlayer.id, updated);

    if (match && match.status === "ready") {
      await this.updateScheduledMatch(scheduledMatchId, { status: "scheduled" });
    }

    return updated;
  }

  async autoAssignCourt(scheduledMatchId: string): Promise<ScheduledMatch | undefined> {
    const match = await this.getScheduledMatch(scheduledMatchId);
    if (!match) return undefined;

    const tournament = await this.getTournament(match.tournamentId);
    if (!tournament) return undefined;

    // Check if match already has a pre-selected court
    if (match.courtId) {
      const preselectedCourt = await this.getCourt(match.courtId);
      // If pre-selected court is available, use it
      if (preselectedCourt && preselectedCourt.isAvailable) {
        return await this.updateScheduledMatch(scheduledMatchId, { 
          status: "assigned"
        });
      }
      // If pre-selected court is not available, fall through to auto-assignment
    }

    // Find an available court
    const availableCourt = Array.from(this.courts.values())
      .find(court => court.clubId === tournament.clubId && court.isAvailable);

    if (!availableCourt) return undefined;

    return await this.updateScheduledMatch(scheduledMatchId, { 
      courtId: availableCourt.id,
      status: "assigned"
    });
  }

  async manualAssignCourt(scheduledMatchId: string, courtId: string): Promise<ScheduledMatch | undefined> {
    const match = await this.getScheduledMatch(scheduledMatchId);
    if (!match) return undefined;

    return await this.updateScheduledMatch(scheduledMatchId, { 
      courtId,
      status: "assigned"
    });
  }

  async resetTournamentData(tournamentId: string): Promise<boolean> {
    try {
      // Get all pairs for this tournament
      const tournamentPairs = Array.from(this.pairs.values())
        .filter(p => p.tournamentId === tournamentId);
      
      const pairIds = new Set(tournamentPairs.map(p => p.id));
      
      // Delete scheduled match players
      const scheduledMatchesToDelete = Array.from(this.scheduledMatches.values())
        .filter(sm => sm.tournamentId === tournamentId);
      
      for (const sm of scheduledMatchesToDelete) {
        Array.from(this.scheduledMatchPlayers.values())
          .filter(smp => smp.scheduledMatchId === sm.id)
          .forEach(smp => this.scheduledMatchPlayers.delete(smp.id));
        this.scheduledMatches.delete(sm.id);
      }
      
      // Delete matches and their results
      const matchesToDelete = Array.from(this.matches.values())
        .filter(m => pairIds.has(m.pair1Id) || pairIds.has(m.pair2Id));
      
      for (const match of matchesToDelete) {
        Array.from(this.results.values())
          .filter(r => r.matchId === match.id)
          .forEach(r => this.results.delete(r.id));
        this.matches.delete(match.id);
      }
      
      // Delete pairs
      tournamentPairs.forEach(p => this.pairs.delete(p.id));
      
      // Delete players
      Array.from(this.players.values())
        .filter(p => p.tournamentId === tournamentId)
        .forEach(p => this.players.delete(p.id));
      
      return true;
    } catch (error) {
      console.error("Error resetting tournament data:", error);
      return false;
    }
  }
}

// Use DatabaseStorage for PostgreSQL persistence
export const storage = new DatabaseStorage();

// MemStorage is still available for development/testing if needed
// export const storage = new MemStorage();
