import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery<{ user: { id: string; username: string; name: string; role: string } }>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
  });

  return {
    user: user?.user,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
  };
}
