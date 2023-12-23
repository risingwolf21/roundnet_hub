import { Permissions, User, UserRole } from "src/types/supabaseTypes";
import { AbilityBuilder, AbilityTuple, AnyAbility, MongoAbility, MongoQuery, PureAbility, SubjectType, createMongoAbility } from '@casl/ability';
import { createContext } from 'react';
import { createContextualCan, useAbility } from '@casl/react';


export type Actions = 'use' | 'edit' | 'delete' | 'view'
export type Ability =
    | [Actions, 'drink']
    | [Actions, 'training']
    | [Actions, 'payments']
    | [Actions, 'user']
    | [Actions, 'groups']
    | [Actions, 'keyFinder']
    | [Actions, 'history']
    | [Actions, 'notifications']
    | [Actions, 'browse']
    | [Actions, 'browseAdmin']

export const allPermissions: Permissions[] = [
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

export const userPermissions: Permissions[] = [
    "use;drink",
    "view;drink",
    "use;training",
    "view;training",
    "view;groups",
    "use;user",
    "view;user",
    "view;keyFinder"
]

export const financePermissions: Permissions[] = [...userPermissions, "edit;payments"];
export const procurePermissions: Permissions[] = [...userPermissions, "edit;drink", "delete;drink"];
export const trainerPermissions: Permissions[] = [...userPermissions, "edit;training", "delete;training", "edit;groups"];

export type AppAbility = PureAbility<Ability, MongoQuery>

export const AbilityContext = createContext<MongoAbility<Ability, MongoQuery>>((null as unknown) as AppAbility);
export const Can = createContextualCan(AbilityContext.Consumer);
export const useAppAbility = () => {
    const ability = useAbility(AbilityContext);

    ability.can = ability.can.bind(ability);
    ability.cannot = ability.cannot.bind(ability);

    return ability;
}

export function defineAbilityFor(permissions: Permissions[], role: UserRole | null) {
    const { can, cannot, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);

    allPermissions.filter(x => !permissions.includes(x)).forEach(each => {
        var split = each.split(";");
        cannot(split[0] as Actions, split[0] as Ability[1]);
    });

    if (role) {
        can("view", "payments");
        can("view", "history");
        can("view", "browse");
    }
    if (role !== "user") {
        can("view", "browseAdmin");
    }

    permissions.forEach(each => {
        var split = each.split(";");
        can(split[0] as Actions, split[1] as Ability[1]);
    });

    return createMongoAbility<Ability, MongoQuery>(rules);
};