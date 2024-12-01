import {createContext, useContext} from "react";
import {UserWithRolesAndPermissions} from "../../types/supabaseTypes";

export const AuthContext = createContext<UserWithRolesAndPermissions>(null!);

// export the useAuth hook
export const useAuth = () => {
    return useContext(AuthContext);
};