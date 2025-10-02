"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { StateCreator } from "zustand";
import { User } from "@/lib/types";
import { Room } from "@/lib/types";
import api from "@/api/api";
import { logger } from "@/lib/utils";
import { enhancedApiCall } from "@/api/api-helpers";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastFn = (options: ToastOptions) => void;

interface AuthSlice {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, toastFn?: ToastFn) => Promise<boolean>;
  register: (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    toastFn?: ToastFn
  ) => Promise<boolean>;
  logout: (options?: { suppressToast?: boolean; redirect?: boolean; toastFn?: ToastFn; routerPush?: (path: string) => void }) => Promise<void>;
  refreshUser: () => Promise<void>;
  loadUser: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
}

interface RoomSlice {
  rooms: Room[];
  isLoading: boolean;
  fetchRooms: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  findRoomById: (id: string) => Room | undefined;
}

interface SelectedRoomSlice {
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
}

type AppState = AuthSlice & RoomSlice & SelectedRoomSlice;

const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setUser: (user: User | null) => set({ 
    user, 
    isAuthenticated: !!user 
  }),

  loadUser: async () => {
    logger.log("🔍 Loading user session...");
    set({ isLoading: true });

    const { success, data } = await enhancedApiCall({
      apiCall: api.auth.getProfile(),
      errorContext: "auth-profile-initial",
      suppressErrorToast: true,
    });

    if (success && data?.success) {
      set({ user: data.user, isAuthenticated: true });
      logger.log("✅ User session loaded successfully");
    } else {
      set({ user: null, isAuthenticated: false });
    }
    set({ isLoading: false });
  },

  logout: async (options?: { suppressToast?: boolean; redirect?: boolean; toastFn?: ToastFn; routerPush?: (path: string) => void }) => {
    const { suppressToast = false, redirect = true, toastFn, routerPush } = options || {};

    try {
      const { success } = await enhancedApiCall({
        apiCall: api.auth.logout(),
        errorContext: "auth-logout",
        suppressErrorToast: true,
      });

      if (success && !suppressToast && toastFn) {
        toastFn({
          title: "Logged out",
          description: "You have been logged out successfully.",
        });
      }
    } catch (error) {
      logger.warn("Logout API call failed, but proceeding with local cleanup", error);
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (redirect && routerPush) {
        routerPush("/login");
      }
    }
  },

  refreshUser: async () => {
    logger.log("🔄 Refreshing user data...");
    const { success, data } = await enhancedApiCall({
      apiCall: api.auth.getProfile(),
      errorContext: "auth-refresh-profile",
      suppressErrorToast: true,
    });

    if (success && data?.success) {
      set({ user: data.user, isAuthenticated: true });
    }
  },

  login: async (email: string, password: string, toastFn?: ToastFn): Promise<boolean> => {
    set({ isLoading: true });
    try {
      const { success, data } = await enhancedApiCall({
        apiCall: api.auth.login({ email, password }),
        toast: toastFn,
        errorContext: "auth-login",
      });

      if (success && data?.success) {
        set({ user: data.user, isAuthenticated: true });
        logger.log("✅ Login successful");
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Login failed:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    toastFn?: ToastFn
  ): Promise<boolean> => {
    set({ isLoading: true });
    try {
      const { success, data } = await enhancedApiCall({
        apiCall: api.auth.register({ username, firstName, lastName, email, password }),
        toast: toastFn,
        errorContext: "auth-register",
      });

      if (success && data?.success) {
        set({ user: data.user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Registration failed:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
});

const createRoomSlice: StateCreator<AppState, [], [], RoomSlice> = (set, get) => ({
  rooms: [],
  isLoading: false,

  fetchRooms: async () => {
    const { user } = get();
    if (!user) {
      set({ rooms: [], isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { success, data } = await enhancedApiCall<{ rooms: Room[] }>({
        apiCall: api.message.getRooms(),
        errorContext: 'rooms-fetch',
        suppressErrorToast: true,
      });

      if (success && data && Array.isArray(data.rooms)) {
        set({ rooms: data.rooms });
      } else {
        console.warn("API response for rooms did not contain a 'rooms' array:", data);
        set({ rooms: [] });
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      set({ rooms: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshRooms: async () => {
    await get().fetchRooms();
  },

  findRoomById: (id: string) => {
    return get().rooms.find((room) => room.id === id);
  },
});

const createSelectedRoomSlice: StateCreator<AppState, [], [], SelectedRoomSlice> = (set) => ({
  selectedRoomId: null,

  setSelectedRoomId: (id: string | null) => set({ selectedRoomId: id }),
});

const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createRoomSlice(...a),
      ...createSelectedRoomSlice(...a),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, rooms: state.rooms }),
    }
  )
);

export default useAppStore;
