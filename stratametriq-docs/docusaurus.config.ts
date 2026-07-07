import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'StrataMetriq Docs',
  tagline: 'Architecture Intelligence & Pre-Deployment Safety in VS Code',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://stratametriq.example.com',
  baseUrl: '/',

  organizationName: 'stratametriq',
  projectName: 'stratametriq-docs',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'StrataMetriq',
      logo: {
        alt: 'StrataMetriq Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://marketplace.visualstudio.com/',
          label: 'VS Code Marketplace',
          position: 'right',
        },
        {
          href: 'https://github.com/aabid-wani/stratametriq',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Executive Summary',
              to: '/docs/intro',
            },
            {
              label: 'Technical Architecture',
              to: '/docs/architecture',
            },
            {
              label: 'User Guide & 9-Point Audit',
              to: '/docs/user-guide',
            },
          ],
        },
        {
          title: 'Ecosystem',
          items: [
            {
              label: 'VS Code Marketplace',
              href: 'https://marketplace.visualstudio.com/',
            },
            {
              label: 'TypeScript Compiler API',
              href: 'https://github.com/microsoft/TypeScript',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub Repository',
              href: 'https://github.com/aabid-wani/stratametriq',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} StrataMetriq. Architecture Intelligence & Pre-Deployment Safety. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
