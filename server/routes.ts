import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPlayerSchema, insertPairSchema, insertMatchSchema, insertResultSchema, insertCourtSchema } from "@shared/schema";
import { z } from "zod";

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Admin role middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.session.userRole !== 'admin') {
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
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          name: user.name, 
          role: user.role 
        } 
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
      res.json(tournament);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get tournament", error: error.message });
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
      const pairs = await storage.getPairs();
      res.json(pairs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get pairs", error: error.message });
    }
  });

  app.post("/api/pairs", requireAuth, async (req, res) => {
    try {
      const pairData = insertPairSchema.parse(req.body);
      const newPair = await storage.createPair(pairData);
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

  // Matches routes
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
      
      // If match is finished, make court available
      if (updates.status === "finished") {
        await storage.updateCourt(updatedMatch.courtId, { isAvailable: true });
      }
      
      broadcastUpdate({ type: "match_updated", data: updatedMatch });
      res.json(updatedMatch);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to update match", error: error.message });
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

  app.post("/api/results", requireAuth, async (req, res) => {
    try {
      const resultData = insertResultSchema.parse(req.body);
      const newResult = await storage.createResult(resultData);
      
      // Update match status
      const match = await storage.getMatch(resultData.matchId);
      if (match) {
        await storage.updateMatch(match.id, { 
          status: "finished", 
          endTime: new Date(),
          winnerId: resultData.winnerId,
          score: resultData.score
        });
        
        // Make court available
        await storage.updateCourt(match.courtId, { isAvailable: true });
      }
      
      broadcastUpdate({ type: "result_recorded", data: newResult });
      res.status(201).json(newResult);
    } catch (error: any) {
      res.status(400).json({ message: "Failed to create result", error: error.message });
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
        
        // Create match
        const match = await storage.createMatch({
          tournamentId,
          courtId: court.id,
          pair1Id: pair1.id,
          pair2Id: pair2.id,
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

  return httpServer;
}
