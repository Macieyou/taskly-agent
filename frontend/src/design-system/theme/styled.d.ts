import 'styled-components'
import type { Theme } from './theme'

declare module 'styled-components' {
  // Module augmentation requires an interface so styled-components merges our theme.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends Theme {}
}
