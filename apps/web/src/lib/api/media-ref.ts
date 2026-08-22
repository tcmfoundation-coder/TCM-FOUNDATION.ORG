// Shared shape for the nested media relation returned by admin SELECTs
// across content/resource services (logo, photo, coverImage, heroImage).
export interface MediaRef {
  id: string;
  cloudinaryPublicId: string;
  secureUrl: string;
  altText: string;
}
