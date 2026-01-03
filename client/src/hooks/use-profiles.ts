import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateProfileRequest, type UpdateProfileRequest } from "@shared/routes";

export function useMyProfile() {
  return useQuery({
    queryKey: [api.profiles.me.path],
    queryFn: async () => {
      const res = await fetch(api.profiles.me.path, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profiles.me.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const validated = api.profiles.update.input.parse(data);
      const res = await fetch(api.profiles.update.path, {
        method: api.profiles.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return api.profiles.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.profiles.me.path] }),
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: [api.profiles.list.path],
    queryFn: async () => {
      const res = await fetch(api.profiles.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return api.profiles.list.responses[200].parse(await res.json());
    },
  });
}

export function useProfile(id: number) {
  return useQuery({
    queryKey: [api.profiles.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.profiles.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profiles.get.responses[200].parse(await res.json());
    },
  });
}

export function useSwipe() {
  return useMutation({
    mutationFn: async (data: { swipedId: string; direction: 'left' | 'right' }) => {
      const validated = api.swipes.create.input.parse(data);
      const res = await fetch(api.swipes.create.path, {
        method: api.swipes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          const error = await res.json();
          if (error.code === 'LIMIT_REACHED') {
            throw new Error('LIMIT_REACHED');
          }
        }
        throw new Error("Failed to swipe");
      }
      
      return api.swipes.create.responses[201].parse(await res.json());
    },
  });
}

export function useUpgradePremium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.premium.upgrade.path, {
        method: api.premium.upgrade.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upgrade");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.profiles.me.path] }),
  });
}
