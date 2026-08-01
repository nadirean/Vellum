import React, { useEffect, useState } from 'react';

import { Image, View } from 'react-native';

interface FocusedCoverImageProps {
  uri: string;
  size: number;
  focusY?: number; // 0 = top, 50 = center (default), 100 = bottom
  borderRadius?: number;
}

/**
 * Displays a cover image cropped to a square, with adjustable vertical focus.
 * When focusY !== 50, the image's natural aspect ratio is measured and the
 * vertical position is shifted so the desired region is visible.
 */
export function FocusedCoverImage({
  uri,
  size,
  focusY = 50,
  borderRadius = 0,
}: FocusedCoverImageProps) {
  const [naturalAR, setNaturalAR] = useState<number | null>(null);

  useEffect(() => {
    if (focusY === 50) {
      setNaturalAR(null);
      return;
    }
    Image.getSize(
      uri,
      (w, h) => setNaturalAR(h / w),
      () => setNaturalAR(null),
    );
  }, [uri, focusY]);

  // Default centered rendering (no custom focus, or image not portrait)
  if (focusY === 50 || !naturalAR || naturalAR <= 1) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius }}
        resizeMode='cover'
      />
    );
  }

  // Custom vertical positioning for portrait images
  const imgH = size * naturalAR;
  const overflow = imgH - size;
  const top = -(overflow * (focusY / 100));

  return (
    <View style={{ width: size, height: size, overflow: 'hidden', borderRadius }}>
      <Image source={{ uri }} style={{ position: 'absolute', width: size, height: imgH, top }} />
    </View>
  );
}
