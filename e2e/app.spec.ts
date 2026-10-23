import { test, expect } from '@playwright/test';

test.describe('BooklyPDF Desktop App End-to-End', () => {
  test('deve renderizar a tela inicial da biblioteca e elementos principais', async ({ page }) => {
    // Ao iniciar na porta de preview/dev
    await page.goto('http://localhost:5173');

    // Título da aplicação
    await expect(page.locator('h1.library-title')).toHaveText(/BooklyPDF/i);

    // Botão Adicionar presente
    await expect(page.locator('button', { hasText: 'Adicionar' })).toBeVisible();

    // Campo de busca presente
    await expect(page.locator('input.search-input')).toBeVisible();

    // Filtros visíveis
    await expect(page.locator('.filter-tab', { hasText: 'Todos' })).toBeVisible();
    await expect(page.locator('.filter-tab', { hasText: 'Em andamento' })).toBeVisible();
  });
});

