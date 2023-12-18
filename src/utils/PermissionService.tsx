import { Permissions, User } from "src/types/supabaseTypes";
import { AbilityBuilder, MongoQuery, PureAbility, createMongoAbility } from '@casl/ability';

export interface IPermissionService {
    canViewDrinks(): boolean;

    canViewTraining(): boolean;

    canViewPayment(): boolean;

    canViewHistory(): boolean;

    canViewKeyFinder(): boolean;

    canViewAccount(): boolean;

    canViewAdminHistory(): boolean;

    canViewUserList(): boolean;

    canEditUser(): boolean;

    canDeleteUser(): boolean;

    canDeleteDrink(): boolean;

    canEditDrink(): boolean;

    canConfirmPayment(): boolean;
}

export class EmptyPermissionService implements IPermissionService {
    canViewDrinks(): boolean {
        return false;
    }
    canViewTraining(): boolean {
        return false;
    }
    canViewPayment(): boolean {
        return false;
    }
    canViewHistory(): boolean {
        return false;
    }
    canViewKeyFinder(): boolean {
        return false;
    }
    canViewAccount(): boolean {
        return false;
    }
    canViewAdminHistory(): boolean {
        return false;
    }
    canViewUserList(): boolean {
        return false;
    }
    canEditUser(): boolean {
        return false;
    }
    canDeleteUser(): boolean {
        return false;
    }
    canDeleteDrink(): boolean {
        return false;
    }
    canEditDrink(): boolean {
        return false;
    }
    canConfirmPayment(): boolean {
        return false;
    }

}

export class SupabasePermissionService implements IPermissionService {

    user: User

    constructor(user: User) {
        this.user = user;
    }

    canViewDrinks(): boolean {
        return false;
    }
    canViewTraining(): boolean {
        return false;
    }
    canViewPayment(): boolean {
        return false;
    }
    canViewHistory(): boolean {
        return false;
    }
    canViewKeyFinder(): boolean {
        return false;
    }
    canViewAccount(): boolean {
        return false;
    }
    canViewAdminHistory(): boolean {
        return false;
    }
    canViewUserList(): boolean {
        return false;
    }
    canEditUser(): boolean {
        return false;
    }
    canDeleteUser(): boolean {
        return false;
    }
    canDeleteDrink(): boolean {
        return false;
    }
    canEditDrink(): boolean {
        return false;
    }
    canConfirmPayment(): boolean {
        return false;
    }
}

export function defineAbilityFor(permissions: Permissions[]) {
    const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

    if (permissions.includes("canAddDrinks"))
        can("add", "drinks");
    if (permissions.includes("canAddTraining"))
        can("add", "training");
    if (permissions.includes("canConfirmPayment"))
        can("confirm", "payments");
    if (permissions.includes("canCreateGroup"))
        can("create", "group");
    if (permissions.includes("canDeleteDrinks"))
        can("delete", "drinks");
    if (permissions.includes("canDeleteTraining"))
        can("delete", "training");
    if (permissions.includes("canEditDrinks"))
        can("edit", "drinks");
    if (permissions.includes("canEditGroup"))
        can("edit", "group");
    if (permissions.includes("canEditTraining"))
        can("edit", "training");
    if (permissions.includes("canEditUsers"))
        can("edit", "users");
    if (permissions.includes("canViewCompleteHistory"))
        can("view", "completeHistory");
    if (permissions.includes("canViewDrinks"))
        can("view", "drinks");

    return build()
};