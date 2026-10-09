"use  client"

import { createContext, useContext } from "react";
import { MeResponse } from "@/lib/api";

export const AuthContext =
    createContext<MeResponse | null>(null);

export  function useAuth() {
    return useContext(AuthContext);
}