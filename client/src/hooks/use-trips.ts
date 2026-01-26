import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type CreateTripRequest } from "@shared/routes";

export function useTrips() {
  return useQuery({
    queryKey: [api.trips.list.path],
    queryFn: async () => {
      const res = await fetch(api.trips.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trips");
      return api.trips.list.responses[200].parse(await res.json());
    },
  });
}

export function useUserTrips(userId: string | undefined) {
  return useQuery({
    queryKey: ['/api/trips/user', userId],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/trips/user/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user trips");
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTripRequest) => {
      const validated = api.trips.create.input.parse(data);
      const res = await fetch(api.trips.create.path, {
        method: api.trips.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create trip");
      return api.trips.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trips.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips/user'] });
    },
  });
}

interface UpdateTripDetailsInput {
  tripId: number;
  activities?: string[];
  houseRental?: number;
  taxiRides?: number;
  boatTrips?: number;
  cookingMeals?: number;
  boardRental?: number;
  photographer?: number;
}

export function useUpdateTripActivities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tripId, activities, houseRental, taxiRides, boatTrips, cookingMeals, boardRental, photographer }: UpdateTripDetailsInput) => {
      const res = await fetch(`/api/trips/${tripId}/details`, {
        method: 'PATCH',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          activities, 
          houseRental, 
          taxiRides, 
          boatTrips, 
          cookingMeals, 
          boardRental,
          photographer 
        }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update trip details");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.trips.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/trips/user'] });
    },
  });
}
