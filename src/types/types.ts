import {SupabaseClient} from "@supabase/supabase-js"
import {User} from "./supabaseTypes"

export type ClientUser = {
    client: SupabaseClient,
    user: User
}

export type BottomNavigationItem = "training" | "drinks" | "challenges";