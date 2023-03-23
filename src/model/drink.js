class Drink {

    constructor(name, price) {
        this.name = name;
        this.price = price;
    }

    toJson = () => {
        return {
            name: this.name,
            price: this.price,
        }
    }

    static fromJson = (json) => {
        return Drink(json["name"], json["price"]);
    }
}

export default Drink;