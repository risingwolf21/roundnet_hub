import { Browser, Builder, WebDriver } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import firefox from 'selenium-webdriver/firefox';

export async function createDriver(browser: string = 'chrome'): Promise<WebDriver> {
  let driver: WebDriver;

  switch (browser.toLowerCase()) {
    case 'chrome': {
      const chromeOptions = new chrome.Options();
      if (process.env.CI) {
        chromeOptions.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage');
      }
      driver = await new Builder()
        .forBrowser(Browser.CHROME)
        .setChromeOptions(chromeOptions)
        .build();
      break;
    }

    case 'firefox': {
      const firefoxOptions = new firefox.Options();
      if (process.env.CI) {
        firefoxOptions.addArguments('--headless');
      }
      driver = await new Builder()
        .forBrowser(Browser.FIREFOX)
        .setFirefoxOptions(firefoxOptions)
        .build();
      break;
    }

    case 'safari': {
      driver = await new Builder()
        .forBrowser(Browser.SAFARI)
        .build();
      break;
    }

    default:
      throw new Error(`Unsupported browser: ${browser}`);
  }

  // Set implicit wait timeout
  await driver.manage().setTimeouts({ implicit: 10000 });

  return driver;
}

export const BASE_URL = 'http://localhost:5173';