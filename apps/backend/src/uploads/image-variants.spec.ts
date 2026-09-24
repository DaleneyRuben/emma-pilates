import sharp from 'sharp';
import { buildImageVariants, variantPlans } from './image-variants';

const image = (width: number, height: number, format: 'jpeg' | 'png') =>
  sharp({
    create: { width, height, channels: 3, background: '#c81e1e' },
  })
    [format]()
    .toBuffer();

const dimensions = async (bytes: Buffer) => {
  const metadata = await sharp(bytes).metadata();
  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    hasExif: metadata.exif !== undefined,
  };
};

describe('buildImageVariants', () => {
  it('builds a readable and a thumbnail JPEG for a receipt, fitting each box without enlarging', async () => {
    const variants = await buildImageVariants(
      await image(1170, 2532, 'png'),
      'transfer_receipt',
    );

    expect(variants.map((variant) => variant.kind)).toEqual([
      'readable',
      'thumbnail',
    ]);
    const readable = variants[0];
    const thumbnail = variants[1];
    expect(readable.mediaType).toBe('image/jpeg');
    expect(await dimensions(readable.bytes)).toEqual({
      width: 946,
      height: 2048,
      format: 'jpeg',
      hasExif: false,
    });
    expect(thumbnail.mediaType).toBe('image/jpeg');
    expect(await dimensions(thumbnail.bytes)).toMatchObject({
      width: 370,
      height: 800,
      format: 'jpeg',
    });
    expect(readable.width).toBe(946);
    expect(readable.height).toBe(2048);
    expect(thumbnail.byteSize).toBe(thumbnail.bytes.byteLength);
  });

  it('keeps a small receipt at its own size', async () => {
    const variants = await buildImageVariants(
      await image(600, 400, 'jpeg'),
      'transfer_receipt',
    );

    expect(await dimensions(variants[0].bytes)).toMatchObject({
      width: 600,
      height: 400,
    });
    expect(await dimensions(variants[1].bytes)).toMatchObject({
      width: 600,
      height: 400,
    });
  });

  it('strips metadata and applies the orientation before resizing', async () => {
    const rotated = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#111' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);

    const [readable] = await buildImageVariants(rotated, 'transfer_receipt');

    expect(await dimensions(readable.bytes)).toEqual({
      width: 200,
      height: 300,
      format: 'jpeg',
      hasExif: false,
    });
  });

  it('centre-crops a profile photo into square display and thumbnail variants', async () => {
    const variants = await buildImageVariants(
      await image(1200, 800, 'jpeg'),
      'profile_photo',
    );

    expect(variants.map((variant) => variant.kind)).toEqual([
      'display',
      'thumbnail',
    ]);
    expect(await dimensions(variants[0].bytes)).toMatchObject({
      width: 320,
      height: 320,
      format: 'jpeg',
    });
    expect(await dimensions(variants[1].bytes)).toMatchObject({
      width: 96,
      height: 96,
    });
  });

  it('builds the three 16:9 WebP widths for a Promotion image', async () => {
    const variants = await buildImageVariants(
      await image(2400, 1600, 'png'),
      'promotion',
    );

    expect(variants.map((variant) => variant.kind)).toEqual([
      'promotion_480',
      'promotion_960',
      'promotion_1440',
    ]);
    expect(variants.every((variant) => variant.mediaType === 'image/webp')).toBe(
      true,
    );
    expect(await dimensions(variants[0].bytes)).toMatchObject({
      width: 480,
      height: 270,
      format: 'webp',
    });
    expect(await dimensions(variants[1].bytes)).toMatchObject({
      width: 960,
      height: 540,
    });
    expect(await dimensions(variants[2].bytes)).toMatchObject({
      width: 1440,
      height: 810,
    });
  });

  it('never enlarges a Promotion image at the minimum size', async () => {
    const variants = await buildImageVariants(
      await image(1200, 675, 'jpeg'),
      'promotion',
    );

    expect(await dimensions(variants[2].bytes)).toMatchObject({
      width: 1200,
      height: 675,
    });
  });

  it('rejects a Promotion image below the 1200 by 675 minimum', async () => {
    await expect(
      buildImageVariants(await image(1199, 675, 'jpeg'), 'promotion'),
    ).rejects.toThrow('image_dimensions_too_small');
    await expect(
      buildImageVariants(await image(1200, 674, 'jpeg'), 'promotion'),
    ).rejects.toThrow('image_dimensions_too_small');
  });

  it('records the decided plan per purpose', () => {
    expect(variantPlans.transfer_receipt.map((plan) => plan.kind)).toEqual([
      'readable',
      'thumbnail',
    ]);
    expect(variantPlans.promotion.map((plan) => plan.box)).toEqual([
      { width: 480, height: 270 },
      { width: 960, height: 540 },
      { width: 1440, height: 810 },
    ]);
  });
});
