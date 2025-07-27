import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { limiter } from '../../utils/rate-limit';

const allowedOrigins = [
  process.env.API_URL_DEV,
  'https://solarastudios.com.br',
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
};

const resendApiKey = process.env.RESEND_API_KEY;
const receiver =
  process.env.CONTACT_RECEIVER_EMAIL || 'contato@solarastudios.com.br';

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  try {
    await limiter.checkNext(req, 5);
  } catch {
    return NextResponse.json(
      {
        error: 'Muitas requisições. Tente novamente em breve.',
      },
      {
        status: 429,
        headers: corsHeaders,
      }
    );
  }

  if (!resendApiKey) {
    return new NextResponse('RESEND_API_KEY não definida!', {
      status: 500,
      headers: corsHeaders,
    });
  }

  if (!receiver) {
    return new NextResponse('CONTACT_RECEIVER_EMAIL não definida!', {
      status: 500,
      headers: corsHeaders,
    });
  }

  const resend = new Resend(resendApiKey);

  try {
    const body = await req.json();
    console.log({ body });
    const {
      name,
      email,
      subject,
      message,
      contactType,
      attachments = [],
    } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes.' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (attachments.length > 5) {
      return NextResponse.json(
        { error: 'Máximo de 5 arquivos permitidos.' },
        { status: 400, headers: corsHeaders }
      );
    }
    for (const file of attachments) {
      if (file.size > 1 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Cada arquivo deve ter no máximo 1MB.' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Monta os anexos para o Resend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resendAttachments = attachments.map((file: any) => ({
      filename: file.name,
      content: file.content,
      type: file.type,
      disposition: 'attachment',
    }));

    // Envia o e-mail via Resend
    await resend.emails.send({
      from: `Contato Solara Studios <contato-site@solarastudios.com.br>`,
      replyTo: email,
      to: receiver,
      subject,
      text:
        `Nome: ${name}\n` +
        `E-mail: ${email}\n` +
        (contactType ? `Tipo: ${contactType}\n` : '') +
        `Mensagem:\n${message}`,
      attachments: resendAttachments,
    });

    return NextResponse.json(
      { message: 'E-mail enviado com sucesso!' },
      { status: 200, headers: corsHeaders }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao enviar o e-mail.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
