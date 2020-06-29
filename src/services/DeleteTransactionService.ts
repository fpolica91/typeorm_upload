import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(transaction_id: string): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionRepository.findOne(transaction_id);
    if (!transaction) {
      throw new AppError('cannot find transaction you want to delete', 400);
    }
    await transactionRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
