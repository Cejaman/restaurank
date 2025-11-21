/**
 * constants/Theme.ts
 * Definición de colores y estilos globales.
 */

// 1. Tu paleta de colores personalizada (Usada en toda la app)
export const COLORS = {
  background: "#F9F9F9",
  cardBackground: "#FFFFFF",
  border: "#E5E5E5",
  textPrimary: "#2E2E2E",
  textSecondary: "#7A7A7A",
  iconInactive: "#7A7A7A",
  iconActive: "#3EB489",
  button: "#3EB489",
  counter: "#4A4A4A",
  textDark: "#2E2E2E",  // Un gris muy oscuro, casi negro
  white: "#FFFFFF",     // Agregado por seguridad para componentes que usen COLORS.white
};

// 2. Estilos de Fuentes predefinidos
export const FONTS = {
  user: { fontSize: 16, fontWeight: "600" as "600", color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary },
  text: { fontSize: 14, color: COLORS.counter },
};

// 3. Estilo de Tarjeta estándar
export const CARD = {
  borderRadius: 16,
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  padding: 16,
  marginBottom: 12,
};

// 4. Estructura requerida por el hook 'useThemeColor' de Expo
// Esto soluciona el error: Module ... has no exported member 'Colors'
const tintColorLight = COLORS.button;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: COLORS.textPrimary,
    background: COLORS.background,
    tint: tintColorLight,
    icon: COLORS.iconInactive,
    tabIconDefault: COLORS.iconInactive,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};