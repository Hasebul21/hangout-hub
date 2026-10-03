import { environment } from '../../environments/environment';

export const DEFAULT_AVATAR = 'default-avatar.svg';

export function avatarUrl(userId: number | null | undefined, version?: string): string {
  if (!userId) {
    return DEFAULT_AVATAR;
  }
  const url = `${environment.apiBaseUrl}/users/${userId}/avatar`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

export function useDefaultAvatar(event: Event): void {
  const img = event.target as HTMLImageElement;
  if (!img.src.endsWith(DEFAULT_AVATAR)) {
    img.src = DEFAULT_AVATAR;
  }
}
