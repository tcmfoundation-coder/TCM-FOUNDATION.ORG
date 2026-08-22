// Shared shape for the nested category/tag relations returned by admin
// SELECTs across resource services (blog, articles, spotlights). Write
// payloads use plain id arrays (categoryIds/tagIds) instead — see each
// resource's WriteInput type.
export interface CategoryRef {
  id: string;
  name: string;
}

export interface TagRef {
  id: string;
  name: string;
}
