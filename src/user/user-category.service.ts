import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { UserService } from './user.service';
import slugify from 'slugify';
import { UserCategory } from './entities/user-category.entity';
import ShortUniqueId from 'short-unique-id';

@Injectable()
export class UserCategoryService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly userService: UserService,
  ) {}

  async createCategory(
    userId: number,
    name: string,
    type: string,
  ): Promise<UserCategory> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let slug = slugify(name);

    const exist = await this.findOneCategory(userId, slug, type);

    if (exist) {
      const UID = new ShortUniqueId({ length: 5 });
      slug = slugify(`${name} ${UID()}`);
    }

    let category = new UserCategory();
    category.name = name;
    category.slug = slug;
    category.type = type;
    category.user = user;

    category = await this.em.save(category);

    return category;
  }

  async updateCategory(
    userId: number,
    slug: string,
    name: string,
    type: string,
  ): Promise<UserCategory> {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let category = await this.findOneCategory(userId, slug, type);

    if (!category) {
      throw new NotFoundException(`Category "${slug}" not found.`);
    }

    if (name !== category.name) {
      let newSlug = slugify(name);

      const exist = await this.findOneCategory(userId, newSlug, type);

      if (exist) {
        const UID = new ShortUniqueId({ length: 5 });
        newSlug = slugify(`${name} ${UID()}`);
      }

      category.name = name;
      category.slug = newSlug;

      category = await this.em.save(category);
    }

    return category;
  }

  // REPOSITORY

  findOneCategory(
    userId: number,
    slug: string,
    type: string,
  ): Promise<UserCategory | null> {
    return this.em
      .getRepository(UserCategory)
      .createQueryBuilder('category')
      .innerJoin('category.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('category.slug = :slug', { slug })
      .andWhere('category.type = :type', { type })
      .getOne();
  }

  findUserCategories(userId: number, type: string): Promise<UserCategory[]> {
    return this.em
      .getRepository(UserCategory)
      .createQueryBuilder('category')
      .innerJoin('category.user', 'user')
      .where('user.id = :userId', { userId })
      .andWhere('category.type = :type', { type })
      .orderBy('category.name', 'ASC')
      .getMany();
  }
}
