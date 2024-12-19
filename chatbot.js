const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("Escaneie o QR code abaixo para conectar ao WhatsApp:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
  console.log("WhatsApp conectado.");
});

client.initialize();

const estadoUsuarios = {};

client.on("message", async (msg) => {
  const user = msg.from;

  if (!estadoUsuarios[user]) {
    estadoUsuarios[user] = { etapa: "inicio", relatorio: {} };
    await client.sendMessage(
      user,
      "Bem-vindo ao atendimento jurídico. Por favor, escolha a área do Direito em que deseja assistência:\n\n" +
        "1 - Direito de Família\n2 - Direito Criminal\n3 - Direito Previdenciário\n4 - Direito do Trabalho\n5 - Horários de atendimento"
    );
    return;
  }

  const estadoAtual = estadoUsuarios[user];

  switch (estadoAtual.etapa) {
    case "inicio":
      if (msg.body === "1") {
        estadoAtual.etapa = "familia";
        estadoAtual.relatorio.area = "Direito de Família";
        await client.sendMessage(
          user,
          "Qual seu caso?\n\n1 - Divórcio\n2 - Pensão Alimentícia\n3 - Guarda dos Filhos\n4 - Inventário\n5 - Outros"
        );
      } else if (msg.body === "2") {
        estadoAtual.etapa = "criminal";
        estadoAtual.relatorio.area = "Direito Criminal";
        await client.sendMessage(
          user,
          "Qual sua situação?\n\n1 - Prisão em Flagrante\n2 - Processo Criminal\n3 - Violência Doméstica\n4 - Outros"
        );
      } else if (msg.body === "3") {
        estadoAtual.etapa = "previdenciario";
        estadoAtual.relatorio.area = "Direito Previdenciário";
        await client.sendMessage(
          user,
          "Qual benefício você procura?\n\n1 - Aposentadoria\n2 - Auxílio-doença\n3 - Pensão por Morte\n4 - BPC/LOAS\n5 - Outros"
        );
      } else if (msg.body === "4") {
        estadoAtual.etapa = "trabalho";
        estadoAtual.relatorio.area = "Direito do Trabalho";
        await client.sendMessage(
          user,
          "Qual seu desejo?\n\n1 - Rescisão\n2 - Horas Extras\n3 - Acidente de Trabalho\n4 - Assédio Moral\n5 - Outros"
        );
      } else if (msg.body === "5") {
        estadoAtual.etapa = "horario";
        estadoAtual.relatorio.area = "horários";
        await client.sendMessage(
          user,
          "Qual horário preferível?\n\n1 - Segunda:8:00 - 17:00,\n2 - Terça: 8:00 - 17:00\n3 - Quarta: 8:00 - 17:00\n4 - Quinta: 8:00 - 17:00,\n5 - Sexta:8:00 - 17:00 "
        );
      } else {
        await client.sendMessage(user, "Escolha uma opção válida (1 a 5).");
      }
      break;

    case "familia":
    case "criminal":
    case "previdenciario":
    case "trabalho":
    case "horario":
      estadoAtual.etapa = "coletarNome";
      estadoAtual.relatorio.caso = msg.body;
      await client.sendMessage(
        user,
        "Para agendar uma consulta, por favor informe seu nome completo."
      );
      break;

    case "coletarNome":
      estadoAtual.relatorio.nome = msg.body;
      estadoAtual.etapa = "coletarTelefone";
      await client.sendMessage(
        user,
        "Obrigado! Agora, por favor, informe seu telefone de contato."
      );
      break;

    case "coletarTelefone":
      estadoAtual.relatorio.telefone = msg.body;
      estadoAtual.etapa = "coletarHorario";
      await client.sendMessage(
        user,
        "Qual seu horário preferido para atendimento?"
      );
      break;

    case "coletarHorario":
      estadoAtual.relatorio.horario = msg.body;
      const resumo =
        `Resumo do Atendimento Jurídico\n\n` +
        `Área de Direito: ${estadoAtual.relatorio.area}\n` +
        `Caso: ${estadoAtual.relatorio.caso}\n` +
        `Nome: ${estadoAtual.relatorio.nome}\n` +
        `Telefone: ${estadoAtual.relatorio.telefone}\n` +
        `Horário Preferido: ${estadoAtual.relatorio.horario}\n\n` +
        `Deseja confirmar o agendamento? (1 para Sim, 2 para Não)`;
      await client.sendMessage(user, resumo);
      estadoAtual.etapa = "confirmarAgendamento";
      break;

    case "confirmarAgendamento":
      if (msg.body === "1") {
        const numeroAtendente = "5581984147295@c.us";
        try {
          const resumoAtendente =
            `Novo agendamento:\n\n` +
            `Nome: ${estadoAtual.relatorio.nome}\n` +
            `Telefone: ${estadoAtual.relatorio.telefone}\n` +
            `Horário: ${estadoAtual.relatorio.horario}\n` +
            `Área: ${estadoAtual.relatorio.area}\n` +
            `Caso: ${estadoAtual.relatorio.caso}`;
          await client.sendMessage(numeroAtendente, resumoAtendente);
          await client.sendMessage(
            user,
            "Consulta confirmada e agendada com sucesso! Entraremos em contato em breve."
          );
        } catch (error) {
          console.error("Erro ao enviar mensagem para o atendente:", error);
          await client.sendMessage(
            user,
            "Ocorreu um erro ao agendar sua consulta. Por favor, tente novamente mais tarde."
          );
        }
        delete estadoUsuarios[user];
      } else if (msg.body === "2") {
        await client.sendMessage(
          user,
          "Agendamento cancelado. Caso precise de mais informações, entre em contato conosco."
        );
        delete estadoUsuarios[user];
      } else {
        await client.sendMessage(
          user,
          "Escolha uma opção válida (1 para Sim, 2 para Não)."
        );
      }
      break;

    default:
      await client.sendMessage(
        user,
        "Desculpe, algo deu errado. Por favor, digite 'menu' para começar novamente."
      );
      delete estadoUsuarios[user];
      break;
  }
});
