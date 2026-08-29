import { describe, it, expect } from 'vitest';
import { classifyActionRisk } from '../src/planner/risk-classifier';

describe('Action Risk Classifier', () => {
  it('should classify modal and tab buttons as SAFE', () => {
    const tabRes = classifyActionRisk({ tag: 'button', text: 'Chuyển Tab Dự Án' });
    expect(tabRes.riskLevel).toBe('SAFE');

    const modalRes = classifyActionRisk({ tag: 'button', text: 'Mở Chi Tiết', ariaLabel: 'Open Modal' });
    expect(modalRes.riskLevel).toBe('SAFE');
  });

  it('should classify destructive actions (Delete, Purchase, Checkout) as DESTRUCTIVE', () => {
    const deleteRes = classifyActionRisk({ tag: 'button', text: 'Delete Account' });
    expect(deleteRes.riskLevel).toBe('DESTRUCTIVE');

    const payRes = classifyActionRisk({ tag: 'button', text: 'Thanh toán ngay' });
    expect(payRes.riskLevel).toBe('DESTRUCTIVE');

    const checkoutRes = classifyActionRisk({ tag: 'button', text: 'Proceed to Checkout' });
    expect(checkoutRes.riskLevel).toBe('DESTRUCTIVE');
  });

  it('should classify external navigation (OAuth, Stripe, HTTP links) as EXTERNAL', () => {
    const oauthRes = classifyActionRisk({ tag: 'a', text: 'Login with Google', href: 'https://accounts.google.com/o/oauth2' });
    expect(oauthRes.riskLevel).toBe('EXTERNAL');

    const stripeRes = classifyActionRisk({ tag: 'a', text: 'Stripe Pay', href: 'https://checkout.stripe.com/c/pay/123' });
    expect(stripeRes.riskLevel).toBe('EXTERNAL');
  });
});
