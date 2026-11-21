import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExamplePrompts } from './ExamplePrompts';

describe('ExamplePrompts', () => {
  it('renders the existing prompt actions as buttons', () => {
    const html = renderToStaticMarkup(ExamplePrompts());

    expect(html.match(/<button/g)).toHaveLength(6);
    expect(html).toContain('Build a todo app in React using Tailwind');
    expect(html).toContain('START WITH AN IDEA');
  });
});
