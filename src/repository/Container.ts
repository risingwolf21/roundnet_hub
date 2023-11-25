import { Container } from "inversify";
import { IEventRepository, SupabaseEventRepository } from "./IEventRepository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { IAdminDrinksRepository, SupabaseAdminDrinksRepository } from "./IAdminDrinksRepository";
import { IDrinkRepository, SupabaseDrinkRepository } from "./IDrinkRepository";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { IAdminUsersRepository, SupabaseAdminUsersRepository } from "./IAdminUsersRepository";
import { IKeysRepository, SupabaseKeysRepository } from "./IKeysRepository";

const container = new Container();
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);
container.bind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => new SupabaseAdminDrinksRepository(supabase)).inSingletonScope()
container.bind<IAdminUsersRepository>("IAdminUsersRepository").toDynamicValue(() => new SupabaseAdminUsersRepository(supabase)).inSingletonScope()
container.bind<IDrinkRepository>("IDrinkRepository").toDynamicValue(() => new SupabaseDrinkRepository(supabase)).inSingletonScope()
container.bind<IEventRepository>("IEventRepository").toDynamicValue(() => new SupabaseEventRepository(supabase)).inSingletonScope()
container.bind<IKeysRepository>("IKeysRepository").toDynamicValue(() => new SupabaseKeysRepository(supabase)).inSingletonScope()

export default container;