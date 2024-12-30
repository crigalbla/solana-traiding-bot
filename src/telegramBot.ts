import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Wallet } from './Classes/Wallet';
import * as dotenv from 'dotenv';

dotenv.config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN ?? '', {
  polling: true,
});

bot.onText(/\/start/, (msg: Message) => {
  bot.sendMessage(
    msg.chat.id,
    'Hello! I am ready to send transactions in SOL network. Click on write /help to know all the functionalities'
  );
});

bot.onText(/\/help/, (msg: Message) => {
  bot.sendMessage(
    msg.chat.id,
    `
/help => this command (show all the posible functionalities)
/sendSol publicKey amount => send an amount of SOL to the mentioned wallet

We are working in more functionalities...!
`
  );
});

bot.onText(
  /\/sendSol (\S+) (\d+)/,
  async (msg: Message, match: RegExpExecArray | null) => {
    if (match) {
      const recipient = match[1];
      const amount = parseFloat(match[2]);
      try {
        const wallet = new Wallet(process.env.TEST_PRIVATE_KEY ?? '');

        const txId = await wallet.transfer(recipient, amount);
        bot.sendMessage(msg.chat.id, `Transaction sent: ${txId}`);

        const txConfirmated = await wallet.isTransactionConfirmed(txId);
        bot.sendMessage(
          msg.chat.id,
          txConfirmated
            ? 'The transaction was confirmated'
            : 'The transaction was not confirmated'
        );
      } catch (error) {
        bot.sendMessage(msg.chat.id, 'Error to send SOL: ' + error);
      }
    }
  }
);
