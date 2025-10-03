import { 
  type User, 
  type InsertUser,
  type Tournament,
  type InsertTournament,
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
  type ResultWithDetails
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Tournaments
  getTournament(id: string): Promise<Tournament | undefined>;
  getActiveTournament(): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  updateTournament(id: string, updates: Partial<Tournament>): Promise<Tournament | undefined>;
  
  // Clubs
  getClub(id: string): Promise<Club | undefined>;
  getClubs(): Promise<Club[]>;
  createClub(club: InsertClub): Promise<Club>;
  
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
  getPairs(): Promise<Pair[]>;
  getPairsByTournament(tournamentId: string): Promise<Pair[]>;
  getWaitingPairs(tournamentId: string): Promise<PairWithPlayers[]>;
  createPair(pair: InsertPair): Promise<Pair>;
  updatePair(id: string, updates: Partial<Pair>): Promise<Pair | undefined>;
  
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
  createResult(result: InsertResult): Promise<Result>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tournaments: Map<string, Tournament>;
  private clubs: Map<string, Club>;
  private courts: Map<string, Court>;
  private players: Map<string, Player>;
  private pairs: Map<string, Pair>;
  private matches: Map<string, Match>;
  private results: Map<string, Result>;

  constructor() {
    this.users = new Map();
    this.tournaments = new Map();
    this.clubs = new Map();
    this.courts = new Map();
    this.players = new Map();
    this.pairs = new Map();
    this.matches = new Map();
    this.results = new Map();
    
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

    // Create default admin user
    await this.createUser({
      username: "admin",
      password: "admin123", // In real app, this would be hashed
      role: "admin",
      name: "Admin Principal"
    });

    // Create scorekeeper user  
    await this.createUser({
      username: "escribano",
      password: "escribano123",
      role: "scorekeeper", 
      name: "Escribano Sistema"
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
      id,
      createdAt: new Date()
    };
    this.clubs.set(id, club);
    return club;
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

  async getPairs(): Promise<Pair[]> {
    return Array.from(this.pairs.values());
  }

  async getPairsByTournament(tournamentId: string): Promise<Pair[]> {
    return Array.from(this.pairs.values()).filter(pair => pair.tournamentId === tournamentId);
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
    const allResults = Array.from(this.results.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);

    const resultsWithDetails: ResultWithDetails[] = [];
    for (const result of allResults) {
      const match = await this.getMatch(result.matchId);
      if (match && match.tournamentId === tournamentId) {
        const matchWithDetails = (await this.getCurrentMatches(tournamentId))
          .find(m => m.id === match.id);
        
        if (!matchWithDetails) continue;

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
              match: matchWithDetails,
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
}

export const storage = new MemStorage();
