import { useState } from 'react';
import type { ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('usePromptEnhancement');

export function usePromptEnhancer() {
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [promptEnhanced, setPromptEnhanced] = useState(false);

  const resetEnhancer = () => {
    setEnhancingPrompt(false);
    setPromptEnhanced(false);
  };

  const enhancePrompt = async (
    input: string,
    setInput: (value: string) => void,
    model: string,
    provider: ProviderInfo,
  ) => {
    setEnhancingPrompt(true);
    setPromptEnhanced(false);

    const originalInput = input;
    const requestBody = {
      message: input,
      model,
      provider,
    };

    try {
      const response = await fetch('/api/enhancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok || !response.body) {
        throw new Error('Prompt enhancement failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let enhancedInput = '';

      setInput('');

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          enhancedInput += decoder.decode();
          break;
        }

        enhancedInput += decoder.decode(value, { stream: true });
        setInput(enhancedInput);
      }

      setInput(enhancedInput);
      setPromptEnhanced(true);
    } catch {
      setInput(originalInput);
      logger.error('Prompt enhancement request failed');
    } finally {
      setEnhancingPrompt(false);
    }
  };

  return { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer };
}
