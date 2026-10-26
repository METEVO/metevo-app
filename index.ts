import './src/config/env';

import { registerRootComponent } from 'expo';

import App from './App';

// The env module is imported first on purpose: it validates every
// environment-dependent value and throws before any screen can render
// with a broken configuration.
registerRootComponent(App);
