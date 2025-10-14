import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

export function useWebSocket(userId?: string) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        if (userId) {
          ws.send(JSON.stringify({ type: "auth", userId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle real-time updates
          switch (message.type) {
            case "match_started":
              queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting"] });
              queryClient.invalidateQueries({ 
                predicate: (query) => query.queryKey[0] === "/api/scheduled-matches/ready"
              });
              break;
            case "match_updated":
            case "score_updated":
              queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting"] });
              break;
            case "match_finished":
            case "result_recorded":
              queryClient.invalidateQueries({ queryKey: ["/api/results/recent"] });
              queryClient.invalidateQueries({ queryKey: ["/api/results/today"] });
              queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/day"] });
              queryClient.invalidateQueries({ queryKey: ["/api/scheduled-matches/today"] });
              break;
            case "pair_registered":
            case "pair_updated":
            case "pair_deleted":
              queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting"] });
              queryClient.invalidateQueries({ queryKey: ["/api/pairs"] });
              break;
            case "court_created":
            case "court_updated":
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              break;
            case "scheduled_match_created":
            case "scheduled_match_updated":
            case "scheduled_match_deleted":
            case "player_checked_in":
            case "player_checked_out":
            case "court_auto_assigned":
            case "court_manually_assigned":
              queryClient.invalidateQueries({ 
                predicate: (query) => 
                  query.queryKey[0] === "/api/scheduled-matches" ||
                  query.queryKey[0] === "/api/scheduled-matches/day" ||
                  query.queryKey[0] === "/api/scheduled-matches/today" ||
                  query.queryKey[0] === "/api/scheduled-matches/ready"
              });
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              break;
            default:
              console.log("WebSocket message:", message);
          }
        } catch (error) {
          console.error("WebSocket message parse error:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [userId]);

  return wsRef.current;
}
