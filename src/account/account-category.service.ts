import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserService } from '../user/user.service';
import { UserCategoryService } from '../user/user-category.service';
import { AccountCategoryDto } from './dto/category/account-category.dto';
import { UpdateCategoryDto } from './dto/category/update-category.dto';
import { UserCategory } from '../user/entities/user-category.entity';
import { AccountCategory } from './entities/account-category.entity';
import { UserAccountService } from './user-account.service';
import { UserAccountDto } from './dto/user-account.dto';

@Injectable()
export class AccountCategoryService {
  private CATEGORY_TYPE = 'account';

  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly userService: UserService,
    private readonly userCategoryService: UserCategoryService,
    @Inject(forwardRef(() => UserAccountService))
    private readonly userAccountService: UserAccountService,
  ) {}

  async createCategory(
    userId: number,
    name: string,
  ): Promise<AccountCategoryDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const category = await this.userCategoryService.createCategory(
      userId,
      name,
      this.CATEGORY_TYPE,
    );

    return new AccountCategoryDto({
      name: category.name,
      slug: category.slug,
      accounts: [],
    });
  }

  async updateCategory(
    userId: number,
    update: UpdateCategoryDto,
  ): Promise<AccountCategoryDto> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let category: UserCategory | null = null;

    if (update.name) {
      category = await this.userCategoryService.updateCategory(
        userId,
        update.slug,
        update.name,
        this.CATEGORY_TYPE,
      );
    }

    if (!category) {
      category = await this.userCategoryService.findOneCategory(
        userId,
        update.slug,
        this.CATEGORY_TYPE,
      );

      if (!category) {
        throw new NotFoundException(`Category "${update.slug}" not found.`);
      }
    }

    if (update.accounts) {
      const categoryAccounts = await this.findCategoryAccounts(category.id);

      const addresses = categoryAccounts.map(
        (cA) => cA.account.account.stakeAddress,
      );

      for (const account of update.accounts) {
        if (!addresses.includes(account)) {
          const userAccount = await this.userAccountService.findUserAccount(
            userId,
            account,
          );

          if (!userAccount) {
            continue;
          }

          const accountCategory = new AccountCategory();
          accountCategory.account = userAccount;
          accountCategory.category = category;

          await this.em.save(accountCategory);
        }
      }

      for (const cA of categoryAccounts) {
        if (!update.accounts.includes(cA.account.account.stakeAddress)) {
          await this.em.remove(cA);
        }
      }
    }

    const accounts = await this.findCategoryAccounts(category.id);

    return new AccountCategoryDto({
      name: category.name,
      slug: category.slug,
      accounts: accounts.map((a) => a.account.account.stakeAddress),
    });
  }

  async getAll(userId: number): Promise<AccountCategoryDto[]> {
    const userCategories = await this.userCategoryService.findUserCategories(
      userId,
      this.CATEGORY_TYPE,
    );
    const accountCategories = await this.findUserCategories(userId);

    const categories: { [key: number]: AccountCategoryDto } = {};

    for (const uC of userCategories) {
      categories[uC.id] = new AccountCategoryDto({
        name: uC.name,
        slug: uC.slug,
        accounts: [],
      });
    }

    for (const aC of accountCategories) {
      if (!categories[aC.category.id]) {
        categories[aC.category.id] = new AccountCategoryDto({
          name: aC.category.name,
          slug: aC.category.slug,
          accounts: [],
        });
      }
      categories[aC.category.id].accounts.push(aC.account.account.stakeAddress);
    }

    return Object.values(categories).sort((a, b) => (a.name < b.name ? -1 : 1));
  }

  async remove(userId: number, slug: string): Promise<boolean> {
    const category = await this.userCategoryService.findOneCategory(
      userId,
      slug,
      this.CATEGORY_TYPE,
    );

    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found.`);
    }

    await this.em.remove(category);

    return true;
  }

  async getCategoryAccountList(
    userId: number,
    slug: string,
  ): Promise<UserAccountDto[]> {
    const category = await this.userCategoryService.findOneCategory(
      userId,
      slug,
      this.CATEGORY_TYPE,
    );

    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found.`);
    }

    const categoryAccounts = await this.findCategoryAccounts(category.id);

    return categoryAccounts.map(
      (cA) =>
        new UserAccountDto({
          stakeAddress: cA.account.account.stakeAddress,
          name: cA.account.name,
          syncing: cA.account.account.syncing,
          createdAt: cA.account.createdAt,
          updatedAt: cA.account.updatedAt,
        }),
    );
  }

  // REPOSITORY

  findCategoryAccounts(categoryId: number): Promise<AccountCategory[]> {
    return this.em
      .getRepository(AccountCategory)
      .createQueryBuilder('ac')
      .innerJoin('ac.category', 'category')
      .innerJoinAndSelect('ac.account', 'userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .where('category.id = :categoryId', { categoryId })
      .getMany();
  }

  findCategoryAccountsBySlug(
    userId: number,
    slug: string,
  ): Promise<AccountCategory[]> {
    return this.em
      .getRepository(AccountCategory)
      .createQueryBuilder('ac')
      .innerJoin('ac.category', 'category')
      .innerJoin('category.user', 'user')
      .innerJoinAndSelect('ac.account', 'userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .where('category.slug = :slug', { slug })
      .andWhere('category.type = :type', { type: this.CATEGORY_TYPE })
      .andWhere('user.id = :userId', { userId })
      .getMany();
  }

  findUserCategories(userId: number): Promise<AccountCategory[]> {
    return this.em
      .getRepository(AccountCategory)
      .createQueryBuilder('ac')
      .innerJoinAndSelect('ac.account', 'userAccount')
      .innerJoinAndSelect('userAccount.account', 'account')
      .innerJoinAndSelect('ac.category', 'category')
      .innerJoin('category.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('category.type = :type', { type: this.CATEGORY_TYPE })
      .orderBy('category.name', 'ASC')
      .getMany();
  }
}
