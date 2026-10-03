import yaml from 'js-yaml';
import { PageFrontMatter } from '../types';
import { generateUUID } from './id';

export interface ParsedMarkdown {
  frontMatter: PageFrontMatter;
  body: string;
  content: string;
}

/**
 * Parses markdown text with optional YAML front-matter.
 * If front-matter is missing or invalid, derives title from fallbackTitle and creates a new UUID.
 * Unknown front-matter keys are strictly preserved.
 */
export function parsePageMarkdown(rawText: string, fallbackTitle: string = 'Untitled'): ParsedMarkdown {
  const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = rawText.match(frontMatterRegex);

  let frontMatter: PageFrontMatter;
  let body: string;

  if (match) {
    try {
      const parsedYaml = yaml.load(match[1]) as Record<string, unknown>;
      if (parsedYaml && typeof parsedYaml === 'object') {
        const id = typeof parsedYaml.id === 'string' && parsedYaml.id ? parsedYaml.id : generateUUID();
        const title = typeof parsedYaml.title === 'string' && parsedYaml.title ? parsedYaml.title : fallbackTitle;
        const tags = Array.isArray(parsedYaml.tags) ? parsedYaml.tags.map(String) : [];
        const favorite = Boolean(parsedYaml.favorite);
        const created = typeof parsedYaml.created === 'string' ? parsedYaml.created : new Date().toISOString();
        const updated = typeof parsedYaml.updated === 'string' ? parsedYaml.updated : new Date().toISOString();

        frontMatter = {
          ...parsedYaml, // Preserves all unknown custom front-matter keys!
          id,
          title,
          tags,
          favorite,
          created,
          updated,
        };
      } else {
        frontMatter = createDefaultFrontMatter(fallbackTitle);
      }
    } catch {
      // In case of malformed YAML, treat as normal markdown and preserve body
      frontMatter = createDefaultFrontMatter(fallbackTitle);
    }
    body = rawText.slice(match[0].length);
  } else {
    // No front matter at all
    frontMatter = createDefaultFrontMatter(fallbackTitle);
    body = rawText;
  }

  return { frontMatter, body, content: body };
}

export function createDefaultFrontMatter(title: string): PageFrontMatter {
  const now = new Date().toISOString();
  return {
    id: generateUUID(),
    title,
    tags: [],
    favorite: false,
    created: now,
    updated: now,
  };
}

/**
 * Serializes front-matter and markdown body into standard markdown format.
 * Preserves all custom front-matter properties.
 */
export function serializePageMarkdown(frontMatter: PageFrontMatter, body: string): string {
  // Ensure required fields are set
  const payload: Record<string, unknown> = {
    ...frontMatter,
    id: frontMatter.id,
    title: frontMatter.title,
    tags: frontMatter.tags || [],
    favorite: Boolean(frontMatter.favorite),
    created: frontMatter.created || new Date().toISOString(),
    updated: frontMatter.updated || new Date().toISOString(),
  };

  const yamlString = yaml.dump(payload, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
  });

  return `---\n${yamlString}---\n\n${(body || '').trimStart()}`;
}
