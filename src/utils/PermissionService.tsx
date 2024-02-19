import {AbilityBuilder, createMongoAbility, MongoQuery, PureAbility} from '@casl/ability';
import {Permissions, User} from "src/types/supabaseTypes";


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
    | [Actions, 'eventComments']

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

export const ability = createMongoAbility();
export const can = (action: Actions, subject: Ability[1]) => ability.can(action, subject);

export function defineRulesFor(user: User | null) {
    const { can, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (!user)
        return [];

    can("view", "payments");
    can("view", "history");
    can("view", "browse");
    can("view", "notifications");

    if (user.permissions) {
        user.permissions.forEach((each: Permissions) => {
            let split = each.split(";");
            can(split[0] as Actions, split[1] as Ability[1]);
        });
    }

    if (can("edit", "groups") || can("edit", "drink") || can("edit", "payments") || can("edit", "user")) {
        can("view", "browseAdmin");
    }

    return rules;
}