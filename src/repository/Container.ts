import { IEventRepository, SupabaseEventRepository } from "./IEventRepository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { IDrinkRepository, SupabaseDrinkRepository } from "./IDrinkRepository";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { IKeysRepository, SupabaseKeysRepository } from "./IKeysRepository";
import { Container } from "inversify";

const container = new Container();
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);
container.bind<IDrinkRepository>("IDrinkRepository").toDynamicValue(() => new SupabaseDrinkRepository(supabase)).inSingletonScope()
container.bind<IEventRepository>("IEventRepository").toDynamicValue(() => new SupabaseEventRepository(supabase)).inSingletonScope()
container.bind<IKeysRepository>("IKeysRepository").toDynamicValue(() => new SupabaseKeysRepository(supabase)).inSingletonScope()

export default container;