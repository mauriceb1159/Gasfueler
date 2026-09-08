const storeImagesPublicPath = '/storage/v1/object/public/store-images/';

export function getStoreImageSource(imageUrl: string | null) {
  if (!imageUrl) return null;

  const trimmedUrl = imageUrl.trim();

  if (!trimmedUrl) return null;

  if (trimmedUrl.startsWith('/api/store-images/')) {
    return trimmedUrl;
  }

  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  try {
    const url = new URL(trimmedUrl);
    const storeImageIndex = url.pathname.indexOf(storeImagesPublicPath);

    if (storeImageIndex !== -1) {
      const objectPath = url.pathname.slice(
        storeImageIndex + storeImagesPublicPath.length
      );

      if (objectPath) {
        return `/api/store-images/${objectPath
          .split('/')
          .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
          .join('/')}`;
      }
    }
  } catch {
    return null;
  }

  return trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('http://')
    ? trimmedUrl
    : null;
}
