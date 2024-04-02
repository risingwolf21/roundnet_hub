import {SupabaseClient} from "@supabase/supabase-js";
import {injectable} from "inversify";
import {Database} from "src/types/supabase";

@injectable()
export abstract class SupabaseRepository {
    client: SupabaseClient<Database>

    constructor(client: SupabaseClient<Database>) {
        this.client = client
    }
}