import '@testing-library/jest-dom'
import { totalAmountToPay } from '../utils'

test('catch edge case when drinks is undefined', () => {
    // ARRANGE
    let result = totalAmountToPay(undefined);

    // ASSERT
    expect(result).toBe(0);
});


test('catch edge case when drinks is empty', () => {
    // ARRANGE
    let result = totalAmountToPay([]);

    // ASSERT
    expect(result).toBe(0);
});

test('catch edge case when drinks is null', () => {
    // ARRANGE
    let result = totalAmountToPay(null);

    // ASSERT
    expect(result).toBe(0);
});

test('Expect one item to return correct price', () => {
    // ARRANGE
    let result = totalAmountToPay([
        {
            drinks: [
                {
                    count: 1,
                    price: '1.5'
                }
            ]
        }
    ]);

    // ASSERT
    expect(result).toBe(1.5);
});

test('Expect one item with multiple drinks to return correct price', () => {
    // ARRANGE
    let result = totalAmountToPay([
        {
            drinks: [
                {
                    count: 3,
                    price: '1.5'
                }
            ]
        }
    ]);

    // ASSERT
    expect(result).toBe(4.5);
});

test('Expect multiple items with one drink to return correct price', () => {
    // ARRANGE
    let result = totalAmountToPay([
        {
            drinks: [
                {
                    count: 1,
                    price: '1.5'
                }
            ]
        },
        {
            drinks: [
                {
                    count: 1,
                    price: '1.5'
                }
            ]
        }
    ]);

    // ASSERT
    expect(result).toBe(3);
});

test('Throw error when count is negative', () => {
    // ARRANGE
    let result = () => totalAmountToPay([
        {
            drinks: [
                {
                    count: -1,
                    price: '1.5'
                }
            ]
        }
    ]);

    // ASSERT
    expect(result).toThrow(Error);
});

test('Throw error when price is negative', () => {
    // ARRANGE
    let result = () => totalAmountToPay([
        {
            drinks: [
                {
                    count: 1,
                    price: '-1.5'
                }
            ]
        }
    ]);

    // ASSERT
    expect(result).toThrow(Error);
});

test('Throw error when object does not match', () => {
    // ARRANGE
    let result = () => totalAmountToPay([
        {
            someDummyWrongName: [
                {
                    count: -1,
                    price: '1.5'
                }
            ]
        }
    ]);

    // ASSERT
    expect(result).toThrow(Error);
});