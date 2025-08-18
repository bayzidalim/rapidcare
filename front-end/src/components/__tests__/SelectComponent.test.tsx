import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectItem } from '../ui/select';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';

describe('Select Component', () => {
  it('renders without nested select elements', () => {
    const { container } = render(
      <Select onValueChange={() => {}}>
        <SelectTrigger>
          <SelectValue placeholder="Choose option" />
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectTrigger>
      </Select>
    );

    // Should only have one select element
    const selectElements = container.querySelectorAll('select');
    expect(selectElements).toHaveLength(1);
  });

  it('handles value changes correctly', () => {
    const mockOnValueChange = jest.fn();
    
    render(
      <Select onValueChange={mockOnValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Choose option" />
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectTrigger>
      </Select>
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option1' } });

    expect(mockOnValueChange).toHaveBeenCalledWith('option1');
  });

  it('renders placeholder correctly', () => {
    const { container } = render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose option" />
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectTrigger>
      </Select>
    );
    
    // Check if placeholder option exists
    const placeholderOption = container.querySelector('option[value=""]');
    expect(placeholderOption).toBeInTheDocument();
    expect(placeholderOption?.textContent).toBe('Choose option');
  });

  it('renders options correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Choose option" />
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectTrigger>
      </Select>
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });
});