export interface TranslationProvider {
  name: string;
  translate(text: string, fromLang: string, toLang: string): Promise<string>;
}

/**
 * Mock Translation Provider phục vụ offline testing và unit tests
 */
export class MockTranslationProvider implements TranslationProvider {
  public name = 'mock';
  private dictionary: Record<string, Record<string, string>> = {
    'Xin chào': { en: 'Hello' },
    'Đăng nhập': { en: 'Sign in' },
    'Đăng ký': { en: 'Sign up' },
    'Xác nhận': { en: 'Confirm' },
    'Hủy': { en: 'Cancel' },
  };

  constructor(customDict?: Record<string, Record<string, string>>) {
    if (customDict) {
      this.dictionary = { ...this.dictionary, ...customDict };
    }
  }

  async translate(text: string, _fromLang: string, toLang: string): Promise<string> {
    if (this.dictionary[text]?.[toLang]) {
      return this.dictionary[text][toLang];
    }
    // Giữ nguyên ICU params nếu có: {name}, {count}
    return `[${toLang.toUpperCase()}] ${text}`;
  }
}

/**
 * Google Gemini Translation Provider
 */
export class GeminiTranslationProvider implements TranslationProvider {
  public name = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
  }

  async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    if (!this.apiKey) {
      return `[TODO: TRANSLATE (${toLang})] ${text}`;
    }

    try {
      const prompt = `You are a professional software localizer. Translate the following UI string from ${fromLang} to ${toLang}. 
IMPORTANT: Preserve all ICU variables and interpolation brackets like {name}, {count} exactly as they are without translating the text inside brackets.
Return ONLY the translated string without any explanations or markdown quotes.

Original: "${text}"`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
        }
      );

      if (!response.ok) {
        return `[TODO: TRANSLATE (${toLang})] ${text}`;
      }

      const data = await response.json();
      const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      return translated || text;
    } catch {
      return `[TODO: TRANSLATE (${toLang})] ${text}`;
    }
  }
}

/**
 * Cache Wrapper để lưu lại bản dịch tránh gọi lại API tốn quota
 */
export class CachedTranslationProvider implements TranslationProvider {
  public name: string;
  private provider: TranslationProvider;
  private cache: Map<string, string> = new Map();

  constructor(provider: TranslationProvider) {
    this.provider = provider;
    this.name = `cached-${provider.name}`;
  }

  async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    const cacheKey = `${fromLang}:${toLang}:${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const translated = await this.provider.translate(text, fromLang, toLang);
    this.cache.set(cacheKey, translated);
    return translated;
  }
}
