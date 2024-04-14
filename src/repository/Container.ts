import {SupabaseClient} from "@supabase/supabase-js";
import {Container} from "inversify";
import {supabase, supabaseAdmin} from "src/components/services/supabase/supabaseClient";
import {Database} from "../types/supabase";
import {IAdminDrinksRepository, SupabaseAdminDrinksRepository} from "./IAdminDrinksRepository";
import {IAdminUsersRepository, SupabaseAdminUsersRepository} from "./IAdminUsersRepository";

const container = new Container();
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);

container.bind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => new SupabaseAdminDrinksRepository(supabaseAdmin)).inSingletonScope()
// container.bind<IAdminDrinksRepository>("EmptyAdminDrinksRepository").toDynamicValue(() => new EmptyAdminDrinksRepository()).inSingletonScope()

container.bind<IAdminUsersRepository>("IAdminUsersRepository").toDynamicValue(() => new SupabaseAdminUsersRepository(supabaseAdmin)).inSingletonScope()
// container.bind<IAdminUsersRepository>("EmptyAdminUsersRepository").toDynamicValue(() => new EmptyAdminUsersRepository()).inSingletonScope()

export default container;