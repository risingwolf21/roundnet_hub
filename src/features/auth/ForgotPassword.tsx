import { supabase } from '@/lib/supabase';
import { FormEvent, useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TENANT_LOGO } from '@/utils';
import { Separator } from '@base-ui/react';
import { captureException } from '@sentry/react';
import { CheckIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApplication } from './ApplicationContext';


const ForgotPasswordFormShadcn = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { version } = useApplication();

  const navigate = useNavigate();

  const forgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    if (email) {
      const result = await supabase.auth
        .resetPasswordForEmail(email, {
          redirectTo: import.meta.env.VITE_PUBLIC_URL + '/auth/reset-password',
        });

      if (result.error) {
        setError("Password reset failed. Try again!")
        captureException(new Error('Could not sign in user.'), (scope) => {
          scope.clear();
          scope.setExtra('email', email);
          scope.setExtra('error', JSON.stringify(error));
          return scope;
        });
      } else {
        setSuccess(true)
      }
      setIsLoading(false);
    }
  };

  if (success) {
    return <Card>
      <CardHeader className='flex justify-center'>
        <Avatar className='size-15 border border-green-600 bg-green-600/10 p-2 dark:border-green-400 dark:bg-green-400/10'>
          <AvatarFallback className='bg-transparent'>
            <div className='flex items-center justify-center'>
              <CheckIcon className='size-7 text-green-600 dark:text-green-400' />
            </div>
          </AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent>
        <div className='space-y-3.5 text-center'>
          <div className='leading-7'>Email wurde versendet</div>
          <div className='max-w-sm'>
            Es wurde eine Email mit den Informationen für das Zurücksetzen deines Passwort versendet 🎉
          </div>
        </div>
      </CardContent>
      <CardFooter className='flex justify-center'>
        <Button size='lg' onClick={() => navigate("/auth/login")}>Zurück zum Login</Button>
      </CardFooter>
    </Card>
  }


  return <Card className='z-1 w-full border-none shadow-md sm:max-w-lg'>
    <CardHeader className='gap-6'>
      <div className={'flex justify-center gap-2.5'}>
        <img src={TENANT_LOGO} className='max-w-32 max-h-32 object-cover' />
      </div>
      <div>
        <CardTitle className="text-2xl">
          Passwort zurücksetzen
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <form onSubmit={forgotPassword}>
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

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Senden...' : 'Abschicken'}
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
        {`Version ${APP_VERSION}-${version.slice(0, 8)}`}
      </div>
    </CardContent>
  </Card>
};
export default ForgotPasswordFormShadcn;
