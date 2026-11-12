// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { TaskForm } from '../src/features/tasks/TaskForm';

afterEach(cleanup);

function renderForm() {
  render(<TaskForm />);
  const category = screen.getByLabelText('カテゴリー') as HTMLSelectElement;
  const subCategory = screen.getByLabelText('サブカテゴリー（任意）') as HTMLSelectElement;
  return { category, subCategory };
}

describe('TaskForm のカテゴリー初期選択', () => {
  it('デフォルトのカテゴリーが選択され、サブカテゴリーをすぐ選べる', () => {
    const { category, subCategory } = renderForm();

    expect(category.value).toBe('cat-default-study');
    expect(subCategory.disabled).toBe(false);
    expect(within(subCategory).queryByRole('option', { name: '数学' })).not.toBeNull();
  });

  it('カテゴリーを変更するとサブカテゴリー候補が切り替わる', () => {
    const { category, subCategory } = renderForm();

    fireEvent.change(category, { target: { value: 'cat-default-work' } });

    expect(subCategory.disabled).toBe(false);
    expect(within(subCategory).queryByRole('option', { name: 'プログラミング' })).not.toBeNull();
    expect(within(subCategory).queryByRole('option', { name: '数学' })).toBeNull();
  });

  it('サブカテゴリーを選択できる', () => {
    const { subCategory } = renderForm();

    fireEvent.change(subCategory, { target: { value: 'sub-default-study-math' } });

    expect(subCategory.value).toBe('sub-default-study-math');
  });
});
