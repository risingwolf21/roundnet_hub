import { SupabaseClient } from "@supabase/supabase-js";
import { inject } from "inversify";
import { Database } from "../types/supabase";

export abstract class SupabaseRepository {
    @inject("SupabaseClient")
    client: SupabaseClient<Database> | undefined
}