import sharp from 'sharp';
import type { ImagePurpose } from './image-purpose';

export type ImageVariantKind =
  | 'thumbnail'
  | 'display'
  | 'readable'
  | 'promotion_480'
  | 'promotion_960'
  | 'promotion_1440';

export type VariantMediaType = 'image/jpeg' | 'image/webp';

type VariantPlan = {
  kind: ImageVariantKind;
  box: { width: number; height: number };
  fit: 'inside' | 'cover';
  encode:
    | { format: 'jpeg'; quality: number; chroma: '4:2:0' | '4:4:4' }
    | { format: 'webp'; quality: number };
};

// The sizes decided in docs/implementation/UPL-002-image-variants.md.
export const variantPlans: Readonly<
  Record<ImagePurpose, readonly VariantPlan[]>
> = {
  transfer_receipt: [
    {
      kind: 'readable',
      box: { width: 2048, height: 2048 },
      fit: 'inside',
      encode: { format: 'jpeg', quality: 85, chroma: '4:4:4' },
    },
    {
      kind: 'thumbnail',
      box: { width: 800, height: 800 },
      fit: 'inside',
      encode: { format: 'jpeg', quality: 80, chroma: '4:2:0' },
    },
  ],
  profile_photo: [
    {
      kind: 'display',
      box: { width: 320, height: 320 },
      fit: 'cover',
      encode: { format: 'jpeg', quality: 82, chroma: '4:2:0' },
    },
    {
      kind: 'thumbnail',
      box: { width: 96, height: 96 },
      fit: 'cover',
      encode: { format: 'jpeg', quality: 80, chroma: '4:2:0' },
    },
  ],
  promotion: [
    {
      kind: 'promotion_480',
      box: { width: 480, height: 270 },
      fit: 'cover',
      encode: { format: 'webp', quality: 80 },
    },
    {
      kind: 'promotion_960',
      box: { width: 960, height: 540 },
      fit: 'cover',
      encode: { format: 'webp', quality: 82 },
    },
    {
      kind: 'promotion_1440',
      box: { width: 1440, height: 810 },
      fit: 'cover',
      encode: { format: 'webp', quality: 82 },
    },
  ],
};

// AW18: Promotion artwork is horizontal, at least 1200 × 675.
const minimumSourceSize: Partial<
  Record<ImagePurpose, { width: number; height: number }>
> = { promotion: { width: 1200, height: 675 } };

export type BuiltImageVariant = {
  kind: ImageVariantKind;
  mediaType: VariantMediaType;
  bytes: Buffer;
  byteSize: number;
  width: number;
  height: number;
};

const encoded = (pipeline: sharp.Sharp, plan: VariantPlan): sharp.Sharp =>
  plan.encode.format === 'jpeg'
    ? pipeline.jpeg({
        quality: plan.encode.quality,
        mozjpeg: true,
        chromaSubsampling: plan.encode.chroma,
      })
    : pipeline.webp({ quality: plan.encode.quality });

// Decodes once per variant from the verified bytes: sharp applies the
// orientation and drops every metadata block unless asked to keep it.
const buildVariant = async (
  bytes: Buffer,
  plan: VariantPlan,
): Promise<BuiltImageVariant> => {
  const output = await encoded(
    sharp(bytes).rotate().resize({
      width: plan.box.width,
      height: plan.box.height,
      fit: plan.fit,
      position: 'centre',
      withoutEnlargement: true,
    }),
    plan,
  ).toBuffer({ resolveWithObject: true });

  return {
    kind: plan.kind,
    mediaType: plan.encode.format === 'jpeg' ? 'image/jpeg' : 'image/webp',
    bytes: output.data,
    byteSize: output.info.size,
    width: output.info.width,
    height: output.info.height,
  };
};

const orientedSize = (
  metadata: sharp.Metadata,
): { width: number; height: number } => {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const swapped = (metadata.orientation ?? 1) >= 5;
  return swapped ? { width: height, height: width } : { width, height };
};

export const buildImageVariants = async (
  bytes: Buffer,
  purpose: ImagePurpose,
): Promise<BuiltImageVariant[]> => {
  const metadata = await sharp(bytes).metadata();
  if ((metadata.pages ?? 1) > 1) {
    throw new Error('image_animated_not_allowed');
  }
  const minimum = minimumSourceSize[purpose];
  if (minimum !== undefined) {
    const size = orientedSize(metadata);
    if (size.width < minimum.width || size.height < minimum.height) {
      throw new Error('image_dimensions_too_small');
    }
  }

  const variants: BuiltImageVariant[] = [];
  for (const plan of variantPlans[purpose]) {
    variants.push(await buildVariant(bytes, plan));
  }
  return variants;
};
