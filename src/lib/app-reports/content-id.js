// Shared by the site and the Email Worker; no Node or DOM dependencies.
export const CID_IMAGE_RE = /<img\b[^>]*?\bsrc\s*=\s*["']?cid:([^"'\s>]+)[^>]*>/gi;

export const bareContentId = (id) => String(id ?? '').trim().replace(/^<|>$/g, '');

// Only the URI reference is percent-encoded, not the Content-ID header itself.
export function decodeCidReference(id) {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}
