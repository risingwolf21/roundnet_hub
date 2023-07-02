export const totalAmountToPay = (drinks) => {
    if (!drinks)
        return 0;

    return Object.values(drinks)
        .flatMap(x => {
            if(!x.drinks)
                throw new Error("Object does not contain element \"drinks\"");
            return x.drinks;
        })
        .reduce((prev, curr) => {
            if (curr.count < 0 || curr.price < 0)
                throw new Error("Price or Count of drink can not be less than 0");
            return prev + (curr.count * curr.price)
        }, 0);
}