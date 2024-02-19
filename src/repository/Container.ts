import {SupabaseClient} from "@supabase/supabase-js";
import {Container} from "inversify";
import {supabase, supabaseAdmin} from "src/components/services/supabase/supabaseClient";
import {Database} from "../types/supabase";
import {IDrinkRepository, SupabaseDrinkRepository} from "./IDrinkRepository";
import {IEventRepository, SupabaseEventRepository} from "./IEventRepository";
import {IKeysRepository, SupabaseKeysRepository} from "./IKeysRepository";
import {IUserRepository, SupabaseUserRepository} from "./IUserRepository";
import {ISentryRepository, SentryRepository} from "./ISentryRepository";
import {IGroupsRepository, SupabaseGroupsRepository} from "./IGroupsRepository";
import {IAdminDrinksRepository, SupabaseAdminDrinksRepository} from "./IAdminDrinksRepository";
import {IAdminUsersRepository, SupabaseAdminUsersRepository} from "./IAdminUsersRepository";

const container = new Container();
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);

container.bind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => new SupabaseAdminDrinksRepository(supabaseAdmin)).inSingletonScope()
// container.bind<IAdminDrinksRepository>("EmptyAdminDrinksRepository").toDynamicValue(() => new EmptyAdminDrinksRepository()).inSingletonScope()

container.bind<IAdminUsersRepository>("IAdminUsersRepository").toDynamicValue(() => new SupabaseAdminUsersRepository(supabaseAdmin)).inSingletonScope()
// container.bind<IAdminUsersRepository>("EmptyAdminUsersRepository").toDynamicValue(() => new EmptyAdminUsersRepository()).inSingletonScope()

container.bind<IDrinkRepository>("IDrinkRepository").toDynamicValue(() => new SupabaseDrinkRepository(supabase)).inSingletonScope()
container.bind<IEventRepository>("IEventRepository").toDynamicValue(() => new SupabaseEventRepository(supabase)).inSingletonScope()
container.bind<IKeysRepository>("IKeysRepository").toDynamicValue(() => new SupabaseKeysRepository(supabase)).inSingletonScope()
container.bind<IUserRepository>("IUserRepository").toDynamicValue(() => new SupabaseUserRepository(supabase)).inSingletonScope()
container.bind<IGroupsRepository>("IGroupsRepository").toDynamicValue(() => new SupabaseGroupsRepository(supabase)).inSingletonScope()
container.bind<ISentryRepository>("ISentryRepository").toDynamicValue(() => new SentryRepository()).inSingletonScope()

export default container;