import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "../stores/auth.store";

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      user: state.user,
      appUser: state.appUser,
      loading: state.loading,
    })),
  );
}
