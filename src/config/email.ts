import { Resend } from "resend";
import { env } from "./env";

export const emailEnabled = Boolean(env.resendApiKey && env.emailFrom);

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

if (!emailEnabled) {
  // eslint-disable-next-line no-console
  console.warn(
    "[email] RESEND_API_KEY/EMAIL_FROM não configurados — recuperação de senha por e-mail desativada (o link vai só pro log)."
  );
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function enviarEmailRedefinicaoSenha(destinatario: string, nome: string, link: string) {
  if (!resend || !env.emailFrom) {
    // eslint-disable-next-line no-console
    console.warn(`[email] Envio desativado — link de redefinição de senha para ${destinatario}: ${link}`);
    return;
  }
  await resend.emails.send({
    // Nome de exibição (não só o endereço cru) e uma versão em texto puro
    // ao lado do HTML — sinais que ajudam a reputação/entrega em domínio
    // novo (spam filter desconfia mais de e-mail só-HTML sem remetente nomeado).
    from: `Fideliza+ <${env.emailFrom}>`,
    to: destinatario,
    subject: "Redefinir sua senha",
    html: `
      <p>Olá, ${escaparHtml(nome)}!</p>
      <p>Recebemos um pedido para redefinir a senha da sua conta. Clique no link abaixo para criar uma nova senha (válido por 30 minutos):</p>
      <p><a href="${link}">Redefinir minha senha</a></p>
      <p>Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">Fideliza+ — programa de fidelidade</p>
    `,
    text: `Olá, ${nome}!\n\nRecebemos um pedido para redefinir a senha da sua conta. Acesse o link abaixo para criar uma nova senha (válido por 30 minutos):\n\n${link}\n\nSe você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.\n\nFideliza+`,
  });
}
