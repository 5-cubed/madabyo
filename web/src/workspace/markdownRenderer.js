import { marked } from 'marked';

export async function renderFile(handle) {
  let text;

  // Read the file, with not-found error handling (Step 23)
  try {
    const file = await handle.getFile();
    text = await file.text();
  } catch {
    return { status: 'not-found' };
  }

  // Parse the markdown to HTML, with render-error handling (Step 15)
  try {
    const html = marked.parse(text);
    return { status: 'ok', html };
  } catch {
    return { status: 'render-error' };
  }
}
