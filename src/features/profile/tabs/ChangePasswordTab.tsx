import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";
import { captureException } from "@sentry/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const ChangePasswordTab = () => {
  const { t } = useTranslation();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const data = new FormData(event.currentTarget);
    const password = data.get('password')?.toString();
    const password1 = data.get('confirmPassword')?.toString();

    if (password !== password1 || !password || !password1) {
      toast.error(t('profile.password.mismatch'));
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      captureException(error);
      toast.error(error.message);
    }
    setLoading(false);
  };

  return (
    <>
      <CardTitle className="px-4 font-semibold">{t('profile.password.title')}</CardTitle>
      <CardContent className="px-4">
        <form className='space-y-6' onSubmit={submit}>
          <div className='w-full space-y-1'>
            <Label className='leading-5' htmlFor='password'>
              {t('profile.password.newPassword')}
            </Label>
            <div className='relative'>
              <Input
                id='password'
                name='password'
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder={t('profile.password.placeholder')}
                className='pr-9'
              />
              <Button
                variant='ghost'
                size='icon'
                type='button'
                onClick={() => setIsPasswordVisible(prev => !prev)}
                className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
              >
                {isPasswordVisible ? <EyeOff /> : <Eye />}
                <span className='sr-only'>{isPasswordVisible ? t('profile.password.hidePassword') : t('profile.password.showPassword')}</span>
              </Button>
            </div>
          </div>
          <div className='w-full space-y-1'>
            <Label className='leading-5' htmlFor='confirmPassword'>
              {t('profile.password.confirmPassword')}
            </Label>
            <div className='relative'>
              <Input
                id='confirmPassword'
                name='confirmPassword'
                type={isConfirmPasswordVisible ? 'text' : 'password'}
                placeholder={t('profile.password.placeholder')}
                className='pr-9'
              />
              <Button
                variant='ghost'
                size='icon'
                type='button'
                onClick={() => setIsConfirmPasswordVisible(prev => !prev)}
                className='text-muted-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 rounded-l-none hover:bg-transparent'
              >
                {isConfirmPasswordVisible ? <EyeOff /> : <Eye />}
                <span className='sr-only'>{isConfirmPasswordVisible ? t('profile.password.hidePassword') : t('profile.password.showPassword')}</span>
              </Button>
            </div>
          </div>
          <Button className='w-full' type='submit' disabled={loading}>
            {loading && <Spinner />}
            {t('profile.password.submit')}
          </Button>
        </form>
      </CardContent>
    </>
  );
};
