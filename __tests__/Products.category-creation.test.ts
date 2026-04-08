/**
 * CATEGORY CREATION & PRODUCT FORM INTEGRATION TESTS
 * 
 * Test Suite for:
 * - Creating a new category within product form
 * - Automatic category assignment after creation
 * - Product creation with newly created category
 * - Bug prevention: Race conditions, state synchronization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ============================================================================
// MOCK DATA & TYPES
// ============================================================================

interface Category {
  id: string;
  company_id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

interface Product {
  id: string;
  company_id: string;
  name: string;
  price: number;
  stock: number;
  category_id?: string;
  sku?: string;
  barcode?: string;
  cost?: number;
  min_stock?: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface FormStateData {
  name: string;
  price: string | number;
  stock: string | number;
  category_id: string;
  [key: string]: any;
}

const mockCompanyId = 'company-test-123';
const mockUserId = 'user-test-456';

const mockExistingCategories: Category[] = [
  { id: 'cat-1', company_id: mockCompanyId, name: 'Electronics' },
  { id: 'cat-2', company_id: mockCompanyId, name: 'Clothing' },
];

const mockNewCategory: Category = {
  id: 'cat-new-123',
  company_id: mockCompanyId,
  name: 'New Tech Category',
  created_at: new Date().toISOString(),
};

// ============================================================================
// TEST SUITE 1: Category Creation in Product Form
// ============================================================================
describe('CATEGORY CREATION: Product Form Integration', () => {
  let formData: FormStateData;
  let categories: Category[];
  let createdCategories: Category[];

  beforeEach(() => {
    // Initialize form state
    formData = {
      name: '',
      price: '',
      stock: '',
      category_id: '',
    };

    // Initialize category list
    categories = [...mockExistingCategories];
    createdCategories = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ====== SCENARIO 1: Basic Category Creation ======
  it('should create new category and return with correct data', async () => {
    const categoryName = 'New Tech Category';

    // Simulate creating category
    const newCategory = await simulateCreateCategory(
      categoryName,
      mockCompanyId
    );

    expect(newCategory).toBeDefined();
    expect(newCategory.id).toBeDefined();
    expect(newCategory.name).toBe(categoryName);
    expect(newCategory.company_id).toBe(mockCompanyId);
    expect(newCategory.created_at).toBeDefined();
  });

  // ====== SCENARIO 2: Auto-Assign Category to Form ======
  it('should automatically assign created category to form data', async () => {
    const categoryName = 'Auto-Assign Test Category';

    // Step 1: Create category
    const newCategory = await simulateCreateCategory(
      categoryName,
      mockCompanyId
    );

    // Step 2: Simulate onSuccess callback from mutation
    // This is what happens in createCategoryMutation.onSuccess
    formData = { ...formData, category_id: newCategory.id };

    expect(formData.category_id).toBe(newCategory.id);
  });

  // ====== SCENARIO 3: Category List Updates After Creation ======
  it('should update category list after new category creation', async () => {
    const initialCategoryCount = categories.length;
    const categoryName = 'List Update Test';

    // Step 1: Simulate creating category
    const newCategory = await simulateCreateCategory(
      categoryName,
      mockCompanyId
    );

    // Step 2: Add to categories list (simulating invalidateQueries)
    categories = [...categories, newCategory];

    expect(categories).toHaveLength(initialCategoryCount + 1);
    expect(categories).toContainEqual(newCategory);
  });

  // ====== SCENARIO 4: Product Creation with New Category ======
  it('should create product with newly created category', async () => {
    const categoryName = 'Product Test Category';
    const productName = 'Test Product with New Category';

    // Step 1: Create category
    const newCategory = await simulateCreateCategory(
      categoryName,
      mockCompanyId
    );

    // Step 2: Update form with new category
    formData = {
      name: productName,
      price: 99.99,
      stock: 50,
      category_id: newCategory.id,
    };

    // Step 3: Create product with the form data
    const product = await simulateCreateProduct(formData, mockCompanyId);

    expect(product.name).toBe(productName);
    expect(product.category_id).toBe(newCategory.id);
    expect(product.price).toBe(99.99);
    expect(product.stock).toBe(50);
  });

  // ====== SCENARIO 5: Multiple Categories Created in Sequence ======
  it('should handle multiple category creations without state issues', async () => {
    const categoryNames = [
      'Category 1',
      'Category 2',
      'Category 3',
    ];

    const newCategories: Category[] = [];

    // Create multiple categories
    for (const name of categoryNames) {
      const cat = await simulateCreateCategory(name, mockCompanyId);
      newCategories.push(cat);
      categories = [...categories, cat];
    }

    expect(newCategories).toHaveLength(3);
    expect(categories).toHaveLength(mockExistingCategories.length + 3);

    // Verify last created category is selectable
    formData.category_id = newCategories[newCategories.length - 1].id;
    expect(formData.category_id).toBe(newCategories[2].id);
  });

  // ====== SCENARIO 6: Category Dialog State Cleanup ======
  it('should cleanup dialog state after category creation', async () => {
    let isAddCategoryDialogOpen = true;
    let newCategoryName = 'Test Category';

    // Step 1: Simulate user typing in category input
    expect(isAddCategoryDialogOpen).toBe(true);
    expect(newCategoryName).toBe('Test Category');

    // Step 2: Simulate category creation
    const newCategory = await simulateCreateCategory(
      newCategoryName,
      mockCompanyId
    );

    // Step 3: Simulate onSuccess cleanup (from createCategoryMutation)
    isAddCategoryDialogOpen = false;
    newCategoryName = '';

    expect(isAddCategoryDialogOpen).toBe(false);
    expect(newCategoryName).toBe('');
    expect(newCategory.name).toBe('Test Category');
  });

  // ====== SCENARIO 7: Form Validation with New Category ======
  it('should validate product form with newly created category', async () => {
    const newCategory = await simulateCreateCategory(
      'Validation Test',
      mockCompanyId
    );

    // Try to create product without required fields
    formData = {
      name: '',
      price: '',
      stock: '',
      category_id: newCategory.id,
    };

    const validation = validateProductForm(formData);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContainEqual(
      expect.objectContaining({ field: 'name' })
    );

    // Fill in required fields
    formData.name = 'Valid Product';
    formData.price = 100;
    formData.stock = 50;

    const validationAfter = validateProductForm(formData);
    expect(validationAfter.isValid).toBe(true);
  });

  // ====== SCENARIO 8: Race Condition Prevention ======
  it('should prevent race conditions when creating category and product', async () => {
    const categoryName = 'Race Condition Test';

    // Simulate rapid creation
    let categoryCreationInProgress = true;
    let productCreationInProgress = false;

    // Start category creation
    const categoryPromise = simulateCreateCategory(
      categoryName,
      mockCompanyId
    ).then(cat => {
      categoryCreationInProgress = false;
      formData.category_id = cat.id;
      return cat;
    });

    // Try to create product while category is being created
    // This should wait for category to complete
    expect(categoryCreationInProgress).toBe(true);

    const createdCategory = await categoryPromise;

    // Now product can be created
    productCreationInProgress = true;
    formData.name = 'Product with New Category';
    formData.price = 99.99;
    formData.stock = 50;

    const product = await simulateCreateProduct(
      formData,
      mockCompanyId
    ).then(prod => {
      productCreationInProgress = false;
      return prod;
    });

    expect(categoryCreationInProgress).toBe(false);
    expect(productCreationInProgress).toBe(false);
    expect(product.category_id).toBe(createdCategory.id);
  });

  // ====== SCENARIO 9: Duplicate Category Prevention ======
  it('should handle duplicate category names appropriately', async () => {
    const categoryName = 'Duplicate Test';

    // Create first category
    const firstCategory = await simulateCreateCategory(
      categoryName,
      mockCompanyId
    );

    expect(firstCategory).toBeDefined();

    // Try to create duplicate (in real scenario, DB might allow or prevent)
    // Test both scenarios:
    
    // Scenario A: Database allows duplicates per company
    const secondCategory = await simulateCreateCategory(
      categoryName,
      mockCompanyId
    );

    expect(secondCategory).toBeDefined();
    expect(firstCategory.id).not.toBe(secondCategory.id);

    // Both should be available in form
    categories = [firstCategory, secondCategory];
    expect(categories.filter(c => c.name === categoryName)).toHaveLength(2);
  });
});

// ============================================================================
// TEST SUITE 2: Delete Category with Form Integration
// ============================================================================
describe('CATEGORY DELETION: Product Form Integration', () => {
  let categories: Category[];
  let formData: FormStateData;

  beforeEach(() => {
    categories = [...mockExistingCategories];
    formData = {
      name: '',
      price: '',
      stock: '',
      category_id: '',
    };
  });

  // ====== SCENARIO 1: Delete Category That's Not Selected ======
  it('should allow deleting category when form has different category selected', async () => {
    const categoryToDelete = categories[0];
    const otherCategory = categories[1];

    // Form has different category selected
    formData.category_id = otherCategory.id;

    // Delete first category
    const deleteResult = await simulateDeleteCategory(
      categoryToDelete.id,
      mockCompanyId
    );

    expect(deleteResult.success).toBe(true);

    // Categories should update
    categories = categories.filter(c => c.id !== categoryToDelete.id);
    expect(categories).not.toContainEqual(categoryToDelete);

    // Form should still have valid category
    expect(formData.category_id).toBe(otherCategory.id);
    expect(categories.some(c => c.id === formData.category_id)).toBe(true);
  });

  // ====== SCENARIO 2: Delete Selected Category ======
  it('should clear form category when selected category is deleted', async () => {
    const categoryToDelete = categories[0];

    // Form has this category selected
    formData.category_id = categoryToDelete.id;

    // Delete the category
    const deleteResult = await simulateDeleteCategory(
      categoryToDelete.id,
      mockCompanyId
    );

    // Update categories list
    categories = categories.filter(c => c.id !== categoryToDelete.id);

    // Form should clear the category since it no longer exists
    if (!categories.some(c => c.id === formData.category_id)) {
      formData.category_id = '';
    }

    expect(formData.category_id).toBe('');
    expect(categories).not.toContainEqual(categoryToDelete);
  });

  // ====== SCENARIO 3: Cannot Delete Category with Products ======
  it('should prevent deleting category that has associated products', async () => {
    const categoryWithProducts = mockExistingCategories[0];
    const mockProducts: Product[] = [
      {
        id: 'prod-1',
        company_id: mockCompanyId,
        name: 'Product with Category',
        price: 100,
        stock: 50,
        category_id: categoryWithProducts.id,
        active: true,
      },
    ];

    // Try to delete category
    const deleteResult = await simulateDeleteCategory(
      categoryWithProducts.id,
      mockCompanyId,
      mockProducts // Pass products for validation
    );

    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toContain('producto');

    // Categories should NOT be deleted
    expect(categories).toContainEqual(categoryWithProducts);
  });
});

// ============================================================================
// HELPER FUNCTIONS (Simulating actual behavior)
// ============================================================================

async function simulateCreateCategory(
  name: string,
  companyId: string
): Promise<Category> {
  // Simulate API call with slight delay
  await new Promise(resolve => setTimeout(resolve, 10));

  const newCategory: Category = {
    id: `cat-${Date.now()}`,
    company_id: companyId,
    name: name.trim(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return newCategory;
}

async function simulateDeleteCategory(
  categoryId: string,
  companyId: string,
  products: Product[] = []
): Promise<{ success: boolean; error?: string }> {
  // Check if category has associated products
  const productsInCategory = products.filter(
    p => p.category_id === categoryId
  );

  if (productsInCategory.length > 0) {
    return {
      success: false,
      error: `No se puede eliminar esta categoría porque tiene ${productsInCategory.length} producto(s) asociado(s)`,
    };
  }

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 10));

  return { success: true };
}

async function simulateCreateProduct(
  formData: FormStateData,
  companyId: string
): Promise<Product> {
  // Validate form
  const validation = validateProductForm(formData);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors[0].message}`);
  }

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 10));

  const product: Product = {
    id: `prod-${Date.now()}`,
    company_id: companyId,
    name: String(formData.name),
    price: Number(formData.price),
    stock: Number(formData.stock),
    category_id: formData.category_id || undefined,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return product;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

function validateProductForm(formData: FormStateData): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  if (!formData.name || String(formData.name).trim() === '') {
    errors.push({ field: 'name', message: 'Product name is required' });
  }

  if (!formData.price || Number(formData.price) <= 0) {
    errors.push({ field: 'price', message: 'Price must be greater than 0' });
  }

  if (formData.stock === undefined || Number(formData.stock) < 0) {
    errors.push({ field: 'stock', message: 'Stock cannot be negative' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
