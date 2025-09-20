import WebSocket from 'ws';

export function attachReminderEvents(
  ws,
  { exitOnFire = true, eventId = null },
) {
  let targetId = eventId;
  ws.on('message', (buf) => {
    let data;
    try {
      data = JSON.parse(buf.toString());
    } catch {
      data = { raw: buf.toString() };
    }

    if (data?.type === 'S2C_REMINDER_ADDED') {
      targetId = data.payload?.id ?? null;
      console.info(
        `Accusé de réception (id:${targetId}) pour le rappel: ${data.payload.name}.`,
      );
    }

    if (data?.type === 'S2C_REMINDER_FIRED') {
      if (!targetId || data.payload?.id === targetId) {
        console.info(`Rappel déclenché (${targetId}): ${data.payload.name}.`);
        if (exitOnFire) {
          try {
            console.info('Fermeture du client.');
            ws.close();
          } catch {}
          process.exit(0);
        } else {
          console.info('Connexion conservée (exitOnFire=false).');
        }
      }
    }

    if (data?.type === 'ERROR') {
      console.error('Erreur serveur :', data.payload);
      try {
        ws.close();
      } catch {}
      process.exit(1);
    }
  });

  ws.on('error', (e) => {
    console.error('WS error:', e?.message ?? e);
    process.exit(1);
  });

  return {
    setTargetId(id) {
      targetId = id;
    },
    getTargetId() {
      return targetId;
    },
  };
}

export function waitOpen(ws) {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}
