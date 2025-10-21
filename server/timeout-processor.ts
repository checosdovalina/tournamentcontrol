import { log } from "./vite";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";
import { combineDateTimeInTimezone, formatInTimezone } from "./timezone-utils";

export function startTimeoutProcessor(storage: IStorage, broadcastUpdate: (data: any) => void) {
  // Run check every minute
  const INTERVAL_MS = 60 * 1000; // 60 seconds
  const TOLERANCE_MINUTES = 15;

  const processTimeouts = async () => {
    log('[Timeout Processor] Running timeout check...');
    try {
      const now = new Date();
      
      // Get all scheduled matches that might be overdue
      const allMatches = await storage.getAllScheduledMatches();
      log(`[Timeout Processor] Found ${allMatches.length} total matches to evaluate`);
      
      // Group matches by tournament to minimize tournament lookups
      const tournamentCache = new Map<string, any>();
      
      for (const match of allMatches) {
        // Skip if already completed, cancelled, or playing
        if (match.status === 'completed' || match.status === 'cancelled' || match.status === 'playing') {
          continue;
        }
        
        // Skip if no planned time
        if (!match.plannedTime) {
          continue;
        }
        
        // Get tournament timezone (with caching)
        let tournament = tournamentCache.get(match.tournamentId);
        if (!tournament) {
          tournament = await storage.getTournament(match.tournamentId);
          if (tournament) {
            tournamentCache.set(match.tournamentId, tournament);
          }
        }
        
        // Default to America/Santiago if tournament not found or no timezone set
        const timezone = tournament?.timezone || 'America/Santiago';
        
        // Create match datetime using tournament timezone
        const matchDay = typeof match.day === 'string' ? new Date(match.day) : match.day;
        const matchDateTime = combineDateTimeInTimezone(matchDay, match.plannedTime, timezone);
        const timeoutThreshold = new Date(matchDateTime.getTime() + TOLERANCE_MINUTES * 60 * 1000);
        
        // Skip if match was created RECENTLY after its timeout period (retroactive scheduling)
        // This prevents immediate cancellation when scheduling past matches
        // But we only skip if created within 2 hours of the timeout - older matches should be processed
        const matchCreatedAt = typeof match.createdAt === 'string' ? new Date(match.createdAt) : match.createdAt;
        if (matchCreatedAt && matchCreatedAt >= timeoutThreshold) {
          const timeSinceTimeout = matchCreatedAt.getTime() - timeoutThreshold.getTime();
          const twoHoursInMs = 2 * 60 * 60 * 1000;
          
          // Only skip if created within 2 hours after the timeout
          if (timeSinceTimeout <= twoHoursInMs) {
            log(`[Timeout Processor] Match ${match.id}: SKIPPED - recently created after timeout (created=${formatInTimezone(matchCreatedAt, timezone)}, timeout=${formatInTimezone(timeoutThreshold, timezone)}, diff=${Math.round(timeSinceTimeout / 1000 / 60)}min)`);
            continue;
          } else {
            log(`[Timeout Processor] Match ${match.id}: Processing despite creation after timeout - too old to skip (created=${formatInTimezone(matchCreatedAt, timezone)}, timeout=${formatInTimezone(timeoutThreshold, timezone)}, diff=${Math.round(timeSinceTimeout / 1000 / 60 / 60)}hrs)`);
          }
        }
        
        // Debug logging with timezone-aware formatting
        log(`[Timeout Processor] Match ${match.id} [${timezone}]: planned=${formatInTimezone(matchDateTime, timezone)}, timeout=${formatInTimezone(timeoutThreshold, timezone)}, now=${formatInTimezone(now, timezone)}, overdue=${now >= timeoutThreshold}`);
        
        // Check if we've passed the timeout threshold
        if (now >= timeoutThreshold) {
          // Skip if already marked as pending DQF (avoid reprocessing)
          if (match.pendingDqf) {
            log(`[Timeout Processor] Match ${match.id}: Already marked as pending DQF, skipping`);
            continue;
          }
          
          // Get check-in records for this match
          const checkInRecords = await storage.getScheduledMatchPlayers(match.id);
          
          // Count how many players checked in per pair
          const pair1CheckIns = checkInRecords.filter(p => p.pairId === match.pair1Id && p.isPresent).length;
          const pair2CheckIns = checkInRecords.filter(p => p.pairId === match.pair2Id && p.isPresent).length;
          
          const pair1Confirmed = pair1CheckIns === 2; // Both players from pair 1 must be present
          const pair2Confirmed = pair2CheckIns === 2; // Both players from pair 2 must be present
          
          log(`[Timeout Processor] Match ${match.id} check-ins: pair1=${pair1CheckIns}/2 (confirmed=${pair1Confirmed}), pair2=${pair2CheckIns}/2 (confirmed=${pair2Confirmed})`);
          
          // CASE 1: Only pair1 present → mark pending DQF (admin decides)
          if (pair1Confirmed && !pair2Confirmed) {
            log(`[Timeout Processor] Match ${match.id}: CASE 1 - Only pair1 present, marking pending DQF`);
            await handlePendingDqf(storage, match, match.pair1Id, broadcastUpdate);
          }
          // CASE 2: Only pair2 present → mark pending DQF (admin decides)
          else if (!pair1Confirmed && pair2Confirmed) {
            log(`[Timeout Processor] Match ${match.id}: CASE 2 - Only pair2 present, marking pending DQF`);
            await handlePendingDqf(storage, match, match.pair2Id, broadcastUpdate);
          }
          // CASE 3: Both pairs present → do nothing (normal game)
          else if (pair1Confirmed && pair2Confirmed) {
            log(`[Timeout Processor] Match ${match.id}: CASE 3 - Both pairs present, no action needed`);
          }
          // CASE 4: Both pairs absent → do nothing (no auto-cancellation)
          else {
            log(`[Timeout Processor] Match ${match.id}: CASE 4 - No pairs fully present, no action taken`);
          }
        }
      }
    } catch (error: any) {
      log(`[Timeout Processor] Error: ${error.message}`);
    }
  };

  const handleCancellation = async (storage: IStorage, match: any, broadcastUpdate: (data: any) => void) => {
    log(`[Timeout Processor] Cancelling match ${match.id} - both pairs absent`);
    
    // Get courtId - use assigned court or get first available court
    let courtId = match.courtId;
    if (!courtId) {
      const courts = await storage.getCourts();
      courtId = courts[0]?.id || 'unknown';
    }
    
    // Create a cancelled match record with no winner
    const cancelledMatch = await storage.createMatch({
      tournamentId: match.tournamentId,
      courtId,
      pair1Id: match.pair1Id,
      pair2Id: match.pair2Id,
      categoryId: match.categoryId,
      format: match.format,
      status: 'finished',
      score: {
        sets: [[0, 0]],
        currentSet: 0,
        currentPoints: [0, 0],
      },
      winnerId: null,
      accessToken: randomUUID(),
      notes: 'Partido cancelado - ambas parejas ausentes',
    });
    
    // Create result record for cancelled match (no winner)
    await storage.createResult({
      matchId: cancelledMatch.id,
      winnerId: null,
      loserId: null,
      score: {
        sets: [[0, 0]],
        currentSet: 0,
        currentPoints: [0, 0],
      },
    });
    
    // Update scheduled match to completed with cancelled outcome
    const updatedMatch = await storage.updateScheduledMatch(match.id, {
      status: 'completed',
      matchId: cancelledMatch.id,
      outcome: 'cancelled',
      outcomeReason: 'PARTIDO CANCELADO - Ambas parejas ausentes',
    });
    
    // Free court if assigned
    if (match.courtId) {
      await storage.updateCourt(match.courtId, { isAvailable: true });
    }
    
    // Broadcast updates
    broadcastUpdate({ type: 'match_cancelled', data: updatedMatch });
    broadcastUpdate({ type: 'match_finished', data: cancelledMatch });
    
    log(`[Timeout Processor] Match ${match.id} cancelled successfully`);
  };

  const handlePendingDqf = async (storage: IStorage, match: any, presentPairId: string, broadcastUpdate: (data: any) => void) => {
    log(`[Timeout Processor] Match ${match.id} marked as pending DQF - present pair: ${presentPairId}`);
    
    // Update scheduled match to mark it as pending DQF
    const updatedMatch = await storage.updateScheduledMatch(match.id, {
      pendingDqf: true,
      defaultWinnerPairId: presentPairId, // Track which pair is present (potential winner)
    });
    
    // Broadcast update so admin UI can show DQF button
    broadcastUpdate({ type: 'match_pending_dqf', data: updatedMatch });
    
    log(`[Timeout Processor] Match ${match.id} marked as pending DQF successfully`);
  };

  const handleDefault = async (storage: IStorage, match: any, winnerPairId: string, broadcastUpdate: (data: any) => void) => {
    const loserPairId = winnerPairId === match.pair1Id ? match.pair2Id : match.pair1Id;
    log(`[Timeout Processor] Match ${match.id} won by default - winner: ${winnerPairId}`);
    
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
      notes: 'Ganado por default - pareja contraria ausente',
    });
    
    // Create result record
    await storage.createResult({
      matchId: createdMatch.id,
      winnerId: winnerPairId,
      loserId: loserPairId,
      score: defaultScore,
    });
    
    // Update scheduled match
    const updatedMatch = await storage.updateScheduledMatch(match.id, {
      status: 'completed',
      matchId: createdMatch.id,
      outcome: 'default',
      outcomeReason: 'PARTIDO GANADO POR DEFAULT',
      defaultWinnerPairId: winnerPairId,
    });
    
    // Free court if assigned
    if (match.courtId) {
      await storage.updateCourt(match.courtId, { isAvailable: true });
    }
    
    // Broadcast updates
    broadcastUpdate({ type: 'match_default_win', data: updatedMatch });
    broadcastUpdate({ type: 'match_finished', data: createdMatch });
    
    log(`[Timeout Processor] Match ${match.id} completed by default successfully`);
  };

  // Start the interval
  log('[Timeout Processor] Starting timeout processor (runs every 60s)');
  const intervalId = setInterval(processTimeouts, INTERVAL_MS);
  
  // Run immediately on startup
  processTimeouts();
  
  return intervalId;
}
