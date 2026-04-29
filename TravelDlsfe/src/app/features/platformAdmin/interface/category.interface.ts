export interface Category {
  idCategory: number;
  nameCategory: string;
  status: string;
  deletedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryPaginator {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
  };
  data: Category[];
}

export interface CreateCategoryDto {
  nameCategory: string;
  status?: string;
}

export interface UpdateCategoryDto {
  nameCategory?: string;
  status?: string;
}
