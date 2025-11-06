import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ModelImage } from '../types';

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// A helper to create more informative error messages from API calls
const createApiError = (error: unknown, context: string): Error => {
    console.error(context, error);
    const errorMessage = (error instanceof Error)
        ? error.message
        : (typeof error === 'object' && error !== null) ? JSON.stringify(error) : String(error);
    return new Error(`Gemini API Error: ${errorMessage}`);
}

export const generateImageVariation = async (
  baseImage: ModelImage,
  posePrompt: string,
  stylePrompt: string,
  backgroundPrompt: string
): Promise<string> => {
  const ai = getAiClient();
  const fullPrompt = `Re-create the scene from the provided image featuring the same person. The person's new pose and expression must be: "${posePrompt}"${stylePrompt ? `, in the style of ${stylePrompt}` : ''}. The background must be: ${backgroundPrompt}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType, }, },
          { text: fullPrompt, },
        ],
      },
      config: { responseModalities: [Modality.IMAGE], },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error('No image data found in the API response.');
  } catch (error) {
    throw createApiError(error, 'Error calling Gemini API for image variation:');
  }
};


export const generateProductPosePrompts = async (
  productImage: ModelImage,
  userContext: string
): Promise<{ poses: string[] }> => {
  const ai = getAiClient();
  const prompt = `You are a creative director for a product photoshoot. Based on the user's provided product image and context, generate a JSON object containing an array of exactly 9 distinct and creative pose descriptions. Each description should be a short, actionable phrase for a model, in English. The context is: "${userContext || 'general product advertising'}".`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: productImage.data, mimeType: productImage.mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            poses: {
              type: Type.ARRAY,
              items: { type: Type.STRING, description: "A creative pose description for a model with the product.", },
            },
          },
          required: ["poses"],
        },
      },
    });
    
    const jsonString = response.text.trim();
    return JSON.parse(jsonString);

  } catch (error) {
    throw createApiError(error, 'Error calling Gemini API for product prompts:');
  }
};


export const generateProductPoseImage = async (
  faceImage: ModelImage,
  productImage: ModelImage,
  posePrompt: string,
  backgroundPrompt: string
): Promise<string> => {
  const ai = getAiClient();
  const fullPrompt = `From the two provided images, create a new photorealistic image. It must feature the person from the first image holding or presenting the product from the second image. The person's pose and expression must be: "${posePrompt}". The background must be: ${backgroundPrompt}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: faceImage.data, mimeType: faceImage.mimeType } },
          { inlineData: { data: productImage.data, mimeType: productImage.mimeType } },
          { text: fullPrompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE], },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error('No image data found in the API response.');
  } catch (error) {
    throw createApiError(error, 'Error calling Gemini API for product pose:');
  }
};

export const generateBaseMockup = async (
  prompt: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { responseModalities: [Modality.IMAGE], },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error('No image data found in the API response for base mockup.');
  } catch (error) {
    throw createApiError(error, 'Error calling Gemini API for base mockup:');
  }
};

export const applyDesignToMockup = async (
  baseMockupImage: ModelImage,
  designImage: ModelImage,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: baseMockupImage.data, mimeType: baseMockupImage.mimeType } },
          { inlineData: { data: designImage.data, mimeType: designImage.mimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE], },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error('No image data found in the API response for mockup.');
  } catch (error) {
    throw createApiError(error, 'Error calling Gemini API for applying design:');
  }
};