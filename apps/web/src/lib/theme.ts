import type { CSSProperties } from "react";

export interface OrganizationBranding {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  successColor?: string | null;
  warningColor?: string | null;
  infoColor?: string | null;
  radius?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  borderRadius?: string | null;
  name?: string | null;
  slug?: string | null;
}

export const defaultTheme = {
  background: "210 33% 97%",
  foreground: "220 35% 16%",
  card: "0 0% 100%",
  cardForeground: "220 35% 16%",
  primary: "174 77% 26%",
  primaryForeground: "0 0% 100%",
  secondary: "214 32% 91%",
  secondaryForeground: "220 35% 16%",
  accent: "38 92% 39%",
  accentForeground: "0 0% 100%",
  success: "145 63% 30%",
  warning: "38 92% 39%",
  info: "206 88% 36%",
  radius: "0.5rem",
} as const;

const hexPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
const radiusPattern = /^(0|0\.25|0\.375|0\.5|0\.75|1)rem$/;

export function resolveOrganizationTheme(
  branding?: OrganizationBranding | null,
): CSSProperties {
  if (!branding) {
    return {};
  }

  const css: Record<string, string> = {};
  assignColor(css, "--primary", branding.primaryColor);
  assignColor(css, "--secondary", branding.secondaryColor);
  assignColor(css, "--accent", branding.accentColor);
  assignColor(css, "--success", branding.successColor);
  assignColor(css, "--warning", branding.warningColor);
  assignColor(css, "--info", branding.infoColor);

  if (branding.radius && radiusPattern.test(branding.radius)) {
    css["--radius"] = branding.radius;
  }

  return css as CSSProperties;
}

function assignColor(
  target: Record<string, string>,
  token: string,
  value?: string | null,
) {
  if (!value || !hexPattern.test(value)) {
    return;
  }

  target[token] = hexToHsl(value);
}

function hexToHsl(hex: string) {
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) {
    return `0 0% ${Math.round(lightness * 100)}%`;
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;

  if (max === red) {
    hue = (green - blue) / delta + (green < blue ? 6 : 0);
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }

  return `${Math.round(hue * 60)} ${Math.round(saturation * 100)}% ${Math.round(
    lightness * 100,
  )}%`;
}
