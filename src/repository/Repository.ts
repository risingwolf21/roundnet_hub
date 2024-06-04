import {SupabaseClient} from "@supabase/supabase-js";
import {injectable} from "inversify";
import {Database} from "../types/supabase-generated.types";

@injectable()
export abstract class SupabaseRepository {
    client: SupabaseClient<Database>

    constructor(client: SupabaseClient<Database>) {
        this.client = client
    }
}