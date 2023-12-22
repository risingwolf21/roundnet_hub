import { Permissions, User, UserRole } from "src/types/supabaseTypes";
import { AbilityBuilder, AbilityTuple, AnyAbility, MongoAbility, MongoQuery, PureAbility, SubjectType, createMongoAbility } from '@casl/ability';
import { createContext } from 'react';
import { createContextualCan } from '@casl/react';


type Actions = 'use' | 'edit' | 'delete' | 'view'
export type AbilityType = 'drink' | 'training' | 'payments' | 'user' | 'groups' | 'keyFinder' | 'history' | 'notifications'
type Ability =
    | [Actions, AbilityType]
    | [Actions, AbilityType]
    | [Actions, AbilityType]
    | [Actions, AbilityType]
    | [Actions, AbilityType]
    | [Actions, AbilityType]

const permissionsArray: Permissions[] = [
    "use;drink",
    "edit;drink",
    "delete;drink",
    "view;drink",
    "use;training",
    "edit;training",
    "delete;training",
    "view;training",
    "edit;groups",
    "delete;groups",
    "view;groups",
    "edit;payments",
    "use;user",
    "delete;user",
    "view;user",
    "edit;user",
    "view;keyFinder",
    "edit;keyFinder",
    "delete;keyFinder"
];

export type AppAbility = PureAbility<Ability, MongoQuery>

export const AbilityContext = createContext<MongoAbility<AbilityTuple, MongoQuery>>(new PureAbility());
export const Can = createContextualCan(AbilityContext.Consumer);

export function defineAbilityFor(permissions: Permissions[], role: UserRole | null) {
    const { can, cannot, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);


    permissionsArray.filter(x => !permissions.includes(x)).forEach(each => {
        var split = each.split(";");
        cannot(split[0] as Actions, split[1] as AbilityType);
    });

    can("view", "payments");
    can("view", "history");

    // permissions.forEach(each => {
    //     var split = each.split(";");
    //     can(split[0] as Actions, split[1] as AbilityType);
    // });

    return createMongoAbility(rules);
};