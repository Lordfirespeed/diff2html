import HoganJsUtils from './hoganjs-utils';
import * as Rematch from './rematch';
import * as renderUtils from './render-utils';
import {
  DiffFile,
  DiffLine,
  LineType,
  DiffBlock,
  DiffLineDeleted,
  DiffLineContent,
  DiffLineContext,
  DiffLineInserted,
} from './types';

export interface LineByLineRendererConfig extends renderUtils.RenderConfig {
  renderNothingWhenEmpty?: boolean;
  matchingMaxComparisons?: number;
  maxLineSizeInBlockForComparison?: number;
}

export const defaultLineByLineRendererConfig = {
  ...renderUtils.defaultRenderConfig,
  renderNothingWhenEmpty: false,
  matchingMaxComparisons: 2500,
  maxLineSizeInBlockForComparison: 200,
};

const genericTemplatesPath = 'generic';
const baseTemplatesPath = 'line-by-line';
const iconsBaseTemplatesPath = 'icon';
const tagsBaseTemplatesPath = 'tag';

export default class LineByLineRenderer {
  private readonly hoganUtils: HoganJsUtils;
  private readonly config: typeof defaultLineByLineRendererConfig;

  constructor(hoganUtils: HoganJsUtils, config: LineByLineRendererConfig = {}) {
    this.hoganUtils = hoganUtils;
    this.config = { ...defaultLineByLineRendererConfig, ...config };
  }

  render(diffFiles: DiffFile[]): string {
    const diffsHtml = diffFiles
      .map(file => {
        let diffs;
        if (file.blocks.length) {
          diffs = this.generateFileHtml(file);
        } else {
          diffs = this.generateEmptyDiff();
        }
        return this.makeFileDiffHtml(file, diffs);
      })
      .join('\n');

    return this.hoganUtils.render(genericTemplatesPath, 'wrapper', { content: diffsHtml });
  }

  makeFileDiffHtml(file: DiffFile, diffs: string): string {
    if (this.config.renderNothingWhenEmpty && Array.isArray(file.blocks) && file.blocks.length === 0) return '';

    const fileDiffTemplate = this.hoganUtils.template(baseTemplatesPath, 'file-diff');
    const filePathTemplate = this.hoganUtils.template(genericTemplatesPath, 'file-path');
    const fileIconTemplate = this.hoganUtils.template(iconsBaseTemplatesPath, 'file');
    const fileTagTemplate = this.hoganUtils.template(tagsBaseTemplatesPath, renderUtils.getFileIcon(file));

    return fileDiffTemplate.render({
      file: file,
      fileHtmlId: renderUtils.getHtmlId(file),
      diffs: diffs,
      filePath: filePathTemplate.render(
        {
          fileDiffName: renderUtils.filenameDiff(file),
        },
        {
          fileIcon: fileIconTemplate,
          fileTag: fileTagTemplate,
        },
      ),
      overflowClass: this.config.diffOverflow.concat('-overflow'),
    });
  }

  generateEmptyDiff(): string {
    return (
      '<tr' +
      this.hoganUtils.render(genericTemplatesPath, 'empty-diff', {
        contentClass: 'd2h-code-line',
        colspan: '2',
        CSSLineClass: renderUtils.CSSLineClass,
      }) +
      '</tr>'
    );
  }

  generateFileHtml(file: DiffFile): string {
    const matcher = Rematch.newMatcherFn(
      Rematch.newDistanceFn((e: DiffLine) => renderUtils.deconstructLine(e.content, file.isCombined).content),
    );

    return file.blocks
      .map(block => {
        const lines: string[] = [];

        lines.push(
          this.hoganUtils.render(genericTemplatesPath, 'block-header', {
            CSSLineClass: renderUtils.CSSLineClass,
            margin_colspan: '2',
            colspan: '1',
            blockHeader: file.isTooBig ? block.header : renderUtils.escapeForHtml(block.header),
            lineClass: 'd2h-code-linenumber',
            contentClass: 'd2h-code-line',
          }),
        );

        this.applyLineGrouping(block).forEach(([contextLines, oldLines, newLines]) => {
          if (oldLines.length && newLines.length && !contextLines.length) {
            this.applyRematchMatching(oldLines, newLines, matcher).map(([oldLines, newLines]) => {
              const { left, right } = this.processChangedLines(file.isCombined, oldLines, newLines);
              lines.push(...left);
              lines.push(...right);
            });
          } else if (contextLines.length) {
            contextLines.forEach(line => {
              const { prefix, content } = renderUtils.deconstructLine(line.content, file.isCombined);
              lines.push(
                this.generateSingleLineHtml({
                  type: renderUtils.CSSLineClass.CONTEXT,
                  prefix: prefix,
                  content: content,
                  oldNumber: line.oldNumber,
                  newNumber: line.newNumber,
                }),
              );
            });
          } else if (oldLines.length || newLines.length) {
            const { left, right } = this.processChangedLines(file.isCombined, oldLines, newLines);
            lines.push(...left);
            lines.push(...right);
          } else {
            console.error('Unknown state reached while processing groups of lines', contextLines, oldLines, newLines);
          }
        });

        return lines;
      })
      .map((block_html: string[]) => {
        return block_html.map(line => `<tr>${line}</tr>`).join('\n');
      })
      .join('\n');
  }

  applyLineGrouping(block: DiffBlock): DiffLineGroups {
    const blockLinesGroups: DiffLineGroups = [];

    let oldLines: (DiffLineDeleted & DiffLineContent)[] = [];
    let newLines: (DiffLineInserted & DiffLineContent)[] = [];

    for (let i = 0; i < block.lines.length; i++) {
      const diffLine = block.lines[i];

      if (
        (diffLine.type !== LineType.INSERT && newLines.length) ||
        (diffLine.type === LineType.CONTEXT && oldLines.length > 0)
      ) {
        blockLinesGroups.push([[], oldLines, newLines]);
        oldLines = [];
        newLines = [];
      }

      if (diffLine.type === LineType.CONTEXT) {
        blockLinesGroups.push([[diffLine], [], []]);
      } else if (diffLine.type === LineType.INSERT && oldLines.length === 0) {
        blockLinesGroups.push([[], [], [diffLine]]);
      } else if (diffLine.type === LineType.INSERT && oldLines.length > 0) {
        newLines.push(diffLine);
      } else if (diffLine.type === LineType.DELETE) {
        oldLines.push(diffLine);
      }
    }

    if (oldLines.length || newLines.length) {
      blockLinesGroups.push([[], oldLines, newLines]);
      oldLines = [];
      newLines = [];
    }

    return blockLinesGroups;
  }

  applyRematchMatching(
    oldLines: DiffLine[],
    newLines: DiffLine[],
    matcher: Rematch.MatcherFn<DiffLine>,
  ): DiffLine[][][] {
    const comparisons = oldLines.length * newLines.length;
    const maxLineSizeInBlock = Math.max.apply(
      null,
      [0].concat(oldLines.concat(newLines).map(elem => elem.content.length)),
    );
    const doMatching =
      comparisons < this.config.matchingMaxComparisons &&
      maxLineSizeInBlock < this.config.maxLineSizeInBlockForComparison &&
      (this.config.matching === 'lines' || this.config.matching === 'words');

    return doMatching ? matcher(oldLines, newLines) : [[oldLines, newLines]];
  }

  processChangedLines(isCombined: boolean, oldLines: DiffLine[], newLines: DiffLine[]): FileHtml {
    const fileHtml: FileHtml = {
      left: [],
      right: [],
    };

    const maxLinesNumber = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLinesNumber; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      const diff =
        oldLine !== undefined && newLine !== undefined
          ? renderUtils.diffHighlight(oldLine.content, newLine.content, isCombined, this.config)
          : undefined;

      const preparedOldLine =
        oldLine !== undefined && oldLine.oldNumber !== undefined
          ? {
              ...(diff !== undefined
                ? {
                    prefix: diff.oldLine.prefix,
                    content: diff.oldLine.content,
                    type: renderUtils.CSSLineClass.DELETE_CHANGES,
                  }
                : {
                    ...renderUtils.deconstructLine(oldLine.content, isCombined),
                    type: renderUtils.toCSSClass(oldLine.type),
                  }),
              oldNumber: oldLine.oldNumber,
              newNumber: oldLine.newNumber,
            }
          : undefined;

      const preparedNewLine =
        newLine !== undefined && newLine.newNumber !== undefined
          ? {
              ...(diff !== undefined
                ? {
                    prefix: diff.newLine.prefix,
                    content: diff.newLine.content,
                    type: renderUtils.CSSLineClass.INSERT_CHANGES,
                  }
                : {
                    ...renderUtils.deconstructLine(newLine.content, isCombined),
                    type: renderUtils.toCSSClass(newLine.type),
                  }),
              oldNumber: newLine.oldNumber,
              newNumber: newLine.newNumber,
            }
          : undefined;

      const { left, right } = this.generateLineHtml(preparedOldLine, preparedNewLine);
      fileHtml.left.push(left);
      fileHtml.right.push(right);
    }

    return fileHtml;
  }

  generateLineHtml(oldLine?: DiffPreparedLine, newLine?: DiffPreparedLine): LineHtml {
    return {
      left: this.generateSingleLineHtml(oldLine),
      right: this.generateSingleLineHtml(newLine),
    };
  }

  generateSingleLineHtml(line?: DiffPreparedLine): string {
    if (line === undefined) return '';

    const oldLineNumberHtml = this.hoganUtils.render(genericTemplatesPath, 'line-number', {
      type: line.type,
      lineClass: line.oldNumber ? 'd2h-code-linenumber' : 'd2h-code-emptyplaceholder',
      lineNumber: line.oldNumber,
    });

    const newLineNumberHtml = this.hoganUtils.render(genericTemplatesPath, 'line-number', {
      type: line.type,
      lineClass: line.newNumber ? 'd2h-code-linenumber' : 'd2h-code-emptyplaceholder',
      lineNumber: line.newNumber,
    });

    const newLineContentHtml = this.hoganUtils.render(genericTemplatesPath, 'line', {
      type: line.type,
      contentClass: 'd2h-code-line',
      prefix: line.prefix === ' ' ? '&nbsp;' : line.prefix,
      content: line.content,
    });

    return oldLineNumberHtml.concat(newLineNumberHtml, newLineContentHtml);
  }
}

type DiffLineGroups = [
  (DiffLineContext & DiffLineContent)[],
  (DiffLineDeleted & DiffLineContent)[],
  (DiffLineInserted & DiffLineContent)[],
][];

type DiffPreparedLine = {
  type: renderUtils.CSSLineClass;
  prefix: string;
  content: string;
  oldNumber?: number;
  newNumber?: number;
};

type LineHtml = {
  left: string;
  right: string;
};

type FileHtml = {
  left: string[];
  right: string[];
};
