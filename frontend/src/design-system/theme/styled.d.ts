import 'styled-components'
import type { Theme } from './theme'

declare module 'styled-components' {
  // Module augmentation requires an interface so styled-components merges our theme.
  export interface DefaultTheme extends Theme {}
}
