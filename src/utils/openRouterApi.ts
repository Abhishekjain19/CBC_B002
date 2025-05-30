// OpenRouter API utility

const OPENROUTER_API_KEY = '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';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function getAIResponse(messages: AIMessage[]): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout for detailed response
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin, // Required for OpenRouter API
        'X-Title': 'ThinkSpark AI Learning' // Name of your app
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: messages,
        max_tokens: 1200 // Higher for detailed response
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      return 'Partial response: The AI response was brief due to timeout.';
    }
    console.error('Error fetching AI response:', error);
    throw error;
  }
}
