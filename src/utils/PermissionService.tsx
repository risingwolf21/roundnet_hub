import { AbilityBuilder, createMongoAbility, MongoQuery, PureAbility } from '@casl/ability';

export type Actions = 'select' | 'insert' | 'update' | 'delete' | 'view';
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
  | [Actions, 'postgres'];

export type AppAbility = PureAbility<Ability, MongoQuery>;

export const ability = createMongoAbility();
export const can = (action: Actions, subject: Ability[1]) => ability.can(action, subject);

export function defineRulesFor(userPermissions: AppPermission[], roles: AppRole[]) {
  const { can, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can('view', 'notifications');
  can('view', 'browse');

  userPermissions.forEach((each: AppPermission) => {
    let split = each.name.split('.');
    can(split[1] as Actions, split[0] as Ability[1]);
  });

  if (
    roles.some((x: AppRole) =>
      ['admin', 'eventModerator', 'userModerator', 'groupModerator', 'drinkModerator', 'challengeModerator'].includes(
        x.name
      )
    )
  ) {
    can('select', 'browseAdmin');
  }

  if (roles.some((x: AppRole) => ['admin'].includes(x.name))) {
    can('view', 'postgres');
  }

  return rules;
}
