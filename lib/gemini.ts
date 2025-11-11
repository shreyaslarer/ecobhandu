// Gemini API Configuration - Using Direct REST API
// API Key from Google AI Studio: https://makersuite.google.com/app/apikey

export const GEMINI_API_KEY = 'AIzaSyDx1MSWs76FI8aurtQO_DgD04kd63QKKt4';

export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

/**
 * Analyzes an environmental issue image using Google's Gemini AI
 * @param base64Image - Base64 encoded image string (without data URI prefix)
 * @returns Promise<string> - AI-generated description of the environmental issue
 * @throws Error if API call fails or returns invalid response
 */
export async function analyzeEnvironmentalImage(base64Image: string): Promise<string> {
  if (!base64Image || base64Image.trim().length === 0) {
    throw new Error('Invalid image data: base64Image cannot be empty');
  }

  // API key validation (your key: AIzaSyDx1MSWs76FI8aurtQO_DgD04kd63QKKt4)
  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 30) {
    throw new Error('Gemini API key not configured. Please check lib/gemini.ts');
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an environmental issue analyst. Analyze this image and provide a clear, professional description of the environmental issue shown.

Your response should:
1. Identify the type of environmental issue (waste, pollution, deforestation, etc.)
2. Describe what you see in specific, factual terms
3. Mention the severity and potential impact
4. Keep it to 2-3 sentences, clear and actionable for authorities

Be professional, factual, and focus on details that would help resolve the issue.`,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 500, // Increased from 250 to allow full response
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error Response:', errorData);
      throw new Error(`Gemini API request failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    // Log the full response for debugging
    console.log('Gemini API Response:', JSON.stringify(data, null, 2));

    // Validate response structure
    if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      console.error('Invalid Gemini API response - no candidates:', data);
      throw new Error('No response from AI');
    }

    const candidate = data.candidates[0];
    
    // Log candidate details
    console.log('Candidate structure:', JSON.stringify(candidate, null, 2));
    
    // Check for MAX_TOKENS issue
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('Response was truncated due to MAX_TOKENS. Increasing token limit...');
      // Continue anyway - we might have partial content
    }
    
    // Check for safety blocks
    if (candidate.finishReason === 'SAFETY') {
      throw new Error('Content was blocked by safety filters. Please try a different image.');
    }

    // Try multiple ways to extract text based on different API response formats
    let generatedText = 
      candidate.content?.parts?.[0]?.text ||
      candidate.content?.text ||
      candidate.text ||
      candidate.output ||
      null;
    
    console.log('Extracted Text:', generatedText);
    console.log('Content object:', JSON.stringify(candidate.content, null, 2));
    
    // If still no text and finishReason is MAX_TOKENS, provide helpful error
    if (!generatedText || typeof generatedText !== 'string') {
      if (candidate.finishReason === 'MAX_TOKENS') {
        throw new Error('Response was cut off. Please try again with a clearer image.');
      }
      console.error('Could not extract text. Full candidate:', JSON.stringify(candidate, null, 2));
      throw new Error('Failed to extract description from AI response');
    }

    return generatedText.trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to analyze image. Please try again.');
  }
}
