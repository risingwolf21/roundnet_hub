class User {

    constructor(UID, displayName, email, verified, isAdmin = false) {
        this.UID = UID;
        this.displayName = displayName;
        this.email = email;
        this.verified = verified;
        this.isAdmin = isAdmin;
    }

    toJson = () => {
        return {
            UID: this.UID,
            displayName: this.displayName,
            email: this.email,
            verified: this.verified,
            isAdmin: this.isAdmin
        }
    }

    static fromJson = (json) => {
        return User(json["UID"], json["displayName"], json["email"], json["verified"], json["isAdmin"]);
    }
}

export default User;