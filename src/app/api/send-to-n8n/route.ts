import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // This runs on your SERVER, so no CORS issues talking to n8n
    const n8nResponse = await axios.post('https://bronson-unpostponed-niels.ngrok-free.dev/webhook-test/translation', body);

    return NextResponse.json(n8nResponse.data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reach n8n' }, { status: 500 });
  }
}