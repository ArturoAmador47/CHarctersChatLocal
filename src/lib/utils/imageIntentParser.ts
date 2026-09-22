/**
 * Parser for detecting image generation intents in LLM responses
 *
 * Detects markers like [IMAGE: description] in text and extracts the image prompt
 */

export interface ImageIntent {
  prompt: string;
  fullMatch: string;
}

export interface ParsedContent {
  textBeforeImage: string;
  imageIntent: ImageIntent | null;
  textAfterImage: string;
  hasImageIntent: boolean;
}

// Matches [IMAGE: description] or [IMAGEN: description] (Spanish support)
const IMAGE_MARKER_REGEX = /\[(?:IMAGE|IMAGEN):\s*([^\]]+)\]/i;

/**
 * Parse content for image generation intent markers
 *
 * @example
 * parseImageIntent("Hello! [IMAGE: a cute cat] Hope you like it!")
 * // Returns:
 * // {
 * //   textBeforeImage: "Hello! ",
 * //   imageIntent: { prompt: "a cute cat", fullMatch: "[IMAGE: a cute cat]" },
 * //   textAfterImage: " Hope you like it!",
 * //   hasImageIntent: true
 * // }
 */
export function parseImageIntent(content: string): ParsedContent {
  const match = content.match(IMAGE_MARKER_REGEX);

  if (!match) {
    return {
      textBeforeImage: content,
      imageIntent: null,
      textAfterImage: '',
      hasImageIntent: false
    };
  }

  const fullMatch = match[0];
  const prompt = match[1].trim();
  const matchIndex = match.index!;

  return {
    textBeforeImage: content.slice(0, matchIndex).trim(),
    imageIntent: {
      prompt,
      fullMatch
    },
    textAfterImage: content.slice(matchIndex + fullMatch.length).trim(),
    hasImageIntent: true
  };
}

/**
 * Remove image markers from content, returning clean text
 */
export function stripImageMarkers(content: string): string {
  return content.replace(IMAGE_MARKER_REGEX, '').trim();
}

/**
 * Check if content contains an image intent marker
 */
export function hasImageIntent(content: string): boolean {
  return IMAGE_MARKER_REGEX.test(content);
}

/**
 * Extract all image intents from content (for multiple images)
 */
export function extractAllImageIntents(content: string): ImageIntent[] {
  const globalRegex = /\[(?:IMAGE|IMAGEN):\s*([^\]]+)\]/gi;
  const intents: ImageIntent[] = [];
  let match;

  while ((match = globalRegex.exec(content)) !== null) {
    intents.push({
      prompt: match[1].trim(),
      fullMatch: match[0]
    });
  }

  return intents;
}
