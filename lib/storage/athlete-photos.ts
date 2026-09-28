import { supabase } from "@/lib/supabase";

export const ATHLETE_PHOTO_SUBMISSIONS_BUCKET = "athlete-photo-submissions";
export const ATHLETE_PROFILE_PUBLIC_BUCKET = "athlete-profile-public";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AthletePhotoSubmission = {
  path: string;
  status: "pending_review";
};

export async function submitAthletePhoto(
  file: File,
): Promise<AthletePhotoSubmission> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("รูปต้องมีขนาดไม่เกิน 5 MB");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนแก้ไขรูปโปรไฟล์");
  }

  const path = `${user.id}/pending-profile`;
  const { error } = await supabase.storage
    .from(ATHLETE_PHOTO_SUBMISSIONS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  return { path, status: "pending_review" };
}
