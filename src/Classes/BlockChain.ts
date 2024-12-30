import {
  Connection,
  PublicKey,
  BlockhashWithExpiryBlockHeight,
} from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID } from '@solana/spl-token';

export class BlockChain {
  public connection: Connection;

  constructor(urlBlockChain?: string) {
    this.connection = new Connection(
      urlBlockChain ?? 'https://api.devnet.solana.com',
      'confirmed'
    );
  }

  public async getWalletBalance(publicKey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / 1e9;
  }

  public async getLastestBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    return await this.connection.getLatestBlockhash();
  }

  public async getTokenDecimals(mintAddress?: string): Promise<number> {
    if (!mintAddress) {
      return 9;
    }

    try {
      const mintPublicKey = new PublicKey(mintAddress);

      const mintInfo = await getMint(
        this.connection,
        mintPublicKey,
        'confirmed',
        TOKEN_PROGRAM_ID
      );

      return mintInfo.decimals;
    } catch (error) {
      console.error('Error retrieving token decimals:', error);
      throw error;
    }
  }
}
