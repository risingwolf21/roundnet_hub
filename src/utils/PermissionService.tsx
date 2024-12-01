import {AbilityBuilder, createMongoAbility, MongoQuery, PureAbility} from '@casl/ability';

export type Actions = 'select' | 'insert' | 'update' | 'delete'
export type Ability =
    | [Actions, 'event']
    | [Actions, 'drink']
    | [Actions, 'payments']
    | [Actions, 'challenge']
    | [Actions, 'group']
    | [Actions, 'item']
    | [Actions, 'user']
    | [Actions, 'eventComments']

    | [Actions, 'history']
    | [Actions, 'notifications']
    | [Actions, 'browse']
    | [Actions, 'browseAdmin']

export type AppAbility = PureAbility<Ability, MongoQuery>

export const ability = createMongoAbility();
export const can = (action: Actions, subject: Ability[1]) => ability.can(action, subject);

export function defineRulesFor(userPermissions: AppPermission[]) {
    const {can, rules} = new AbilityBuilder<AppAbility>(createMongoAbility);

    can("select", "payments");

    userPermissions.forEach((each: AppPermission) => {
        let split = each.split(".");
        can(split[1] as Actions, split[0] as Ability[1]);
    });

    if (userPermissions.some((x: AppPermission) => ["event.update"
        , "event.insert"
        , "event.delete"
        , "drink.update"
        , "drink.insert"
        , "drink.delete"
        , "group.update"
        , "group.insert"
        , "group.delete"
        , "challenge.update"
        , "challenge.insert"
        , "challenge.delete"
        , "payments.update"
        , "payments.insert"
        , "payments.delete"
        , "item.update"
        , "item.insert"
        , "item.delete"].includes(x))) {
        can("select", "browseAdmin");
    }

    return rules;
}