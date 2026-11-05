/**
 * Static guidance shown in the setup wizard for the image step (your choice C:
 * give the user the exact ChatGPT prompt and the Cloudinary configuration).
 * Kept in one place so it's easy to update when the image source changes.
 */

export const CLOUDINARY_STEPS: string[] = [
  'Create a free account at cloudinary.com and sign in.',
  'On the Dashboard, copy your "Cloud name" and paste it into the field above.',
  'Under Settings → Upload, add an unsigned upload preset (or use signed uploads with your API key/secret kept OUT of this repo).',
  'Generate the product images with the ChatGPT prompt below (one square image per product).',
  'Upload each image to Cloudinary using the product id as the public_id (e.g. RC00001_00001), so the catalog URLs resolve.',
  'The storefront builds image URLs as https://res.cloudinary.com/<cloud>/image/upload/<transform>/<public_id>.',
];

export const CHATGPT_IMAGE_PROMPT = `You are generating clean e-commerce product photos for a hobby RC (remote-control) store.

For each product I give you (name, type, color, scale), produce ONE image:
- 600 x 600 pixels, square.
- The single product centered on a pure white background (#FFFFFF), studio product-shot style, soft shadow.
- No text, no watermark, no props, no people, no packaging.
- Realistic, well-lit, true to the described color and vehicle type.

Return the image only. I will upload it to Cloudinary with the product id as the file name.`;
