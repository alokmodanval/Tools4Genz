/**
 * Slug generation and validation utility.
 */

/**
 * Converts a string into a URL-friendly slug.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric chars except space and hyphen
    .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with a single hyphen
    .replace(/-+/g, '-')       // Replace multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, '');  // Trim hyphens from ends
}

/**
 * Checks if a slug is URL-safe.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
