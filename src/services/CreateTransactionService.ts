import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  category: string;
  type: 'income' | 'outcome';
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const { total } = await transactionRepository.getBalance();
    // check if total is 0 and user trying to buy item
    if (total === 0 && type === 'outcome') {
      throw new AppError('transaction declined', 400);
    }
    // check if value of outcome is more than total in account
    if (total < value && type === 'outcome') {
      throw new AppError('transaction declined', 400);
    }
    // check if the category of this transaction is already registerd on the db
    let transactionCategory = await categoryRepository.findOne({
      where: { name: category },
    });

    // if the category does not exist create one
    if (!transactionCategory) {
      transactionCategory = categoryRepository.create({ title: category });
      await categoryRepository.save(transactionCategory);
    }
    const transaction = await transactionRepository.create({
      title,
      type,
      value,
      category: transactionCategory,
    });
    await transactionRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
