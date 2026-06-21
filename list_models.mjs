const key = "AQ.Ab8RN6IQ5Lnq38koieHsffArMpIB6Ua4UIWT_2wbQRkqQ98DjA";

async function listModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  if (data.models) {
    console.log('Available models:');
    for (const m of data.models) {
      if (m.name.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent')) {
        console.log(m.name);
      }
    }
  } else {
    console.log('Error fetching models:', data);
  }
}

listModels();
