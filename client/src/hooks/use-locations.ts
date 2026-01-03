import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useLocations() {
  return useQuery({
    queryKey: [api.locations.list.path],
    queryFn: async () => {
      const res = await fetch(api.locations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch locations");
      return api.locations.list.responses[200].parse(await res.json());
    },
  });
}

export function useLocation(id: number) {
  return useQuery({
    queryKey: [api.locations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.locations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch location");
      return api.locations.get.responses[200].parse(await res.json());
    },
  });
}

export function useFavoriteLocations() {
  return useQuery<any[]>({
    queryKey: ["/api/locations/favorites"],
  });
}

export function useToggleFavorite() {
  return useMutation({
    mutationFn: async (locationId: number) => {
      await apiRequest("POST", `/api/locations/${locationId}/favorite`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations/favorites"] });
    },
  });
}
