import { Session } from '@supabase/supabase-js';
import { WebDriver } from 'selenium-webdriver';
import { admin } from './adminClient';

export async function getSession(email: string, password: string) {
  const { data, error } = await admin.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.session;
}

export async function loginAs(driver: WebDriver, session: Session) {
  await driver.get('about:blank');

  await driver.executeScript(
    `
    localStorage.setItem(
      'sb-your-project-auth-token',
      JSON.stringify(arguments[0])
    );
  `,
    session
  );
}