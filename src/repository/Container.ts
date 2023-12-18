import { IEventRepository, SupabaseEventRepository } from "./IEventRepository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { IDrinkRepository, SupabaseDrinkRepository } from "./IDrinkRepository";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { IKeysRepository, SupabaseKeysRepository } from "./IKeysRepository";
import { Container } from "inversify";
import { defineAbilityFor } from "src/utils/PermissionService";
import { AbilityTuple, MongoAbility, MongoQuery } from "@casl/ability";

const container = new Container();
container.bind<MongoAbility<AbilityTuple, MongoQuery>>("Ability").toDynamicValue(() => defineAbilityFor([]));
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);
container.bind<IDrinkRepository>("IDrinkRepository").toDynamicValue(() => new SupabaseDrinkRepository(supabase)).inSingletonScope()
container.bind<IEventRepository>("IEventRepository").toDynamicValue(() => new SupabaseEventRepository(supabase)).inSingletonScope()
container.bind<IKeysRepository>("IKeysRepository").toDynamicValue(() => new SupabaseKeysRepository(supabase)).inSingletonScope()

export default container;