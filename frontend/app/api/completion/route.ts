import OpenAI from 'openai';
import {
  OpenAIStream,
  StreamingTextResponse,
  experimental_StreamData,
} from 'ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ,
});

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { prompt } = await req.json();

  // Ask OpenAI for a streaming completion given the prompt
  const response = await openai.completions.create({
    model: 'gpt-4.1',
    max_tokens: 2000,
    stream: true,
    prompt,
  });

  const data = new experimental_StreamData();

  data.append({ test: 'value' });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response, {
    onFinal(completion) {
      data.close();
    },
    experimental_streamData: true,
  });

  // Respond with the stream
  return new StreamingTextResponse(stream, {}, data);
}
