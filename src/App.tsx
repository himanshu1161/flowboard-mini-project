import { Provider } from 'react-redux'
import type { AppStore } from './store'
import { AppShell } from './views/layout/AppShell'

export default function App({ store }: { store: AppStore }) {
  return (
    <Provider store={store}>
      <AppShell />
    </Provider>
  )
}
