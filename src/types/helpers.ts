import { Database } from './supabase-generated.types';

type Schemas = keyof Database;
type TablesMap<S extends Schemas> = Database[S] extends { Tables: Record<string, any> } ? Database[S]['Tables'] : never;

type PublicTables = keyof TablesMap<'public'> & string;
type TablesInSchema<S extends Schemas> = keyof TablesMap<S> & string;

type RowOf<S extends Schemas, T extends TablesInSchema<S>> = TablesMap<S>[T] extends { Row: infer R } ? R : never;
type InsertOf<S extends Schemas, T extends TablesInSchema<S>> = TablesMap<S>[T] extends { Insert: infer I } ? I : never;
type UpdateOf<S extends Schemas, T extends TablesInSchema<S>> = TablesMap<S>[T] extends { Update: infer U } ? U : never;

/**
 * Default = public wenn nur ein Generic übergeben wird:
 * Tables<'user'>                -> public.user
 * Tables<'notifications','notifications'>
 */
export type Tables<A extends string, B extends string = never> = [B] extends [never]
  ? A extends PublicTables
    ? RowOf<'public', A>
    : never
  : A extends Schemas
    ? B extends TablesInSchema<A>
      ? RowOf<A, B>
      : never
    : never;

export type TablesInsert<A extends string, B extends string = never> = [B] extends [never]
  ? A extends PublicTables
    ? InsertOf<'public', A>
    : never
  : A extends Schemas
    ? B extends TablesInSchema<A>
      ? InsertOf<A, B>
      : never
    : never;

export type TablesUpdate<A extends string, B extends string = never> = [B] extends [never]
  ? A extends PublicTables
    ? UpdateOf<'public', A>
    : never
  : A extends Schemas
    ? B extends TablesInSchema<A>
      ? UpdateOf<A, B>
      : never
    : never;
