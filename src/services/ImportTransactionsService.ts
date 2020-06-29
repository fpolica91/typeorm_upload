import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface CsvTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const contactsReadStream = fs.createReadStream(filePath);
    const parsers = csvParse({
      from_line: 2,
    });
    const parserCSV = contactsReadStream.pipe(parsers);
    const transactions: CsvTransaction[] = [];
    const categories: string[] = [];

    parserCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value || !category) return;
      categories.push(category);
      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => parserCSV.on('end', resolve));
    /**
     * @existingCategories is the categories already in the DB
     */
    // food, rent, insurance
    const existingCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });
    // get only the titles
    const existingCategoryTitles = existingCategories.map(
      (category: Category) => category.title,
    );

    // categories that are alrady in the database
    const addCategoryTitles = categories
      .filter(category => !existingCategoryTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoryRepository.save(newCategories);
    const finalCategories = [...newCategories, ...existingCategories];

    const createdTransactions = transactionRepository.create(
      transactions.map(t => ({
        title: t.title,
        type: t.type,
        value: t.value,
        category: finalCategories.find(
          category => category.title === t.category,
        ),
      })),
    );
    await transactionRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
