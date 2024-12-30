import { Connection, PublicKey } from '@solana/web3.js';
import { Wallet } from './Classes/Wallet';
import * as dotenv from 'dotenv';

dotenv.config();

const sendSolTest = async () => {
  const wallet = new Wallet(process.env.TEST_PRIVATE_KEY ?? '[]');

  console.log('Conected to Devnet');
  console.log('Public key:', wallet.getPublicKey().toBase58());
  console.log('Porfolio balance:', await wallet.getBalance(), 'SOL');

  const signature = await wallet.transfer(
    process.env.TEST_PUBLIC_KEY_2 ?? '',
    0.001
  );
  await wallet.isTransactionConfirmed(signature);

  const connection = new Connection(
    'https://api.devnet.solana.com',
    'confirmed'
  );
  const recipientPubkey = new PublicKey(process.env.TEST_PUBLIC_KEY_2 ?? '');
  const balance = await connection.getBalance(recipientPubkey);
  console.log('Balance in first wallet:', await wallet.getBalance());
  console.log('Balance in second wallet:', balance / 1e9);
};

// Tokens https://raw.githubusercontent.com/solana-labs/token-list/refs/heads/main/src/tokens/solana.tokenlist.json
const swapSolByUsdt = async () => {
  const wallet = new Wallet(process.env.TEST_PRIVATE_KEY ?? '[]');
  const mintAddressSOL = 'So11111111111111111111111111111111111111112';
  const mintAddressUSDT = 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS';

  const amountInSOL = 0.01;

  try {
    const signature = await wallet.swapToken(
      mintAddressSOL,
      mintAddressUSDT,
      amountInSOL
    );
    console.log('Swap done. Transaction ID:', signature);
  } catch (error) {
    console.error('Error during swap:', error);
  }
};

const main = async () => {};

swapSolByUsdt().catch((err) => {
  console.error('Error running the main script:', err);
});
