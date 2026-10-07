import type { PromotionDto } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  Heading,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import {
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useResolvePublicUrl } from "../client-fetcher";
import { choosePromotionImageSource, promotionCardWidth } from "./promotion-image";

const cardGap = spacing.mdLg;

type PromotionsCarouselProps = {
  loading: boolean;
  promotions: readonly PromotionDto[];
  // A public image that no longer answers means the Promotion changed after
  // the list was read (ADR-0077); Home reads the list again.
  onImageMissing: () => void;
};

function SectionLabel() {
  return <Text style={styles.sectionLabel}>Novedades del estudio</Text>;
}

function Dots({ count, current }: { count: number; current: number }) {
  return (
    <View
      accessibilityLabel={`Promoción ${current + 1} de ${count}`}
      accessible
      style={styles.dots}
    >
      {Array.from({ length: count }, (_, position) => (
        <View key={position} style={[styles.dot, position === current && styles.dotActive]} />
      ))}
    </View>
  );
}

export function PromotionsCarousel({
  loading,
  promotions,
  onImageMissing,
}: PromotionsCarouselProps) {
  const { width } = useWindowDimensions();
  const resolve = useResolvePublicUrl();
  const [missingUrls, setMissingUrls] = useState<ReadonlySet<string>>(new Set());
  const [current, setCurrent] = useState(0);
  const cardWidth = promotionCardWidth(width);

  if (loading) {
    return (
      <View style={styles.section}>
        <SectionLabel />
        <View accessibilityLabel="Cargando promociones" style={[styles.card, { width: cardWidth }]}>
          <View style={styles.imagePlaceholder} />
          <View style={styles.copy}>
            <View style={styles.headlinePlaceholder} />
            <View style={styles.descriptionPlaceholder} />
          </View>
        </View>
      </View>
    );
  }

  const cards = promotions.flatMap((promotion) => {
    const source = choosePromotionImageSource(promotion.image.sources, cardWidth, PixelRatio.get());
    return source === undefined || missingUrls.has(source.url)
      ? []
      : [{ promotion, uri: resolve(source.url), sourceUrl: source.url }];
  });

  if (cards.length === 0) return null;

  const shown = Math.min(current, cards.length - 1);
  const page = cardWidth + cardGap;

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const atEnd =
      contentSize !== undefined &&
      layoutMeasurement !== undefined &&
      contentOffset.x + layoutMeasurement.width >= contentSize.width - 1;
    setCurrent(
      atEnd ? cards.length - 1 : Math.min(Math.round(contentOffset.x / page), cards.length - 1),
    );
  };

  const markMissing = (sourceUrl: string) => {
    setMissingUrls((previous) => new Set(previous).add(sourceUrl));
    onImageMissing();
  };

  return (
    <View style={styles.section}>
      <SectionLabel />
      <ScrollView
        contentContainerStyle={styles.track}
        decelerationRate="fast"
        disableIntervalMomentum
        horizontal
        onMomentumScrollEnd={onMomentumScrollEnd}
        showsHorizontalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={page}
        style={styles.scroller}
        testID="promotions-carousel"
      >
        {cards.map(({ promotion, uri, sourceUrl }) => (
          <View key={promotion.id} style={[styles.card, { width: cardWidth }]}>
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={promotion.headline}
              onError={() => markMissing(sourceUrl)}
              resizeMode="cover"
              source={{ uri }}
              style={styles.image}
            />
            <View style={styles.copy}>
              <Heading style={styles.headline}>{promotion.headline}</Heading>
              <BodyText style={styles.description}>{promotion.description}</BodyText>
            </View>
          </View>
        ))}
      </ScrollView>
      {cards.length > 1 ? <Dots count={cards.length} current={shown} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    overflow: "hidden",
  },
  copy: { gap: spacing.smd, padding: spacing.lg },
  description: { fontSize: typography.note, lineHeight: 20 },
  descriptionPlaceholder: {
    backgroundColor: colors.divider,
    borderRadius: radii.control,
    height: 14,
    width: "80%",
  },
  dot: {
    backgroundColor: colors.secondaryAccent,
    borderRadius: radii.pill,
    height: 6,
    width: 6,
  },
  dotActive: { backgroundColor: colors.primary, width: 18 },
  dots: {
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.smd,
    minHeight: spacing.md,
  },
  headline: { fontSize: 18, lineHeight: 24 },
  headlinePlaceholder: {
    backgroundColor: colors.primaryTint,
    borderRadius: radii.control,
    height: 18,
    width: "60%",
  },
  image: { aspectRatio: 16 / 9, backgroundColor: colors.primaryTint, width: "100%" },
  imagePlaceholder: { aspectRatio: 16 / 9, backgroundColor: colors.primaryTint },
  scroller: { flexGrow: 0, marginHorizontal: -spacing.lg },
  section: { gap: spacing.md },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: 1.9,
    textTransform: "uppercase",
  },
  track: { gap: cardGap, paddingHorizontal: spacing.lg },
});
