import { supabase } from '@/lib/supabase';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRANDING, TENANT_LOGO } from '@/utils';
import { Separator } from '@base-ui/react';
import { captureException } from '@sentry/react';
import i18n from 'i18next';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useApplication } from './ApplicationContext';


const SignUpForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { version } = useApplication();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError(t('profile.password.mismatch'));
      return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.signup.invalidEmail'));
      return;
    }

    if (!password || password.length < 6) {
      setError(t('auth.signup.passwordTooShort'));
      return;
    }

    if (!name || name.length < 1) {
      setError(t('auth.signup.nameRequired'));
      return;
    }

    if (!surname || surname.length < 1) {
      setError(t('auth.signup.surnameRequired'));
      return;
    }

    setIsLoading(true);

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name + ' ' + surname,
          displayName: name,
          email,
          role: 'user',
          language: i18n.resolvedLanguage,
        },
      },
    });
    if (error || !data || !data.user) {
      // An existing account is a user mistake, not an app error.
      if (error?.code !== 'user_already_exists')
        captureException(new Error('Could not sign up user.'), (scope) => {
          scope.clear();
          scope.setTag('error_code', error?.code ?? 'no_user');
          scope.setExtra('displayName', name);
          scope.setExtra('email', email);
          scope.setExtra('error', error && { code: error.code, status: error.status, message: error.message });
          return scope;
        });
      setError(t('auth.signup.failed', { message: error?.message }));
    }
    setIsLoading(false);
    if (data.session) {
      await supabase.auth.setSession(data.session);
      navigate('/help');
    } else {
      navigate('/auth/login');
    }
  };


  return <Card className='z-1 w-full border-none shadow-md sm:max-w-lg'>
    <CardHeader className='gap-6'>
      <div className={'flex justify-center gap-2.5'}>
        <img src={TENANT_LOGO} className='max-w-32 max-h-32 object-cover' />
      </div>
      <div>
        <CardTitle className="text-2xl">
          {t('auth.signup.titleAt')} {' '} <strong>{BRANDING.title}</strong>
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <form onSubmit={signUp}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="repeat-password">{t('profile.account.firstName')}</Label>
            </div>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="repeat-password">{t('profile.account.lastName')}</Label>
            </div>
            <Input
              id="surname"
              required
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">{t('auth.password')}</Label>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="repeat-password">{t('auth.repeatPassword')}</Label>
            </div>
            <Input
              id="repeat-password"
              type="password"
              required
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          <a href="#" className="underline underline-offset-4" onClick={() => navigate('/auth/login')}>
            {t('auth.haveAccount')}
          </a>
        </div>
      </form>
      <Separator className={"my-4"} />
      <div className='flex justify-center'>
        {t('auth.version', { version: `${APP_VERSION}${version ? `-${version.slice(0, 8)}` : ''}` })}
      </div>
    </CardContent>
  </Card>
};
export default SignUpForm;
