import { supabase } from '@/lib/supabase';
import { FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRANDING, TENANT_LOGO } from '@/utils';
import { Separator } from '@base-ui/react';
import { captureException } from '@sentry/react';
import { useNavigate } from 'react-router';
import { useApplication } from './ApplicationContext';


const LoginFormShadcn = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { version } = useApplication();

  const navigate = useNavigate();

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    if (email && password) {
      const result = await supabase.auth
        .signInWithPassword({
          email: email,
          password: password,
        });
      if (result.error || !result.data.session) {
        setError("Login failed. Try again!")
        if (result.error && result.error.code !== 'invalid_credentials')
          captureException(new Error('Could not sign in user.'), (scope) => {
            scope.clear();
            scope.setExtra('email', email);
            scope.setExtra('error', JSON.stringify(error));
            return scope;
          });
      }
      if (result.data.session) {
        await supabase.auth.setSession(result.data.session);
      }
      setIsLoading(false);
    }
  };

  return <Card className='z-1 w-full border-none shadow-md sm:max-w-lg'>
    <CardHeader className='gap-6'>
      <div className={'flex justify-center gap-2.5'}>
        <img src={TENANT_LOGO} className='max-w-32 max-h-32 object-cover' />
      </div>
      <div>
        <CardTitle className="text-2xl">
          Login für {' '} <strong>{BRANDING.title}</strong>
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <form onSubmit={signIn}>
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
              <Label htmlFor="password">Passwort</Label>
              <a
                href="#"
                className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                onClick={() => navigate("/auth/forgot-password")}
              >
                Passwort vergessen?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder='******'
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Einloggen...' : 'Login'}
          </Button>
        </div>
        <div className="mt-4 text-center text-sm">
          <a href="#" className="underline underline-offset-4" onClick={() => navigate("/auth/signup")}>
            Noch keinen Account? {' '}
          </a>
        </div>
      </form>
      <Separator className={"my-4"} />
      <div className='flex justify-center'>
        {`Version ${APP_VERSION}-${version.slice(0, 8)}`}
      </div>
    </CardContent>
  </Card>

};
export default LoginFormShadcn;
