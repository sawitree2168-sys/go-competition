/**
 * Compute the source-image crop matching the on-screen 256px avatar preview.
 * Pure function for tests and consistent rendering on mobile/desktop.
 */
export function avatarCropRect(width,height,zoom=1,offsetX=0,offsetY=0){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error("invalid_image_dimensions");
  if(!Number.isFinite(zoom)||zoom<1||zoom>2)throw new Error("invalid_zoom");
  if(!Number.isFinite(offsetX)||!Number.isFinite(offsetY))throw new Error("invalid_offset");
  const side=Math.min(width,height)/zoom;
  const px=Math.min(width,height)/(256*zoom);
  const x=Math.max(0,Math.min(width-side,(width-side)/2-offsetX*px));
  const y=Math.max(0,Math.min(height-side,(height-side)/2-offsetY*px));
  return {x,y,width:side,height:side};
}
