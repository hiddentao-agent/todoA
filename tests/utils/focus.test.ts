import { describe, it, expect } from 'vitest';
import { getFocusableElements } from '@/utils/focus';

function makeContainer(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div;
}

describe('getFocusableElements', () => {
  it('returns focusable buttons in a container', () => {
    const container = makeContainer('<button>Save</button><button>Cancel</button>');

    const result = getFocusableElements(container);

    expect(result).toHaveLength(2);
    expect(result[0].tagName).toBe('BUTTON');
    expect(result[0].textContent).toBe('Save');
    expect(result[1].tagName).toBe('BUTTON');
    expect(result[1].textContent).toBe('Cancel');
  });

  it('returns an empty array when there are no focusable elements', () => {
    const container = makeContainer('<div></div><span>text</span><p>para</p>');

    const result = getFocusableElements(container);

    expect(result).toEqual([]);
  });

  it('excludes elements with tabindex="-1"', () => {
    const container = makeContainer('<button>OK</button><button tabindex="-1">Hidden</button>');

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0].textContent).toBe('OK');
  });

  it('includes elements with tabindex="0"', () => {
    const container = makeContainer(
      '<div tabindex="0">Focusable div</div><span>not focusable</span>',
    );

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('DIV');
    expect(result[0].textContent?.trim()).toBe('Focusable div');
  });

  it('returns all mixed focusable types', () => {
    const container = makeContainer(
      '<a href="#">Link</a>' +
        '<input type="text" value="name" />' +
        '<select><option>A</option></select>' +
        '<textarea></textarea>' +
        '<button>Click</button>',
    );

    const result = getFocusableElements(container);

    expect(result).toHaveLength(5);
    const tags = result.map((el) => el.tagName);
    expect(tags).toEqual(expect.arrayContaining(['A', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON']));
  });

  it('finds focusable elements nested inside other elements', () => {
    const container = makeContainer('<div><fieldset><button>Deep</button></fieldset></div>');

    const result = getFocusableElements(container);

    expect(result).toHaveLength(1);
    expect(result[0].tagName).toBe('BUTTON');
    expect(result[0].textContent).toBe('Deep');
  });
});
