import React, { createContext, useContext, useState, useEffect } from "react";
import { useGetMe, useLogin, useLogout, User, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (args: Parameters<ReturnType<typeof useLogin>["mutateAsync"]>[0]) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { data: serverUser, isLoading: isUserLoading } = useGetMe();
  const [localUser, setLocalUser] = useState<User | null | undefined>(undefined);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (!isUserLoading) {
      setLocalUser(serverUser ?? null);
    }
  }, [serverUser, isUserLoading]);

  const login = async (args: Parameters<typeof loginMutation.mutateAsync>[0]) => {
    const res = await loginMutation.mutateAsync(args);
    await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    return res;
  };

  const logout = async () => {
    const res = await logoutMutation.mutateAsync();
    setLocalUser(null);
    qc.removeQueries({ queryKey: getGetMeQueryKey() });
    return res;
  };

  const isLoading = localUser === undefined;

  return (
    <AuthContext.Provider
      value={{
        user: localUser ?? null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
