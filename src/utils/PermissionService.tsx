import { User } from "src/types/supabaseTypes";

interface AdminPaymentPermissionService {
    canViewManagePayments(): boolean;

    canMarkPaymentAsDone(): boolean;
}

interface AdminDrinkPermissionService {
    canViewManageDrinks(): boolean;

    canDeleteDrink(): boolean;

    canEditDrink(): boolean;

    canEditDrinkName(): boolean;

    canEditDrinkPrice(): boolean;

    canEditDrinkStock(): boolean;

    canEditDrinkImage(): boolean;

    canEditDrinkActive(): boolean;
}

interface AdminUserPermissionService {

    canViewUserList(): boolean;

    canEditUser(): boolean;

    canEditUserDisplayName(): boolean;

    canEditUserVerification(): boolean;

    canEditUserRole(): boolean;

    canDeleteUser(): boolean;
}

interface AdminHistoryPermissionService {

    canViewAdminHistory(): boolean;
}

interface ApplicationPermissionService {
    canViewDrinks(): boolean;

    canViewTraining(): boolean;

    canViewPayment(): boolean;

    canViewHistory(): boolean;

    canViewKeyFinder(): boolean;

    canViewAccount(): boolean;
}

class PermissionService implements ApplicationPermissionService, AdminDrinkPermissionService, AdminHistoryPermissionService, AdminPaymentPermissionService, AdminUserPermissionService {

    user: User

    constructor(user: User){
        this.user = user;
    }

    canViewManageDrinks(): boolean {
        throw new Error("Method not implemented.");
    }
    canDeleteDrink(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditDrink(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditDrinkName(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditDrinkPrice(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditDrinkStock(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditDrinkImage(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditDrinkActive(): boolean {
        throw new Error("Method not implemented.");
    }
    canViewAdminHistory(): boolean {
        throw new Error("Method not implemented.");
    }
    canViewManagePayments(): boolean {
        throw new Error("Method not implemented.");
    }
    canMarkPaymentAsDone(): boolean {
        throw new Error("Method not implemented.");
    }
    canViewUserList(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditUser(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditUserDisplayName(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditUserVerification(): boolean {
        throw new Error("Method not implemented.");
    }
    canEditUserRole(): boolean {
        throw new Error("Method not implemented.");
    }
    canDeleteUser(): boolean {
        throw new Error("Method not implemented.");
    }
    canViewDrinks(): boolean {
        return true;
    }

    canViewTraining(): boolean {
        return true;
    }

    canViewPayment(): boolean {
        return true;
    }

    canViewHistory(): boolean {
        return true;
    }

    canViewKeyFinder(): boolean {
        return true;
    }

    canViewAccount(): boolean {
        return true;
    }


}

