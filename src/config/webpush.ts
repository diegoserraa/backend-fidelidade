import webpush from "web-push";
import { env } from "./env";

export const pushEnabled = Boolean(env.vapidPublicKey && env.vapidPrivateKey);

if (pushEnabled) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey!, env.vapidPrivateKey!);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas — envio de notificações desativado."
  );
}

export { webpush };
