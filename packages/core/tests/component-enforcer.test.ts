import { describe, it, expect } from 'vitest';
import {
  scanRestrictedComponents,
  transformRestrictedComponents,
} from '../src/tokens/component-enforcer';
import type { EnforceComponentsConfig } from '../src/types';

describe('Design System Component Enforcement', () => {
  const config: EnforceComponentsConfig = {
    enabled: true,
    severity: 'error',
    restricted_elements: {
      button: {
        use: 'Button',
        from: '@/components/ui/button',
        message: 'Vui lòng sử dụng <Button /> từ Design System thay vì thẻ <button> trần.',
      },
      a: {
        use: 'Link',
        from: 'next/link',
        message: 'Dùng <Link> từ next/link để tối ưu navigation.',
      },
      img: {
        use: 'Image',
        from: 'next/image',
      },
    },
  };

  it('should detect raw HTML elements restricted by Design System', () => {
    const code = `
      export function LoginForm() {
        return (
          <form>
            <a href="/forgot">Quên mật khẩu</a>
            <button type="submit">Đăng nhập</button>
          </form>
        );
      }
    `;

    const violations = scanRestrictedComponents({
      filePath: 'src/components/LoginForm.tsx',
      code,
      config,
    });

    expect(violations.length).toBe(2);
    expect(violations[0].ruleId).toBe('restricted-element');
    expect(violations[0].suggestedFix?.replacement).toBe('Link');
    expect(violations[0].suggestedFix?.importFrom).toBe('next/link');

    expect(violations[1].ruleId).toBe('restricted-element');
    expect(violations[1].suggestedFix?.replacement).toBe('Button');
    expect(violations[1].suggestedFix?.importFrom).toBe('@/components/ui/button');
  });

  it('should exempt the component definition file itself', () => {
    const code = `
      export function Button(props) {
        return <button {...props} className="btn" />;
      }
    `;

    const violations = scanRestrictedComponents({
      filePath: 'src/components/ui/Button.tsx',
      code,
      config,
    });

    // In Button.tsx, rendering raw <button> is exempted!
    expect(violations.length).toBe(0);
  });

  it('should auto-transform restricted elements to custom components and inject imports', () => {
    const code = `export function Card() {
  return <div><button onClick={() => {}}>Xác nhận</button></div>;
}`;

    const violations = scanRestrictedComponents({
      filePath: 'src/components/Card.tsx',
      code,
      config,
    });

    const result = transformRestrictedComponents(code, violations);

    expect(result.hasChanged).toBe(true);
    expect(result.code).toContain("import { Button } from '@/components/ui/button';");
    expect(result.code).toContain("<Button onClick={() => {}}>Xác nhận</Button>");
  });
});
