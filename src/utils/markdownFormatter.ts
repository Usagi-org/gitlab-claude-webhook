/**
 * Formats Claude Code output to ensure proper GitLab Markdown rendering
 */
export class MarkdownFormatter {
  /**
   * Formats Claude's output to be GitLab-compatible Markdown
   */
  public static formatForGitLab(content: string): string {
    if (!content || !content.trim()) {
      return content;
    }

    let formatted = content;

    // Fix code block markers
    formatted = this.fixCodeBlocks(formatted);

    // Ensure proper line breaks
    formatted = this.normalizeLineBreaks(formatted);

    // Fix nested formatting issues
    formatted = this.fixNestedFormatting(formatted);

    return formatted.trim();
  }

  /**
   * Fixes code block markers to ensure they are properly closed
   */
  private static fixCodeBlocks(content: string): string {
    // Count opening and closing code block markers
    const openingMarkers = (content.match(/```[\w]*\n/g) || []).length;
    const closingMarkers = (content.match(/\n```/g) || []).length;

    let result = content;

    // If there are unclosed code blocks, close them
    if (openingMarkers > closingMarkers) {
      const diff = openingMarkers - closingMarkers;
      for (let i = 0; i < diff; i++) {
        result += '\n```';
      }
    }

    // Ensure code blocks have proper spacing
    result = result.replace(/```(\w+)\n/g, '```$1\n');
    result = result.replace(/\n```\n/g, '\n```\n\n');

    return result;
  }

  /**
   * Normalizes line breaks for consistent rendering
   */
  private static normalizeLineBreaks(content: string): string {
    // Replace multiple consecutive newlines with double newlines
    let result = content.replace(/\n{3,}/g, '\n\n');

    // Ensure proper spacing around headers
    result = result.replace(/\n(#{1,6}\s)/g, '\n\n$1');
    result = result.replace(/(#{1,6}\s[^\n]+)\n/g, '$1\n\n');

    return result;
  }

  /**
   * Fixes nested formatting issues that might break rendering
   */
  private static fixNestedFormatting(content: string): string {
    let result = content;

    // Escape special characters inside inline code
    result = result.replace(/`([^`]+)`/g, (match, code) => {
      const escaped = code.replace(/[*_~]/g, '\\$&');
      return `\`${escaped}\``;
    });

    return result;
  }
}
