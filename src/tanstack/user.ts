import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { UserWithGroups } from "@/types/supabaseTypes";
import { dataURLtoFile, readFile } from "@/utils";
import { captureException } from "@sentry/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Compressor from 'compressorjs';
import { v4 as uuid } from 'uuid';
import { authKeys } from "./auth";


export const useProfile = (payload: { userId?: string | null, playerId?: string | null }) =>
  useQuery({
    queryKey: ['profile', payload.userId, payload.playerId],
    queryFn: async () => {
      const result = payload.userId ? await supabase.schema('public')
        .from('user')
        .select('*')
        .eq('id', payload.userId)
        .maybeSingle()
        .throwOnError() : null;

      const playerResult = payload.playerId ? await supabase.schema('games')
        .from('players')
        .select('*')
        .eq('player', payload.playerId)
        .maybeSingle()
        .throwOnError() : null;

      return {
        user: result?.data ?? null,
        player: playerResult?.data ?? null,
        avatarUrl: result?.data?.avatarUrl || playerResult?.data?.rg_avatar_url || null,
        displayName: result?.data?.name || playerResult?.data?.display_name || 'Unbekannter Spieler',
      };
    },
  });

const uploadAvatarImage = async (file: Blob, fileName: string, user: User) => {
  const compressedFile = await readFile(file);
  if (compressedFile && typeof compressedFile === 'string') {
    const { data: list, error } = await supabase.storage.from('user').list(`${user.id}`)

    if (error || !list) {
      throw error;
    }

    const filesToRemove = list.map((x) => `${user.id}/${x.name}`);

    if (filesToRemove.length > 0) {
      await supabase.storage.from('user').remove(filesToRemove);
    }

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user')
      .upload(`${user.id}/${fileName}`, dataURLtoFile(compressedFile, fileName), {
        upsert: true,
      });
    if (uploadError) {
      throw uploadError;
    }
    if (!uploadData || !uploadData.path) {
      throw new Error("Error uploading the image")
    }

    const { data } = supabase.storage.from('user').getPublicUrl(uploadData.path);

    return data.publicUrl;
  }
  return null;
}

export async function compress(file: Blob | File, convertSize: number) {
  return await new Promise<File | Blob>((resolve, reject) => {
    new Compressor(file, {
      convertSize,
      success: resolve,
      error: reject,
    });
  });
}

export const useUpdateUserProfile = (user: User) =>
  useMutation({
    mutationFn: async ({ displayName, fullName, avatarUrl, croppedImage }: { displayName: string, fullName: string, avatarUrl: string | null, croppedImage: string | null }) => {

      let newAvatarUrl: string | null = null;
      if (croppedImage) {
        const fileName = uuid() + '.jpg';
        const result = await compress(dataURLtoFile(croppedImage, fileName), 1000000)
        newAvatarUrl = await uploadAvatarImage(result, fileName, user);
      }

      const { data } = await supabase.from('user')
        .update({ name: fullName, displayName, avatarUrl: newAvatarUrl ?? avatarUrl })
        .eq('id', user.id)
        .select("*")
        .maybeSingle()
        .throwOnError();

      const { error } = await supabase.auth.updateUser({
        data: { displayName, name: fullName, avatarUrl: newAvatarUrl ?? avatarUrl },
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onMutate: async ({ displayName, fullName }) => {
      await queryClient.cancelQueries({ queryKey: authKeys.currentUser(user.id) });

      const previousUser = queryClient.getQueryData<UserWithGroups | null>(authKeys.currentUser(user.id));

      if (previousUser) {
        const newUser = {
          ...previousUser,
          displayName: displayName,
          name: fullName
        };
        queryClient.setQueryData<UserWithGroups | null>(authKeys.currentUser(user.id), newUser);
      }

      return { previousUser };
    },
    onError: (error, variables, context) => {
      captureException(error, {
        extra: {
          userName: user.name,
          userId: user.id,
          ...error,
          ...variables,
        },
        tags: { type: 'UpdatePlayer', scope: 'games' },
      });
      if (context?.previousUser) {
        queryClient.setQueryData(authKeys.currentUser(user.id), context.previousUser);
      }
    },
  });
