// hooks/useIncreaseChallengePoint.ts
import { useCallback } from 'react';
import { useNotifications } from '@toolpad/core/useNotifications';
import { Dayjs } from 'dayjs';
import { ChallengeRepository } from 'src/repository/ChallengeRepository';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { dataURLtoFile } from 'src/utils';
import { captureException } from '@sentry/react';
import { FullChallenge } from 'src/types/supabaseTypes';
import { QueryObserverResult } from '@tanstack/react-query';

export function useIncreaseChallengePoint(challenge: Challenge | null, user: User, refetch: () => Promise<QueryObserverResult<FullChallenge | null, Error>>) {
  const notifications = useNotifications();

  const uploadImage = useCallback(async (image: { dataUrl: string, fileName: string } | null) => {
    if (!image || !challenge) return null;
    const { data: uploadData, error } = await supabase.storage
      .from('challenge')
      .upload(`${challenge.id}/${image.fileName}`, dataURLtoFile(image.dataUrl, image.fileName), { upsert: true });
    if (uploadData?.path && !error) {
      const { data } = supabase.storage.from('challenge').getPublicUrl(uploadData.path);
      return data?.publicUrl ?? null;
    }
    return null;
  }, [challenge])

  return useCallback(
    async (created_at: Dayjs, image: { dataUrl: string; fileName: string } | null) => {
      if (!user || !challenge) {
        notifications.show('Something went wrong! Try again later', { severity: 'error' });
        return;
      }

      const uploadedImageUrl = await uploadImage(image);
      if (!uploadedImageUrl && image) {
        notifications.show('Fehler beim hochladen des Bildes. Der Punkt wurde dennoch eingetragen', { severity: 'error' });
      }

      try {
        const result = await ChallengeRepository.increasePointForUser(user.userId, challenge.id, created_at, uploadedImageUrl);
        if (result.data) {
          refetch();
          notifications.show('Success!', { severity: 'success' });
        }
      } catch (error: any) {
        captureException(error);
        notifications.show(error.message, { severity: 'error' });
      }
    },
    [challenge, notifications, refetch, user, uploadImage]
  );
}
