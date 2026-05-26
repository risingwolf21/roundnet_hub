import { queryClient } from "@/lib/queryClient";
import { UserRepository } from "@/repository/UserRepository";
import { UserWithGroups } from "@/types/supabaseTypes";
import { dataURLtoFile, readFile } from "@/utils";
import { captureException } from "@sentry/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { v4 as uuid } from 'uuid';
import { authKeys } from "./auth";


export const useProfile = (userId: string) =>
  useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const [user, player] = await Promise.all([
        UserRepository.fetchProfile(userId),
        UserRepository.fetchLinkedPlayer(userId),
      ]);

      return {
        user: user ?? null,
        player: player ?? null,
        avatarUrl: user?.avatarUrl || player?.rg_avatar_url || null,
        displayName: user?.name || player?.display_name || 'Unbekannter Spieler',
      };
    },
  });

const uploadAvatarImage = async (file: Blob, fileName: string, user: User) => {
  const compressedFile = await readFile(file);
  if (compressedFile && typeof compressedFile === 'string') {
    const { data: list, error } = await UserRepository.listAvatarFiles(user.id);

    if (error || !list) {
      throw error;
    }

    const filesToRemove = list.map((x) => `${user.id}/${x.name}`);

    if (filesToRemove.length > 0) {
      await UserRepository.removeAvatarFiles(filesToRemove);
    }

    const { data: uploadData, error: uploadError } = await UserRepository.uploadAvatar(
      `${user.id}/${fileName}`,
      dataURLtoFile(compressedFile, fileName),
      { upsert: true }
    );
    if (uploadError) {
      throw uploadError;
    }
    if (!uploadData || !uploadData.path) {
      throw new Error("Error uploading the image")
    }

    return UserRepository.getAvatarUrl(uploadData.path);
  }
  return null;
}

export async function compress(file: Blob | File, convertSize: number) {
  const { default: Compressor } = await import('compressorjs');
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
    meta: { suppressErrorToast: true },
    mutationFn: async ({ displayName, fullName, avatarUrl, croppedImage }: { displayName: string, fullName: string, avatarUrl: string | null, croppedImage: string | null }) => {

      let newAvatarUrl: string | null = null;
      if (croppedImage) {
        const fileName = uuid() + '.jpg';
        const result = await compress(dataURLtoFile(croppedImage, fileName), 1000000)
        newAvatarUrl = await uploadAvatarImage(result, fileName, user);
      }

      const data = await UserRepository.updateProfile(user.id, {
        name: fullName,
        displayName,
        avatarUrl: newAvatarUrl ?? avatarUrl,
      });

      const { supabase } = await import('@/lib/supabase');
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

export const useUpdateAvatarFromPlayerMutation = (user: User) =>
  useMutation({
    mutationFn: async ({ avatarUrl }: { avatarUrl: string | null | undefined }) => {
      const { data: list, error } = await UserRepository.listAvatarFiles(user.id);
      if (error || !list) throw error ?? new Error('Failed to list avatar files');

      const filesToRemove = list.map((x) => `${user.id}/${x.name}`);
      if (filesToRemove.length > 0) {
        await UserRepository.removeAvatarFiles(filesToRemove);
      }

      return UserRepository.updateProfile(user.id, { avatarUrl: avatarUrl ?? null });
    },
    onError: (error) => {
      captureException(error, {
        extra: { userId: user.id, userName: user.name },
        tags: { type: 'UpdateAvatarFromPlayer', scope: 'user' },
      });
    },
  });
