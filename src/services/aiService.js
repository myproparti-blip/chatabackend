import Groq from 'groq-sdk'

let client = null

function getClient() {
  if (client) return client

  const apiKey = process.env.GROQ_API_KEY
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is required')
  }

  client = new Groq({ apiKey })

  return client
}

export async function chatWithAI(messages) {
  try {
    const groqClient = getClient()
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: 1024,
    })

    return {
      success: true,
      content: response.choices[0].message.content,
    }
  } catch (error) {
    console.error('AI Service Error:', error.message)
    return {
      success: false,
      error: error.message || 'Failed to get AI response',
    }
  }
}
