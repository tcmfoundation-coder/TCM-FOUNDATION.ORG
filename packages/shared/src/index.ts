// Shared enums/constants used by both apps/web and apps/api so the two
// never drift out of sync on values that cross the HTTP boundary.
// Prisma is the source of truth for persisted enums on the API side —
// these mirror those values for the frontend, which has no Prisma client.

export enum PrivilegedRole {
  CONTENT_EDITOR = "CONTENT_EDITOR",
  ADMINISTRATOR = "ADMINISTRATOR",
  SUPER_ADMINISTRATOR = "SUPER_ADMINISTRATOR",
}

export enum UserRoleStatus {
  PENDING_MFA = "PENDING_MFA",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

export enum CategoryAppliesTo {
  BLOG = "BLOG",
  ARTICLE = "ARTICLE",
  SPOTLIGHT = "SPOTLIGHT",
  OPPORTUNITY = "OPPORTUNITY",
}

export enum OpportunityType {
  CAREER = "CAREER",
  BUSINESS = "BUSINESS",
  EDUCATION = "EDUCATION",
}

export enum ApplicationFieldType {
  SHORT_TEXT = "SHORT_TEXT",
  LONG_TEXT = "LONG_TEXT",
  EMAIL = "EMAIL",
  PHONE = "PHONE",
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
}

export enum ApplicationSubmissionReviewStatus {
  NEW = "NEW",
  IN_REVIEW = "IN_REVIEW",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
}

export enum SupportRequestStatus {
  NEW = "NEW",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum NewsletterSubscriberStatus {
  SUBSCRIBED = "SUBSCRIBED",
  UNSUBSCRIBED = "UNSUBSCRIBED",
}

export enum CallForApplicationStatus {
  DRAFT = "DRAFT",
  OPEN = "OPEN",
  CLOSED = "CLOSED",
}

export enum MediaType {
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
  VIDEO = "VIDEO",
}

export enum AuditAction {
  ROLE_ASSIGNED = "ROLE_ASSIGNED",
  ROLE_ACTIVATED = "ROLE_ACTIVATED",
  ROLE_REVOKED = "ROLE_REVOKED",
  ROLE_ASSIGNMENT_EXPIRED = "ROLE_ASSIGNMENT_EXPIRED",
  ADMIN_LOGIN_SUCCEEDED = "ADMIN_LOGIN_SUCCEEDED",
  ADMIN_LOGIN_FAILED = "ADMIN_LOGIN_FAILED",
  ADMIN_LOGOUT = "ADMIN_LOGOUT",
  MFA_VERIFICATION_SUCCEEDED = "MFA_VERIFICATION_SUCCEEDED",
  MFA_VERIFICATION_FAILED = "MFA_VERIFICATION_FAILED",
  AUTHORIZATION_DENIED = "AUTHORIZATION_DENIED",
  CONTENT_CREATED = "CONTENT_CREATED",
  CONTENT_UPDATED = "CONTENT_UPDATED",
  CONTENT_DELETED = "CONTENT_DELETED",
  MEDIA_UPLOADED = "MEDIA_UPLOADED",
  MEDIA_DELETED = "MEDIA_DELETED",
  SUBMISSION_STATUS_CHANGED = "SUBMISSION_STATUS_CHANGED",
}
