import React from 'react';
import { render } from '@testing-library/react-native';
import Typo from '../../components/Typo';

jest.mock('@/contexts/themeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#123456',
      textLight: '#abcdef',
    },
    isDark: false,
  }),
}));

describe('Typo Component', () => {
  it('renders correctly with default props', async () => {
    const { getByText } = await render(<Typo>Hello Typo</Typo>);
    const element = getByText('Hello Typo');
    expect(element).toBeTruthy();
  });

  it('applies custom size and fontWeight', async () => {
    const { getByText } = await render(
      <Typo size={20} fontWeight="bold">Custom Typo</Typo>
    );
    const element = getByText('Custom Typo');
    expect(element.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fontWeight: 'bold',
        }),
      ])
    );
  });
});
