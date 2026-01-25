import { By, until, WebDriver } from 'selenium-webdriver';
import { BASE_URL, createDriver } from '../config/driver';

describe('Homepage', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    driver = await createDriver();
  });

  afterAll(async () => {
    await driver.quit();
  });

  test('loads and displays title', async () => {
    await driver.get(BASE_URL);

    const title = await driver.getTitle();
    expect(title).toContain('Localhost');
  });

  test('navigates to login page', async () => {
    await driver.get(`${BASE_URL}`);

    await driver.wait(until.urlContains('/auth/login'), 10000);

    const url = await driver.getCurrentUrl();
    expect(url).toContain('/auth/login');

    const submitButton = await driver.findElement(By.css('[data-testid="login-button"]'));

    const emailInput = await driver.findElement(By.id('email'));
    await emailInput.sendKeys('admin@example.com');

    const passwordInput = await driver.findElement(By.name('password'));
    await passwordInput.sendKeys('Wolf1396!');

    await submitButton.click();

    await driver.wait(until.urlIs(`${BASE_URL}/home`), 10000);

    const newUrl = await driver.getCurrentUrl();
    expect(newUrl).toBe(`${BASE_URL}/home`);
  });
});