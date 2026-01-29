import { By, until, WebDriver } from 'selenium-webdriver';
import { v4 as uuid } from 'uuid';
import { BASE_URL, createDriver } from '../config/driver';

describe('Homepage', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver.quit();
  });

  test('register a new user', async () => {
    await driver.get(`${BASE_URL}`);

    await driver.wait(until.urlContains('/auth/login'), 10000);

    const signupLink = await driver.findElement(By.css('[data-testid="signup-link"]'));

    await signupLink.click();

    await driver.wait(until.urlContains('/auth/signup'), 10000);

    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth/signup');

    const submitButton = await driver.findElement(By.css('[data-testid="signup-button"]'));

    const surname = "Test"
    const name = uuid().substring(0, 8);
    const email = `${surname.toLowerCase()}.${name.toLowerCase()}@test.com`;

    const emailInput = await driver.findElement(By.id('email'));
    await emailInput.sendKeys(email);

    const nameInput = await driver.findElement(By.id('name'));
    await nameInput.sendKeys(name);

    const surnameInput = await driver.findElement(By.id('surname'));
    await surnameInput.sendKeys(surname);

    const passwordInput = await driver.findElement(By.name('password'));
    await passwordInput.sendKeys('123123123');

    const password2Input = await driver.findElement(By.name('password2'));
    await password2Input.sendKeys('123123123');

    await submitButton.click();

    await driver.wait(until.urlContains('/help'), 10000);

    const newUrl = await driver.getCurrentUrl();
    expect(newUrl).toBe(`${BASE_URL}/help`);
  });
});