import { SupabaseClient } from "@supabase/supabase-js";
import { inject, injectable } from "inversify";
import { Database } from "../types/supabase";

@injectable()
export abstract class SupabaseRepository {
    @inject("SupabaseClient")
    client: SupabaseClient<Database> | undefined
}