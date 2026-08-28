import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { ComponentDeduplicationConfig, Violation } from '../types';

const traverse = (typeof _traverse === 'function' ? _traverse : (_traverse as any).default) as typeof _traverse;

export interface SubtreeNode {
  tag: string;
  classes: string[];
  children: SubtreeNode[];
}

export interface JSXBlockFingerprint {
  filePath: string;
  line: number;
  column: number;
  skeleton: string;
  classes: Set<string>;
  elementCount: number;
}

/**
 * Trích xuất skeleton cấu trúc và tập hợp class từ một JSXElement
 */
function extractSubtreeFingerprint(
  node: t.JSXElement,
  filePath: string
): JSXBlockFingerprint | null {
  let elementCount = 0;
  const classes = new Set<string>();

  function walk(elem: t.JSXElement): string {
    elementCount++;
    const opening = elem.openingElement;
    const tagName = t.isJSXIdentifier(opening.name) ? opening.name.name : 'Unknown';

    // Lấy class từ className
    for (const attr of opening.attributes) {
      if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'className') {
        if (t.isStringLiteral(attr.value)) {
          attr.value.value.split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
        }
      }
    }

    const childSkeletons: string[] = [];
    for (const child of elem.children) {
      if (t.isJSXElement(child)) {
        childSkeletons.push(walk(child));
      }
    }

    if (childSkeletons.length > 0) {
      return `${tagName}>(${childSkeletons.join('+')})`;
    }
    return tagName;
  }

  const skeleton = walk(node);
  const loc = node.openingElement.loc;

  return {
    filePath,
    line: loc?.start.line || 1,
    column: loc?.start.column || 1,
    skeleton,
    classes,
    elementCount,
  };
}

/**
 * Tính toán độ tương đồng Jaccard giữa 2 tập hợp classes
 */
function calculateJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0;
  if (a.size === 0 || b.size === 0) return 0.0;

  let intersectionCount = 0;
  for (const item of a) {
    if (b.has(item)) intersectionCount++;
  }

  const unionCount = a.size + b.size - intersectionCount;
  return unionCount === 0 ? 1.0 : intersectionCount / unionCount;
}

/**
 * Quét toàn bộ project để tìm các Component hoặc Block JSX có cấu trúc và CSS trùng lặp
 */
export function scanDuplicateLayoutViolations(
  files: { filePath: string; code: string }[],
  config: ComponentDeduplicationConfig
): Violation[] {
  if (!config || !config.enabled || config.severity === 'off') {
    return [];
  }

  const allBlocks: JSXBlockFingerprint[] = [];

  for (const { filePath, code } of files) {
    let ast: any;
    try {
      ast = parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'dynamicImport',
        ],
      });
    } catch {
      continue;
    }

    traverse(ast, {
      JSXElement(path) {
        // Chỉ lấy các block cấp cao (không phải con trực tiếp của thẻ con khác trong cùng nhánh)
        const isRootBlock = !path.parentPath.isJSXElement();
        if (isRootBlock) {
          const fp = extractSubtreeFingerprint(path.node, filePath);
          if (fp && fp.elementCount >= config.min_element_count) {
            allBlocks.push(fp);
          }
        }
      },
    });
  }

  const violations: Violation[] = [];
  const reportedPairs = new Set<string>();

  // Nhóm các block theo skeleton giống nhau
  const skeletonGroups = new Map<string, JSXBlockFingerprint[]>();
  for (const block of allBlocks) {
    if (!skeletonGroups.has(block.skeleton)) {
      skeletonGroups.set(block.skeleton, []);
    }
    skeletonGroups.get(block.skeleton)!.push(block);
  }

  for (const [skeleton, group] of skeletonGroups.entries()) {
    // Áp dụng Quy tắc số 3 (Rule of Three): xuất hiện từ min_occurrences lần trở lên
    if (group.length >= config.min_occurrences) {
      // Kiểm tra độ tương đồng CSS giữa các block
      for (let i = 0; i < group.length; i++) {
        const b1 = group[i];
        let similarCount = 1;
        const matchingFiles: string[] = [b1.filePath];

        for (let j = i + 1; j < group.length; j++) {
          const b2 = group[j];
          const similarity = calculateJaccardSimilarity(b1.classes, b2.classes);

          if (similarity >= config.similarity_threshold) {
            similarCount++;
            matchingFiles.push(b2.filePath);
          }
        }

        if (similarCount >= config.min_occurrences) {
          const key = `${b1.filePath}:${b1.line}`;
          if (!reportedPairs.has(key)) {
            reportedPairs.add(key);

            const distinctFiles = Array.from(new Set(matchingFiles));
            violations.push({
              ruleId: 'duplicate-layout',
              severity: config.severity,
              message: `Duplicate component layout detected (${similarCount} occurrences across files: ${distinctFiles.join(', ')}). Consider abstracting into a shared reusable component.`,
              file: b1.filePath,
              loc: {
                line: b1.line,
                column: b1.column,
                start: 0,
                end: 0,
              },
              rawText: skeleton,
              metadata: {
                type: 'duplicate-component-structure',
                skeleton,
                similarCount,
                matchingFiles: distinctFiles,
              },
            });
          }
        }
      }
    }
  }

  return violations;
}
