import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Liquidity, SwapSide } from '@raydium-io/raydium-sdk';
import { BlockChain } from './BlockChain';

export class Wallet {
  private readonly blockChain: BlockChain;
  private readonly connection: Connection;
  private readonly keypair: Keypair;

  constructor(privateKey: string) {
    this.blockChain = new BlockChain('https://api.devnet.solana.com');
    this.connection = this.blockChain.connection;

    const secretKey = Uint8Array.from(JSON.parse(privateKey));
    this.keypair = Keypair.fromSecretKey(secretKey);
  }

  public async getBalance(): Promise<number> {
    return this.blockChain.getWalletBalance(this.keypair.publicKey);
  }

  public getPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  public async isTransactionConfirmed(signature: string): Promise<boolean> {
    try {
      const latestBlockhash = await this.connection.getLatestBlockhash();
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash?.blockhash,
          lastValidBlockHeight: latestBlockhash?.lastValidBlockHeight,
        },
        'confirmed'
      );
      console.log('Transaction confirmed:', confirmation);
      return true;
    } catch (error) {
      console.log('Transaction error:', error);
    }

    return false;
  }

  public async transfer(
    toPublicKey: string,
    amount: number,
    tokenMintAddress?: string
  ): Promise<string> {
    try {
      const recipientPublicKey = new PublicKey(toPublicKey);
      const decimals = await this.blockChain.getTokenDecimals(tokenMintAddress);
      const amountInSmallestUnit = amount * Math.pow(10, decimals);

      if (!tokenMintAddress) {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.keypair.publicKey,
            toPubkey: recipientPublicKey,
            lamports: amountInSmallestUnit,
          })
        );

        return await this.sendTransaction(transaction, [this.keypair]);
      } else {
        const tokenMintPubkey = new PublicKey(tokenMintAddress);

        const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.keypair,
          tokenMintPubkey,
          this.keypair.publicKey
        );
        const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.keypair,
          tokenMintPubkey,
          recipientPublicKey
        );

        const transferInstruction = createTransferInstruction(
          senderTokenAccount.address,
          recipientTokenAccount.address,
          this.keypair.publicKey,
          amountInSmallestUnit,
          [],
          TOKEN_PROGRAM_ID
        );

        const transaction = new Transaction().add(transferInstruction);
        return await this.sendTransaction(transaction, [this.keypair]);
      }
    } catch (error) {
      console.error('Error processing the transaction:', error);
      throw error;
    }
  }

  // TODO test method
  public async swapToken(
    mintAddressTokenToSell: string,
    mintAddessTokenToBuy: string,
    amountIn: number
  ): Promise<string> {
    try {
      const inputToken = new PublicKey(mintAddressTokenToSell);
      const outputToken = new PublicKey(mintAddessTokenToBuy);
      const decimals = await this.blockChain.getTokenDecimals(
        mintAddressTokenToSell
      );
      const amountInSmallestUnit = amountIn * Math.pow(10, decimals);

      const arrayPoolKeys = await Liquidity.fetchAllPoolKeys(this.connection, {
        4: inputToken,
        5: outputToken,
      });

      if (!arrayPoolKeys || arrayPoolKeys.length === 0) {
        throw new Error("There aren't liquidity pools");
      }

      const tokenAccountIn = await getAssociatedTokenAddress(
        inputToken,
        this.keypair.publicKey
      );
      const tokenAccountOut = await getAssociatedTokenAddress(
        outputToken,
        this.keypair.publicKey
      );

      const swapInstruction = Liquidity.makeSwapInstruction({
        userKeys: {
          tokenAccountIn,
          tokenAccountOut,
          owner: this.keypair.publicKey,
        },
        poolKeys: arrayPoolKeys[0],
        amountIn: amountInSmallestUnit,
        amountOut: 1, // TODO change this number to avoid hight price impacts
        fixedSide: 'in' as SwapSide,
      });

      const transaction = new Transaction();
      swapInstruction.innerTransaction.instructions.forEach((instruction) => {
        transaction.add(instruction);
      });
      const signature = await this.sendTransaction(transaction, [this.keypair]);
      console.log('Swap transaction sent:', signature);
      return signature;
    } catch (error) {
      console.error('Swap transaction error:', error);
      throw error;
    }
  }

  // PRIVATES -----------------------------------------------------------------------

  private async sendTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.keypair.publicKey;

    transaction.sign(...signers);

    const serializedTransaction = transaction.serialize();
    const encodedTransaction = serializedTransaction.toString('base64');

    const signature = await this.connection.sendEncodedTransaction(
      encodedTransaction,
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      }
    );

    console.log('Transaction sent with signature:', signature);
    return signature;
  }
}
