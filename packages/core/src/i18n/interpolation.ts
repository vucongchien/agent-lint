import * as t from '@babel/types';
import { generateI18nKey } from './slug';

export interface InterpolationResult {
  icuString: string;
  generatedKey: string;
  params: { name: string; expressionCode: string }[];
  replacementCode: string;
}

/**
 * Bóc tách TemplateLiteral thành chuỗi ICU message và object tham số
 * Ví dụ: `Xin chào ${user.name}, bạn có ${count} thông báo`
 * -> icuString: "Xin chào {name}, bạn có {count} thông báo"
 * -> params: [{ name: "name", expressionCode: "user.name" }, { name: "count", expressionCode: "count" }]
 * -> replacementCode: "{t('xin_chao_thong_bao', { name: user.name, count: count })}"
 */
export function parseTemplateLiteralInterpolation(
  node: t.TemplateLiteral,
  code: string,
  options: {
    funcName?: string;
    filePath?: string;
    strategy?: 'slug' | 'camelCase' | 'file_scoped' | 'hash';
    maxLength?: number;
    prefix?: string;
  } = {}
): InterpolationResult | null {
  const funcName = options.funcName || 't';
  const { quasis, expressions } = node;

  let fullRawText = '';
  let icuString = '';
  const params: { name: string; expressionCode: string }[] = [];
  const usedParamNames = new Set<string>();

  for (let i = 0; i < quasis.length; i++) {
    const quasi = quasis[i];
    const rawVal = quasi.value.raw;
    fullRawText += rawVal;
    icuString += rawVal;

    if (i < expressions.length) {
      const expr = expressions[i];
      let exprCode = '';

      if (expr.start !== undefined && expr.end !== undefined && expr.start !== null && expr.end !== null) {
        exprCode = code.slice(expr.start, expr.end);
      } else if (t.isIdentifier(expr)) {
        exprCode = expr.name;
      } else {
        exprCode = `param_${i + 1}`;
      }

      // Đặt tên param ngắn gọn từ expression (ví dụ user.name -> name, items.length -> count / length)
      let paramName = 'param';
      if (t.isIdentifier(expr)) {
        paramName = expr.name;
      } else if (t.isMemberExpression(expr) && t.isIdentifier(expr.property)) {
        paramName = expr.property.name;
      } else {
        paramName = `val${i + 1}`;
      }

      // Xử lý chống trùng paramName
      let finalParamName = paramName;
      let counter = 1;
      while (usedParamNames.has(finalParamName)) {
        finalParamName = `${paramName}_${counter++}`;
      }
      usedParamNames.add(finalParamName);

      params.push({ name: finalParamName, expressionCode: exprCode });
      icuString += `{${finalParamName}}`;
      fullRawText += ` ${finalParamName} `;
    }
  }

  const trimmedText = fullRawText.trim();
  if (!trimmedText) return null;

  const generatedKey = generateI18nKey(trimmedText, {
    strategy: options.strategy || 'slug',
    maxLength: options.maxLength || 40,
    prefix: options.prefix || '',
    filePath: options.filePath,
  });

  const paramsObjectStr = params
    .map((p) => (p.name === p.expressionCode ? p.name : `${p.name}: ${p.expressionCode}`))
    .join(', ');

  const replacementCode = params.length > 0
    ? `{${funcName}('${generatedKey}', { ${paramsObjectStr} })}`
    : `{${funcName}('${generatedKey}')}`;

  return {
    icuString,
    generatedKey,
    params,
    replacementCode,
  };
}
