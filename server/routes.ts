import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { 
  insertPlayerSchema, 
  insertPairSchema, 
  insertMatchSchema, 
  insertResultSchema, 
  insertCourtSchema,
  insertClubSchema,
  insertUserSchema,
  insertTournamentSchema,
  insertTournamentUserSchema,
  insertCategorySchema,
  insertSponsorBannerSchema,
  insertAdvertisementSchema,
  insertAnnouncementSchema,
  insertScheduledMatchSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
}

export async function registerRoutes(app: Express): Promise<{ server: Server, broadcastUpdate: (message: any) => void, storage: typeof storage }> {
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Admin role middleware (allows both admin and superadmin)
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.userRole !== 'admin' && req.session.userRole !== 'superadmin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Superadmin role middleware
  const requireSuperadmin = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.userRole !== 'superadmin') {
      return res.status(403).json({ message: "Superadmin access required" });
    }
    next();
  };

  // Helper function to release court and handle pre-assigned match
  const releaseCourtAndHandlePreAssignment = async (courtId: string, broadcastFn: (msg: any) => void) => {
    // Release court
    const updatedCourt = await storage.updateCourt(courtId, { isAvailable: true });
    if (updatedCourt) {
      broadcastFn({ type: "court_updated", data: updatedCourt });
    }
    
    // Handle pre-assigned match if exists
    const court = await storage.getCourt(courtId);
    if (court?.preAssignedScheduledMatchId) {
      const preAssignedMatch = await storage.getScheduledMatch(court.preAssignedScheduledMatchId);
      
      // Clear pre-assignment
      await storage.updateScheduledMatch(court.preAssignedScheduledMatchId, {
        preAssignedAt: null,
      });
      await storage.updateCourt(courtId, {
        preAssignedScheduledMatchId: null,
      });
      broadcastFn({ type: "match_enabled_from_preassign", data: { matchId: court.preAssignedScheduledMatchId } });
      
      // Auto-start match if ALL players confirmed AND has categoryId
      if (preAssignedMatch && preAssignedMatch.categoryId) {
        const checkInRecords = await storage.getScheduledMatchPlayers(court.preAssignedScheduledMatchId);
        const pair1CheckIns = checkInRecords.filter(p => p.pairId === preAssignedMatch.pair1Id && p.isPresent).length;
        const pair2CheckIns = checkInRecords.filter(p => p.pairId === preAssignedMatch.pair2Id && p.isPresent).length;
        
        const allPlayersConfirmed = pair1CheckIns === 2 && pair2CheckIns === 2;
        
        if (allPlayersConfirmed) {
          // Create playing match
          const playingMatch = await storage.createMatch({
            tournamentId: preAssignedMatch.tournamentId,
            courtId: courtId,
            pair1Id: preAssignedMatch.pair1Id,
            pair2Id: preAssignedMatch.pair2Id,
            categoryId: preAssignedMatch.categoryId,
            format: preAssignedMatch.format,
            accessToken: randomUUID(),
            status: "playing",
          });
          
          // Update scheduled match status
          await storage.updateScheduledMatch(court.preAssignedScheduledMatchId, { 
            status: "playing",
            matchId: playingMatch.id 
          });
          
          // Update court and pairs
          const nowBusyCourt = await storage.updateCourt(courtId, { isAvailable: false });
          await storage.updatePair(preAssignedMatch.pair1Id, { isWaiting: false });
          await storage.updatePair(preAssignedMatch.pair2Id, { isWaiting: false });
          
          broadcastFn({ type: "match_started", data: playingMatch });
          if (nowBusyCourt) {
            broadcastFn({ type: "court_updated", data: nowBusyCourt });
          }
        }
      }
    }
  };

  // Tournament access middleware - checks if user has access to a specific tournament
  const requireTournamentAccess = (tournamentIdParam: string = 'tournamentId') => {
    return async (req: any, res: any, next: any) => {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Superadmin bypasses tournament access checks
      if (req.session.userRole === 'superadmin') {
        return next();
      }

      // Get tournament ID from params, query, or body
      const tournamentId = req.params[tournamentIdParam] || req.query[tournamentIdParam] || req.body[tournamentIdParam];
      
      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID required" });
      }

      try {
        // Check if user has access to this tournament
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(req.session.userId, tournamentId);
        
        if (!tournamentUser || tournamentUser.status !== 'active') {
          return res.status(403).json({ message: "You don't have access to this tournament" });
        }

        // Store tournament user info in request for later use
        req.tournamentUser = tournamentUser;
        next();
      } catch (error: any) {
        res.status(500).json({ message: "Failed to verify tournament access", error: error.message });
      }
    };
  };

  // Middleware to require specific tournament role (admin or scorekeeper)
  const requireTournamentRole = (requiredRole: 'admin' | 'scorekeeper', tournamentIdParam: string = 'tournamentId') => {
    return async (req: any, res: any, next: any) => {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Superadmin bypasses role checks
      if (req.session.userRole === 'superadmin') {
        return next();
      }

      // Get tournament ID
      const tournamentId = req.params[tournamentIdParam] || req.query[tournamentIdParam] || req.body[tournamentIdParam];
      
      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID required" });
      }

      try {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(req.session.userId, tournamentId);
        
        if (!tournamentUser || tournamentUser.status !== 'active') {
          return res.status(403).json({ message: "You don't have access to this tournament" });
        }

        if (tournamentUser.role !== requiredRole && tournamentUser.role !== 'admin') {
          return res.status(403).json({ message: `${requiredRole} role required for this action` });
        }

        req.tournamentUser = tournamentUser;
        next();
      } catch (error: any) {
        res.status(500).json({ message: "Failed to verify tournament role", error: error.message });
      }
    };
  };

  // Initial setup endpoint - ONLY for creating first superadmin (works only if no users exist)
  app.post("/api/auth/setup", async (req, res) => {
    try {
      // Check if any users exist
      const users = await storage.getUsers();
      if (users.length > 0) {
        return res.status(403).json({ message: "Setup already completed. Users exist in the system." });
      }

      const { username, password, name } = req.body;
      
      if (!username || !password || !name) {
        return res.status(400).json({ message: "Username, password, and name are required" });
      }

      // Create first superadmin user (plain password, will be hashed in production)
      const user = await storage.createUser({
        username,
        password,
        name,
        role: "superadmin",
      });

      res.json({ 
        message: "Superadmin created successfully! You can now login.", 
        user: { id: user.id, username: user.username, name: user.name, role: user.role }
      });
    } catch (error: any) {
      res.status(500).json({ message: "Setup failed", error: error.message });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      // Save session explicitly to ensure it's persisted
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        
        res.json({ 
          user: { 
            id: user.id, 
            username: user.username, 
            name: user.name, 
            role: user.role 
          } 
        });
      });
    } catch (error: any) {
      res.status(500).json({ message: "Login failed", error: error.message });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role 
        } 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get user", error: error.message });
    }
  });

  // Tournament routes
  app.get("/api/tournament", async (req, res) => {
    try {
      const tournament = await storage.getActiveTournament();
      if (!tournament) {
        return res.status(404).json({ message: "No active tournament found" });
      }
      
      // Include user's role in this tournament if authenticated
      let userRole = null;
      if (req.session.userId) {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId,
          tournament.id
        );
        userRole = tournamentUser?.role || null;
      }
      
      res.json({ ...tournament, userRole });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get tournament", error: error.message });
    }
  });

  // Reset tournament data (players, pairs, matches, results)
  app.post("/api/tournament/:id/reset", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      
      // Get user to check if superadmin
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Check if user is superadmin or admin of this tournament
      const isSuperadmin = user.role === "superadmin";
      const tournamentUser = await storage.getTournamentUserByUserAndTournament(userId, id);
      const isAdmin = tournamentUser?.role === "admin";
      
      if (!isSuperadmin && !isAdmin) {
        return res.status(403).json({ 
          message: "Solo los administradores del torneo pueden resetear los datos" 
        });
      }
      
      // Check if tournament exists
      const tournament = await storage.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ message: "Torneo no encontrado" });
      }
      
      // Reset tournament data
      const success = await storage.resetTournamentData(id);
      
      if (!success) {
        return res.status(500).json({ 
          message: "Error al resetear los datos del torneo" 
        });
      }
      
      // Broadcast update to all connected clients
      broadcastUpdate({ 
        type: "tournament_reset", 
        data: { tournamentId: id } 
      });
      
      res.json({ 
        message: "Datos del torneo reseteados exitosamente",
        tournamentId: id
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error al resetear los datos del torneo", 
        error: error.message 
      });
    }
  });

  // Clubs routes
  app.get("/api/clubs", async (req, res) => {
    try {
      const clubs = await storage.getClubs();
      res.json(clubs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get clubs", error: error.message });
    }
  });

  app.post("/api/clubs", requireSuperadmin, async (req, res) => {
    try {
      const insertClub = insertClubSchema.parse(req.body);
      const club = await storage.createClub(insertClub);
      res.status(201).json(club);
    } catch (error: any) {
      res.status(400).json({ message: "Invalid club data", error: error.message });
    }
  });

  app.patch("/api/clubs/:id", requireSuperadmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const club = await storage.updateClub(id, updates);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json(club);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update club", error: error.message });
    }
  });

  app.delete("/api/clubs/:id", requireSuperadmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteClub(id);
      if (!success) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json({ message: "Club deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete club", error: error.message });
    }
  });

  // Courts routes
  app.get("/api/courts", async (req, res) => {
    try {
      const courts = await storage.getCourts();
      res.json(courts);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get courts", error: error.message });
    }
  });

  app.post("/api/courts", requireAdmin, async (req, res) => {
    try {
      const court = insertCourtSchema.parse(req.body);
      const newCourt = await storage.createCourt(court);
      broadcastUpdate({ type: "court_created", data: newCourt });
      res.status(201).json(newCourt);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create court", error: error.message });
    }
  });

  app.patch("/api/courts/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedCourt = await storage.updateCourt(id, updates);
      
      if (!updatedCourt) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      broadcastUpdate({ type: "court_updated", data: updatedCourt });
      res.json(updatedCourt);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update court", error: error.message });
    }
  });

  // Release orphaned courts (courts marked as occupied but with no active matches)
  app.post("/api/courts/release-orphaned", requireAdmin, async (req, res) => {
    try {
      const courts = await storage.getCourts();
      const matches = await storage.getMatches();
      const tournaments = await storage.getTournaments();
      
      // Get court IDs that have active matches
      const activeCourts = new Set<string>();
      matches.forEach(match => {
        if (match.status === "playing" && match.courtId) {
          activeCourts.add(match.courtId);
        }
      });
      
      // Check scheduled matches from all tournaments
      for (const tournament of tournaments) {
        const scheduledMatches = await storage.getScheduledMatchesByTournament(tournament.id);
        scheduledMatches.forEach(sm => {
          if ((sm.status === "playing" || sm.status === "assigned") && sm.courtId) {
            activeCourts.add(sm.courtId);
          }
        });
      }
      
      // Find and release orphaned courts
      const releasedCourts: string[] = [];
      for (const court of courts) {
        if (!court.isAvailable && !activeCourts.has(court.id)) {
          const updatedCourt = await storage.updateCourt(court.id, { isAvailable: true });
          if (updatedCourt) {
            releasedCourts.push(court.name);
            broadcastUpdate({ type: "court_updated", data: updatedCourt });
          }
        }
      }
      
      res.json({ 
        message: `Released ${releasedCourts.length} orphaned court${releasedCourts.length !== 1 ? 's' : ''}`,
        courts: releasedCourts
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to release orphaned courts", error: error.message });
    }
  });

  // Players routes
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get players", error: error.message });
    }
  });

  app.post("/api/players", requireAuth, async (req, res) => {
    try {
      const player = insertPlayerSchema.parse(req.body);
      const newPlayer = await storage.createPlayer(player);
      res.status(201).json(newPlayer);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create player", error: error.message });
    }
  });

  // Pairs routes
  app.get("/api/pairs", async (req, res) => {
    try {
      const { tournamentId } = req.query;
      
      // If tournamentId is provided, filter by tournament for better performance
      const pairs = tournamentId 
        ? await storage.getPairsByTournament(tournamentId as string)
        : await storage.getPairs();
      
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get pairs", error: error.message });
    }
  });

  app.post("/api/pairs", requireAuth, async (req, res) => {
    try {
      console.log("Creating pair with data:", JSON.stringify(req.body, null, 2));
      const pairData = insertPairSchema.parse(req.body);
      console.log("Parsed pair data:", JSON.stringify(pairData, null, 2));
      const newPair = await storage.createPair(pairData);
      console.log("Created pair:", JSON.stringify(newPair, null, 2));
      broadcastUpdate({ type: "pair_registered", data: newPair });
      res.status(201).json(newPair);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create pair", error: error.message });
    }
  });

  app.get("/api/pairs/waiting/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const waitingPairs = await storage.getWaitingPairs(tournamentId);
      res.json(waitingPairs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get waiting pairs", error: error.message });
    }
  });

  app.patch("/api/pairs/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedPair = await storage.updatePair(id, updates);
      
      if (!updatedPair) {
        return res.status(404).json({ message: "Pair not found" });
      }
      
      broadcastUpdate({ type: "pair_updated", data: updatedPair });
      res.json(updatedPair);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update pair", error: error.message });
    }
  });

  app.delete("/api/pairs/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePair(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Pair not found" });
      }
      
      broadcastUpdate({ type: "pair_deleted", data: { id } });
      res.json({ message: "Pair deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete pair", error: error.message });
    }
  });

  // Import pairs from Excel
  const upload = multer({ storage: multer.memoryStorage() });
  
  app.post("/api/pairs/import", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { tournamentId } = req.body;
      if (!tournamentId) {
        return res.status(400).json({ message: "Tournament ID is required" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      const results = {
        success: 0,
        errors: [] as any[],
        created: [] as any[]
      };

      // Expected columns: Player1Name, Player2Name, CategoryName
      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        
        try {
          const player1Name = row['Jugador 1'] || row['Player 1'] || row['Player1'] || row['Player1Name'];
          const player2Name = row['Jugador 2'] || row['Player 2'] || row['Player2'] || row['Player2Name'];
          const categoryName = row['Categoría'] || row['Categoria'] || row['Category'] || row['CategoryName'];

          if (!player1Name || !player2Name) {
            results.errors.push({
              row: i + 2,
              error: "Faltan nombres de jugadores"
            });
            continue;
          }

          // Find or create category if specified
          let categoryId = null;
          if (categoryName) {
            const categories = await storage.getCategoriesByTournament(tournamentId);
            let category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            
            if (!category) {
              // Create new category
              category = await storage.createCategory({
                tournamentId,
                name: categoryName
              });
            }
            categoryId = category.id;
          }

          // Create players
          const player1 = await storage.createPlayer({
            name: player1Name
          });

          const player2 = await storage.createPlayer({
            name: player2Name
          });

          // Create pair
          const pair = await storage.createPair({
            player1Id: player1.id,
            player2Id: player2.id,
            tournamentId,
            categoryId,
            isWaiting: true
          });

          results.created.push(pair);
          results.success++;

        } catch (error: any) {
          results.errors.push({
            row: i + 2,
            error: error.message
          });
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to import pairs", error: error.message });
    }
  });

  // Import scheduled matches from Excel
  app.post("/api/scheduled-matches/import/:tournamentId", requireTournamentRole('admin'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se subió ningún archivo" });
      }

      const { tournamentId } = req.params;

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const results = {
        success: 0,
        errors: [] as any[],
        created: [] as any[]
      };

      // Load all existing players and pairs for lookup
      const allPlayers = await storage.getPlayers();
      const allPairs: any[] = await storage.getPairs();
      const existingScheduledMatches = await storage.getScheduledMatchesByTournament(tournamentId);
      
      // Cache for created pairs during this import
      const createdPairs: any[] = [];

      // Helper function to find or create player
      const findOrCreatePlayer = async (name: string) => {
        const normalizedName = name.toString().trim().toLowerCase();
        let player = allPlayers.find(p => p.name.toLowerCase() === normalizedName);
        
        if (!player) {
          player = await storage.createPlayer({ name: name.toString().trim() });
          allPlayers.push(player); // Add to cache
        }
        
        return player;
      };

      // Helper function to find or create pair
      const findOrCreatePair = async (player1Id: string, player2Id: string, categoryId: string | null) => {
        // Check if pair already exists in DB (either order)
        let pair = allPairs.find(p => 
          p.tournamentId === tournamentId &&
          ((p.player1Id === player1Id && p.player2Id === player2Id) ||
           (p.player1Id === player2Id && p.player2Id === player1Id))
        );
        
        // Check in recently created pairs
        if (!pair) {
          pair = createdPairs.find(p => 
            p.tournamentId === tournamentId &&
            ((p.player1Id === player1Id && p.player2Id === player2Id) ||
             (p.player1Id === player2Id && p.player2Id === player1Id))
          );
        }
        
        if (!pair) {
          pair = await storage.createPair({
            player1Id,
            player2Id,
            tournamentId,
            categoryId,
            isWaiting: false
          });
          createdPairs.push(pair); // Add to import cache
        }
        
        return pair;
      };

      // Skip header row, start from row 1
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        try {
          // Columns: Fecha, Hora, Jugador1Pareja1, Jugador2Pareja1, Jugador1Pareja2, Jugador2Pareja2, Categoría, Formato
          const dateStr = row[0];
          const timeStr = row[1];
          const player1Pair1Name = row[2];
          const player2Pair1Name = row[3];
          const player1Pair2Name = row[4];
          const player2Pair2Name = row[5];
          const categoryName = row[6];
          const format = row[7];

          // Validate required fields
          if (!dateStr || !player1Pair1Name || !player2Pair1Name || !player1Pair2Name || !player2Pair2Name) {
            results.errors.push({
              row: i + 1,
              error: "Faltan datos requeridos (fecha, jugadores)"
            });
            continue;
          }

          // Parse date
          let matchDate: Date;
          if (typeof dateStr === 'number') {
            // Excel serial date number
            matchDate = new Date((dateStr - 25569) * 86400 * 1000);
          } else {
            matchDate = new Date(dateStr);
          }

          if (isNaN(matchDate.getTime())) {
            results.errors.push({
              row: i + 1,
              error: `Fecha inválida: ${dateStr}`
            });
            continue;
          }

          // Parse time if provided
          let plannedTime: string | null = null;
          if (timeStr) {
            if (typeof timeStr === 'number') {
              // Excel time (fraction of day)
              const hours = Math.floor(timeStr * 24);
              const minutes = Math.floor((timeStr * 24 * 60) % 60);
              plannedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else if (typeof timeStr === 'string') {
              plannedTime = timeStr;
            }
          }

          // Find or create category
          let categoryId = null;
          if (categoryName) {
            const categories = await storage.getCategoriesByTournament(tournamentId);
            let category = categories.find(c => c.name.toLowerCase() === categoryName.toString().toLowerCase());
            
            if (!category) {
              category = await storage.createCategory({
                tournamentId,
                name: categoryName.toString()
              });
            }
            categoryId = category.id;
          }

          // Find or create players
          const player1Pair1 = await findOrCreatePlayer(player1Pair1Name);
          const player2Pair1 = await findOrCreatePlayer(player2Pair1Name);
          const player1Pair2 = await findOrCreatePlayer(player1Pair2Name);
          const player2Pair2 = await findOrCreatePlayer(player2Pair2Name);

          // Find or create pairs
          const pair1 = await findOrCreatePair(player1Pair1.id, player2Pair1.id, categoryId);
          const pair2 = await findOrCreatePair(player1Pair2.id, player2Pair2.id, categoryId);

          if (!pair1 || !pair2) {
            results.errors.push({
              row: i + 1,
              error: "Error al crear o encontrar parejas"
            });
            continue;
          }

          // Check if match already exists (same day, time, and pairs)
          const matchDateStr = matchDate.toISOString().split('T')[0];
          const isDuplicate = existingScheduledMatches.some((m: any) => {
            const mDateStr = new Date(m.day).toISOString().split('T')[0];
            const sameDay = mDateStr === matchDateStr;
            const sameTime = m.plannedTime === plannedTime;
            const samePairs = (
              (m.pair1Id === pair1.id && m.pair2Id === pair2.id) ||
              (m.pair1Id === pair2.id && m.pair2Id === pair1.id)
            );
            return sameDay && sameTime && samePairs;
          });

          if (isDuplicate) {
            results.errors.push({
              row: i + 1,
              error: "Partido duplicado (ya existe con misma fecha, hora y parejas)"
            });
            continue;
          }

          // Validate match format
          const validFormats = ['best_of_3', 'best_of_5', 'single_set'];
          const matchFormat = format && validFormats.includes(format.toString()) 
            ? format.toString() as 'best_of_3' | 'best_of_5' | 'single_set'
            : 'best_of_3';

          // Create scheduled match
          const scheduledMatch = await storage.createScheduledMatch({
            tournamentId,
            pair1Id: pair1.id,
            pair2Id: pair2.id,
            categoryId,
            day: matchDate,
            plannedTime,
            format: matchFormat,
            status: 'unconfirmed'
          });

          existingScheduledMatches.push(scheduledMatch as any); // Add to cache for duplicate detection
          results.created.push(scheduledMatch);
          results.success++;
          broadcastUpdate({ type: "scheduled_match_created", data: scheduledMatch });

        } catch (error: any) {
          results.errors.push({
            row: i + 1,
            error: error.message
          });
        }
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Error al importar partidos", error: error.message });
    }
  });

  // Matches routes
  // Public endpoint - no authentication required
  app.get("/api/matches/public/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const match = await storage.getMatchByAccessToken(token);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(match);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get match", error: error.message });
    }
  });

  // Public endpoint to update score - no authentication required
  app.patch("/api/matches/public/:token/score", async (req, res) => {
    try {
      const { token } = req.params;
      const { score } = req.body;
      
      if (!score) {
        return res.status(400).json({ message: "Score is required" });
      }

      // Find match by access token
      const match = await storage.getMatchByAccessToken(token);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Update the score
      const updatedMatch = await storage.updateMatch(match.id, { score });
      
      if (!updatedMatch) {
        return res.status(404).json({ message: "Failed to update match" });
      }
      
      // Broadcast score update for real-time display
      broadcastUpdate({ type: "score_updated", data: updatedMatch });
      
      res.json(updatedMatch);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update score", error: error.message });
    }
  });

  // Public endpoint to complete match - no authentication required
  app.post("/api/matches/public/:token/complete", async (req, res) => {
    try {
      const { token } = req.params;
      const { winnerId, score } = req.body;

      // Find match by access token
      const match = await storage.getMatchByAccessToken(token);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Validate match is still playing (also prevents duplicate completion)
      if (match.status !== "playing") {
        return res.status(400).json({ message: "Match is already finished or not in playing state" });
      }

      // Use the score from request or from match
      const finalScore = score || match.score;

      // Validate score is complete and calculate winner server-side
      const isSetComplete = (set: number[]) => {
        return (set[0] >= 6 && set[0] - set[1] >= 2) || 
               (set[1] >= 6 && set[1] - set[0] >= 2) ||
               (set[0] === 7 && set[1] === 6) ||
               (set[1] === 7 && set[0] === 6);
      };

      const setsWon = [0, 0];
      if (finalScore?.sets) {
        finalScore.sets.forEach((set: number[]) => {
          if (isSetComplete(set)) {
            if (set[0] > set[1]) setsWon[0]++;
            else if (set[1] > set[0]) setsWon[1]++;
          }
        });
      }

      // Validate that one team has won 2 complete sets
      if (setsWon[0] < 2 && setsWon[1] < 2) {
        return res.status(400).json({ message: "Match is not complete - no team has won 2 sets" });
      }

      // Calculate the actual winner server-side
      const actualWinnerId = setsWon[0] >= 2 ? match.pair1Id : match.pair2Id;
      const actualLoserId = setsWon[0] >= 2 ? match.pair2Id : match.pair1Id;

      // If winnerId provided, validate it matches
      if (winnerId && winnerId !== actualWinnerId) {
        return res.status(400).json({ message: "Provided winner does not match score" });
      }

      // Create result with server-calculated winner and loser
      const result = await storage.createResult({
        matchId: match.id,
        winnerId: actualWinnerId,
        loserId: actualLoserId,
        score: finalScore
      });

      // Update match status to finished
      const updatedMatch = await storage.updateMatch(match.id, { 
        status: "finished",
        score: finalScore
      });

      // Check if court has a pre-assigned match waiting
      const court = await storage.getCourt(match.courtId);
      const preAssignedMatchId = court?.preAssignedScheduledMatchId;
      
      // Make court available
      await storage.updateCourt(match.courtId, { 
        isAvailable: true,
        preAssignedScheduledMatchId: null 
      });

      // Update scheduled match to completed if it exists
      const allScheduledMatches = await storage.getAllScheduledMatches();
      const scheduledMatch = allScheduledMatches.find(sm => sm.matchId === match.id);
      if (scheduledMatch && scheduledMatch.status !== 'completed') {
        await storage.updateScheduledMatch(scheduledMatch.id, {
          status: 'completed',
          outcome: 'normal'
        });
        broadcastUpdate({ type: "scheduled_match_updated", data: { id: scheduledMatch.id } });
      }

      // If there was a pre-assigned match, clear its preAssignedAt to enable it
      if (preAssignedMatchId) {
        const preAssignedMatch = allScheduledMatches.find(sm => sm.id === preAssignedMatchId);
        if (preAssignedMatch) {
          await storage.updateScheduledMatch(preAssignedMatchId, {
            preAssignedAt: null
          });
          broadcastUpdate({ 
            type: "pre_assigned_match_ready", 
            data: { ...preAssignedMatch, preAssignedAt: null } 
          });
        }
      }

      // Broadcast result
      broadcastUpdate({ type: "result_recorded", data: result });
      
      res.json({ match: updatedMatch, result });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to complete match", error: error.message });
    }
  });

  app.get("/api/matches/current/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const matches = await storage.getCurrentMatches(tournamentId);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get current matches", error: error.message });
    }
  });

  app.post("/api/matches", requireAuth, async (req, res) => {
    try {
      const matchData = insertMatchSchema.parse(req.body);
      const newMatch = await storage.createMatch(matchData);
      
      // Update court availability
      await storage.updateCourt(matchData.courtId, { isAvailable: false });
      
      // Update pairs status
      await storage.updatePair(matchData.pair1Id, { isWaiting: false });
      await storage.updatePair(matchData.pair2Id, { isWaiting: false });
      
      broadcastUpdate({ type: "match_started", data: newMatch });
      res.status(201).json(newMatch);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create match", error: error.message });
    }
  });

  app.patch("/api/matches/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedMatch = await storage.updateMatch(id, updates);
      
      if (!updatedMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // If match is finished, release court and handle pre-assigned match
      if (updates.status === "finished") {
        await releaseCourtAndHandlePreAssignment(updatedMatch.courtId, broadcastUpdate);
      }
      
      broadcastUpdate({ type: "match_updated", data: updatedMatch });
      res.json(updatedMatch);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update match", error: error.message });
    }
  });

  // Update match score in real-time (for live score capture)
  app.patch("/api/matches/:id/score", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { score } = req.body;
      
      if (!score) {
        return res.status(400).json({ message: "Score is required" });
      }
      
      const updatedMatch = await storage.updateMatch(id, { score });
      
      if (!updatedMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Broadcast score update for real-time display
      broadcastUpdate({ type: "score_updated", data: updatedMatch });
      res.json(updatedMatch);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update score", error: error.message });
    }
  });

  // Reassign court for active match
  app.post("/api/matches/:id/reassign-court", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { courtId } = req.body;
      
      if (!courtId) {
        return res.status(400).json({ message: "Court ID is required" });
      }
      
      // Get current match
      const match = await storage.getMatch(id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Check if new court exists and is available
      const newCourt = await storage.getCourt(courtId);
      if (!newCourt) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      if (!newCourt.isAvailable && newCourt.id !== match.courtId) {
        return res.status(400).json({ message: "Court is not available" });
      }
      
      // If match had a previous court, make it available
      if (match.courtId && match.courtId !== courtId) {
        const oldCourt = await storage.updateCourt(match.courtId, { isAvailable: true });
        if (oldCourt) {
          broadcastUpdate({ type: "court_updated", data: oldCourt });
        }
      }
      
      // Assign new court
      const updatedMatch = await storage.updateMatch(id, { courtId });
      const updatedNewCourt = await storage.updateCourt(courtId, { isAvailable: false });
      
      if (updatedNewCourt) {
        broadcastUpdate({ type: "court_updated", data: updatedNewCourt });
      }
      
      broadcastUpdate({ type: "match_updated", data: updatedMatch });
      res.json({ match: updatedMatch, court: updatedNewCourt });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to reassign court", error: error.message });
    }
  });

  // Finish match and save result (from live score capture)
  app.post("/api/matches/:id/finish", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { winnerPairId, sets } = req.body;
      
      if (!winnerPairId || !sets) {
        return res.status(400).json({ message: "Winner pair ID and sets are required" });
      }
      
      const match = await storage.getMatch(id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      // Validate that sets are complete and count winners
      let setsWonByPair1 = 0;
      let setsWonByPair2 = 0;
      
      for (const set of sets) {
        const [games1, games2] = set;
        
        // Check if set is complete
        let setComplete = false;
        let setWinner = null;
        
        // Valid completed sets: 6-x with difference >= 2, or 7-6 (tiebreak), or 7-5
        if (games1 >= 6 && games1 - games2 >= 2) {
          setComplete = true;
          setWinner = 0;
        } else if (games2 >= 6 && games2 - games1 >= 2) {
          setComplete = true;
          setWinner = 1;
        } else if (games1 === 7 && games2 === 6) {
          setComplete = true;
          setWinner = 0;
        } else if (games2 === 7 && games1 === 6) {
          setComplete = true;
          setWinner = 1;
        }
        
        if (!setComplete) {
          return res.status(400).json({ 
            message: `Set incompleto detectado: ${games1}-${games2}. Los sets deben estar completos para finalizar el partido.` 
          });
        }
        
        if (setWinner === 0) setsWonByPair1++;
        if (setWinner === 1) setsWonByPair2++;
      }
      
      const isValidWinner = (winnerPairId === match.pair1Id && setsWonByPair1 >= 2) ||
                           (winnerPairId === match.pair2Id && setsWonByPair2 >= 2);
      
      if (!isValidWinner) {
        return res.status(400).json({ message: "El ganador debe haber ganado al menos 2 de 3 sets completos" });
      }
      
      // Determine loser
      const loserId = winnerPairId === match.pair1Id ? match.pair2Id : match.pair1Id;
      
      // Create result with score object
      const result = await storage.createResult({
        matchId: id,
        winnerId: winnerPairId,
        loserId: loserId,
        score: { sets }
      });
      
      // Update match status
      const updatedMatch = await storage.updateMatch(id, {
        status: "finished",
        endTime: new Date(),
        winnerId: winnerPairId,
        score: { sets, currentSet: sets.length + 1, currentPoints: [0, 0] }
      });
      
      // Release court and handle pre-assigned match
      if (match.courtId) {
        await releaseCourtAndHandlePreAssignment(match.courtId, broadcastUpdate);
      }
      
      // Update scheduled match to completed if it exists
      const scheduledMatches = await storage.getScheduledMatchesByTournament(match.tournamentId);
      const scheduledMatch = scheduledMatches.find(sm => sm.matchId === match.id);
      if (scheduledMatch) {
        const updatedScheduledMatch = await storage.updateScheduledMatch(scheduledMatch.id, { status: "completed" });
        if (updatedScheduledMatch) {
          broadcastUpdate({ type: "scheduled_match_updated", data: updatedScheduledMatch });
        }
      }
      
      broadcastUpdate({ type: "match_finished", data: { match: updatedMatch || match, result } });
      res.json({ result, match: updatedMatch || match });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to finish match", error: error.message });
    }
  });

  // Results routes
  app.get("/api/results/recent/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const results = await storage.getRecentResults(tournamentId, limit);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get recent results", error: error.message });
    }
  });

  app.get("/api/results/today/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const dayParam = req.query.day as string;
      
      let today: Date;
      if (dayParam) {
        // Use the date provided by the client (YYYY-MM-DD format)
        today = new Date(dayParam + 'T00:00:00');
      } else {
        // Fallback to server date
        today = new Date();
        today.setHours(0, 0, 0, 0);
      }
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const results = await storage.getResultsByDateRange(tournamentId, today, tomorrow);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get today's results", error: error.message });
    }
  });

  app.post("/api/results", requireAuth, async (req, res) => {
    try {
      const resultData = insertResultSchema.parse(req.body);
      const newResult = await storage.createResult(resultData);
      
      // Update match status
      const match = await storage.getMatch(resultData.matchId);
      if (match) {
        const updatedMatch = await storage.updateMatch(match.id, { 
          status: "finished", 
          endTime: new Date(),
          winnerId: resultData.winnerId,
          score: resultData.score
        });
        
        // Release court and handle pre-assigned match
        await releaseCourtAndHandlePreAssignment(match.courtId, broadcastUpdate);
        
        // Broadcast match updated
        if (updatedMatch) {
          broadcastUpdate({ type: "match_finished", data: { match: updatedMatch, result: newResult } });
        }
        
        // Update scheduled match to completed if it exists
        const scheduledMatches = await storage.getScheduledMatchesByTournament(match.tournamentId);
        const scheduledMatch = scheduledMatches.find(sm => sm.matchId === match.id);
        if (scheduledMatch) {
          const updatedScheduledMatch = await storage.updateScheduledMatch(scheduledMatch.id, { status: "completed" });
          if (updatedScheduledMatch) {
            broadcastUpdate({ type: "scheduled_match_updated", data: updatedScheduledMatch });
          }
        }
      }
      
      broadcastUpdate({ type: "result_recorded", data: newResult });
      res.status(201).json(newResult);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create result", error: error.message });
    }
  });

  app.patch("/api/results/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const result = await storage.getResult(id);
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      
      const updatedResult = await storage.updateResult(id, updateData);
      
      // Update match if needed
      if (updateData.winnerId || updateData.score) {
        const match = await storage.getMatch(result.matchId);
        if (match) {
          await storage.updateMatch(match.id, {
            winnerId: updateData.winnerId || result.winnerId,
            score: updateData.score || result.score
          });
        }
      }
      
      broadcastUpdate({ type: "result_updated", data: updatedResult });
      res.json(updatedResult);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update result", error: error.message });
    }
  });

  app.delete("/api/results/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const result = await storage.getResult(id);
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      
      // Update match back to finished without result
      const match = await storage.getMatch(result.matchId);
      if (match) {
        await storage.updateMatch(match.id, {
          status: "playing",
          winnerId: null,
          score: null,
          endTime: null
        });
      }
      
      const deleted = await storage.deleteResult(id);
      
      if (deleted) {
        broadcastUpdate({ type: "result_deleted", data: { id } });
        res.json({ message: "Result deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete result" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete result", error: error.message });
    }
  });

  // Tournament statistics
  app.get("/api/stats/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const pairs = await storage.getPairsByTournament(tournamentId);
      const matches = await storage.getMatches();
      const courts = await storage.getCourts();
      
      const tournamentMatches = matches.filter(m => m.tournamentId === tournamentId);
      const finishedMatches = tournamentMatches.filter(m => m.status === "finished");
      const activeCourts = courts.filter(c => !c.isAvailable).length;
      
      // Calculate average match duration
      const totalDuration = finishedMatches.reduce((sum, match) => {
        if (match.startTime && match.endTime) {
          return sum + (match.endTime.getTime() - match.startTime.getTime());
        }
        return sum;
      }, 0);
      
      const avgDuration = finishedMatches.length > 0 
        ? Math.round(totalDuration / finishedMatches.length / (1000 * 60)) 
        : 0;

      const stats = {
        matchesPlayed: finishedMatches.length,
        pairsRegistered: pairs.length,
        avgTime: `${avgDuration} min`,
        activeCourts: `${activeCourts}/${courts.length}`
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get statistics", error: error.message });
    }
  });

  // Auto-assign court to waiting pairs
  app.post("/api/auto-assign/:tournamentId", requireAuth, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      
      // Get available courts
      const courts = await storage.getCourts();
      const availableCourts = courts.filter(c => c.isAvailable);
      
      // Get waiting pairs
      const waitingPairs = await storage.getWaitingPairs(tournamentId);
      
      if (availableCourts.length === 0 || waitingPairs.length < 2) {
        return res.json({ message: "No assignments possible", assigned: 0 });
      }
      
      let assignedMatches = 0;
      
      for (const court of availableCourts) {
        if (waitingPairs.length < 2) break;
        
        const pair1 = waitingPairs.shift()!;
        const pair2 = waitingPairs.shift()!;
        
        // Create match - use pair1's category as the match category
        const match = await storage.createMatch({
          tournamentId,
          courtId: court.id,
          pair1Id: pair1.id,
          pair2Id: pair2.id,
          categoryId: pair1.categoryId,
          accessToken: randomUUID(),
          status: "playing"
        });
        
        // Update court and pairs
        await storage.updateCourt(court.id, { isAvailable: false });
        await storage.updatePair(pair1.id, { isWaiting: false });
        await storage.updatePair(pair2.id, { isWaiting: false });
        
        assignedMatches++;
        broadcastUpdate({ type: "match_started", data: match });
      }
      
      res.json({ message: `Assigned ${assignedMatches} matches`, assigned: assignedMatches });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to auto-assign", error: error.message });
    }
  });

  // Manual assign pair to specific court
  app.post("/api/manual-assign", requireAuth, async (req, res) => {
    try {
      const { pairId, courtId, tournamentId } = req.body;
      
      if (!pairId || !courtId || !tournamentId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get the court
      const court = await storage.getCourt(courtId);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      if (!court.isAvailable) {
        return res.status(400).json({ message: "Court is not available" });
      }

      // Get the first pair
      const pair1 = await storage.getPair(pairId);
      if (!pair1) {
        return res.status(404).json({ message: "Pair not found" });
      }

      if (!pair1.isWaiting) {
        return res.status(400).json({ message: "Pair is not waiting" });
      }

      // Get other waiting pairs (excluding the selected one)
      const waitingPairs = await storage.getWaitingPairs(tournamentId);
      const otherPairs = waitingPairs.filter(p => p.id !== pairId);

      if (otherPairs.length === 0) {
        return res.status(400).json({ message: "Need at least one more pair to create a match" });
      }

      // Take the next waiting pair
      const pair2 = otherPairs[0];

      // Create match
      const match = await storage.createMatch({
        tournamentId,
        courtId: court.id,
        pair1Id: pair1.id,
        pair2Id: pair2.id,
        categoryId: pair1.categoryId,
        accessToken: randomUUID(),
        status: "playing"
      });

      // Update court and pairs
      await storage.updateCourt(court.id, { isAvailable: false });
      await storage.updatePair(pair1.id, { isWaiting: false });
      await storage.updatePair(pair2.id, { isWaiting: false });

      broadcastUpdate({ type: "match_started", data: match });

      res.json({ 
        message: `Match created on court ${court.name}`,
        match 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to assign court", error: error.message });
    }
  });

  // ========== SUPERADMIN ROUTES ==========
  
  // User Management
  app.get("/api/admin/users", requireSuperadmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, email: u.email })));
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get users", error: error.message });
    }
  });

  app.post("/api/admin/users", requireSuperadmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create user", error: error.message });
    }
  });

  app.patch("/api/admin/users/:id", requireSuperadmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update user", error: error.message });
    }
  });

  // Tournament Management
  app.get("/api/admin/tournaments", requireSuperadmin, async (req, res) => {
    try {
      const tournaments = await storage.getTournaments();
      res.json(tournaments);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get tournaments", error: error.message });
    }
  });

  app.post("/api/admin/tournaments", requireSuperadmin, async (req, res) => {
    try {
      const tournamentData = insertTournamentSchema.parse(req.body);
      const tournament = await storage.createTournament(tournamentData);
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create tournament", error: error.message });
    }
  });

  app.patch("/api/admin/tournaments/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Check authorization - superadmin or tournament admin
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          id
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Superadmin or tournament admin access required" });
      }
      
      const tournament = await storage.updateTournament(id, updates);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update tournament", error: error.message });
    }
  });

  // Tournament User Assignment
  app.get("/api/admin/tournament-users/:tournamentId", requireSuperadmin, async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournamentUsers = await storage.getTournamentUsersByTournament(tournamentId);
      
      // Enrich with user details
      const enriched = await Promise.all(
        tournamentUsers.map(async (tu) => {
          const user = await storage.getUser(tu.userId);
          return { ...tu, user: user ? { id: user.id, username: user.username, name: user.name } : null };
        })
      );
      
      res.json(enriched);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get tournament users", error: error.message });
    }
  });

  app.post("/api/admin/tournament-users", requireSuperadmin, async (req, res) => {
    try {
      const assignmentData = insertTournamentUserSchema.parse(req.body);
      
      // Check if assignment already exists
      const existing = await storage.getTournamentUserByUserAndTournament(
        assignmentData.userId,
        assignmentData.tournamentId
      );
      
      if (existing) {
        return res.status(400).json({ message: "User already assigned to this tournament" });
      }
      
      const tournamentUser = await storage.createTournamentUser(assignmentData);
      res.json(tournamentUser);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to assign user to tournament", error: error.message });
    }
  });

  app.delete("/api/admin/tournament-users/:id", requireSuperadmin, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteTournamentUser(id);
      if (!success) {
        return res.status(404).json({ message: "Tournament user assignment not found" });
      }
      res.json({ message: "User removed from tournament" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to remove user from tournament", error: error.message });
    }
  });

  // ========== TOURNAMENT ADMIN ROUTES (require tournament admin role) ==========
  
  // Category Management
  app.get("/api/categories/:tournamentId", requireTournamentAccess(), async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const categories = await storage.getCategoriesByTournament(tournamentId);
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get categories", error: error.message });
    }
  });

  app.post("/api/categories", requireTournamentRole('admin'), async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
      broadcastUpdate({ type: "category_created", data: category });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create category", error: error.message });
    }
  });

  app.patch("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Fetch category to get tournamentId for authorization
      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check authorization - explicit permission check
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existingCategory.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with update
      const category = await storage.updateCategory(id, updates);
      res.json(category);
      broadcastUpdate({ type: "category_updated", data: category });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update category", error: error.message });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch category to get tournamentId for authorization
      const existingCategory = await storage.getCategory(id);
      if (!existingCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check authorization - explicit permission check
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existingCategory.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with delete
      const success = await storage.deleteCategory(id);
      if (!success) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted" });
      broadcastUpdate({ type: "category_deleted", data: { id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete category", error: error.message });
    }
  });

  // Sponsor Banner Management
  app.get("/api/banners/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const banners = await storage.getSponsorBannersByTournament(tournamentId);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get banners", error: error.message });
    }
  });

  app.post("/api/banners", requireTournamentRole('admin'), async (req, res) => {
    try {
      const bannerData = insertSponsorBannerSchema.parse(req.body);
      const banner = await storage.createSponsorBanner(bannerData);
      res.json(banner);
      broadcastUpdate({ type: "banner_created", data: banner });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create banner", error: error.message });
    }
  });

  app.patch("/api/banners/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Fetch banner to get tournamentId for authorization
      const existingBanner = await storage.getSponsorBanner(id);
      if (!existingBanner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      
      // Check authorization - explicit permission check
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existingBanner.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with update
      const banner = await storage.updateSponsorBanner(id, updates);
      res.json(banner);
      broadcastUpdate({ type: "banner_updated", data: banner });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update banner", error: error.message });
    }
  });

  app.delete("/api/banners/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch banner to get tournamentId for authorization
      const existingBanner = await storage.getSponsorBanner(id);
      if (!existingBanner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      
      // Check authorization - explicit permission check
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existingBanner.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with delete
      const success = await storage.deleteSponsorBanner(id);
      if (!success) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json({ message: "Banner deleted" });
      broadcastUpdate({ type: "banner_deleted", data: { id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete banner", error: error.message });
    }
  });

  // ============ Object Storage (File Upload) ============
  // Reference: blueprint:javascript_object_storage
  
  // Get upload URL for file upload - requires authentication
  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL", error: error.message });
    }
  });

  // Serve uploaded objects (public access for advertisements)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // ============ Advertisement Management ============
  
  // Configure multer for advertisement file uploads
  const advertisementStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/uploads/advertisements');
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp-randomstring-originalname
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = file.originalname.split('.').pop();
      cb(null, `ad-${uniqueSuffix}.${ext}`);
    }
  });

  const uploadAdvertisement = multer({ 
    storage: advertisementStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
      // Allow images, videos, and gifs
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only images and videos are allowed.'));
      }
    }
  });

  // Upload advertisement file
  app.post("/api/advertisements/upload", requireAuth, (req, res, next) => {
    uploadAdvertisement.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          // Multer-specific errors
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: "El archivo es demasiado grande. Máximo 50MB" });
          }
          return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
        }
        // Other errors (like file type rejection)
        return res.status(400).json({ message: err.message || "Error al subir archivo" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No se seleccionó ningún archivo" });
      }

      // Return the URL path to access the file
      const fileUrl = `/uploads/advertisements/${req.file.filename}`;
      res.json({ 
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    });
  });
  
  app.get("/api/advertisements/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const advertisements = await storage.getAdvertisementsByTournament(tournamentId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get advertisements", error: error.message });
    }
  });

  app.get("/api/advertisements/active/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const advertisements = await storage.getActiveAdvertisements(tournamentId);
      res.json(advertisements);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get active advertisements", error: error.message });
    }
  });

  app.post("/api/advertisements", requireTournamentRole('admin'), async (req, res) => {
    try {
      const adData = insertAdvertisementSchema.parse(req.body);
      
      // If contentUrl is a Google Cloud Storage URL, normalize it and set ACL policy
      if (adData.contentUrl.startsWith("https://storage.googleapis.com/")) {
        const objectStorageService = new ObjectStorageService();
        const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
          adData.contentUrl,
          {
            owner: req.session.userId!,
            visibility: "public", // Advertisements are publicly visible
          }
        );
        adData.contentUrl = normalizedPath;
      }
      
      const advertisement = await storage.createAdvertisement(adData);
      res.json(advertisement);
      broadcastUpdate({ type: "advertisement_created", data: advertisement });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create advertisement", error: error.message });
    }
  });

  app.patch("/api/advertisements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Fetch advertisement to get tournamentId for authorization
      const existingAd = await storage.getAdvertisement(id);
      if (!existingAd) {
        return res.status(404).json({ message: "Advertisement not found" });
      }
      
      // Check authorization
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existingAd.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // If contentUrl is being updated, normalize Google Cloud Storage URLs and set ACL policy
      // Skip if already normalized (starts with /objects/)
      if (updates.contentUrl && 
          !updates.contentUrl.startsWith("/objects/") && 
          updates.contentUrl.startsWith("https://storage.googleapis.com/")) {
        const objectStorageService = new ObjectStorageService();
        const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
          updates.contentUrl,
          {
            owner: req.session.userId!,
            visibility: "public", // Advertisements are publicly visible
          }
        );
        updates.contentUrl = normalizedPath;
      }
      
      // Authorization passed - proceed with update
      const advertisement = await storage.updateAdvertisement(id, updates);
      if (!advertisement) {
        return res.status(404).json({ message: "Advertisement not found" });
      }
      res.json(advertisement);
      broadcastUpdate({ type: "advertisement_updated", data: advertisement });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update advertisement", error: error.message });
    }
  });

  app.delete("/api/advertisements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch advertisement to get tournamentId for authorization
      const existingAd = await storage.getAdvertisement(id);
      if (!existingAd) {
        return res.status(404).json({ message: "Advertisement not found" });
      }
      
      // Check authorization
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existingAd.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with delete
      const success = await storage.deleteAdvertisement(id);
      if (!success) {
        return res.status(404).json({ message: "Advertisement not found" });
      }
      res.json({ message: "Advertisement deleted" });
      broadcastUpdate({ type: "advertisement_deleted", data: { id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete advertisement", error: error.message });
    }
  });

  // Announcements endpoints
  app.get("/api/announcements/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const announcements = await storage.getAnnouncementsByTournament(tournamentId);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get announcements", error: error.message });
    }
  });

  app.get("/api/announcements/active/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const announcements = await storage.getActiveAnnouncements(tournamentId);
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get active announcements", error: error.message });
    }
  });

  app.post("/api/announcements", requireTournamentRole('admin'), async (req, res) => {
    try {
      const announcementData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(announcementData);
      res.json(announcement);
      broadcastUpdate({ type: "announcement_created", data: announcement });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create announcement", error: error.message });
    }
  });

  app.patch("/api/announcements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Fetch announcement to get tournamentId for authorization
      const existing = await storage.getAnnouncement(id);
      if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      // Check authorization
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existing.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with update
      const announcement = await storage.updateAnnouncement(id, updates);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
      broadcastUpdate({ type: "announcement_updated", data: announcement });
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update announcement", error: error.message });
    }
  });

  app.delete("/api/announcements/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Fetch announcement to get tournamentId for authorization
      const existing = await storage.getAnnouncement(id);
      if (!existing) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      // Check authorization
      let isAuthorized = false;
      
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          existing.tournamentId
        );
        
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Admin access required for this tournament" });
      }
      
      // Authorization passed - proceed with delete
      const success = await storage.deleteAnnouncement(id);
      if (!success) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json({ message: "Announcement deleted" });
      broadcastUpdate({ type: "announcement_deleted", data: { id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete announcement", error: error.message });
    }
  });

  // ============ Scheduled Matches Routes ============
  
  // Get all scheduled matches for a tournament
  app.get("/api/scheduled-matches/:tournamentId", requireTournamentAccess(), async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const matches = await storage.getScheduledMatchesByTournament(tournamentId);
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch scheduled matches", error: error.message });
    }
  });

  // Get ready matches (all players present, waiting for court assignment)
  app.get("/api/scheduled-matches/ready/:tournamentId", requireTournamentAccess(), async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const allMatches = await storage.getScheduledMatchesByTournament(tournamentId);
      
      // Filter for matches where at least one pair is confirmed (both players of one pair checked in), no court assigned yet
      const readyMatches = allMatches.filter(match => {
        // Count players present per pair using match.players array
        const pair1CheckIns = match.players.filter(p => p.pairId === match.pair1Id && p.isPresent).length;
        const pair2CheckIns = match.players.filter(p => p.pairId === match.pair2Id && p.isPresent).length;
        
        // At least one COMPLETE pair must be confirmed (both players = 2)
        const pair1Complete = pair1CheckIns === 2;
        const pair2Complete = pair2CheckIns === 2;
        const atLeastOnePairReady = pair1Complete || pair2Complete;
        
        // Show ready matches regardless of day (allow past matches with confirmed players to be assigned)
        return atLeastOnePairReady && !match.courtId && (match.status === 'scheduled' || match.status === 'ready');
      });
      
      // Sort by waiting time (oldest first)
      readyMatches.sort((a, b) => {
        const aTime = Math.min(...a.players.map(p => p.checkInTime ? new Date(p.checkInTime).getTime() : Infinity));
        const bTime = Math.min(...b.players.map(p => p.checkInTime ? new Date(p.checkInTime).getTime() : Infinity));
        return aTime - bTime;
      });
      
      res.json(readyMatches);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch ready matches", error: error.message });
    }
  });

  // Get scheduled matches for a specific day (public endpoint for display)
  app.get("/api/scheduled-matches/day/:tournamentId", async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const { day } = req.query;
      
      if (!day) {
        return res.status(400).json({ message: "Day parameter is required" });
      }
      
      const matches = await storage.getScheduledMatchesByDay(tournamentId, new Date(day as string));
      res.json(matches);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch scheduled matches for day", error: error.message });
    }
  });

  // Create a new scheduled match
  app.post("/api/scheduled-matches", requireTournamentRole('admin'), async (req, res) => {
    try {
      const insertMatch = insertScheduledMatchSchema.parse(req.body);
      
      // Check for duplicates if court and time are specified
      if (insertMatch.courtId && insertMatch.plannedTime) {
        const existingMatches = await storage.getScheduledMatchesByDay(
          insertMatch.tournamentId,
          insertMatch.day
        );
        
        const duplicate = existingMatches.find(m => 
          m.courtId === insertMatch.courtId && 
          m.plannedTime === insertMatch.plannedTime &&
          m.status !== 'cancelled' &&
          m.status !== 'completed'
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: "Ya existe un partido programado en esta cancha a la misma hora",
            duplicate: {
              court: duplicate.courtId,
              time: duplicate.plannedTime,
              day: duplicate.day
            }
          });
        }
      }
      
      const scheduledMatch = await storage.createScheduledMatch(insertMatch);
      res.status(201).json(scheduledMatch);
      broadcastUpdate({ type: "scheduled_match_created", data: scheduledMatch });
    } catch (error: any) {
      res.status(400).json({ message: "Invalid scheduled match data", error: error.message });
    }
  });

  // Update a scheduled match
  app.patch("/api/scheduled-matches/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Convert day string to Date if present
      if (updates.day && typeof updates.day === 'string') {
        updates.day = new Date(updates.day + 'T12:00:00');
      }
      
      const match = await storage.getScheduledMatch(id);
      if (!match) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }

      let isAuthorized = false;
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          match.tournamentId
        );
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ message: "Tournament admin access required" });
      }
      
      const updatedMatch = await storage.updateScheduledMatch(id, updates);
      if (!updatedMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      
      res.json(updatedMatch);
      broadcastUpdate({ type: "scheduled_match_updated", data: updatedMatch });
    } catch (error: any) {
      console.error('[PATCH scheduled-match] Error:', error);
      res.status(500).json({ message: "Failed to update scheduled match", error: error.message });
    }
  });

  // Delete a scheduled match
  app.delete("/api/scheduled-matches/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const match = await storage.getScheduledMatch(id);
      if (!match) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }

      let isAuthorized = false;
      if (req.session.userRole === 'superadmin') {
        isAuthorized = true;
      } else {
        const tournamentUser = await storage.getTournamentUserByUserAndTournament(
          req.session.userId!,
          match.tournamentId
        );
        if (tournamentUser && tournamentUser.status === 'active' && tournamentUser.role === 'admin') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ message: "Tournament admin access required" });
      }
      
      // If court was assigned, release it and handle pre-assigned match before deleting
      if (match.courtId) {
        await releaseCourtAndHandlePreAssignment(match.courtId, broadcastUpdate);
      }
      
      const success = await storage.deleteScheduledMatch(id);
      
      if (!success) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      
      res.json({ message: "Scheduled match deleted" });
      broadcastUpdate({ type: "scheduled_match_deleted", data: { id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete scheduled match", error: error.message });
    }
  });

  // Check-in a player for a scheduled match
  app.post("/api/scheduled-matches/:id/check-in", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ message: "Player ID is required" });
      }
      
      const checkedInBy = req.session.userId!;
      const player = await storage.checkInPlayer(id, playerId, checkedInBy);
      
      if (!player) {
        return res.status(404).json({ message: "Scheduled match or player not found" });
      }
      
      // Get updated match details to check if ready
      let match = await storage.getScheduledMatch(id);
      
      // Check if at least one complete pair is confirmed and update status to 'ready'
      if (match && match.status === 'scheduled') {
        const checkInRecords = await storage.getScheduledMatchPlayers(id);
        const pair1CheckIns = checkInRecords.filter(p => p.pairId === match!.pair1Id && p.isPresent).length;
        const pair2CheckIns = checkInRecords.filter(p => p.pairId === match!.pair2Id && p.isPresent).length;
        
        const pair1Complete = pair1CheckIns === 2;
        const pair2Complete = pair2CheckIns === 2;
        
        if (pair1Complete || pair2Complete) {
          match = await storage.updateScheduledMatch(id, { status: 'ready' });
        }
      }
      
      // Auto-start match if ALL players confirmed AND court assigned
      // Works with both 'ready' and 'assigned' status
      if (match && (match.status === 'ready' || match.status === 'assigned') && match.courtId && match.categoryId && !match.preAssignedAt) {
        const checkInRecords = await storage.getScheduledMatchPlayers(id);
        const pair1CheckIns = checkInRecords.filter(p => p.pairId === match!.pair1Id && p.isPresent).length;
        const pair2CheckIns = checkInRecords.filter(p => p.pairId === match!.pair2Id && p.isPresent).length;
        
        const allPlayersConfirmed = pair1CheckIns === 2 && pair2CheckIns === 2;
        
        if (allPlayersConfirmed) {
          // Create playing match
          const playingMatch = await storage.createMatch({
            tournamentId: match.tournamentId,
            courtId: match.courtId,
            pair1Id: match.pair1Id,
            pair2Id: match.pair2Id,
            categoryId: match.categoryId,
            format: match.format,
            accessToken: randomUUID(),
            status: "playing",
          });
          
          // Update scheduled match status
          await storage.updateScheduledMatch(id, { 
            status: "playing",
            matchId: playingMatch.id 
          });
          
          // Update court and pairs
          const updatedCourt = await storage.updateCourt(match.courtId, { isAvailable: false });
          await storage.updatePair(match.pair1Id, { isWaiting: false });
          await storage.updatePair(match.pair2Id, { isWaiting: false });
          
          broadcastUpdate({ type: "match_started", data: playingMatch });
          if (updatedCourt) {
            broadcastUpdate({ type: "court_updated", data: updatedCourt });
          }
          
          // Update match reference for response
          match = await storage.getScheduledMatch(id);
        }
      }
      
      res.json({ player, match });
      broadcastUpdate({ type: "player_checked_in", data: { scheduledMatchId: id, playerId, match } });
      // Trigger waiting list update
      broadcastUpdate({ type: "pair_registered", data: { matchId: id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to check-in player", error: error.message });
    }
  });

  // Check-out a player from a scheduled match
  app.post("/api/scheduled-matches/:id/check-out", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ message: "Player ID is required" });
      }
      
      const player = await storage.checkOutPlayer(id, playerId);
      
      if (!player) {
        return res.status(404).json({ message: "Scheduled match or player not found" });
      }
      
      let match = await storage.getScheduledMatch(id);
      
      // Check if we need to revert status from 'ready' to 'scheduled' if no complete pair
      if (match && match.status === 'ready') {
        const checkInRecords = await storage.getScheduledMatchPlayers(id);
        const pair1CheckIns = checkInRecords.filter(p => p.pairId === match!.pair1Id && p.isPresent).length;
        const pair2CheckIns = checkInRecords.filter(p => p.pairId === match!.pair2Id && p.isPresent).length;
        
        const pair1Complete = pair1CheckIns === 2;
        const pair2Complete = pair2CheckIns === 2;
        
        if (!pair1Complete && !pair2Complete) {
          match = await storage.updateScheduledMatch(id, { status: 'scheduled' });
        }
      }
      
      res.json({ player, match });
      broadcastUpdate({ type: "player_checked_out", data: { scheduledMatchId: id, playerId, match } });
      // Trigger waiting list update
      broadcastUpdate({ type: "pair_registered", data: { matchId: id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to check-out player", error: error.message });
    }
  });

  // Reset player status to unconfirmed
  app.post("/api/scheduled-matches/:id/reset-status", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ message: "Player ID is required" });
      }
      
      const player = await storage.resetPlayerStatus(id, playerId);
      
      if (!player) {
        return res.status(404).json({ message: "Scheduled match or player not found" });
      }
      
      const match = await storage.getScheduledMatch(id);
      res.json({ player, match });
      broadcastUpdate({ type: "player_status_reset", data: { scheduledMatchId: id, playerId, match } });
      // Trigger waiting list update
      broadcastUpdate({ type: "pair_registered", data: { matchId: id } });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to reset player status", error: error.message });
    }
  });

  // Execute DQF (Disqualification) for a match pending admin decision
  app.post("/api/scheduled-matches/:id/dqf", requireTournamentRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      
      const match = await storage.getScheduledMatch(id);
      
      if (!match) {
        return res.status(404).json({ message: "Partido programado no encontrado" });
      }
      
      if (!match.pendingDqf) {
        return res.status(400).json({ message: "Este partido no está pendiente de descalificación" });
      }
      
      if (!match.defaultWinnerPairId) {
        return res.status(400).json({ message: "No se puede determinar el ganador por default" });
      }
      
      const winnerPairId = match.defaultWinnerPairId;
      const loserPairId = winnerPairId === match.pair1Id ? match.pair2Id : match.pair1Id;
      
      // Get courtId - use assigned court or get first available court
      let courtId = match.courtId;
      if (!courtId) {
        const courts = await storage.getCourts();
        courtId = courts[0]?.id || 'unknown';
      }
      
      // Create default score: 6-3, 6-3
      const defaultScore = {
        sets: winnerPairId === match.pair1Id ? [[6, 3], [6, 3]] : [[3, 6], [3, 6]],
        currentSet: 3,
        currentPoints: [0, 0],
      };
      
      // Create match record with finished status
      const createdMatch = await storage.createMatch({
        tournamentId: match.tournamentId,
        courtId,
        pair1Id: match.pair1Id,
        pair2Id: match.pair2Id,
        categoryId: match.categoryId,
        format: match.format,
        status: 'finished',
        score: defaultScore,
        winnerId: winnerPairId,
        accessToken: randomUUID(),
        notes: 'Descalificado por administrador - pareja contraria ausente',
      });
      
      // Create result record
      await storage.createResult({
        matchId: createdMatch.id,
        winnerId: winnerPairId,
        loserId: loserPairId,
        score: defaultScore,
      });
      
      // Update scheduled match to completed and clear pendingDqf
      const updatedMatch = await storage.updateScheduledMatch(id, {
        status: 'completed',
        matchId: createdMatch.id,
        outcome: 'default',
        outcomeReason: 'PARTIDO GANADO POR DEFAULT (DQF)',
        pendingDqf: false,
      });
      
      // Release court and handle pre-assigned match if assigned
      if (match.courtId) {
        await releaseCourtAndHandlePreAssignment(match.courtId, broadcastUpdate);
      }
      
      // Broadcast updates
      broadcastUpdate({ type: 'match_dqf_executed', data: updatedMatch });
      broadcastUpdate({ type: 'match_finished', data: createdMatch });
      
      res.json({ match: updatedMatch, result: createdMatch });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to execute DQF", error: error.message });
    }
  });

  // Auto-assign court to a ready match
  app.post("/api/scheduled-matches/:id/auto-assign", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First check if the match exists
      const existingMatch = await storage.getScheduledMatch(id);
      if (!existingMatch) {
        return res.status(404).json({ message: "Partido programado no encontrado" });
      }
      
      // Check if at least one pair has confirmed (both players present)
      const pair1 = await storage.getPair(existingMatch.pair1Id);
      const pair2 = await storage.getPair(existingMatch.pair2Id);
      
      if (!pair1 || !pair2) {
        return res.status(404).json({ message: "Parejas no encontradas" });
      }
      
      const pair1Confirmed = pair1.isPresent === true;
      const pair2Confirmed = pair2.isPresent === true;
      
      if (!pair1Confirmed && !pair2Confirmed) {
        return res.status(400).json({ 
          message: "Al menos una pareja debe estar confirmada (ambos jugadores presentes) para asignar una cancha" 
        });
      }
      
      const match = await storage.autoAssignCourt(id);
      
      if (!match) {
        return res.status(400).json({ message: "No hay canchas disponibles. Todas las canchas están ocupadas por partidos en curso." });
      }
      
      broadcastUpdate({ type: "court_auto_assigned", data: match });
      
      // Auto-start match if all players are confirmed (check all 4 players present)
      const checkInRecords = await storage.getScheduledMatchPlayers(id);
      const pair1CheckIns = checkInRecords.filter(p => p.pairId === match.pair1Id && p.isPresent).length;
      const pair2CheckIns = checkInRecords.filter(p => p.pairId === match.pair2Id && p.isPresent).length;
      const allPlayersConfirmed = pair1CheckIns === 2 && pair2CheckIns === 2;
      
      if ((match.status === "ready" || match.status === "assigned") && match.courtId && match.categoryId && allPlayersConfirmed && !match.preAssignedAt) {
        // Create playing match
        const playingMatch = await storage.createMatch({
          tournamentId: match.tournamentId,
          courtId: match.courtId,
          pair1Id: match.pair1Id,
          pair2Id: match.pair2Id,
          categoryId: match.categoryId,
          format: match.format,
          accessToken: randomUUID(),
          status: "playing",
        });
        
        // Update scheduled match status
        await storage.updateScheduledMatch(id, { 
          status: "playing",
          matchId: playingMatch.id 
        });
        
        // Update court and pairs
        const updatedCourt = await storage.updateCourt(match.courtId, { isAvailable: false });
        await storage.updatePair(match.pair1Id, { isWaiting: false });
        await storage.updatePair(match.pair2Id, { isWaiting: false });
        
        broadcastUpdate({ type: "match_started", data: playingMatch });
        if (updatedCourt) {
          broadcastUpdate({ type: "court_updated", data: updatedCourt });
        }
        
        res.json(playingMatch);
      } else {
        res.json(match);
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to auto-assign court", error: error.message });
    }
  });

  // Manually assign court to a match
  app.post("/api/scheduled-matches/:id/assign-court", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { courtId } = req.body;
      
      if (!courtId) {
        return res.status(400).json({ message: "Court ID is required" });
      }
      
      // Get the current match to check for conflicts
      const currentMatch = await storage.getScheduledMatch(id);
      if (!currentMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      
      // Check if at least one pair has confirmed (both players present)
      const pair1 = await storage.getPair(currentMatch.pair1Id);
      const pair2 = await storage.getPair(currentMatch.pair2Id);
      
      if (!pair1 || !pair2) {
        return res.status(404).json({ message: "Parejas no encontradas" });
      }
      
      const pair1Confirmed = pair1.isPresent === true;
      const pair2Confirmed = pair2.isPresent === true;
      
      if (!pair1Confirmed && !pair2Confirmed) {
        return res.status(400).json({ 
          message: "Al menos una pareja debe estar confirmada (ambos jugadores presentes) para asignar una cancha" 
        });
      }
      
      // Check if court exists
      const court = await storage.getCourt(courtId);
      if (!court) {
        return res.status(404).json({ message: "Court not found" });
      }
      
      let isPreAssignment = false;
      
      console.log(`[Pre-assignment check] Court ${courtId} isAvailable: ${court.isAvailable}`);
      
      // If court is not available, check if we can pre-assign (40+ min match)
      if (!court.isAvailable) {
        // Find current match on this court
        const allMatches = await storage.getMatches();
        const currentCourtMatch = allMatches.find(m => 
          m.courtId === courtId && 
          m.status === 'playing'
        );
        
        console.log(`[Pre-assignment check] Current match on court: ${currentCourtMatch ? currentCourtMatch.id : 'none'}, status: ${currentCourtMatch?.status}`);
        
        if (currentCourtMatch && currentCourtMatch.startTime) {
          const matchDurationMs = Date.now() - currentCourtMatch.startTime.getTime();
          const matchDurationMin = matchDurationMs / (1000 * 60);
          
          console.log(`[Pre-assignment check] Match duration: ${matchDurationMin.toFixed(1)} minutes`);
          
          if (matchDurationMin >= 40) {
            // Allow pre-assignment
            isPreAssignment = true;
            console.log(`[Pre-assignment check] PRE-ASSIGNMENT ALLOWED - Match has been playing for ${matchDurationMin.toFixed(1)} minutes`);
          } else {
            const remainingMin = Math.ceil(40 - matchDurationMin);
            return res.status(400).json({ 
              message: `Esta cancha está en uso. Podrás pre-asignarla en ${remainingMin} minutos (cuando lleve 40+ min de juego)`,
            });
          }
        } else {
          // Court marked as unavailable but no active match - something is wrong
          return res.status(400).json({ 
            message: "Esta cancha no está disponible",
          });
        }
      }
      
      // Check if court is already assigned to another active scheduled match
      // Skip this check if we're doing a pre-assignment (court is busy with ongoing match)
      console.log(`[Conflict check] isPreAssignment: ${isPreAssignment}, checking scheduled match conflicts...`);
      
      if (!isPreAssignment) {
        const allScheduledMatches = await storage.getScheduledMatchesByTournament(currentMatch.tournamentId);
        const courtConflict = allScheduledMatches.find(m => 
          m.id !== id && // Exclude current match
          m.courtId === courtId && 
          (m.matchId !== null || m.preAssignedAt !== null) // Only block if match is actually playing or pre-assigned
        );
        
        console.log(`[Conflict check] Court conflict found: ${courtConflict ? `YES (match ${courtConflict.id})` : 'NO'}`);
        
        if (courtConflict) {
          return res.status(400).json({ 
            message: "Esta cancha ya está asignada a otro partido activo",
          });
        }
      } else {
        console.log(`[Conflict check] SKIPPED - This is a pre-assignment`);
      }
      
      // Check for conflicts if time is specified
      // Skip this check if we're doing a pre-assignment (court is busy with ongoing match)
      if (currentMatch.plannedTime && !isPreAssignment) {
        const existingMatches = await storage.getScheduledMatchesByDay(
          currentMatch.tournamentId,
          currentMatch.day
        );
        
        const duplicate = existingMatches.find(m => 
          m.id !== id && // Exclude current match
          m.courtId === courtId && 
          m.plannedTime === currentMatch.plannedTime &&
          m.status !== 'cancelled' &&
          m.status !== 'completed'
        );
        
        if (duplicate) {
          return res.status(400).json({ 
            message: "Ya existe un partido programado en esta cancha a la misma hora",
            duplicate: {
              court: duplicate.courtId,
              time: duplicate.plannedTime,
              day: duplicate.day
            }
          });
        }
      }
      
      let match: any;
      
      if (isPreAssignment) {
        // Pre-assign court (match won't start until current match finishes)
        match = await storage.updateScheduledMatch(id, {
          courtId,
          status: "assigned",
          preAssignedAt: new Date(),
        });
        
        // Update court with pre-assigned match reference
        await storage.updateCourt(courtId, {
          preAssignedScheduledMatchId: id
        });
        
        if (!match) {
          return res.status(404).json({ message: "Failed to pre-assign court" });
        }
        
        res.json({ ...match, isPreAssigned: true });
        broadcastUpdate({ type: "court_pre_assigned", data: { ...match, isPreAssigned: true } });
      } else {
        // Normal assignment
        match = await storage.manualAssignCourt(id, courtId);
        
        if (!match) {
          return res.status(404).json({ message: "Failed to assign court" });
        }
        
        broadcastUpdate({ type: "court_manually_assigned", data: match });
        
        // Auto-start match if all players are confirmed (check again)
        // Need to verify all 4 players are present since we might have assigned before all confirmed
        const checkInRecords = await storage.getScheduledMatchPlayers(id);
        const pair1CheckIns = checkInRecords.filter(p => p.pairId === match.pair1Id && p.isPresent).length;
        const pair2CheckIns = checkInRecords.filter(p => p.pairId === match.pair2Id && p.isPresent).length;
        const allPlayersConfirmed = pair1CheckIns === 2 && pair2CheckIns === 2;
        
        if ((match.status === "ready" || match.status === "assigned") && match.courtId && match.categoryId && allPlayersConfirmed && !match.preAssignedAt) {
          // Create playing match
          const playingMatch = await storage.createMatch({
            tournamentId: match.tournamentId,
            courtId: match.courtId,
            pair1Id: match.pair1Id,
            pair2Id: match.pair2Id,
            categoryId: match.categoryId,
            format: match.format,
            accessToken: randomUUID(),
            status: "playing",
          });
          
          // Update scheduled match status
          await storage.updateScheduledMatch(id, { 
            status: "playing",
            matchId: playingMatch.id 
          });
          
          // Update court and pairs
          const updatedCourt = await storage.updateCourt(match.courtId, { isAvailable: false });
          await storage.updatePair(match.pair1Id, { isWaiting: false });
          await storage.updatePair(match.pair2Id, { isWaiting: false });
          
          broadcastUpdate({ type: "match_started", data: playingMatch });
          if (updatedCourt) {
            broadcastUpdate({ type: "court_updated", data: updatedCourt });
          }
          
          res.json(playingMatch);
        } else {
          res.json(match);
        }
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to assign court", error: error.message });
    }
  });

  // Get players for a scheduled match (for check-in UI)
  app.get("/api/scheduled-matches/:id/players", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const players = await storage.getScheduledMatchPlayers(id);
      res.json(players);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch match players", error: error.message });
    }
  });

  // Start a scheduled match (convert to playing match)
  app.post("/api/scheduled-matches/:id/start", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const scheduledMatch = await storage.getScheduledMatch(id);
      
      if (!scheduledMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      
      if (scheduledMatch.status !== "assigned" && scheduledMatch.status !== "ready") {
        return res.status(400).json({ message: "Match must be ready or have a court assigned to start" });
      }
      
      if (!scheduledMatch.courtId) {
        return res.status(400).json({ message: "No court assigned to this match" });
      }
      
      // Create match "playing"
      const match = await storage.createMatch({
        tournamentId: scheduledMatch.tournamentId,
        courtId: scheduledMatch.courtId,
        pair1Id: scheduledMatch.pair1Id,
        pair2Id: scheduledMatch.pair2Id,
        categoryId: scheduledMatch.categoryId,
        format: scheduledMatch.format,
        accessToken: randomUUID(),
        status: "playing",
      });
      
      // Update scheduled match status
      await storage.updateScheduledMatch(id, { 
        status: "playing",
        matchId: match.id 
      });
      
      // Update court and pairs
      const updatedCourt = await storage.updateCourt(scheduledMatch.courtId, { isAvailable: false });
      await storage.updatePair(scheduledMatch.pair1Id, { isWaiting: false });
      await storage.updatePair(scheduledMatch.pair2Id, { isWaiting: false });
      
      broadcastUpdate({ type: "match_started", data: match });
      if (updatedCourt) {
        broadcastUpdate({ type: "court_updated", data: updatedCourt });
      }
      res.json(match);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to start match", error: error.message });
    }
  });

  // Reactivate a completed match
  app.post("/api/scheduled-matches/:id/reactivate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const scheduledMatch = await storage.getScheduledMatch(id);
      
      if (!scheduledMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      
      if (scheduledMatch.status !== "completed") {
        return res.status(400).json({ message: "Only completed matches can be reactivated" });
      }
      
      // Find and delete associated result if exists
      if (scheduledMatch.matchId) {
        const results = await storage.getResults();
        const associatedResult = results.find(r => r.matchId === scheduledMatch.matchId);
        if (associatedResult) {
          await storage.deleteResult(associatedResult.id);
        }
      }
      
      // Reset scheduled match status to scheduled
      const updatedMatch = await storage.updateScheduledMatch(id, { 
        status: "scheduled",
        matchId: null,
        courtId: null
      });
      
      if (!updatedMatch) {
        return res.status(500).json({ message: "Failed to update scheduled match" });
      }
      
      // Reset all players check-in status
      const players = await storage.getScheduledMatchPlayers(id);
      for (const player of players) {
        await storage.resetPlayerStatus(id, player.playerId);
      }
      
      // Get the updated match with full details
      const reactivatedMatch = await storage.getScheduledMatch(id);
      
      broadcastUpdate({ type: "match_reactivated", data: reactivatedMatch });
      res.json(reactivatedMatch);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to reactivate match", error: error.message });
    }
  });

  // Assign court and optionally start match (for waiting list)
  app.post("/api/scheduled-matches/:id/assign-and-start", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { courtId } = req.body;
      
      if (!courtId) {
        return res.status(400).json({ message: "Court ID is required" });
      }
      
      const scheduledMatch = await storage.getScheduledMatch(id);
      if (!scheduledMatch) {
        return res.status(404).json({ message: "Scheduled match not found" });
      }
      
      // Check if at least one pair has confirmed (both players present)
      const pair1 = await storage.getPair(scheduledMatch.pair1Id);
      const pair2 = await storage.getPair(scheduledMatch.pair2Id);
      
      if (!pair1 || !pair2) {
        return res.status(404).json({ message: "Parejas no encontradas" });
      }
      
      const pair1Confirmed = pair1.isPresent === true;
      const pair2Confirmed = pair2.isPresent === true;
      
      if (!pair1Confirmed && !pair2Confirmed) {
        return res.status(400).json({ 
          message: "Al menos una pareja debe estar confirmada (ambos jugadores presentes) para asignar una cancha" 
        });
      }
      
      // Verify court is available
      const court = await storage.getCourt(courtId);
      if (!court || !court.isAvailable) {
        return res.status(400).json({ message: "Court is not available" });
      }
      
      // Check if court is already assigned to another active scheduled match
      const allScheduledMatches = await storage.getScheduledMatchesByTournament(scheduledMatch.tournamentId);
      const courtConflict = allScheduledMatches.find(m => 
        m.id !== id && // Exclude current match
        m.courtId === courtId && 
        (m.matchId !== null || m.preAssignedAt !== null) // Only block if match is actually playing or pre-assigned
      );
      
      if (courtConflict) {
        return res.status(400).json({ 
          message: "Esta cancha ya está asignada a otro partido activo",
        });
      }
      
      // Assign court
      const assignedMatch = await storage.manualAssignCourt(id, courtId);
      
      if (!assignedMatch) {
        return res.status(500).json({ message: "Failed to assign court" });
      }
      
      broadcastUpdate({ type: "court_manually_assigned", data: assignedMatch });
      
      // Auto-start match if all players are confirmed (status "ready")
      if (assignedMatch.status === "ready" && assignedMatch.categoryId) {
        // Create playing match
        const match = await storage.createMatch({
          tournamentId: scheduledMatch.tournamentId,
          courtId: courtId,
          pair1Id: scheduledMatch.pair1Id,
          pair2Id: scheduledMatch.pair2Id,
          categoryId: scheduledMatch.categoryId,
          format: scheduledMatch.format,
          accessToken: randomUUID(),
          status: "playing",
        });
        
        // Update scheduled match status
        await storage.updateScheduledMatch(id, { 
          status: "playing",
          matchId: match.id,
          courtId: courtId
        });
        
        // Update court and pairs
        const updatedCourt = await storage.updateCourt(courtId, { isAvailable: false });
        await storage.updatePair(scheduledMatch.pair1Id, { isWaiting: false });
        await storage.updatePair(scheduledMatch.pair2Id, { isWaiting: false });
        
        broadcastUpdate({ type: "match_started", data: match });
        if (updatedCourt) {
          broadcastUpdate({ type: "court_updated", data: updatedCourt });
        }
        res.json({ match, message: `Partido iniciado automáticamente en cancha ${court.name}` });
      } else {
        // Just assigned court, did not auto-start
        res.json({ 
          match: assignedMatch, 
          message: `Cancha ${court.name} asignada. El partido se iniciará automáticamente cuando todos los jugadores confirmen.` 
        });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to assign court", error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<ExtendedWebSocket>();

  function broadcastUpdate(message: any) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  wss.on('connection', (ws: ExtendedWebSocket) => {
    ws.isAlive = true;
    clients.add(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth') {
          ws.userId = data.userId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  // Ping clients periodically to keep connections alive
  const interval = setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return { server: httpServer, broadcastUpdate, storage };
}
