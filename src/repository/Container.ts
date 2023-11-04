import { Container } from "inversify";
import { IEventRepository, SupabaseEventRepository } from "./IEventRepository";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { IAdminDrinksRepository, SupabaseAdminDrinksRepository } from "./IAdminDrinksRepository";
import { IDrinkRepository, SupabaseDrinkRepository } from "./IDrinkRepository";
import { supabase } from "../supabaseClient";

const container = new Container();
container.bind<SupabaseClient<Database>>("SupabaseClient").toDynamicValue(() => supabase);
container.bind<IAdminDrinksRepository>("IAdminDrinksRepository").toDynamicValue(() => new SupabaseAdminDrinksRepository(supabase))
container.bind<IDrinkRepository>("IDrinkRepository").toDynamicValue(() => new SupabaseDrinkRepository(supabase))
container.bind<IEventRepository>("IEventRepository").to(SupabaseEventRepository)

export default container;