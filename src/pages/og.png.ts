// Dynamic OG image generator using @vercel/og.
// GET /og.png?title=xxx&subtitle=xxx で 1200x630 の PNG を返す。
// モノクローム × 深コバルトのブランドパレットに整合するデザイン。

import { ImageResponse } from '@vercel/og';
import type { APIRoute } from 'astro';

export const prerender = false;

const DEFAULT_TITLE = '残業を、過去にする。';
const DEFAULT_SUBTITLE = 'Advanced Efficiency Solutions';

// biome-ignore lint/suspicious/noExplicitAny: Satori's createElement signature
const h: any = (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => ({
  type,
  props: {
    ...(props ?? {}),
    children: children.flat(),
  },
});

export const GET: APIRoute = async ({ url }) => {
  const title = url.searchParams.get('title') ?? DEFAULT_TITLE;
  const subtitle = url.searchParams.get('subtitle') ?? DEFAULT_SUBTITLE;

  const tree = h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #F4F3EE 0%, #EEEBE3 50%, #D9D4C7 100%)',
        fontFamily: 'sans-serif',
        position: 'relative',
        color: '#1E3A5F',
        padding: '80px',
      },
    },
    // 左上の ON TIME ブランドロゴ
    h(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          top: '48px',
          left: '56px',
          fontSize: '26px',
          fontWeight: 900,
          letterSpacing: '0.12em',
          color: '#1E3A5F',
        },
      },
      'ON TIME',
    ),
    // 右上 decoration
    h(
      'div',
      {
        style: {
          position: 'absolute',
          top: '48px',
          right: '56px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#5A7A94',
          fontSize: '16px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        },
      },
      h('div', {
        style: {
          display: 'flex',
          width: '10px',
          height: '10px',
          background: '#1E3A5F',
          borderRadius: '50%',
        },
      }),
      'Future Optimization',
    ),
    // 中央タイトル（大）
    h(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: '100px',
          fontWeight: 900,
          color: '#1E3A5F',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          marginBottom: '28px',
        },
      },
      title,
    ),
    // サブタイトル
    h(
      'div',
      {
        style: {
          display: 'flex',
          fontSize: '28px',
          color: '#6B6F76',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      },
      subtitle,
    ),
    // 下部装飾ライン
    h('div', {
      style: {
        display: 'flex',
        position: 'absolute',
        bottom: '0',
        left: '0',
        right: '0',
        height: '6px',
        background: 'linear-gradient(90deg, #2E5180 0%, #1E3A5F 50%, #0F1C30 100%)',
      },
    }),
    // 右下ドメイン表記
    h(
      'div',
      {
        style: {
          display: 'flex',
          position: 'absolute',
          bottom: '48px',
          right: '56px',
          fontSize: '18px',
          color: '#8A847A',
          letterSpacing: '0.1em',
        },
      },
      'ontime.click',
    ),
  );

  // biome-ignore lint/suspicious/noExplicitAny: ImageResponse accepts Satori tree
  return new ImageResponse(tree as any, {
    width: 1200,
    height: 630,
  });
};
