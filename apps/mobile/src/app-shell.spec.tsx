import { render } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('presents the application name as the accessible screen heading', async () => {
    const screen = await render(<App />);

    expect(screen.getByLabelText('Emma Pilates Studio')).toBeOnTheScreen();
  });
});
