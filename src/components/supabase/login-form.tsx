import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BRANDING } from '@/utils'

export type AuthResponse = {
  error?: string
  success?: string
}

export type LoginFormProps = React.ComponentPropsWithoutRef<'div'> & {
  signIn: (formData: FormData) => void | Promise<AuthResponse> | undefined;
}

export const LoginForm = ({ className, signIn, ...props }: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Login to <br></br>
            {BRANDING.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={async (event) => {
            event.preventDefault();
            setIsLoading(true);
            setError(null);
            const formData = new FormData(event.currentTarget);
            const response = await signIn(formData);
            setIsLoading(false);
            setError(response?.error ?? null);
          }}>
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
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Passwort vergessen?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
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
              <a href="/auth/signup" className="underline underline-offset-4">
                Noch keinen Account? {' '}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
