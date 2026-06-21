const key = "AQ.Ab8RN6IQ5Lnq38koieHsffArMpIB6Ua4UIWT_2wbQRkqQ98DjA";

async function testModel(modelName) {
  console.log(`Testing ${modelName}...`);
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
    })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error for ${modelName}:`, data.error.message);
  } else {
    console.log(`Success for ${modelName}!`);
  }
}

async function runTests() {
  await testModel('gemini-flash-latest');
  await testModel('gemini-2.5-flash');
  await testModel('gemini-3.5-flash');
}

runTests();
