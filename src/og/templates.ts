// SnapOG — OG image element templates
// Returns plain objects compatible with workers-og / satori

import type { OGParams } from '../types';

type StyleObject = Record<string, string | number | undefined>;

type VNode = {
  type: string;
  props: {
    style?: StyleObject;
    children?: unknown;
    [key: string]: unknown;
  };
};

// Accent bar — left edge visual anchor
function AccentBar(color: string): VNode {
  return {
    type: 'div',
    props: {
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '6px',
        height: '100%',
        backgroundColor: color,
      },
      children: null,
    },
  };
}

// Header row: domain on left, tag pill on right
function Header(domain: string | undefined, tag: string | undefined, accent: string, surface: string, primary: string): VNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '48px',
        width: '100%',
      },
      children: [
        domain
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '18px',
                  color: accent,
                  fontFamily: 'monospace',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                },
                children: domain,
              },
            }
          : { type: 'div', props: { style: { width: '1px' }, children: null } },
        tag
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '13px',
                  color: primary,
                  backgroundColor: surface,
                  padding: '6px 16px',
                  borderRadius: '100px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                },
                children: tag,
              },
            }
          : { type: 'div', props: { style: { width: '1px' }, children: null } },
      ],
    },
  };
}

// Footer row: author on left, watermark on right
function Footer(
  author: string | undefined,
  watermark: boolean,
  secondary: string
): VNode {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '48px',
        width: '100%',
      },
      children: [
        author
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '18px',
                  color: secondary,
                  fontFamily: 'monospace',
                },
                children: `— ${author}`,
              },
            }
          : { type: 'div', props: { style: { width: '1px' }, children: null } },
        watermark
          ? {
              type: 'div',
              props: {
                style: {
                  fontSize: '14px',
                  color: secondary,
                  fontFamily: 'monospace',
                  opacity: '0.55',
                  letterSpacing: '0.06em',
                },
                children: 'snapog.dev',
              },
            }
          : { type: 'div', props: { style: { width: '1px' }, children: null } },
      ],
    },
  };
}

// Default template — general purpose
function defaultTemplate(params: OGParams, watermark: boolean): VNode {
  const { title, description, domain, author, tag, theme = 'dark' } = params;
  const isDark = theme === 'dark';

  const bg = isDark ? '#0A0A0A' : '#FAFAFA';
  const primary = isDark ? '#F5F5F5' : '#0A0A0A';
  const secondary = isDark ? '#737373' : '#737373';
  const accent = '#F59E0B';
  const surface = isDark ? '#1A1A1A' : '#E8E8E8';

  const fontSize = title.length > 60 ? '42px' : title.length > 40 ? '52px' : '62px';

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: bg,
        padding: '64px 72px 64px 84px',
        position: 'relative',
        fontFamily: '"Noto Sans", sans-serif',
      },
      children: [
        AccentBar(accent),
        Header(domain, tag, accent, surface, primary),
        // Title — lineHeight must be numeric: the satori bundled in
        // workers-og parses unitless string line-heights as 0, which
        // stacks wrapped lines on top of each other.
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flex: '1',
              fontSize,
              fontWeight: '700',
              color: primary,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            },
            children: title,
          },
        },
        // Description
        ...(description
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px',
                    color: secondary,
                    marginTop: '24px',
                    lineHeight: 1.5,
                    maxWidth: '900px',
                  },
                  children: description,
                },
              },
            ]
          : []),
        Footer(author, watermark, secondary),
      ],
    },
  };
}

// Blog template — date-focused, editorial feel
function blogTemplate(params: OGParams, watermark: boolean): VNode {
  const { title, description, domain, author, tag, theme = 'dark' } = params;
  const isDark = theme === 'dark';

  const bg = isDark ? '#0D0D0D' : '#FFFFFF';
  const primary = isDark ? '#FAFAFA' : '#111111';
  const secondary = isDark ? '#6B7280' : '#6B7280';
  const accent = '#F59E0B';
  const surface = isDark ? '#1F1F1F' : '#F3F4F6';

  const fontSize = title.length > 55 ? '44px' : title.length > 35 ? '54px' : '64px';

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: bg,
        padding: '72px 80px',
        position: 'relative',
        fontFamily: '"Noto Serif", serif',
      },
      children: [
        // Top band
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              height: '4px',
              backgroundColor: accent,
            },
            children: null,
          },
        },
        // Site label + tag
        Header(domain, tag, accent, surface, primary),
        // Title
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flex: '1',
              fontSize,
              fontWeight: '700',
              color: primary,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
            },
            children: title,
          },
        },
        // Description
        ...(description
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '21px',
                    color: secondary,
                    marginTop: '28px',
                    lineHeight: 1.6,
                    fontStyle: 'italic',
                  },
                  children: description,
                },
              },
            ]
          : []),
        Footer(author, watermark, secondary),
      ],
    },
  };
}

// Article template — minimal, high-contrast, magazine aesthetic
function articleTemplate(params: OGParams, watermark: boolean): VNode {
  const { title, description, domain, author, tag, theme = 'dark' } = params;
  const isDark = theme === 'dark';

  const bg = isDark ? '#111111' : '#F8F8F8';
  const primary = isDark ? '#FFFFFF' : '#111111';
  const secondary = isDark ? '#9CA3AF' : '#4B5563';
  const accent = '#F59E0B';
  const _surface = isDark ? '#222222' : '#E5E7EB';
  void _surface;
  const divider = isDark ? '#2A2A2A' : '#D1D5DB';

  const fontSize = title.length > 60 ? '40px' : title.length > 40 ? '50px' : '60px';

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: bg,
        padding: '60px 72px',
        position: 'relative',
        fontFamily: '"Noto Sans", sans-serif',
      },
      children: [
        // Category row
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '32px',
            },
            children: [
              tag
                ? {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '12px',
                        fontWeight: '700',
                        color: accent,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                      },
                      children: tag,
                    },
                  }
                : { type: 'div', props: { style: { width: '1px' }, children: null } },
              domain
                ? {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '12px',
                        color: secondary,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontFamily: 'monospace',
                      },
                      children: `• ${domain}`,
                    },
                  }
                : { type: 'div', props: { style: { width: '1px' }, children: null } },
            ],
          },
        },
        // Divider
        {
          type: 'div',
          props: {
            style: {
              width: '48px',
              height: '3px',
              backgroundColor: accent,
              marginBottom: '32px',
            },
            children: null,
          },
        },
        // Title
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flex: '1',
              fontSize,
              fontWeight: '800',
              color: primary,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
            },
            children: title,
          },
        },
        ...(description
          ? [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '20px',
                    color: secondary,
                    marginTop: '20px',
                    lineHeight: 1.5,
                    maxWidth: '850px',
                  },
                  children: description,
                },
              },
            ]
          : []),
        // Footer divider + meta
        {
          type: 'div',
          props: {
            style: {
              width: '100%',
              height: '1px',
              backgroundColor: divider,
              marginTop: '36px',
            },
            children: null,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '16px',
              fontFamily: 'monospace',
            },
            children: [
              author
                ? {
                    type: 'div',
                    props: {
                      style: { fontSize: '16px', color: secondary },
                      children: author,
                    },
                  }
                : { type: 'div', props: { style: { width: '1px' }, children: null } },
              watermark
                ? {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '13px',
                        color: secondary,
                        opacity: '0.5',
                        letterSpacing: '0.06em',
                      },
                      children: 'snapog.dev',
                    },
                  }
                : { type: 'div', props: { style: { width: '1px' }, children: null } },
            ],
          },
        },
      ],
    },
  };
}

export function buildElement(params: OGParams, watermark: boolean): VNode {
  switch (params.template) {
    case 'blog':
      return blogTemplate(params, watermark);
    case 'article':
      return articleTemplate(params, watermark);
    default:
      return defaultTemplate(params, watermark);
  }
}
