import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const receiver =
  process.env.CONTACT_RECEIVER_EMAIL || 'contato@solarastudios.com.br';

if (!resendApiKey) {
  throw new Error('RESEND_API_KEY não definida!');
}
if (!receiver) {
  throw new Error('CONTACT_RECEIVER_EMAIL não definida!');
}

const resend = new Resend(resendApiKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      subject,
      message,
      contactType,
      attachments = [],
    } = body;

    // Validações básicas
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes.' },
        { status: 400 }
      );
    }
    if (attachments.length > 5) {
      return NextResponse.json(
        { error: 'Máximo de 5 arquivos permitidos.' },
        { status: 400 }
      );
    }
    for (const file of attachments) {
      if (file.size > 1 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Cada arquivo deve ter no máximo 1MB.' },
          { status: 400 }
        );
      }
    }

    // Monta os anexos para o Resend
    const resendAttachments = attachments.map((file: any) => ({
      filename: file.name,
      content: file.content, // base64 string
      type: file.type,
      disposition: 'attachment',
    }));

    // Envia o e-mail via Resend
    await resend.emails.send({
      from: `Contato site <contato-site@solarastudios.com.br>`,
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

    return NextResponse.json({ message: 'E-mail enviado com sucesso!' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro ao enviar o e-mail.' },
      { status: 500 }
    );
  }
}
