import { describe, expect, it } from "vitest";
import { buildCloudinaryAttachmentUrl, sanitizeDownloadFilename } from "./cloudinary-download";

describe("sanitizeDownloadFilename", () => {
  it("keeps a normal title as-is with spaces turned into hyphens", () => {
    expect(sanitizeDownloadFilename("Annual Impact Report 2026")).toBe("Annual-Impact-Report-2026");
  });

  it("strips characters Cloudinary rejects in an fl_attachment value", () => {
    expect(sanitizeDownloadFilename("Report: Q1/Q2 (draft).final?")).toBe("Report-Q1Q2-draftfinal");
  });

  it("collapses repeated separators produced by stripping", () => {
    expect(sanitizeDownloadFilename("a   b//c")).toBe("a-bc");
  });

  it("falls back to a default when nothing safe survives sanitization", () => {
    expect(sanitizeDownloadFilename("★彼女/日本語")).toBe("download");
    expect(sanitizeDownloadFilename("")).toBe("download");
  });

  it("accepts a custom fallback", () => {
    expect(sanitizeDownloadFilename("///", "tcm-resource")).toBe("tcm-resource");
  });

  it("caps length so an unreasonably long title can't build a huge URL segment", () => {
    const result = sanitizeDownloadFilename("a".repeat(500));
    expect(result.length).toBe(100);
  });
});

describe("buildCloudinaryAttachmentUrl", () => {
  it("inserts fl_attachment right after /upload/ for a raw (document) delivery URL", () => {
    const url = buildCloudinaryAttachmentUrl(
      "https://res.cloudinary.com/tcm/raw/upload/v1700000000/reports/abc123.pdf",
      "Annual Impact Report 2026",
    );
    expect(url).toBe(
      "https://res.cloudinary.com/tcm/raw/upload/fl_attachment:Annual-Impact-Report-2026/v1700000000/reports/abc123.pdf",
    );
  });

  it("works the same for image/video delivery URLs, not just raw", () => {
    const url = buildCloudinaryAttachmentUrl(
      "https://res.cloudinary.com/tcm/image/upload/v1/photo.jpg",
      "Team Photo",
    );
    expect(url).toBe("https://res.cloudinary.com/tcm/image/upload/fl_attachment:Team-Photo/v1/photo.jpg");
  });

  it("still forces a real download for a pre-fix asset whose public ID has no extension", () => {
    // Regression case: files uploaded before the upload-time extension fix
    // existed. fl_attachment must not depend on the stored URL already
    // having an extension — Cloudinary appends the asset's real stored
    // format to the attachment filename automatically.
    const url = buildCloudinaryAttachmentUrl(
      "https://res.cloudinary.com/tcm/raw/upload/v1/x7f3k9d2",
      "Old Report",
    );
    expect(url).toBe("https://res.cloudinary.com/tcm/raw/upload/fl_attachment:Old-Report/v1/x7f3k9d2");
  });

  it("URL-encodes a sanitized name that still needs escaping in a URL path segment", () => {
    // sanitizeDownloadFilename only allows [a-zA-Z0-9 _-], so this is mostly
    // a safety net, but confirms the two functions compose correctly.
    const url = buildCloudinaryAttachmentUrl("https://res.cloudinary.com/tcm/raw/upload/v1/x.pdf", "a b_c-9");
    expect(url).toContain("fl_attachment:a-b_c-9/");
  });

  it("leaves a non-Cloudinary URL untouched rather than guessing at its shape", () => {
    const url = "https://example.com/files/report.pdf";
    expect(buildCloudinaryAttachmentUrl(url, "Report")).toBe(url);
  });

  it("leaves a Cloudinary URL with no recognizable /upload/ segment untouched", () => {
    const url = "https://res.cloudinary.com/tcm/some/other/shape";
    expect(buildCloudinaryAttachmentUrl(url, "Report")).toBe(url);
  });
});
