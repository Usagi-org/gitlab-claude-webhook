import { FileChange } from '../types/common';
import { getFormattedTimestamp } from '../utils/timezone';

export interface MRInfo {
  title: string;
  description: string;
  commitMessage: string;
}

export interface MROptions {
  instruction: string;
  context: string;
  changes: FileChange[];
  projectUrl?: string;
}

/**
 * Generates improved merge request title and description based on instruction and changes
 */
export class MRGenerator {
  private static readonly INSTRUCTION_PATTERNS = {
    feature: [
      /add|implement|create|build|develop/i,
      /new feature|feature/i,
      /component|function|endpoint|api/i,
    ],
    fix: [/fix|resolve|correct|repair/i, /bug|issue|error|problem/i, /broken|failing|not working/i],
    refactor: [
      /refactor|restructure|reorganize/i,
      /clean up|cleanup|improve structure/i,
      /optimize|performance/i,
    ],
    docs: [/document|documentation|readme/i, /comment|comments|explain/i, /guide|tutorial/i],
    style: [/format|formatting|style/i, /eslint|prettier|lint/i, /indentation|spacing/i],
    test: [/test|testing|spec|unit test/i, /coverage|jest|mocha/i],
    chore: [
      /update|upgrade|bump/i,
      /dependency|dependencies|package/i,
      /config|configuration/i,
      /setup|install/i,
    ],
  };

  public static generateMR(options: MROptions): MRInfo {
    const { instruction, changes } = options;

    const type = this.determineChangeType(instruction, changes);
    const scope = this.determineScope(changes);
    const title = this.generateTitle(type, instruction, scope);
    const description = this.generateDescription(options, type);

    return { title, description, commitMessage: this.generateCommitMessage(title) };
  }

  private static determineChangeType(instruction: string, changes: FileChange[]): string {
    // Check instruction content for type hints
    for (const [type, patterns] of Object.entries(this.INSTRUCTION_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(instruction))) {
        return type;
      }
    }

    // Analyze file changes for type hints
    if (changes.some(c => c.path.includes('test') || c.path.includes('spec'))) {
      return 'test';
    }

    if (changes.some(c => c.path.endsWith('.md') || c.path.includes('README'))) {
      return 'docs';
    }

    if (changes.some(c => c.type === 'created')) {
      return 'feat';
    }

    if (changes.some(c => c.type === 'deleted')) {
      return 'refactor';
    }

    // Default to feat for new functionality
    return 'feat';
  }

  private static determineScope(changes: FileChange[]): string | null {
    if (changes.length === 0) return null;

    // Group files by their primary directory/component
    const directories = changes
      .map(change => {
        const parts = change.path.split('/');
        if (parts.length > 1) {
          return parts[0] === 'src' ? parts[1] : parts[0];
        }
        return null;
      })
      .filter(Boolean);

    // If most changes are in one directory, use it as scope
    const dirCount = directories.reduce(
      (acc, dir) => {
        acc[dir!] = (acc[dir!] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topDir = Object.entries(dirCount).sort(([, a], [, b]) => b - a)[0];

    if (topDir && topDir[1] > changes.length * 0.6) {
      return topDir[0];
    }

    // Check for specific file types
    if (changes.some(c => c.path.includes('api') || c.path.includes('service'))) {
      return 'api';
    }

    if (changes.some(c => c.path.includes('component') || c.path.includes('ui'))) {
      return 'ui';
    }

    if (changes.some(c => c.path.includes('config') || c.path.includes('settings'))) {
      return 'config';
    }

    return null;
  }

  private static generateTitle(type: string, instruction: string, scope: string | null): string {
    // Generate summary based on file changes rather than user instruction
    let summary = this.generateSummaryFromChanges(type, scope);

    // Format as conventional commit
    const prefix = scope ? `${type}(${scope})` : type;
    const title = `${prefix}: ${summary}`;

    // Ensure title doesn't exceed 72 characters
    if (title.length > 72) {
      const maxSummaryLength = 72 - prefix.length - 2; // 2 for ': '
      summary = summary.substring(0, maxSummaryLength - 3) + '...';
      return `${prefix}: ${summary}`;
    }

    return title;
  }

  private static generateSummaryFromChanges(type: string, scope: string | null): string {
    // Generate professional summary based on change type and scope
    const summaryMap: Record<string, string> = {
      feat: scope ? `add ${scope} functionality` : 'add new functionality',
      fix: scope ? `fix ${scope} issues` : 'fix bugs and issues',
      refactor: scope ? `refactor ${scope} code` : 'refactor code structure',
      docs: scope ? `update ${scope} documentation` : 'update documentation',
      style: scope ? `format ${scope} code` : 'format code style',
      test: scope ? `add ${scope} tests` : 'add test coverage',
      chore: scope ? `update ${scope} configuration` : 'update configuration',
    };

    return summaryMap[type] || (scope ? `update ${scope}` : 'update code');
  }

  private static generateDescription(options: MROptions, type: string): string {
    const { context, changes } = options;

    let description = '';

    // Add summary section - only include basic context without conversation history
    description += '## Summary\n\n';
    description += `This merge request contains automated changes made by Claude AI assistant.\n\n`;

    // Add simplified context - extract only the essential information
    const simplifiedContext = this.extractEssentialContext(context);
    if (simplifiedContext) {
      description += `**Source:** ${simplifiedContext}\n\n`;
    }

    // Add changes section
    if (changes.length > 0) {
      description += '## Changes Made\n\n';

      const changesByType = this.groupChangesByType(changes);

      for (const [changeType, files] of Object.entries(changesByType)) {
        if (files.length > 0) {
          description += `### ${this.formatChangeType(changeType)}\n`;
          files.forEach(file => {
            description += `- \`${file.path}\`\n`;
          });
          description += '\n';
        }
      }
    }

    // Add type-specific sections
    description += this.addTypeSpecificSections(type);

    // Add testing section for non-doc changes
    if (type !== 'docs' && changes.some(c => !c.path.endsWith('.md'))) {
      description += '## Testing\n\n';
      description += '- [ ] Code changes have been tested locally\n';
      description += '- [ ] All existing tests pass\n';
      if (type === 'feat') {
        description += '- [ ] New functionality has appropriate test coverage\n';
      }
      description += '\n';
    }

    // Add footer
    description += '---\n\n';
    description += '*🤖 This merge request was generated automatically by Claude Webhook Bot*\n';
    description += `*Generated at: ${getFormattedTimestamp('datetime')}*`;

    return description;
  }

  private static extractEssentialContext(context: string): string | null {
    if (!context || !context.trim()) {
      return null;
    }

    // Extract only the issue/MR reference, not the full conversation history
    const issueMatch = context.match(/Issue #(\d+):/);
    const mrMatch = context.match(/MR #(\d+):/);

    if (issueMatch) {
      return `Issue #${issueMatch[1]}`;
    }

    if (mrMatch) {
      return `MR #${mrMatch[1]}`;
    }

    // If no specific reference found, return first line only
    const firstLine = context.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;
  }

  private static groupChangesByType(changes: FileChange[]): Record<string, FileChange[]> {
    return {
      created: changes.filter(c => c.type === 'created'),
      modified: changes.filter(c => c.type === 'modified'),
      deleted: changes.filter(c => c.type === 'deleted'),
    };
  }

  private static formatChangeType(type: string): string {
    const typeMap: Record<string, string> = {
      created: '📝 Files Created',
      modified: '✏️ Files Modified',
      deleted: '🗑️ Files Deleted',
    };
    return typeMap[type] || type;
  }

  private static addTypeSpecificSections(type: string): string {
    let section = '';

    switch (type) {
      case 'feat':
        section += '## New Features\n\n';
        section += '- [ ] New functionality implemented as requested\n';
        section += '- [ ] Feature integrates well with existing codebase\n\n';
        break;

      case 'fix':
        section += '## Bug Fix Details\n\n';
        section += '- [ ] Issue has been resolved\n';
        section += "- [ ] Fix doesn't introduce new issues\n\n";
        break;

      case 'refactor':
        section += '## Refactoring Details\n\n';
        section += '- [ ] Code structure improved while maintaining functionality\n';
        section += '- [ ] No breaking changes introduced\n\n';
        break;

      case 'docs':
        section += '## Documentation Changes\n\n';
        section += '- [ ] Documentation is accurate and up-to-date\n';
        section += '- [ ] Examples and usage information provided where needed\n\n';
        break;
    }

    return section;
  }

  private static generateCommitMessage(title: string): string {
    // Use the generated title as the commit message header
    // This ensures commit message is based on actual changes, not user conversation
    return title;
  }
}
