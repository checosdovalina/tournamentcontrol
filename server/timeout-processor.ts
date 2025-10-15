import { log } from "./vite";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";

export function startTimeoutProcessor(storage: IStorage, broadcastUpdate: (data: any) => void) {
  // Run check every minute
  const INTERVAL_MS = 60 * 1000; // 60 seconds
  const TOLERANCE_MINUTES = 15;

  const processTimeouts = async () => {
    try {
      const now = new Date();
      
      // Get all scheduled matches that might be overdue
      const allMatches = await storage.getAllScheduledMatches();
      
      for (const match of allMatches) {
        // Skip if already completed, cancelled, or playing
        if (match.status === 'completed' || match.status === 'cancelled' || match.status === 'playing') {
          continue;
        }
        
        // Skip if no planned time
        if (!match.plannedTime) {
          continue;
        }
        
        // Extract date from match.day preserving the calendar date
        let matchDayStr: string;
        if (typeof match.day === 'string') {
          matchDayStr = match.day.slice(0, 10);
        } else if (match.day instanceof Date) {
          matchDayStr = match.day.toISOString().slice(0, 10);
        } else {
          matchDayStr = String(match.day).slice(0, 10);
        }
        
        const [hours, minutes] = match.plannedTime.split(':').map(Number);
        
        // Create match datetime in local timezone
        const matchDateTime = new Date(`${matchDayStr}T${match.plannedTime}:00`);
        
        const timeoutThreshold = new Date(matchDateTime.getTime() + TOLERANCE_MINUTES * 60 * 1000);
        
        // Debug logging
        log(`[Timeout Processor] Match ${match.id}: planned=${matchDateTime.toLocaleString()}, timeout=${timeoutThreshold.toLocaleString()}, now=${now.toLocaleString()}, overdue=${now >= timeoutThreshold}`);
        
        // Check if we've passed the timeout threshold
        if (now >= timeoutThreshold) {
          // Get check-in records for this match
          const checkInRecords = await storage.getScheduledMatchPlayers(match.id);
          
          // Count how many players checked in per pair
          const pair1CheckIns = checkInRecords.filter(p => p.pairId === match.pair1Id && p.isPresent).length;
          const pair2CheckIns = checkInRecords.filter(p => p.pairId === match.pair2Id && p.isPresent).length;
          
          const pair1Confirmed = pair1CheckIns >= 1; // At least 1 player from pair 1
          const pair2Confirmed = pair2CheckIns >= 1; // At least 1 player from pair 2
          
          // CASE 1: Both pairs absent → CANCELLED
          if (!pair1Confirmed && !pair2Confirmed) {
            await handleCancellation(storage, match, broadcastUpdate);
          }
          // CASE 2: Only pair1 present → pair1 wins by default
          else if (pair1Confirmed && !pair2Confirmed) {
            await handleDefault(storage, match, match.pair1Id, broadcastUpdate);
          }
          // CASE 3: Only pair2 present → pair2 wins by default
          else if (!pair1Confirmed && pair2Confirmed) {
            await handleDefault(storage, match, match.pair2Id, broadcastUpdate);
          }
          // CASE 4: Both pairs present → do nothing (normal game)
        }
      }
    } catch (error: any) {
      log(`[Timeout Processor] Error: ${error.message}`);
    }
  };

  const handleCancellation = async (storage: IStorage, match: any, broadcastUpdate: (data: any) => void) => {
    log(`[Timeout Processor] Cancelling match ${match.id} - both pairs absent`);
    
    // Update scheduled match to cancelled
    const updatedMatch = await storage.updateScheduledMatch(match.id, {
      status: 'cancelled',
      outcome: 'cancelled',
      outcomeReason: 'PARTIDO CANCELADO - Ambas parejas ausentes',
    });
    
    // Free court if assigned
    if (match.courtId) {
      await storage.updateCourt(match.courtId, { isAvailable: true });
    }
    
    // Broadcast update
    broadcastUpdate({ type: 'match_cancelled', data: updatedMatch });
    
    log(`[Timeout Processor] Match ${match.id} cancelled successfully`);
  };

  const handleDefault = async (storage: IStorage, match: any, winnerPairId: string, broadcastUpdate: (data: any) => void) => {
    const loserPairId = winnerPairId === match.pair1Id ? match.pair2Id : match.pair1Id;
    log(`[Timeout Processor] Match ${match.id} won by default - winner: ${winnerPairId}`);
    
    // Create default score: 6-3, 6-3
    const defaultScore = {
      sets: winnerPairId === match.pair1Id ? [[6, 3], [6, 3]] : [[3, 6], [3, 6]],
      currentSet: 3,
      currentPoints: [0, 0],
    };
    
    // Create match record with finished status
    const createdMatch = await storage.createMatch({
      tournamentId: match.tournamentId,
      courtId: match.courtId || '', // Should have court assigned
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
