// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Existing mappings
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Added mappings for volunteer screens & detail pages
  'chevron.left': 'chevron-left',
  'bell.fill': 'notifications',
  'gear': 'settings',
  'flame.fill': 'whatshot',
  'location.fill': 'location-on',
  'mappin.circle.fill': 'location-on',
  'clock.fill': 'access-time',
  'calendar': 'calendar-today',
  'checkmark': 'check',
  'checkmark.circle': 'check-circle',
  'checkmark.circle.fill': 'check-circle',
  'star.fill': 'star',
  'star.circle': 'stars',
  'photo': 'photo',
  'camera.fill': 'photo-camera',
  'xmark.circle.fill': 'cancel',
  'doc.on.doc': 'content-copy',
  'note.text': 'description',
  'phone.fill': 'phone',
  'tag.fill': 'local-offer',
  'person.fill': 'person',
  'person.circle.fill': 'account-circle',
  'map.fill': 'map',
  'list.bullet': 'format-list-bulleted',
  'list.bullet.clipboard': 'assignment',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
