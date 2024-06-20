import {SupabaseClient} from "@supabase/supabase-js";
import {Container} from "inversify";
import {supabase} from "src/components/services/supabase/supabaseClient";
import {Database} from "../types/supabase-generated.types";

const container = new Container();
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);

export default container;