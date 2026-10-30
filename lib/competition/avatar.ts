// Shared fallback only; an athlete-uploaded avatar_url takes precedence at call sites.
export const DEFAULT_ATHLETE_AVATAR = '/avatars/go-default-2026.jpg';

// Keep the ID argument for existing callers. The owner approved one default for everyone.
export function defaultAvatar(_id: string) {
  return DEFAULT_ATHLETE_AVATAR;
}
