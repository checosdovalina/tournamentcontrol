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
            case "match_updated":
              queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting"] });
              break;
            case "result_recorded":
              queryClient.invalidateQueries({ queryKey: ["/api/results/recent"] });
              queryClient.invalidateQueries({ queryKey: ["/api/matches/current"] });
              queryClient.invalidateQueries({ queryKey: ["/api/courts"] });
              queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
              break;
            case "pair_registered":
            case "pair_updated":
              queryClient.invalidateQueries({ queryKey: ["/api/pairs/waiting"] });
              break;
            case "court_created":
            case "court_updated":
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
