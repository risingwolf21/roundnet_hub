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
  const navigate = useNavigate();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Bitte gib eine gültige Emailadresse an.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen beinhalten');
      return;
    }

    if (!name || name.length < 1) {
      setError('Name is required.');
      return;
    }

    if (!surname || surname.length < 1) {
      setError('Surname is required.');
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
      captureException(new Error('Could not sign up user.'), (scope) => {
        scope.clear();
        scope.setExtra('displayName', name);
        scope.setExtra('email', email);
        scope.setExtra('error', JSON.stringify(error));
        return scope;
      });
      setError('Could not sign up user. [' + error?.message + ']');
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
          Registrierung bei {' '} <strong>{BRANDING.title}</strong>
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <form onSubmit={signUp}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="repeat-password">Vorname</Label>
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
              <Label htmlFor="repeat-password">Nachname</Label>
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
              <Label htmlFor="password">Passwort</Label>
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
              <Label htmlFor="repeat-password">Passwort wiederholen</Label>
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
            {isLoading ? 'Account wird erstellt...' : 'Registrieren'}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          <a href="#" className="underline underline-offset-4" onClick={() => navigate('/auth/login')}>
            Account vorhanden? Hier einloggen.
          </a>
        </div>
      </form>
      <Separator className={"my-4"} />
      <div className='flex justify-center'>
        {`Version ${APP_VERSION}${version ? `-${version.slice(0, 8)}` : ''}`}
      </div>
    </CardContent>
  </Card>
};
export default SignUpForm;
