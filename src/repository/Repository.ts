import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { injectable } from "inversify";

@injectable()
export abstract class SupabaseRepository {
    client: SupabaseClient<Database>

    constructor(client: SupabaseClient<Database>) {
        this.client = client
    }
}