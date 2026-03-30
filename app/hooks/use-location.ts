import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AppLocation {
  label: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface LocationState extends AppLocation {
  isDetecting: boolean;
  setLocation: (loc: AppLocation) => void;
  detectLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      label: "Select Location",
      address: "Tap to set your delivery location",
      isDetecting: false,
      setLocation: (loc) => set({ ...loc }),
      detectLocation: async () => {
        set({ isDetecting: true });
        try {
          if (!navigator.geolocation) throw new Error("Geolocation not supported");
          
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
          });
          
          const { latitude, longitude } = pos.coords;
          
          // In a real app we'd reverse-geocode here. using dummy string for now.
          set({
            label: "Current Location",
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, // Mock reverse geocoding
            lat: latitude,
            lng: longitude,
            isDetecting: false
          });
        } catch (error) {
          console.error("Location detection failed:", error);
          set({ isDetecting: false });
        }
      },
    }),
    {
      name: "dfd-location-storage",
      partialize: (state) => ({ 
        label: state.label, 
        address: state.address, 
        lat: state.lat, 
        lng: state.lng 
      }),
    }
  )
);
